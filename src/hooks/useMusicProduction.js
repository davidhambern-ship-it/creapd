import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useBuildStatusRecovery } from '@/hooks/useBuildStatusRecovery';

const metadataRepairStarted = new Set();

function parseSourcePayload(value) {
  if (value && typeof value === 'object') return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {}
  }
  return {};
}

function hasVerifiedRadioMetadata(track) {
  const duration = Number(track?.length_seconds || 0);
  const payload = parseSourcePayload(track?.source_payload);
  const youtubeTitle = String(payload.youtube_title || '');
  const sourceType = String(payload.youtube_source_type || '');
  const radioSafeSource =
    track?.source === 'youtube_radio_verified' ||
    track?.source === 'youtube_lyric_verified' ||
    ['lyric_video', 'visualizer', 'audio_track'].includes(sourceType) ||
    /\blyric(?:s)?\b|\bvisuali[sz]er\b|\bofficial audio\b|\baudio only\b/i.test(youtubeTitle);

  return Boolean(track?.youtube_video_id) && duration >= 75 && radioSafeSource;
}

export function useMusicProduction(configId) {
  const [config, setConfig] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [topics, setTopics] = useState([]);
  const [research, setResearch] = useState([]);
  const [rundown, setRundown] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metadataRepairing, setMetadataRepairing] = useState(false);

  const clearProduction = useCallback(() => {
    setConfig(null);
    setPlaylist([]);
    setTopics([]);
    setResearch([]);
    setRundown([]);
    setAssets([]);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setContentLoading(true);
    setError(null);

    try {
      // Fast path: Preview/Neon returns the whole Radio production in one HTTP request.
      try {
        const response = await base44.functions.invoke('getMusicProductionBundle', {
          configuration_id: configId || null,
        });
        const bundle = response?.data;

        if (bundle && Object.prototype.hasOwnProperty.call(bundle, 'configuration')) {
          if (!bundle.configuration) {
            clearProduction();
          } else {
            setConfig(bundle.configuration);
            setPlaylist(bundle.playlist || []);
            setTopics(bundle.topics || []);
            setResearch(bundle.research || []);
            setRundown(bundle.rundown || []);
            setAssets(bundle.assets || []);
          }
          setLoading(false);
          setContentLoading(false);
          return;
        }
      } catch (bundleError) {
        console.warn('Radio bundle load unavailable; using compatibility loader.', bundleError);
      }

      // Compatibility fallback: old entity-by-entity loader.
      let activeId = configId;
      let activeConfig = null;

      if (!activeId) {
        const configs = await base44.entities.MusicProductionConfiguration.list('-created_date', 1);
        if (configs && configs.length > 0) {
          activeId = configs[0].id;
          activeConfig = configs[0];
        } else {
          clearProduction();
          return;
        }
      }

      if (!activeConfig) {
        activeConfig = await base44.entities.MusicProductionConfiguration.get(activeId);
      }
      setConfig(activeConfig);
      setLoading(false);

      const results = await Promise.allSettled([
        base44.entities.PlaylistItem.filter({ configuration_id: activeId }, 'order'),
        base44.entities.MusicTopic.filter({ configuration_id: activeId }),
        base44.entities.MusicResearchItem.filter({ configuration_id: activeId }),
        base44.entities.ShowRundownItem.filter({ configuration_id: activeId }, 'order'),
        base44.entities.MusicAsset.filter({ configuration_id: activeId })
      ]);

      const setters = [setPlaylist, setTopics, setResearch, setRundown, setAssets];
      const labels = ['playlist', 'topics', 'research', 'rundown', 'assets'];
      let partialFailure = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          setters[index](result.value || []);
        } else {
          partialFailure = true;
          console.error(`Music ${labels[index]} load failed:`, result.reason);
        }
      });

      if (partialFailure) {
        setError(new Error('Some Music production data could not be loaded. Refresh to retry.'));
      }
    } catch (err) {
      console.error('useMusicProduction load error:', err);
      setError(err);
    } finally {
      setLoading(false);
      setContentLoading(false);
    }
  }, [configId, clearProduction]);

  useBuildStatusRecovery({
    entityName: 'MusicProductionConfiguration',
    config,
    onTerminal: loadAll,
    staleAfterMs: 300000,
    activeStatuses: ['planning', 'building', 'refreshing'],
  });

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const configurationId = config?.id;
    if (!configurationId || contentLoading || !playlist.length) return undefined;
    if (metadataRepairStarted.has(configurationId)) return undefined;
    if (!playlist.some(track => !hasVerifiedRadioMetadata(track))) return undefined;

    let cancelled = false;
    let idleId = null;
    let timerId = null;

    const runRepair = () => {
      if (cancelled || metadataRepairStarted.has(configurationId)) return;
      metadataRepairStarted.add(configurationId);
      setMetadataRepairing(true);

      base44.functions.invoke('refreshMusicYoutubeMetadata', {
        configuration_id: configurationId,
      })
        .then(async () => {
          if (cancelled) return;
          const [updatedPlaylist, updatedRundown] = await Promise.all([
            base44.entities.PlaylistItem.filter({ configuration_id: configurationId }, 'order'),
            base44.entities.ShowRundownItem.filter({ configuration_id: configurationId }, 'order'),
          ]);
          if (!cancelled) {
            setPlaylist(updatedPlaylist || []);
            setRundown(updatedRundown || []);
          }
        })
        .catch(error => {
          metadataRepairStarted.delete(configurationId);
          console.error('Radio YouTube metadata repair failed:', error);
        })
        .finally(() => {
          if (!cancelled) setMetadataRepairing(false);
        });
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(runRepair, { timeout: 4000 });
    } else {
      timerId = window.setTimeout(runRepair, 2500);
    }

    return () => {
      cancelled = true;
      if (idleId !== null && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [config?.id, playlist, contentLoading]);

  return { config, playlist, topics, research, rundown, assets, loading, contentLoading, error, metadataRepairing, refresh: loadAll };
}
