import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Fetches real-time production stats for the footer.
 * Subscribes to entity changes so the footer updates live as the build progresses.
 */
export function useFooterStats(variant) {
  const [stats, setStats] = useState(null);
  const [configId, setConfigId] = useState(null);
  const configRef = useRef(null);

  useEffect(() => {
    if (!variant) return;

    let unsubscribers = [];

    const loadData = async () => {
      const configMap = {
        music: 'MusicProductionConfiguration',
        talk: 'TalkProductionConfiguration',
        cooking: 'CookingProductionConfiguration',
        sports: 'SportsProductionConfiguration',
        cosmo: 'CosmoProductionConfiguration',
        spiritual: 'SpiritualProductionConfiguration',
        research: 'ResearchProductionConfiguration',
      };

      const entityName = configMap[variant];
      if (!entityName) return;

      // Fetch latest config
      const configs = await base44.entities[entityName].list('-created_date', 1);
      if (!configs || configs.length === 0) return;
      const config = configs[0];
      configRef.current = config;
      setConfigId(config.id);

      const data = await fetchStats(variant, config);
      setStats(data);

      // Subscribe to config entity updates
      const unsubConfig = base44.entities[entityName].subscribe((event) => {
        if (event.type === 'update' && event.data?.id === config.id) {
          configRef.current = event.data;
          fetchStats(variant, event.data).then(setStats);
        }
      });
      unsubscribers.push(unsubConfig);
    };

    loadData();

    return () => {
      unsubscribers.forEach(fn => fn && fn());
    };
  }, [variant]);

  // Poll child entity counts every 10 seconds for real-time updates
  useEffect(() => {
    if (!variant || !configId) return;
    const interval = setInterval(async () => {
      if (configRef.current) {
        const data = await fetchStats(variant, configRef.current);
        setStats(data);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [variant, configId]);

  return stats;
}

async function fetchStats(variant, config) {
  if (!config) return null;

  switch (variant) {
    case 'music':
      return fetchMusicStats(config);
    default:
      return null;
  }
}

async function fetchMusicStats(config) {
  try {
    const [playlist, topics, rundown, assets, research] = await Promise.all([
      base44.entities.PlaylistItem.filter({ configuration_id: config.id }),
      base44.entities.MusicTopic.filter({ configuration_id: config.id }),
      base44.entities.ShowRundownItem.filter({ configuration_id: config.id }),
      base44.entities.MusicAsset.filter({ configuration_id: config.id }),
      base44.entities.MusicResearchItem.filter({ configuration_id: config.id }),
    ]);

    const status = config.status || 'configuring';
    const isReady = status === 'ready';
    const isBuilding = status === 'building';

    return {
      automation: isBuilding ? 'Building' : isReady ? 'Active' : 'Idle',
      automationColor: isBuilding ? 'text-berna-orange' : isReady ? 'text-berna-emerald' : 'text-muted-foreground',
      runtime: `${config.total_show_runtime || 0} min`,
      playlist: `${playlist?.length || 0} tracks`,
      talkSegments: `${config.talk_segment_runtime || 0} min`,
      rundown: isReady ? 'Ready' : rundown?.length > 0 ? `${rundown.length} items` : 'Pending',
      rundownColor: isReady ? 'text-berna-emerald' : 'text-muted-foreground',
    };
  } catch {
    return null;
  }
}