import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const existing = await base44.entities.ProductionProfile.list();
    if (existing.length > 0) {
      return Response.json({ message: 'Profiles already exist', count: existing.length });
    }

    const profiles = [
      {
        profile_key: 'news',
        profile_name: 'News Production',
        description: 'Professional news broadcast production',
        item_singular: 'Story',
        item_plural: 'Stories',
        icon: 'Newspaper',
        color: 'berna-purple',
        is_implemented: true,
        setup_fields: JSON.stringify([
          { key: 'show_name', label: 'Show Name', type: 'text', required: true },
          { key: 'broadcast_date', label: 'Broadcast Date', type: 'date', required: true },
          { key: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Conversational', 'Urgent'], default: 'Professional' },
          { key: 'runtime', label: 'Runtime', type: 'select', options: ['15 Minutes', '30 Minutes', '60 Minutes'], default: '30 Minutes' }
        ]),
        dashboard_widgets: JSON.stringify([]),
        sidebar_items: JSON.stringify([]),
        research_modules: JSON.stringify([]),
        content_item_types: JSON.stringify([]),
        generated_assets: JSON.stringify([]),
        export_options: JSON.stringify([])
      },
      {
        profile_key: 'music',
        profile_name: 'Music Show',
        description: 'Radio show or music program production',
        item_singular: 'Song',
        item_plural: 'Songs',
        icon: 'Music',
        color: 'berna-orange',
        is_implemented: true,
        setup_fields: JSON.stringify([
          { key: 'show_name', label: 'Show Name', type: 'text', required: true },
          { key: 'total_runtime', label: 'Total Runtime', type: 'select', options: ['30 Minutes', '60 Minutes', '90 Minutes'], default: '60 Minutes' },
          { key: 'music_runtime', label: 'Music Runtime', type: 'select', options: ['20 Minutes', '40 Minutes', '60 Minutes'], default: '40 Minutes' },
          { key: 'genres', label: 'Genres', type: 'text', required: false }
        ]),
        dashboard_widgets: JSON.stringify([]),
        sidebar_items: JSON.stringify([]),
        research_modules: JSON.stringify([]),
        content_item_types: JSON.stringify([]),
        generated_assets: JSON.stringify([]),
        export_options: JSON.stringify([])
      },
      {
        profile_key: 'cooking',
        profile_name: 'Cooking Show',
        description: 'Culinary production with recipe management',
        item_singular: 'Recipe',
        item_plural: 'Recipes',
        icon: 'ChefHat',
        color: 'berna-emerald',
        is_implemented: true,
        setup_fields: JSON.stringify([
          { key: 'show_name', label: 'Show Name', type: 'text', required: true },
          { key: 'total_runtime', label: 'Total Runtime', type: 'select', options: ['15 Minutes', '30 Minutes', '45 Minutes'], default: '30 Minutes' },
          { key: 'cuisine_type', label: 'Cuisine Type', type: 'text', required: false },
          { key: 'number_of_recipes', label: 'Number of Recipes', type: 'select', options: ['1', '2', '3', '4'], default: '2' }
        ]),
        dashboard_widgets: JSON.stringify([]),
        sidebar_items: JSON.stringify([]),
        research_modules: JSON.stringify([]),
        content_item_types: JSON.stringify([]),
        generated_assets: JSON.stringify([]),
        export_options: JSON.stringify([])
      }
    ];

    await base44.entities.ProductionProfile.bulkCreate(profiles);

    return Response.json({ message: 'Profiles seeded successfully', count: profiles.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});