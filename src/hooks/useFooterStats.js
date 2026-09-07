import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const CONFIG_ENTITIES = {
  music: 'MusicProductionConfiguration',
  talk: 'TalkProductionConfiguration',
  cooking: 'CookingProductionConfiguration',
  sports: 'SportsProductionConfiguration',
  cosmo: 'CosmoProductionConfiguration',
  spiritual: 'SpiritualProductionConfiguration',
  research: 'ResearchProductionConfiguration',
};

/**
 * Fetches real production telemetry for the desktop footer.
 * No hardcoded counts are returned: a failed collection renders as unavailable
 * instead of presenting demo-looking numbers as if they were live data.
 */
export function useFooterStats(variant) {
  const [stats, setStats] = useState(null);
  const [configId, setConfigId] = useState(null);
  const configRef = useRef(null);

  useEffect(() => {
    if (!variant) return;

    let active = true;
    const unsubscribers = [];

    const loadData = async () => {
      try {
        if (variant === 'news') {
          const data = await fetchNewsStats();
          if (active) setStats(data);
          return;
        }

        const entityName = CONFIG_ENTITIES[variant];
        if (!entityName) {
          if (active) setStats(null);
          return;
        }

        let config = null;
        try {
          const user = await base44.auth.me();
          const defaultId = user?.default_production_config_id;
          if (defaultId) {
            config = await base44.entities[entityName].get(defaultId);
          }
        } catch {
          // No matching default configuration; fall back to the latest profile config.
        }

        if (!config) {
          const configs = await base44.entities[entityName].list('-updated_date', 1);
          if (!configs || configs.length === 0) {
            if (active) setStats({ health: 'unknown' });
            return;
          }
          config = configs[0];
        }

        configRef.current = config;
        if (active) setConfigId(config.id);

        const data = await fetchStats(variant, config);
        if (active) setStats(data);

        const unsubConfig = base44.entities[entityName].subscribe((event) => {
          if (event.type === 'update' && event.data?.id === config.id) {
            configRef.current = event.data;
            fetchStats(variant, event.data)
              .then(data => { if (active) setStats(data); })
              .catch(err => console.error(`${variant} footer refresh failed:`, err));
          }
        });
        unsubscribers.push(unsubConfig);
      } catch (err) {
        console.error(`${variant} footer telemetry load failed:`, err);
        if (active) setStats({ health: 'unknown' });
      }
    };

    loadData();

    return () => {
      active = false;
      unsubscribers.forEach(fn => fn && fn());
    };
  }, [variant]);

  // Poll child entity counts so the footer catches changes that do not touch the
  // parent configuration entity. News has no profile configuration, so it polls
  // directly as well.
  useEffect(() => {
    if (!variant) return;
    if (variant !== 'news' && !configId) return;

    const interval = setInterval(async () => {
      try {
        const data = variant === 'news'
          ? await fetchNewsStats()
          : configRef.current
            ? await fetchStats(variant, configRef.current)
            : null;
        if (data) setStats(data);
      } catch (err) {
        console.error(`${variant} footer telemetry poll failed:`, err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [variant, configId]);

  return stats;
}

function item(value, color) {
  return { value, color };
}

function unavailable() {
  return item('—', 'text-muted-foreground');
}

function countResult(result, suffix = '') {
  if (result.status !== 'fulfilled') return unavailable();
  const count = result.value?.length || 0;
  return item(`${count}${suffix}`);
}

function productionStatus(status) {
  if (status === 'failed') return item('Failed', 'text-red-400');
  if (status === 'building' || status === 'refreshing' || status === 'planning') {
    return item('Building', 'text-berna-orange');
  }
  if (status === 'ready') return item('Ready', 'text-berna-emerald');
  return item('Idle', 'text-muted-foreground');
}

function healthFromStatus(status) {
  return status === 'failed' ? 'failed' : 'ok';
}

async function fetchStats(variant, config) {
  if (!config) return { health: 'unknown' };

  switch (variant) {
    case 'music': return fetchMusicStats(config);
    case 'talk': return fetchTalkStats(config);
    case 'cooking': return fetchCookingStats(config);
    case 'sports': return fetchSportsStats(config);
    case 'cosmo': return fetchCosmoStats(config);
    case 'spiritual': return fetchSpiritualStats(config);
    case 'research': return fetchResearchStats(config);
    default: return { health: 'unknown' };
  }
}

async function fetchNewsStats() {
  const [sources, articles, logs] = await Promise.allSettled([
    base44.entities.Source.filter({}, 'name', 200),
    base44.entities.Article.filter({}, '-created_date', 200),
    base44.entities.AutomationLog.filter({}, '-created_date', 1),
  ]);

  const articleList = articles.status === 'fulfilled' ? (articles.value || []) : null;
  const latestLog = logs.status === 'fulfilled' ? logs.value?.[0] : null;
  const approved = articleList
    ? articleList.filter(article => ['approved', 'bernas_pick', 'used'].includes(article.status)).length
    : null;

  return {
    health: 'ok',
    automation: latestLog ? item('Active', 'text-berna-emerald') : item('Idle', 'text-muted-foreground'),
    lastRefresh: latestLog?.started_at
      ? item(new Date(latestLog.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))
      : unavailable(),
    sources: countResult(sources),
    pulled: articleList ? item(String(articleList.length)) : unavailable(),
    approved: approved === null ? unavailable() : item(String(approved), 'text-berna-emerald'),
  };
}

async function fetchMusicStats(config) {
  const [playlist, rundown] = await Promise.allSettled([
    base44.entities.PlaylistItem.filter({ configuration_id: config.id }),
    base44.entities.ShowRundownItem.filter({ configuration_id: config.id }),
  ]);

  return {
    health: healthFromStatus(config.status),
    automation: productionStatus(config.status),
    runtime: item(`${config.total_show_runtime || 0} min`),
    playlist: playlist.status === 'fulfilled' ? item(`${playlist.value?.length || 0} tracks`) : unavailable(),
    talkSegments: item(`${config.talk_segment_runtime || 0} min`),
    rundown: rundown.status === 'fulfilled'
      ? item(rundown.value?.length > 0 ? `${rundown.value.length} items` : 'Pending', rundown.value?.length > 0 ? 'text-berna-emerald' : 'text-muted-foreground')
      : unavailable(),
  };
}

async function fetchTalkStats(config) {
  const [topics, guests, rundown, assets] = await Promise.allSettled([
    base44.entities.TalkTopic.filter({ configuration_id: config.id }),
    base44.entities.TalkGuest.filter({ configuration_id: config.id }),
    base44.entities.TalkSegment.filter({ configuration_id: config.id }),
    base44.entities.TalkAsset.filter({ configuration_id: config.id }),
  ]);

  return {
    health: healthFromStatus(config.status),
    automation: productionStatus(config.status),
    topics: countResult(topics),
    guests: countResult(guests),
    rundown: countResult(rundown),
    assets: countResult(assets),
  };
}

async function fetchCookingStats(config) {
  const [recipes, ingredients, rundown, assets] = await Promise.allSettled([
    base44.entities.CookingRecipe.filter({ configuration_id: config.id }),
    base44.entities.CookingIngredient.filter({ configuration_id: config.id }),
    base44.entities.CookingSegment.filter({ configuration_id: config.id }),
    base44.entities.CookingAsset.filter({ configuration_id: config.id }),
  ]);

  return {
    health: healthFromStatus(config.status),
    automation: productionStatus(config.status),
    recipes: countResult(recipes),
    ingredients: countResult(ingredients),
    rundown: countResult(rundown),
    assets: countResult(assets),
  };
}

async function fetchSportsStats(config) {
  const [games, athletes, rundown, assets] = await Promise.allSettled([
    base44.entities.SportsGame.filter({ configuration_id: config.id }),
    base44.entities.SportsAthlete.filter({ configuration_id: config.id }),
    base44.entities.SportsSegment.filter({ configuration_id: config.id }),
    base44.entities.SportsAsset.filter({ configuration_id: config.id }),
  ]);

  return {
    health: healthFromStatus(config.status),
    automation: productionStatus(config.status),
    games: countResult(games),
    athletes: countResult(athletes),
    rundown: countResult(rundown),
    assets: countResult(assets),
  };
}

async function fetchCosmoStats(config) {
  const [topics, guests, rundown, assets] = await Promise.allSettled([
    base44.entities.CosmoTopic.filter({ configuration_id: config.id }),
    base44.entities.CosmoGuest.filter({ configuration_id: config.id }),
    base44.entities.CosmoSegment.filter({ configuration_id: config.id }),
    base44.entities.CosmoAsset.filter({ configuration_id: config.id }),
  ]);

  return {
    health: healthFromStatus(config.status),
    automation: productionStatus(config.status),
    topics: countResult(topics),
    guests: countResult(guests),
    rundown: countResult(rundown),
    assets: countResult(assets),
  };
}

async function fetchSpiritualStats(config) {
  const [research, topics, sections, assets] = await Promise.allSettled([
    base44.entities.SpiritualResearchItem.filter({ configuration_id: config.id }),
    base44.entities.SpiritualStudyTopic.filter({ configuration_id: config.id }),
    base44.entities.SpiritualMessageSection.filter({ configuration_id: config.id }),
    base44.entities.SpiritualAsset.filter({ configuration_id: config.id }),
  ]);

  const approvedAssets = assets.status === 'fulfilled'
    ? (assets.value || []).filter(asset => asset.status === 'approved' || asset.status === 'ready').length
    : null;

  return {
    health: healthFromStatus(config.status),
    automation: productionStatus(config.status),
    research: countResult(research),
    studies: countResult(topics),
    sections: countResult(sections),
    approved: approvedAssets === null ? unavailable() : item(String(approvedAssets), 'text-berna-emerald'),
  };
}

async function fetchResearchStats(config) {
  const [topicsResult, pointsResult] = await Promise.allSettled([
    base44.entities.ResearchTopic.filter({ configuration_id: config.id }),
    base44.entities.ResearchPoint.filter({ configuration_id: config.id }),
  ]);

  const points = pointsResult.status === 'fulfilled' ? (pointsResult.value || []) : null;
  const approvedCount = points
    ? points.filter(point => point.status === 'approved' || point.status === 'used').length
    : null;

  let packages = unavailable();
  if (points) {
    const pointIds = points.map(point => point.id).filter(Boolean);
    if (pointIds.length === 0) {
      packages = item('0');
    } else {
      try {
        const allPackages = await base44.entities.ProductionPackage.filter(
          { source_entity_type: 'ResearchPoint' }, '-created_date', 100
        );
        packages = item(String((allPackages || []).filter(pkg => pointIds.includes(pkg.source_entity_id)).length));
      } catch {
        packages = unavailable();
      }
    }
  }

  return {
    health: healthFromStatus(config.status),
    automation: productionStatus(config.status),
    topics: countResult(topicsResult),
    points: countResult(pointsResult),
    approved: approvedCount === null ? unavailable() : item(String(approvedCount), 'text-berna-emerald'),
    packages,
  };
}
