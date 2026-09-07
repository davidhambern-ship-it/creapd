import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useMusicProduction(configId) {
  const [config, setConfig] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [topics, setTopics] = useState([]);
  const [research, setResearch] = useState([]);
  const [rundown, setRundown] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    setError(null);

    try {
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
    }
  }, [configId, clearProduction]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, playlist, topics, research, rundown, assets, loading, error, refresh: loadAll };
}
