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

  const loadAll = useCallback(async () => {
    setLoading(true);
    let activeId = configId;
    let activeConfig = null;

    if (!activeId) {
      const configs = await base44.entities.MusicProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        activeId = configs[0].id;
        activeConfig = configs[0];
      } else {
        setConfig(null);
        setPlaylist([]);
        setTopics([]);
        setResearch([]);
        setRundown([]);
        setAssets([]);
        setLoading(false);
        return;
      }
    }

    if (!activeConfig) {
      activeConfig = await base44.entities.MusicProductionConfiguration.get(activeId);
    }
    setConfig(activeConfig);

    const [p, t, r, rd, a] = await Promise.all([
      base44.entities.PlaylistItem.filter({ configuration_id: activeId }, 'order'),
      base44.entities.MusicTopic.filter({ configuration_id: activeId }),
      base44.entities.MusicResearchItem.filter({ configuration_id: activeId }),
      base44.entities.ShowRundownItem.filter({ configuration_id: activeId }, 'order'),
      base44.entities.MusicAsset.filter({ configuration_id: activeId })
    ]);

    setPlaylist(p || []);
    setTopics(t || []);
    setResearch(r || []);
    setRundown(rd || []);
    setAssets(a || []);
    setLoading(false);
  }, [configId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, playlist, topics, research, rundown, assets, loading, refresh: loadAll };
}