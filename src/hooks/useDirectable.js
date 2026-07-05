import { useEffect, useRef, useCallback } from 'react';
import { registry } from '@/lib/creapr/Registry';

/**
 * useDirectable — the atomic contract between a UI component and the CREAPr Engine.
 *
 * A component calls this hook with a stable `id` and a `directable` config:
 *   - onCommand(command, payload): called when the Engine issues a command to this atom
 *   - getData(): returns the atom's current data snapshot (for Engine reads)
 *   - isAvailable(): returns false when the atom is in a state that can't accept commands
 *
 * The hook handles registration on mount and unregistration on unmount.
 * If `id` is null/undefined, the hook is a no-op (component stays outside the Engine).
 *
 * @param {string|null} id - Stable, database-backed atom ID
 * @param {object} directable - { onCommand, getData, isAvailable }
 */
export function useDirectable(id, directable) {
  // Keep the latest directable config in a ref so the registry always
  // has the current version without re-registering on every render.
  const configRef = useRef(directable);
  configRef.current = directable;

  // Register on mount (or when id changes), unregister on unmount.
  useEffect(() => {
    if (!id) return;

    registry.register(id, {
      onCommand: (command, payload) => configRef.current.onCommand?.(command, payload),
      getData: () => configRef.current.getData?.() ?? {},
      isAvailable: () => configRef.current.isAvailable?.() ?? true,
    });

    return () => registry.unregister(id);
  }, [id]);

  // Allow the component to push a data snapshot update to the Engine on demand.
  const pushData = useCallback(() => {
    if (!id) return;
    // Registry already holds a live ref to getData — this is a no-op trigger
    // that the Engine can use to re-poll. Kept for future event-bus integration.
    const atom = registry.get(id);
    return atom ? atom.getData() : null;
  }, [id]);

  return { pushData };
}

export default useDirectable;