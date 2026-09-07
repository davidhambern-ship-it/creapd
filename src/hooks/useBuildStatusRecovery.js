import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_ACTIVE_STATUSES = ['building', 'refreshing'];

/**
 * Watches a long-running Production Profile configuration and prevents an
 * abandoned backend build from leaving the producer on an infinite spinner.
 *
 * The backend remains authoritative. This watchdog only intervenes when the
 * entity has stayed in an active status without any update for the configured
 * stale window. The configuration schemas already support `failed`, so the
 * producer can return to the normal dashboard and retry the build.
 */
export function useBuildStatusRecovery({
  entityName,
  config,
  onTerminal,
  staleAfterMs = 180000,
  pollIntervalMs = 5000,
  activeStatuses = DEFAULT_ACTIVE_STATUSES,
}) {
  const onTerminalRef = useRef(onTerminal);
  const activeStatusesKey = activeStatuses.join('|');

  useEffect(() => {
    onTerminalRef.current = onTerminal;
  }, [onTerminal]);

  useEffect(() => {
    if (!entityName || !config?.id || !activeStatuses.includes(config.status)) return;

    let active = true;
    let timer = null;
    let checking = false;
    const watchStartedAt = Date.now();

    const checkStatus = async () => {
      if (!active || checking) return;
      checking = true;

      try {
        const entity = base44.entities[entityName];
        if (!entity) throw new Error(`Unknown production configuration entity: ${entityName}`);

        const updated = await entity.get(config.id);
        if (!active || !updated) return;

        const isStillActive = activeStatuses.includes(updated.status);
        const updatedAt = new Date(updated.updated_date).getTime();
        const staleMs = Number.isFinite(updatedAt)
          ? Date.now() - updatedAt
          : Date.now() - watchStartedAt;

        if (isStillActive && staleMs >= staleAfterMs) {
          console.error(
            `${entityName} build became stale after ${Math.round(staleMs / 1000)} seconds; marking failed.`
          );
          await entity.update(config.id, { status: 'failed' });
          if (active) await onTerminalRef.current?.('failed');
          return;
        }

        if (!isStillActive) {
          if (active) await onTerminalRef.current?.(updated.status);
          return;
        }
      } catch (err) {
        // A transient polling error must not itself kill the production. The
        // next interval will retry; the page-level data hook remains usable.
        console.error(`${entityName} build watchdog poll failed:`, err);
      } finally {
        checking = false;
      }
    };

    timer = setInterval(checkStatus, pollIntervalMs);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [entityName, config?.id, config?.status, staleAfterMs, pollIntervalMs, activeStatusesKey]);
}
