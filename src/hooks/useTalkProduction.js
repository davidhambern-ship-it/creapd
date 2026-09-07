import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useTalkProduction(configId) {
  const [config, setConfig] = useState(null);
  const [topics, setTopics] = useState([]);
  const [research, setResearch] = useState([]);
  const [guests, setGuests] = useState([]);
  const [segments, setSegments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearProduction = useCallback(() => {
    setConfig(null);
    setTopics([]);
    setResearch([]);
    setGuests([]);
    setSegments([]);
    setAssets([]);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let activeId = configId;
      let activeConfig = null;

      if (!activeId) {
        const configs = await base44.entities.TalkProductionConfiguration.list('-created_date', 1);
        if (configs && configs.length > 0) {
          activeId = configs[0].id;
          activeConfig = configs[0];
        } else {
          clearProduction();
          return;
        }
      }

      if (!activeConfig) {
        activeConfig = await base44.entities.TalkProductionConfiguration.get(activeId);
      }
      setConfig(activeConfig);

      const results = await Promise.allSettled([
        base44.entities.TalkTopic.filter({ configuration_id: activeId }),
        base44.entities.TalkResearchItem.filter({ configuration_id: activeId }),
        base44.entities.TalkGuest.filter({ configuration_id: activeId }),
        base44.entities.TalkSegment.filter({ configuration_id: activeId }, 'order'),
        base44.entities.TalkAsset.filter({ configuration_id: activeId })
      ]);

      const setters = [setTopics, setResearch, setGuests, setSegments, setAssets];
      const labels = ['topics', 'research', 'guests', 'segments', 'assets'];
      let partialFailure = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          setters[index](result.value || []);
        } else {
          partialFailure = true;
          console.error(`Talk ${labels[index]} load failed:`, result.reason);
        }
      });

      if (partialFailure) {
        setError(new Error('Some Talk production data could not be loaded. Refresh to retry.'));
      }
    } catch (err) {
      console.error('useTalkProduction load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [configId, clearProduction]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, topics, research, guests, segments, assets, loading, error, refresh: loadAll };
}
