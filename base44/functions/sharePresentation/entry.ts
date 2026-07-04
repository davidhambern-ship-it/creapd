import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { presentation_id } = body;

    if (!presentation_id) {
      return Response.json({ error: 'Presentation ID is required' }, { status: 400 });
    }

    // Get the Stories Presentation
    const presentation = await base44.asServiceRole.entities.StoriesPresentation.get(presentation_id);
    if (!presentation) {
      return Response.json({ error: 'Presentation not found' }, { status: 404 });
    }

    if (presentation.status !== 'approved') {
      return Response.json({ error: 'Presentation must be approved before sharing' }, { status: 400 });
    }

    // Check if already shared
    const existing = await base44.asServiceRole.entities.ShowcaseProduction.filter(
      { source_production_id: presentation_id, source_type: 'stories_presentation' },
      '-created_date',
      1
    );
    if (existing.length > 0) {
      return Response.json({
        status: 'existing',
        message: 'This presentation has already been shared to CREAPD Showcase',
        showcase: {
          id: existing[0].id,
          title: existing[0].title,
          showcase_thumbnail_url: existing[0].showcase_thumbnail_url,
          status: existing[0].status
        }
      });
    }

    // Format runtime
    const totalSec = Math.floor((presentation.total_runtime_ms || 0) / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const runtime = `${min}:${sec.toString().padStart(2, '0')}`;

    // Generate CREAPD-branded showcase thumbnail placeholder
    const showcaseThumbnail = `https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&h=450&fit=crop&auto=format&q=80`;

    // Create ShowcaseProduction record
    const showcase = await base44.asServiceRole.entities.ShowcaseProduction.create({
      title: presentation.title,
      description: `${presentation.production_profile} presentation with ${presentation.story_count} stories. Runtime: ${runtime}`,
      production_profile: presentation.production_profile,
      runtime,
      creator_name: user.full_name || user.email,
      creator_id: user.id,
      source_production_id: presentation_id,
      source_type: 'stories_presentation',
      showcase_thumbnail_url: showcaseThumbnail,
      shared_date: new Date().toISOString(),
      is_public: true,
      status: 'approved',
      view_count: 0,
      like_count: 0
    });

    // Update presentation showcase status
    await base44.asServiceRole.entities.StoriesPresentation.update(presentation_id, {
      showcase_status: 'showcased'
    });

    return Response.json({
      status: 'success',
      message: 'Presentation shared to CREAPD Showcase',
      showcase: {
        id: showcase.id,
        title: showcase.title,
        production_profile: showcase.production_profile,
        showcase_thumbnail_url: showcase.showcase_thumbnail_url,
        status: showcase.status
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});