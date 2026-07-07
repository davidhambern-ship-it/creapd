/**
 * Lobby Department Controller
 *
 * Handles navigation, orientation, and "where am I / what's next" requests.
 * This is the default fallback controller when no specific department
 * matches the producer's intent.
 */

import { deriveResearchPOCStage } from '@/lib/pocStageTracker';

export async function handleDepartmentRequest({
  producer,
  creapSettings,
  showProfile,
  productionProfile,
  department,
  projectState,
  conversationHistory,
  userMessage,
  intent,
  context,
}) {
  const pocState = deriveResearchPOCStage({
    config: projectState,
    topics: context?.topics || [],
    points: context?.points || [],
    packages: context?.packages || [],
    dossiers: context?.dossiers || [],
  });

  const firstName = (producer?.full_name || 'there').split(' ')[0];

  let message = '';
  let nextDept = null;

  if (!projectState?.production_name) {
    message = `${firstName}, we need to configure your research production first. Head to Configuration to set parameters.`;
    nextDept = null;
  } else if (pocState?.pendingAction) {
    message = `You're at ${pocState.stageInfo.name}. ${pocState.pendingAction}`;
    nextDept = _departmentForRoute(pocState.nextRoute);
  } else {
    message = `Welcome to the Research Production lobby, ${firstName}. What would you like to work on?`;
  }

  return {
    message_to_user: message,
    department_result: {
      poc_stage: pocState?.stage,
      poc_stage_name: pocState?.stageInfo?.name,
      pending_action: pocState?.pendingAction,
      next_route: pocState?.nextRoute,
    },
    workflow_updates: {},
    ui_commands: pocState?.nextRoute
      ? [{ type: 'navigate', target: pocState.nextRoute }]
      : [],
    events: [],
    next_recommended_department: nextDept,
    requires_user_approval: false,
  };
}

function _departmentForRoute(route) {
  const map = {
    '/research': 'Lobby',
    '/research/topics': 'Topics',
    '/research/manager': 'Research',
    '/research/dossier': 'Dossier',
    '/research/assets': 'Develop',
    '/research/export': 'Packet',
  };
  return map[route] || null;
}

export default { handleDepartmentRequest };