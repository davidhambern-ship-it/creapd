/**
 * UI Command Executor
 *
 * Interprets ui_commands returned by the CREAPr Brain and dispatches
 * them to the appropriate handlers.
 *
 * Navigation commands (navigate, navigate_department) use react-router's
 * navigate function. Component-level commands (show_shelves, show_featured,
 * transition_to_desk, reveal_assignment) are passed to optional callbacks
 * that the consuming component provides.
 */

import { RPP_DEPARTMENTS } from '@/lib/rppConstants';

const DEPARTMENT_ROUTES = RPP_DEPARTMENTS.reduce((acc, d) => {
  acc[d.name] = d.path;
  acc[d.id] = d.path;
  return acc;
}, {});

/**
 * Execute a list of UI commands.
 * @param {Array} commands - Array of { type, target, data }
 * @param {Object} handlers - { navigate, onShowShelves, onShowFeatured, onTransitionToDesk, onRevealAssignment, onHighlight }
 */
export function executeUICommands(commands, handlers = {}) {
  if (!commands || !Array.isArray(commands)) return;

  const {
    navigate,
    onShowShelves,
    onShowFeatured,
    onTransitionToDesk,
    onRevealAssignment,
    onHighlight,
  } = handlers;

  for (const cmd of commands) {
    if (!cmd?.type) continue;
    switch (cmd.type) {
      case 'navigate':
      case 'navigate_department': {
        const route = DEPARTMENT_ROUTES[cmd.target] || cmd.target;
        if (route && navigate) navigate(route);
        break;
      }
      case 'show_shelves':
        onShowShelves?.(cmd.data);
        break;
      case 'show_featured':
        onShowFeatured?.(cmd.data);
        break;
      case 'transition_to_desk':
        onTransitionToDesk?.();
        break;
      case 'reveal_assignment':
        onRevealAssignment?.(cmd.data);
        break;
      case 'highlight':
        onHighlight?.(cmd.target, cmd.data);
        break;
      // Unknown command types are silently ignored — the Brain decides
      // WHAT happens, the frontend decides HOW. Unknown types mean the
      // frontend doesn't support that command yet.
    }
  }
}

export default { executeUICommands };