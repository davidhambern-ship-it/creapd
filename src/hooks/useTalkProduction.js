import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';
import { useBuildStatusRecovery } from '@/hooks/useBuildStatusRecovery';

export function useTalkProduction(configId) {
  const ownedPreview = shouldUseNeonAuth();
  const [config, setConfig] = useState(null);
  const [topics, setTopics] = useState([]);
  const [research, setResearch] = useState([]);
  const [guests, setGuests] = useState([]);
  const [segments, setSegments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [packages, setPackages] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearProduction = useCallback(() => {
    setConfig(null);
    setTopics([]);
    setResearch([]);
    setGuests([]);
    setSegments([]);
    setAssets([]);
    setPackages([]);
    setSession(null);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (ownedPreview) {
        const suffix = configId ? `&configuration_id=${encodeURIComponent(configId)}` : '';
        const data = await creapdApi.get(`/production/core?studio=talk${suffix}`);
        const activeConfig = data?.configuration || null;

        if (!activeConfig) {
          clearProduction();
          return;
        }

        setConfig(activeConfig);
        setTopics(data?.topics || []);
        setResearch(data?.research || []);
        setGuests(data?.guests || []);
        setSegments(data?.segments || []);
        setAssets(data?.assets || []);
        setPackages(data?.packages || []);
        setSession(data?.session || null);
        return;
      }

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

      setPackages([]);
      setSession(null);

      if (partialFailure) {
        setError(new Error('Some Talk production data could not be loaded. Refresh to retry.'));
      }
    } catch (err) {
      console.error('useTalkProduction load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [configId, clearProduction, ownedPreview]);

  useBuildStatusRecovery({
    entityName: ownedPreview ? null : 'TalkProductionConfiguration',
    config,
    onTerminal: loadAll,
  });

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return {
    config,
    topics,
    research,
    guests,
    segments,
    assets,
    packages,
    session,
    loading,
    error,
    refresh: loadAll,
    source: ownedPreview ? 'neon' : 'base44',
  };
}
