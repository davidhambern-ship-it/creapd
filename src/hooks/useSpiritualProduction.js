import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useSpiritualProduction(configId) {
  const [config, setConfig] = useState(null);
  const [research, setResearch] = useState([]);
  const [topics, setTopics] = useState([]);
  const [messageSections, setMessageSections] = useState([]);
  const [assets, setAssets] = useState([]);
  const [packageItems, setPackageItems] = useState([]);
  const [presentationScenes, setPresentationScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingVoice, setGeneratingVoice] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const pollRef = useRef(null);

  const clearProduction = useCallback(() => {
    setConfig(null);
    setResearch([]);
    setTopics([]);
    setMessageSections([]);
    setAssets([]);
    setPackageItems([]);
    setPresentationScenes([]);
  }, []);

  const fetchSubEntities = useCallback(async (activeId) => {
    const results = await Promise.allSettled([
      base44.entities.SpiritualResearchItem.filter({ configuration_id: activeId }),
      base44.entities.SpiritualStudyTopic.filter({ configuration_id: activeId }),
      base44.entities.SpiritualMessageSection.filter({ configuration_id: activeId }, 'order'),
      base44.entities.SpiritualAsset.filter({ configuration_id: activeId }),
      base44.entities.SpiritualPackageItem.filter({ configuration_id: activeId }, 'order'),
      base44.entities.PresentationScene.filter({ configuration_id: activeId }, 'order')
    ]);

    const setters = [
      setResearch,
      setTopics,
      setMessageSections,
      setAssets,
      setPackageItems,
      setPresentationScenes
    ];
    const labels = ['research', 'topics', 'message sections', 'assets', 'package items', 'presentation scenes'];
    let partialFailure = false;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        setters[index](result.value || []);
      } else {
        partialFailure = true;
        console.error(`Spiritual ${labels[index]} load failed:`, result.reason);
      }
    });

    return partialFailure;
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);

    try {
      let activeId = configId;
      let activeConfig = null;

      if (!activeId) {
        const configs = await base44.entities.SpiritualProductionConfiguration.list('-created_date', 1);
        if (configs && configs.length > 0) {
          activeId = configs[0].id;
          activeConfig = configs[0];
        } else {
          clearProduction();
          return;
        }
      }

      if (!activeConfig) {
        activeConfig = await base44.entities.SpiritualProductionConfiguration.get(activeId);
      }
      setConfig(activeConfig);

      // Only fetch sub-entities when not building (avoids rate limit during polling).
      if (activeConfig.status !== 'building') {
        const partialFailure = await fetchSubEntities(activeId);
        if (partialFailure) {
          setError(new Error('Some Spiritual production data could not be loaded. Refresh to retry.'));
        }
      }
    } catch (err) {
      console.error('useSpiritualProduction load error:', err);
      setError(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [configId, clearProduction, fetchSubEntities]);

  const generateSceneImages = useCallback(async (activeId) => {
    try {
      const sections = await base44.entities.SpiritualMessageSection.filter({ configuration_id: activeId }, 'order');
      for (const section of sections) {
        if (section.generated_image_url) continue;
        const prompt = section.slide_visual_prompt || ('spiritual presentation slide about ' + (section.title || ''));
        try {
          const result = await base44.integrations.Core.GenerateImage({ prompt });
          if (result.url) {
            await base44.entities.SpiritualMessageSection.update(section.id, { generated_image_url: result.url });
          }
        } catch (err) { console.error('Image gen error:', err); }
      }
    } catch (err) { console.error('Scene image generation failed:', err); }
  }, []);

  // Poll config status when building.
  useEffect(() => {
    if (config?.status !== 'building') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    const activeId = config.id;
    pollRef.current = setInterval(async () => {
      try {
        const updated = await base44.entities.SpiritualProductionConfiguration.get(activeId);
        // Staleness safety net: if the config has been "building" for more than 3 minutes,
        // the backend function likely timed out without reaching its catch block.
        const updatedAt = new Date(updated.updated_date).getTime();
        const staleMs = Number.isFinite(updatedAt) ? Date.now() - updatedAt : 0;
        if (updated.status === 'building' && staleMs > 180000) {
          await base44.entities.SpiritualProductionConfiguration.update(activeId, { status: 'failed' });
          updated.status = 'failed';
        }
        setConfig(updated);

        if (updated.status !== 'building') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          const partialFailure = await fetchSubEntities(activeId);
          if (partialFailure) {
            setError(new Error('Some Spiritual production data could not be loaded after the build. Refresh to retry.'));
          }

          // After build completes, trigger voice generation.
          if (updated.status === 'ready') {
            setGeneratingVoice(true);
            const voiceTimeout = setTimeout(() => {
              console.error('Voice generation timed out after 5 minutes');
              setGeneratingVoice(false);
              setGeneratingImages(false);
              loadAll(true);
            }, 300000);

            base44.functions.invoke('generateSpiritualVoiceovers', { configuration_id: activeId })
              .then(async () => {
                clearTimeout(voiceTimeout);
                setGeneratingVoice(false);
                setGeneratingImages(true);
                const imageTimeout = setTimeout(() => {
                  console.error('Image generation timed out after 5 minutes');
                  setGeneratingImages(false);
                  loadAll(true);
                }, 300000);

                try {
                  await generateSceneImages(activeId);
                } catch (err) {
                  console.error('Scene image generation failed:', err);
                }

                clearTimeout(imageTimeout);
                setGeneratingImages(false);
                await loadAll(true);
              })
              .catch(err => {
                clearTimeout(voiceTimeout);
                console.error('Voice generation error:', err);
                setError(err);
                setGeneratingVoice(false);
                setGeneratingImages(false);
                loadAll(true);
              });
          }
        }
      } catch (err) {
        console.error('Spiritual build status poll failed:', err);
        setError(err);
      }
    }, 10000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [config?.status, config?.id, fetchSubEntities, generateSceneImages, loadAll]);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  return {
    config,
    setConfig,
    research,
    topics,
    messageSections,
    assets,
    packageItems,
    presentationScenes,
    loading,
    error,
    generatingVoice,
    generatingImages,
    refresh: () => loadAll(true)
  };
}
