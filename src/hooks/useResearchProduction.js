import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useResearchProduction(configId) {
  const [config, setConfig] = useState(null);
  const [topics, setTopics] = useState([]);
  const [points, setPoints] = useState([]);
  const [packages, setPackages] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearProduction = useCallback(() => {
    setConfig(null);
    setTopics([]);
    setPoints([]);
    setPackages([]);
    setDossiers([]);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let activeId = configId;
      let activeConfig = null;

      if (!activeId) {
        const configs = await base44.entities.ResearchProductionConfiguration.list('-created_date', 1);
        if (configs && configs.length > 0) {
          activeId = configs[0].id;
          activeConfig = configs[0];
        } else {
          clearProduction();
          return;
        }
      }

      if (!activeConfig) {
        activeConfig = await base44.entities.ResearchProductionConfiguration.get(activeId);
      }
      setConfig(activeConfig);

      // Topics and points are independent enough that one failed collection should
      // not make CREAPD pretend the entire Research Production does not exist.
      const [topicsResult, pointsResult] = await Promise.allSettled([
        base44.entities.ResearchTopic.filter({ configuration_id: activeId }, '-created_date'),
        base44.entities.ResearchPoint.filter({ configuration_id: activeId }, 'order')
      ]);

      const loadedTopics = topicsResult.status === 'fulfilled' ? (topicsResult.value || []) : [];
      const loadedPoints = pointsResult.status === 'fulfilled' ? (pointsResult.value || []) : [];
      let partialFailure = false;

      if (topicsResult.status === 'fulfilled') {
        setTopics(loadedTopics);
      } else {
        partialFailure = true;
        console.error('Research topics load failed:', topicsResult.reason);
      }

      if (pointsResult.status === 'fulfilled') {
        setPoints(loadedPoints);
      } else {
        partialFailure = true;
        console.error('Research points load failed:', pointsResult.reason);
      }

      // Fetch packages linked to the currently loaded research points.
      if (pointsResult.status === 'fulfilled') {
        const pointIds = loadedPoints.map(pt => pt.id).filter(Boolean);
        if (pointIds.length > 0) {
          try {
            const allPackages = await base44.entities.ProductionPackage.filter(
              { source_entity_type: 'ResearchPoint' }, '-created_date', 100
            );
            setPackages((allPackages || []).filter(pkg => pointIds.includes(pkg.source_entity_id)));
          } catch (err) {
            partialFailure = true;
            console.error('Research packages load failed:', err);
          }
        } else {
          setPackages([]);
        }
      }

      // Dossiers are created before research finishes, so load them by topic_id as
      // well as the final dossier_id. This makes active and failed research visible
      // to the Lobby/Briefing Room instead of disappearing until completion.
      if (topicsResult.status === 'fulfilled') {
        const topicIds = loadedTopics.map(topic => topic.id).filter(Boolean);
        const dossierIds = loadedTopics.map(topic => topic.dossier_id).filter(Boolean);

        if (topicIds.length > 0 || dossierIds.length > 0) {
          try {
            const allDossiers = await base44.entities.ResearchDossier.filter({}, '-created_date', 100);
            setDossiers((allDossiers || []).filter(dossier =>
              topicIds.includes(dossier.topic_id) || dossierIds.includes(dossier.id)
            ));
          } catch (err) {
            partialFailure = true;
            console.error('Research dossiers load failed:', err);
          }
        } else {
          setDossiers([]);
        }
      }

      if (partialFailure) {
        setError(new Error('Some Research production data could not be loaded. Refresh to retry.'));
      }
    } catch (err) {
      // A critical configuration lookup failure should be reported, but do not
      // erase already-rendered production data and turn a transient API error into
      // a misleading "No Research Production" screen.
      console.error('useResearchProduction load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [configId, clearProduction]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, topics, points, packages, dossiers, loading, error, refresh: loadAll };
}
