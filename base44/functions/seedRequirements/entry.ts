import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const existing = await base44.asServiceRole.entities.RequirementItem.list();
    if (existing.length > 0) {
      return Response.json({ message: 'Requirements already seeded', count: existing.length });
    }

    const functional = [
      { category: 'Account Management', items: [
        'Allow users to register and create accounts',
        'Support secure authentication',
        'Support multiple Workspaces',
        'Support Organizations and Teams',
        'Support role-based permissions',
        'Allow users to manage personal profiles',
      ]},
      { category: 'Dashboard', items: [
        'Display active productions',
        'Display recent productions',
        'Display notifications',
        'Display saved briefings',
        'Display favorite Brand Profiles',
        'Display favorite Show Profiles',
      ]},
      { category: 'Briefing Center', items: [
        'Generate Daily Briefings',
        'Generate Weekly Briefings',
        'Generate Breaking News Briefings',
        'Generate Custom Briefings',
        'Organize stories into categories',
        'Support searching and filtering',
        'Preserve source attribution',
      ]},
      { category: 'Story Manager', items: [
        'Manage Story Cards',
        'Support story selection',
        'Support production rundowns',
        'Support story reordering',
        'Support production status tracking',
        'Support production notes',
      ]},
      { category: 'Production Package Generator', items: [
        'Generate teleprompter scripts',
        'Generate story summaries',
        'Generate talking points',
        'Generate lower thirds',
        'Generate AI images',
        'Generate image prompts',
        'Generate thumbnail images',
        'Generate social media captions',
        'Generate visual production suggestions',
        'Generate B-roll suggestions',
        'Generate fact-check notes',
        'Generate source references',
      ]},
      { category: 'AI Services', items: [
        'Support multiple AI providers',
        'Support provider switching',
        'Support direct AI image generation',
        'Support reusable prompt templates',
        'Support future AI integrations',
      ]},
      { category: 'Template Library', items: [
        'Upload templates',
        'Store templates',
        'Categorize templates',
        'Preview templates',
        'Apply templates',
        'Preserve uploaded branding',
      ]},
      { category: 'Brand Profiles', items: [
        'Create Brand Profiles',
        'Edit Brand Profiles',
        'Delete Brand Profiles',
        'Store branding assets',
        'Assign default templates',
      ]},
      { category: 'Show Profiles', items: [
        'Create Show Profiles',
        'Store production defaults',
        'Configure AI preferences',
        'Configure export preferences',
      ]},
      { category: 'Export Center', items: [
        'Export complete productions',
        'Export individual assets',
        'Export teleprompter scripts',
        'Export graphics',
        'Export AI-generated images',
        'Support reusable Export Profiles',
      ]},
      { category: 'Settings', items: [
        'Configure AI providers',
        'Configure notifications',
        'Configure exports',
        'Configure security',
        'Configure appearance',
        'Configure storage',
      ]},
    ];

    const nonFunctional = [
      { category: 'Usability', items: [
        'Interface is intuitive',
        'Minimize unnecessary clicks',
        'Present information clearly',
        'Reduce learning time',
        'Support efficient workflows',
      ]},
      { category: 'Performance', items: [
        'Respond quickly to user actions',
        'Remain responsive during AI generation',
        'Support large productions',
        'Support large asset libraries',
        'Scale efficiently',
      ]},
      { category: 'Reliability', items: [
        'Automatically save work',
        'Recover from interruptions',
        'Protect user data',
        'Maintain production history',
        'Support reliable synchronization',
      ]},
      { category: 'Security', items: [
        'Protect user accounts',
        'Protect connected services',
        'Support secure authentication',
        'Protect production assets',
        'Support role-based permissions',
      ]},
      { category: 'Privacy', items: [
        'Respect user ownership',
        'Allow privacy configuration',
        'Provide transparent AI usage',
        'Protect personal information',
      ]},
      { category: 'Accessibility', items: [
        'Support keyboard navigation',
        'Support screen readers',
        'Support scalable text',
        'Support high-contrast interfaces',
        'Maintain accessible layouts',
      ]},
      { category: 'Scalability', items: [
        'Support growing organizations',
        'Support growing user bases',
        'Support growing production libraries',
        'Support growing AI providers',
        'Support growing production complexity',
      ]},
      { category: 'Maintainability', items: [
        'Support modular development',
        'Allow future expansion',
        'Minimize feature dependencies',
        'Support new AI providers',
        'Support additional production asset types',
      ]},
    ];

    const acceptance = [
      { category: 'User Accounts', items: [
        'A user can create an account',
        'A user can sign in securely',
        'A user can recover account access',
        'User information persists between sessions',
      ]},
      { category: 'Briefing Generation', items: [
        'A producer can generate a briefing',
        'Stories are organized logically',
        'Source attribution is displayed',
        'Stories may be searched and filtered',
        'Stories may be selected',
      ]},
      { category: 'Story Management', items: [
        'Selected stories appear in the Story Manager',
        'Stories may be reordered',
        'Stories may contain notes',
        'Production status updates correctly',
      ]},
      { category: 'Production Packages', items: [
        'Every selected story can generate a Production Package',
        'Each asset remains editable',
        'Each asset can be regenerated independently',
        'Producer edits are preserved',
      ]},
      { category: 'AI Image Generation', items: [
        'A producer can select an AI provider',
        'Producer generates images directly inside the application',
        'Images may be regenerated',
        'Images may be exported',
        'Previously generated images remain available until removed by the producer',
      ]},
      { category: 'Script Generation', items: [
        'Scripts respect selected tone',
        'Scripts respect selected runtime',
        'Scripts remain editable',
        'Scripts preserve formatting during export',
      ]},
      { category: 'Templates', items: [
        'Templates upload successfully',
        'Templates preserve layout',
        'Placeholders populate correctly',
        'Templates remain reusable',
      ]},
      { category: 'Brand Profiles', items: [
        'Brand assets remain consistent',
        'Brand switching updates production assets',
        'Scripts remain unchanged unless edited',
      ]},
      { category: 'Show Profiles', items: [
        'Selecting a Show Profile automatically configures production defaults',
        'Defaults may be overridden',
        'Show settings persist between productions',
      ]},
      { category: 'Export', items: [
        'Productions export successfully',
        'Assets export individually',
        'Formatting is preserved',
        'Branding is preserved',
        'Export history is recorded',
      ]},
      { category: 'Collaboration', items: [
        'Permissions function correctly',
        'Multiple users can collaborate',
        'Activity history records production changes',
        'Shared productions synchronize correctly',
      ]},
      { category: 'Security', items: [
        'Unauthorized users cannot access protected content',
        'Connected services remain secure',
        'Sessions may be managed',
        'Authentication functions correctly',
      ]},
      { category: 'Reliability', items: [
        'Auto Save functions continuously',
        'Recovery restores unfinished work',
        'No production data is lost during normal operation',
      ]},
    ];

    const allRecords = [];
    let sortOrder = 0;

    for (const group of functional) {
      for (const item of group.items) {
        allRecords.push({
          requirement_type: 'functional',
          category: group.category,
          requirement_text: item,
          status: 'in_progress',
          sort_order: sortOrder++,
        });
      }
    }
    for (const group of nonFunctional) {
      for (const item of group.items) {
        allRecords.push({
          requirement_type: 'non_functional',
          category: group.category,
          requirement_text: item,
          status: 'in_progress',
          sort_order: sortOrder++,
        });
      }
    }
    for (const group of acceptance) {
      for (const item of group.items) {
        allRecords.push({
          requirement_type: 'acceptance',
          category: group.category,
          requirement_text: item,
          status: 'in_progress',
          sort_order: sortOrder++,
        });
      }
    }

    await base44.asServiceRole.entities.RequirementItem.bulkCreate(allRecords);

    return Response.json({ message: 'Requirements seeded successfully', count: allRecords.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});