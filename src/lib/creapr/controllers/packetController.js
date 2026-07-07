/**
 * Packet Department Controller
 *
 * Handles requests to assemble, export, review, or finalize
 * the complete production deliverable.
 * Invokes the createExportJob backend function.
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
  const packages = context?.packages || [];
  const approvedPackages = packages.filter(
    p => p.status === 'approved' || p.status === 'finalized'
  );

  if (packages.length === 0) {
    return {
      message_to_user: "No production packages to assemble yet. Generate packages in the Development Studio first.",
      department_result: { status: 'no_packages' },
      workflow_updates: {},
      ui_commands: [{ type: 'navigate_department', target: 'Develop' }],
      events: [],
      next_recommended_department: 'Develop',
      requires_user_approval: false,
    };
  }

  if (approvedPackages.length === 0) {
    return {
      message_to_user: `${packages.length} package${packages.length > 1 ? 's' : ''} drafted but none approved yet. Review and approve packages before assembling the final packet.`,
      department_result: { status: 'needs_approval', packages_count: packages.length },
      workflow_updates: {},
      ui_commands: [{ type: 'navigate_department', target: 'Develop' }],
      events: [],
      next_recommended_department: 'Develop',
      requires_user_approval: false,
    };
  }

  // Kick off the export job (fire-and-forget)
  const packageIds = approvedPackages.map(p => p.id);
  let exportStatus = 'initiated';
  let exportError = null;

  try {
    await base44.functions.invoke('createExportJob', {
      package_ids: packageIds,
      format: 'json',
    });
  } catch (err) {
    exportStatus = 'failed';
    exportError = err.message;
  }

  const message = exportStatus === 'failed'
    ? `I tried to assemble the final packet but something went wrong: ${exportError}. You can retry from the Assembly Office.`
    : `${approvedPackages.length} approved package${approvedPackages.length > 1 ? 's' : ''} ready. I've kicked off the export job — the final Production Packet is being assembled. Head to the Assembly Office to download it.`;

  return {
    message_to_user: message,
    department_result: {
      approved_packages_count: approvedPackages.length,
      export_status: exportStatus,
      export_error: exportError,
      status: exportStatus === 'failed' ? 'failed' : 'ready',
    },
    workflow_updates: { export_status: exportStatus },
    ui_commands: [{ type: 'navigate_department', target: 'Packet' }],
    events: [
      {
        type: 'export_initiated',
        package_count: approvedPackages.length,
        status: exportStatus,
        timestamp: new Date().toISOString(),
      },
    ],
    next_recommended_department: 'Packet',
    requires_user_approval: true,
  };
}

export default { handleDepartmentRequest };