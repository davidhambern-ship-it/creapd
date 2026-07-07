/**
 * Research Department Controller
 *
 * Handles requests to gather facts, sources, or perform deep research.
 * Delegates to the deepResearchV2 backend function.
 *
 * Future-ready placeholder: the full specialist pipeline (discovery,
 * organization, critical analysis) will be orchestrated here.
 */

import { base44 } from '@/api/base44Client';

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
  const topicId = context?.activeTopicId || projectState?.activeTopicId;

  if (!topicId) {
    return {
      message_to_user: "I need a research topic before I can dig in. Let's define one in the Topics department first.",
      department_result: { status: 'no_topic' },
      workflow_updates: {},
      ui_commands: [{ type: 'navigate_department', target: 'Topics' }],
      events: [],
      next_recommended_department: 'Topics',
      requires_user_approval: false,
    };
  }

  const researchDepth = projectState?.research_depth || 'standard';

  // Fire the deep research pipeline (fire-and-forget — runs in background)
  try {
    await base44.functions.invoke('deepResearchV2', {
      topic_id: topicId,
      research_depth: researchDepth,
    });
  } catch (err) {
    return {
      message_to_user: `I tried to launch the research pipeline but something went wrong: ${err.message}. You can retry from the Research Manager.`,
      department_result: { topic_id: topicId, status: 'failed', error: err.message },
      workflow_updates: {},
      ui_commands: [{ type: 'navigate_department', target: 'Research' }],
      events: [{ type: 'research_failed', topic_id: topicId, error: err.message, timestamp: new Date().toISOString() }],
      next_recommended_department: 'Research',
      requires_user_approval: false,
    };
  }

  return {
    message_to_user: `Researching now. I've kicked off the deep research pipeline — discovery, organization, and critical analysis are running. Check the Research Manager for live progress.`,
    department_result: {
      topic_id: topicId,
      research_depth: researchDepth,
      status: 'initiated',
    },
    workflow_updates: {
      research_status: 'initiated',
      topic_id: topicId,
    },
    ui_commands: [{ type: 'navigate_department', target: 'Research' }],
    events: [
      {
        type: 'research_initiated',
        topic_id: topicId,
        research_depth: researchDepth,
        timestamp: new Date().toISOString(),
      },
    ],
    next_recommended_department: 'Research',
    requires_user_approval: false,
  };
}

export default { handleDepartmentRequest };