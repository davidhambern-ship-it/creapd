import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useSportsProduction(configId) {
  const [config, setConfig] = useState(null);
  const [games, setGames] = useState([]);
  const [research, setResearch] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    let activeId = configId;
    let activeConfig = null;

    if (!activeId) {
      const configs = await base44.entities.SportsProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        activeId = configs[0].id;
        activeConfig = configs[0];
      } else {
        setConfig(null);
        setGames([]);
        setResearch([]);
        setAthletes([]);
        setSegments([]);
        setAssets([]);
        setLoading(false);
        return;
      }
    }

    if (!activeConfig) {
      activeConfig = await base44.entities.SportsProductionConfiguration.get(activeId);
    }
    setConfig(activeConfig);

    const [g, r, ath, s, a] = await Promise.all([
      base44.entities.SportsGame.filter({ configuration_id: activeId }),
      base44.entities.SportsResearchItem.filter({ configuration_id: activeId }),
      base44.entities.SportsAthlete.filter({ configuration_id: activeId }),
      base44.entities.SportsSegment.filter({ configuration_id: activeId }, 'order'),
      base44.entities.SportsAsset.filter({ configuration_id: activeId })
    ]);

    setGames(g || []);
    setResearch(r || []);
    setAthletes(ath || []);
    setSegments(s || []);
    setAssets(a || []);
    setLoading(false);
  }, [configId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, games, research, athletes, segments, assets, loading, refresh: loadAll };
}