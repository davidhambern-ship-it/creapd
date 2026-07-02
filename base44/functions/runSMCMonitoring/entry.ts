import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    // Get all approved sources
    const sources = await base44.asServiceRole.entities.SMCSource.filter({ approval_status: 'Approved' }, '-created_date', 200);
    let checked = 0;
    let healthy = 0;
    let issues = 0;

    for (const source of sources) {
      checked++;
      const testUrl = source.api_base_url || source.website || source.data_endpoint;
      if (!testUrl) {
        await base44.asServiceRole.entities.SMCSource.update(source.id, { health_status: 'Unknown', last_checked_at: new Date().toISOString() });
        continue;
      }

      try {
        const startTime = Date.now();
        const resp = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(15000) });
        const responseTime = Date.now() - startTime;
        const reachable = resp.ok || resp.status < 500;
        const rateLimited = resp.status === 429;

        let newHealthStatus = 'Healthy';
        if (!reachable) newHealthStatus = 'Offline';
        else if (rateLimited) newHealthStatus = 'Rate Limited';
        else if (responseTime > 5000) newHealthStatus = 'Slow Response';

        const wasHealthy = source.health_status === 'Healthy';
        const nowHealthy = newHealthStatus === 'Healthy';

        await base44.asServiceRole.entities.SMCSource.update(source.id, {
          health_status: newHealthStatus,
          last_checked_at: new Date().toISOString(),
          last_successful_connection: nowHealthy ? new Date().toISOString() : source.last_successful_connection,
          last_failed_connection: !nowHealthy ? new Date().toISOString() : source.last_failed_connection,
          current_response_time_ms: responseTime,
          average_response_time_ms: source.average_response_time_ms > 0 ? Math.round((source.average_response_time_ms + responseTime) / 2) : responseTime,
          health_score: nowHealthy ? Math.min(100, (source.health_score || 50) + 5) : Math.max(0, (source.health_score || 50) - 10)
        });

        if (nowHealthy) healthy++;
        else issues++;

        // Create monitoring event if status changed
        if (wasHealthy !== nowHealthy) {
          await base44.asServiceRole.entities.SMCMonitoringEvent.create({
            source_id: source.id,
            event_type: nowHealthy ? 'Health Check Passed' : 'Health Check Failed',
            health_status: newHealthStatus,
            response_time_ms: responseTime,
            details: nowHealthy ? 'Source recovered' : `Status changed from Healthy to ${newHealthStatus}`,
            recommended_action: nowHealthy ? '' : 'Investigate source connectivity issues',
            severity: nowHealthy ? 'Info' : 'Warning',
            auto_recovery_attempted: false,
            auto_recovery_successful: false
          });
        }

        // Auto-recovery: try backup source if primary is offline
        if (!nowHealthy && source.backup_source_id) {
          try {
            const backup = await base44.asServiceRole.entities.SMCSource.get(source.backup_source_id);
            if (backup && backup.health_status === 'Healthy') {
              await base44.asServiceRole.entities.SMCMonitoringEvent.create({
                source_id: source.id,
                event_type: 'Recovery Successful',
                health_status: source.health_status,
                response_time_ms: 0,
                details: `Backup source "${backup.source_name}" is healthy. Recommend switching.`,
                recommended_action: `Switch to backup: ${backup.source_name}`,
                severity: 'Info',
                auto_recovery_attempted: true,
                auto_recovery_successful: true
              });
            }
          } catch {}
        }

      } catch (err) {
        await base44.asServiceRole.entities.SMCSource.update(source.id, {
          health_status: 'Connection Failed',
          last_checked_at: new Date().toISOString(),
          last_failed_connection: new Date().toISOString(),
          health_score: Math.max(0, (source.health_score || 50) - 15)
        });
        issues++;

        await base44.asServiceRole.entities.SMCMonitoringEvent.create({
          source_id: source.id,
          event_type: 'Health Check Failed',
          health_status: 'Connection Failed',
          response_time_ms: 0,
          details: err.message,
          recommended_action: 'Check if source is still active or switch to backup',
          severity: 'Critical',
          auto_recovery_attempted: false,
          auto_recovery_successful: false
        });
      }
    }

    return Response.json({
      success: true,
      sources_checked: checked,
      healthy: healthy,
      issues_found: issues
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});