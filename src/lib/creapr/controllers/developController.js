/**
 * Develop Department Controller
 *
 * Handles requests to create scripts, prompts, media concepts,
 * and production assets from approved dossier content.
 * Invokes the generateProductionPackage backend function.
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
  const approvedPoints = (context?.points || []).filter(
    p => p.status === 'approved' || p.status === 'used'
  );

  if (approvedPoints.length === 0) {
    return {
      message_to_user: "No approved research points to develop yet. Approve points in the Dossier room first.",
      department_result: { status: 'no_approved_points' },
      workflow_updates: {},
      ui_commands: [{ type: 'navigate_department', target: 'Dossier' }],
      events: [],
      next_recommended_department: 'Dossier',
      requires_user_approval: false,
    };
  }

  // Generate production packages for approved points (fire-and-forget)
  let generatedCount = 0;
  let errors = [];

  for (const point of approvedPoints.slice(0, 10)) {
    try {
      await base44.functions.invoke('generateProductionPackage', {
        source_entity_type: 'ResearchPoint',
        source_entity_id: point.id,
      });
      generatedCount++;
    } catch (err) {
      errors.push({ point_id: point.id, error: err.message });
    }
  }

  const message = errors.length > 0
    ? `Generated ${generatedCount} of ${approvedPoints.length} packages. ${errors.length} failed. Check the Development Studio for details.`
    : `${approvedPoints.length} approved points ready. I've generated ${generatedCount} production packages — scripts, talking points, and visual concepts. Head to the Development Studio to review.`;

  return {
    message_to_user: message,
    department_result: {
      approved_points_count: approvedPoints.length,
      packages_generated: generatedCount,
      errors: errors,
      status: errors.length > 0 ? 'partial' : 'ready',
    },
    workflow_updates: { packages_generated: generatedCount },
    ui_commands: [{ type: 'navigate_department', target: 'Develop' }],
    events: [
      {
        type: 'packages_generated',
        count: generatedCount,
        errors: errors.length,
        timestamp: new Date().toISOString(),
      },
    ],
    next_recommended_department: 'Develop',
    requires_user_approval: false,
  };
}

export default { handleDepartmentRequest };