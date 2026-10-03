import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';

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

  const loadFromNeon = useCallback(async () => {
    const query = configId ? `?config_id=${encodeURIComponent(configId)}` : '';
    const payload = await creapdApi.get(`/research/production${query}`);

    if (!payload?.config) {
      clearProduction();
      return;
    }

    setConfig(payload.config);
    setTopics(payload.topics || []);
    setPoints(payload.points || []);
    setDossiers(payload.dossiers || []);
    setPackages(payload.packages || []);
  }, [configId, clearProduction]);

  const loadFromBase44 = useCallback(async () => {
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
  }, [configId, clearProduction]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (shouldUseNeonAuth()) {
        await loadFromNeon();
      } else {
        await loadFromBase44();
      }
    } catch (err) {
      console.error('useResearchProduction load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [loadFromNeon, loadFromBase44]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, topics, points, packages, dossiers, loading, error, refresh: loadAll };
}
