import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STUCK_THRESHOLD_MINUTES = 10;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const svc = base44.asServiceRole;
    const now = Date.now();
    const threshold = new Date(now - STUCK_THRESHOLD_MINUTES * 60 * 1000).toISOString();

    // Find configs stuck in active build states
    const stuckConfigs = await svc.entities.MusicProductionConfiguration.filter({
      status: { $in: ['building', 'planning', 'refreshing'] }
    });

    const actuallyStuck = stuckConfigs.filter(c =>
      c.updated_date && new Date(c.updated_date).toISOString() < threshold
    );

    const results = [];

    for (const config of actuallyStuck) {
      const result = await resolveStuckConfig(svc, config);
      results.push(result);
    }

    return Response.json({
      checked: stuckConfigs.length,
      stuck: actuallyStuck.length,
      resolved: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function resolveStuckConfig(svc, config) {
  const cid = config.id;
  const buildLog = safeParse(config.build_log, []);
  const stagesCompleted = {};
  for (const entry of buildLog) {
    if (entry.stage) {
      const isDone = entry.status === 'complete' || entry.success === true;
      const isSkipped = entry.status === 'skipped';
      if (isDone || isSkipped) {
        stagesCompleted[entry.stage] = isSkipped ? 'skipped' : 'complete';
      }
    }
  }

  // Check what content actually exists in the database
  const [playlistItems, researchItems, topics, assets, rundownItems] = await Promise.all([
    svc.entities.PlaylistItem.filter({ configuration_id: cid }),
    svc.entities.MusicResearchItem.filter({ configuration_id: cid }),
    svc.entities.MusicTopic.filter({ configuration_id: cid }),
    svc.entities.MusicAsset.filter({ configuration_id: cid }),
    svc.entities.ShowRundownItem.filter({ configuration_id: cid }),
  ]);

  const contentExists = {
    playlist: playlistItems.length > 0,
    research: researchItems.length > 0,
    topics: topics.length > 0,
    assets: assets.length > 0,
    rundown: rundownItems.length > 0,
  };

  const hasPlaylist = contentExists.playlist || stagesCompleted.playlist_generation === 'complete';
  const hasRundown = contentExists.rundown || stagesCompleted.rundown === 'complete';

  const updatedBuildLog = [...buildLog, {
    stage: 'auto_resolve',
    status: 'info',
    details: `Auto-resolve triggered. Content check: playlist=${playlistItems.length}, research=${researchItems.length}, topics=${topics.length}, assets=${assets.length}, rundown=${rundownItems.length}`,
    timestamp: new Date().toISOString()
  }];

  // CASE 1: Rundown exists → build actually completed, status just wasn't updated
  if (hasRundown) {
    await svc.entities.MusicProductionConfiguration.update(cid, {
      status: 'ready',
      build_log: JSON.stringify(updatedBuildLog),
    });
    await notifyUser(svc, config, 'ready', 'Auto-resolved: build had completed but status was stuck. Marked as ready.');
    return { id: cid, name: config.production_name, action: 'marked_ready', reason: 'rundown exists, build was complete' };
  }

  // CASE 2: Playlist + topics exist but no rundown → re-invoke build to finish remaining stages
  if (hasPlaylist) {
    await svc.entities.MusicProductionConfiguration.update(cid, {
      status: 'configuring',
      build_log: JSON.stringify(updatedBuildLog),
    });
    try {
      await svc.functions.invoke('buildMusicProduction', { configuration_id: cid });
      await notifyUser(svc, config, 'rebuilt', 'Auto-resolve: re-invoked build to complete missing stages (rundown).');
      return { id: cid, name: config.production_name, action: 'reinvoked', reason: 'playlist exists, rundown missing' };
    } catch (e) {
      await svc.entities.MusicProductionConfiguration.update(cid, {
        status: 'failed',
        build_log: JSON.stringify([...updatedBuildLog, { stage: 'auto_resolve', success: false, error: e.message, timestamp: new Date().toISOString() }]),
      });
      await notifyUser(svc, config, 'failed', `Auto-resolve tried to rebuild but failed: ${e.message}`);
      return { id: cid, name: config.production_name, action: 'failed', reason: `rebuild failed: ${e.message}` };
    }
  }

  // CASE 3: No playlist → nothing to recover, mark failed
  await svc.entities.MusicProductionConfiguration.update(cid, {
    status: 'failed',
    build_log: JSON.stringify(updatedBuildLog),
  });
  await notifyUser(svc, config, 'failed', 'Auto-resolve: no content was generated. Marked as failed — please retry from the configuration page.');
  return { id: cid, name: config.production_name, action: 'marked_failed', reason: 'no content exists, unrecoverable' };
}

async function notifyUser(svc, config, type, message) {
  try {
    await svc.entities.AppNotification.create({
      title: `Build Update: ${config.production_name || 'Music Production'}`,
      message,
      type: type === 'ready' ? 'production_update' : type === 'failed' ? 'error' : 'info',
      link: '/music/dashboard',
    });
  } catch (e) {
    console.error('Failed to create notification:', e.message);
  }
}

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}