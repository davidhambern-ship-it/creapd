/**
 * Controller Registry
 * Maps department names (as returned by the Brain) to their controller modules.
 * This fills the gap where the Brain returns "Topics" but has no way to
 * resolve it to the actual controller file.
 */

import lobbyController from './controllers/lobbyController';
import topicsController from './controllers/topicsController';
import researchController from './controllers/researchController';
import dossierController from './controllers/dossierController';
import developController from './controllers/developController';
import packetController from './controllers/packetController';

export const CONTROLLER_REGISTRY = {
  Lobby: { controller: lobbyController, departmentId: 'lobby' },
  Topics: { controller: topicsController, departmentId: 'topics' },
  Research: { controller: researchController, departmentId: 'research' },
  Dossier: { controller: dossierController, departmentId: 'dossier' },
  Develop: { controller: developController, departmentId: 'develop' },
  Packet: { controller: packetController, departmentId: 'packet' },
};

/**
 * Resolve a department name to its controller.
 * Accepts capitalized ("Topics"), lowercase ("topics"), or null.
 */
export function getController(departmentName) {
  if (!departmentName) return null;
  const key = departmentName.charAt(0).toUpperCase() + departmentName.slice(1).toLowerCase();
  return CONTROLLER_REGISTRY[key] || null;
}

export const VALID_DEPARTMENTS = Object.keys(CONTROLLER_REGISTRY);