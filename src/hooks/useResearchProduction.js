import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useResearchProduction(configId) {
  const [config, setConfig] = useState(null);
  const [topics, setTopics] = useState([]);
  const [points, setPoints] = useState([]);
  const [packages, setPackages] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    let activeId = configId;
    let activeConfig = null;

    if (!activeId) {
      const configs = await base44.entities.ResearchProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        activeId = configs[0].id;
        activeConfig = configs[0];
      } else {
        setConfig(null);
        setTopics([]);
        setPoints([]);
        setPackages([]);
        setDossiers([]);
        setLoading(false);
        return;
      }
    }

    if (!activeConfig) {
      activeConfig = await base44.entities.ResearchProductionConfiguration.get(activeId);
    }
    setConfig(activeConfig);

    const [t, p] = await Promise.all([
      base44.entities.ResearchTopic.filter({ configuration_id: activeId }, '-created_date'),
      base44.entities.ResearchPoint.filter({ configuration_id: activeId }, 'order')
    ]);

    setTopics(t || []);
    setPoints(p || []);

    // Fetch packages linked to research points
    const pointIds = (p || []).map(pt => pt.id).filter(Boolean);
    let pkgs = [];
    if (pointIds.length > 0) {
      // ProductionPackage uses source_entity_type + source_entity_id for research points
      pkgs = await base44.entities.ProductionPackage.filter({ source_entity_type: 'ResearchPoint' }, '-created_date');
      pkgs = (pkgs || []).filter(pkg => pointIds.includes(pkg.source_entity_id));
    }
    setPackages(pkgs || []);

    // Fetch dossiers for topics that have one
    const dossierIds = (t || []).map(tp => tp.dossier_id).filter(Boolean);
    let doss = [];
    if (dossierIds.length > 0) {
      doss = await base44.entities.ResearchDossier.filter({}, '-created_date');
      doss = (doss || []).filter(d => dossierIds.includes(d.id));
    }
    setDossiers(doss);

    setLoading(false);
  }, [configId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, topics, points, packages, dossiers, loading, refresh: loadAll };
}