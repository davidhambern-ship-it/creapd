import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useSpiritualProduction(configId) {
  const [config, setConfig] = useState(null);
  const [research, setResearch] = useState([]);
  const [topics, setTopics] = useState([]);
  const [messageSections, setMessageSections] = useState([]);
  const [assets, setAssets] = useState([]);
  const [packageItems, setPackageItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    let activeId = configId;
    let activeConfig = null;

    if (!activeId) {
      const configs = await base44.entities.SpiritualProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        activeId = configs[0].id;
        activeConfig = configs[0];
      } else {
        setConfig(null);
        setResearch([]);
        setTopics([]);
        setMessageSections([]);
        setAssets([]);
        setPackageItems([]);
        setLoading(false);
        return;
      }
    }

    if (!activeConfig) {
      activeConfig = await base44.entities.SpiritualProductionConfiguration.get(activeId);
    }
    setConfig(activeConfig);

    const [r, t, m, a, p] = await Promise.all([
      base44.entities.SpiritualResearchItem.filter({ configuration_id: activeId }),
      base44.entities.SpiritualStudyTopic.filter({ configuration_id: activeId }),
      base44.entities.SpiritualMessageSection.filter({ configuration_id: activeId }, 'order'),
      base44.entities.SpiritualAsset.filter({ configuration_id: activeId }),
      base44.entities.SpiritualPackageItem.filter({ configuration_id: activeId }, 'order')
    ]);

    setResearch(r || []);
    setTopics(t || []);
    setMessageSections(m || []);
    setAssets(a || []);
    setPackageItems(p || []);
    if (!silent) setLoading(false);
  }, [configId]);

  useEffect(() => {
    loadAll(false);
  }, [loadAll]);

  return { config, setConfig, research, topics, messageSections, assets, packageItems, loading, refresh: () => loadAll(true) };
}