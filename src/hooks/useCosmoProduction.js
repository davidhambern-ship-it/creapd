import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useCosmoProduction(configId) {
  const [config, setConfig] = useState(null);
  const [topics, setTopics] = useState([]);
  const [research, setResearch] = useState([]);
  const [guests, setGuests] = useState([]);
  const [segments, setSegments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    let activeId = configId;
    let activeConfig = null;

    if (!activeId) {
      const configs = await base44.entities.CosmoProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        activeId = configs[0].id;
        activeConfig = configs[0];
      } else {
        setConfig(null);
        setTopics([]);
        setResearch([]);
        setGuests([]);
        setSegments([]);
        setAssets([]);
        setLoading(false);
        return;
      }
    }

    if (!activeConfig) {
      activeConfig = await base44.entities.CosmoProductionConfiguration.get(activeId);
    }
    setConfig(activeConfig);

    const [t, r, g, s, a] = await Promise.all([
      base44.entities.CosmoTopic.filter({ configuration_id: activeId }),
      base44.entities.CosmoResearchItem.filter({ configuration_id: activeId }),
      base44.entities.CosmoGuest.filter({ configuration_id: activeId }),
      base44.entities.CosmoSegment.filter({ configuration_id: activeId }, 'order'),
      base44.entities.CosmoAsset.filter({ configuration_id: activeId })
    ]);

    setTopics(t || []);
    setResearch(r || []);
    setGuests(g || []);
    setSegments(s || []);
    setAssets(a || []);
    setLoading(false);
  }, [configId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, topics, research, guests, segments, assets, loading, refresh: loadAll };
}