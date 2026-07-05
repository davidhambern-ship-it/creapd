/**
 * Self-Healing Atom Registry
 * 
 * An in-memory map of registered UI "atoms" (components that have opted into
 * the CREAPr Engine via useDirectable). Each atom is stored by a stable
 * database-backed ID and holds a direct reference to its command handler.
 *
 * "Self-Healing": Components register on mount and unregister on unmount.
 * If the Engine queries a missing atom, it returns null — the calling step's
 * `on_missing` directive decides what happens next (re-query, skip, or abort).
 */
class AtomRegistry {
  constructor() {
    this._atoms = new Map();
    this._listeners = new Set();
  }

  /**
   * Register an atom with a stable ID.
   * @param {string} id - Stable, database-backed atom ID (e.g. "story-123")
   * @param {object} atom - { onCommand, getData, isAvailable }
   */
  register(id, atom) {
    this._atoms.set(id, {
      id,
      onCommand: atom.onCommand || (() => {}),
      getData: atom.getData || (() => ({})),
      isAvailable: atom.isAvailable || (() => true),
      registeredAt: Date.now(),
    });
    this._notify();
  }

  /**
   * Unregister an atom (called on component unmount).
   * @param {string} id
   */
  unregister(id) {
    this._atoms.delete(id);
    this._notify();
  }

  /**
   * Retrieve an atom by ID. Returns null if not found (missing/unmounted).
   * This is the "fault surface" — callers must handle the null case.
   * @param {string} id
   * @returns {object|null}
   */
  get(id) {
    const atom = this._atoms.get(id);
    if (!atom) return null;
    if (!atom.isAvailable()) return null;
    return atom;
  }

  /**
   * Get all registered atom IDs, optionally filtered.
   * @param {function} [predicate]
   * @returns {string[]}
   */
  list(predicate) {
    const ids = [];
    for (const [id, atom] of this._atoms) {
      if (!predicate || predicate(atom)) ids.push(id);
    }
    return ids;
  }

  /**
   * Check if an atom is currently registered and available.
   * @param {string} id
   * @returns {boolean}
   */
  has(id) {
    return this.get(id) !== null;
  }

  /**
   * Clear all atoms (used on full orchestrator reset).
   */
  clear() {
    this._atoms.clear();
    this._notify();
  }

  /** Subscribe to registry changes (for debugging / DevTools). */
  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _notify() {
    this._listeners.forEach((fn) => fn(this._atoms));
  }
}

// Singleton — shared across the entire app lifecycle.
export const registry = new AtomRegistry();
export default registry;