import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useBuildStatusRecovery } from '@/hooks/useBuildStatusRecovery';

export function useSportsProduction(configId) {
  const [config, setConfig] = useState(null);
  const [games, setGames] = useState([]);
  const [research, setResearch] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearProduction = useCallback(() => {
    setConfig(null);
    setGames([]);
    setResearch([]);
    setAthletes([]);
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
        const configs = await base44.entities.SportsProductionConfiguration.list('-created_date', 1);
        if (configs && configs.length > 0) {
          activeId = configs[0].id;
          activeConfig = configs[0];
        } else {
          clearProduction();
          return;
        }
      }

      if (!activeConfig) {
        activeConfig = await base44.entities.SportsProductionConfiguration.get(activeId);
      }
      setConfig(activeConfig);

      const results = await Promise.allSettled([
        base44.entities.SportsGame.filter({ configuration_id: activeId }),
        base44.entities.SportsResearchItem.filter({ configuration_id: activeId }),
        base44.entities.SportsAthlete.filter({ configuration_id: activeId }),
        base44.entities.SportsSegment.filter({ configuration_id: activeId }, 'order'),
        base44.entities.SportsAsset.filter({ configuration_id: activeId })
      ]);

      const setters = [setGames, setResearch, setAthletes, setSegments, setAssets];
      const labels = ['games', 'research', 'athletes', 'segments', 'assets'];
      let partialFailure = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          setters[index](result.value || []);
        } else {
          partialFailure = true;
          console.error(`Sports ${labels[index]} load failed:`, result.reason);
        }
      });

      if (partialFailure) {
        setError(new Error('Some Sports production data could not be loaded. Refresh to retry.'));
      }
    } catch (err) {
      console.error('useSportsProduction load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [configId, clearProduction]);

  useBuildStatusRecovery({
    entityName: 'SportsProductionConfiguration',
    config,
    onTerminal: loadAll,
  });

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, games, research, athletes, segments, assets, loading, error, refresh: loadAll };
}
