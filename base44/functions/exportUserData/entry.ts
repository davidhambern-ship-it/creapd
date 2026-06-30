import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const entityNames = [
      'Article', 'Briefing', 'ProductionPackage', 'Production',
      'BrandProfile', 'ShowProfile', 'ImageAsset', 'PromptTemplate',
      'ProductionTemplate', 'BriefingTemplate', 'ExportProfile', 'Source',
      'ProducerSettings', 'ProducerPreferences', 'WeeklyPlan', 'DayPlan',
      'ProducerNote', 'DirectionChange'
    ];

    const exportData = {
      user: { id: user.id, email: user.email, full_name: user.full_name },
      exported_at: new Date().toISOString(),
      data: {}
    };

    for (const name of entityNames) {
      try {
        const items = await base44.entities[name].list('-created_date', 500);
        exportData.data[name] = items;
      } catch (e) {
        exportData.data[name] = { error: e.message };
      }
    }

    return Response.json(exportData);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});