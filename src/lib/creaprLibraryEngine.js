/**
 * Backward-compatible re-export.
 *
 * The CREAPr Library engine logic has been refactored into the
 * Topics Department Controller at:
 *   src/lib/creapr/controllers/topicsController.js
 *
 * This shim preserves existing imports:
 *   import { generateGreeting, processProducerInput, buildResearchTopicData } from '@/lib/creaprLibraryEngine';
 *
 * New code should import directly from the controller or the Brain:
 *   import { runCreaprBrain } from '@/lib/creapr/creaprBrain';
 *   import { handleDepartmentRequest } from '@/lib/creapr/controllers/topicsController';
 */

export {
  generateGreeting,
  processProducerInput,
  buildResearchTopicData,
} from '@/lib/creapr/controllers/topicsController';