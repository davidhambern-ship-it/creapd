import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function useSpiritualProduction(configId) {
  const [config, setConfig] = useState(null);
  const [research, setResearch] = useState([]);
  const [topics, setTopics] = useState([]);
  const [messageSections, setMessageSections] = useState([]);
  const [assets, setAssets] = useState([]);
  const [packageItems, setPackageItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const fetchSubEntities = async (activeId) => {
    const [r, t, m, a, p] = await Promise.all([
      base44.entities.SpiritualResearchItem.filter({ configuration_id: activeId }),
      base44.entities.SpiritualStudyTopic.filter({ configuration_id: activeId }),
      base44.entities.SpiritualMessageSection.filter({ configuration_id: activeId }, 'order'),
      base44.entities.SpiritualAsset.filter({ configuration_id: activeId }),
      base44.entities.SpiritualPackageItem.filter({ configuration_id: activeId }, 'order')
    ]);
    setResearch(r || []);
    setTopics(t || []);
    setMessageSections(m || []);
    setAssets(a || []);
    setPackageItems(p || []);
  };

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    let activeId = configId;
    let activeConfig = null;

    if (!activeId) {
      const configs = await base44.entities.SpiritualProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        activeId = configs[0].id;
        activeConfig = configs[0];
      } else {
        setConfig(null);
        setResearch([]);
        setTopics([]);
        setMessageSections([]);
        setAssets([]);
        setPackageItems([]);
        setLoading(false);
        return;
      }
    }

    if (!activeConfig) {
      activeConfig = await base44.entities.SpiritualProductionConfiguration.get(activeId);
    }
    setConfig(activeConfig);

    // Only fetch sub-entities when not building (avoids rate limit during polling)
    if (activeConfig.status !== 'building') {
      await fetchSubEntities(activeId);
    }
    if (!silent) setLoading(false);
  }, [configId]);

  // Poll config status when building
  useEffect(() => {
    if (config?.status !== 'building') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    let activeId = config.id;
    pollRef.current = setInterval(async () => {
      try {
        const updated = await base44.entities.SpiritualProductionConfiguration.get(activeId);
        setConfig(updated);
        if (updated.status !== 'building') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
          await fetchSubEntities(activeId);
        }
      } catch (e) { /* ignore poll errors */ }
    }, 10000);

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [config?.status, config?.id]);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  return { config, setConfig, research, topics, messageSections, assets, packageItems, loading, refresh: () => loadAll(true) };
}