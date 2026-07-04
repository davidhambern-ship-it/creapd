import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      source_production_id,
      source_type,
      title,
      description,
      production_profile,
      runtime,
      original_thumbnail_url
    } = body;

    if (!source_production_id || !title || !production_profile) {
      return Response.json({ error: 'source_production_id, title, and production_profile are required' }, { status: 400 });
    }

    // Check if already shared by this user
    const existing = await base44.asServiceRole.entities.ShowcaseProduction.filter({
      source_production_id,
      creator_id: user.id
    });

    if (existing.length > 0) {
      return Response.json({ success: false, error: 'This production has already been shared with CREAPD.' }, { status: 409 });
    }

    // Generate a CREAPD-branded showcase thumbnail
    const profileLabel = production_profile.charAt(0).toUpperCase() + production_profile.slice(1);
    const thumbnailPrompt = `Create a premium cinematic showcase thumbnail for a ${profileLabel} production.
Dark charcoal and black background with subtle orange-to-purple gradient glow.
Modern production-studio aesthetic with glass panel textures and soft neon lighting.
High-quality, polished, broadcast-ready visual composition.
No text, no letters, no words — purely a visual background suitable for overlaying text later.
Aspect ratio 16:9, cinematic lighting, depth of field.`;

    let showcaseThumbnailUrl = original_thumbnail_url || '';
    try {
      const imgResult = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt: thumbnailPrompt });
      showcaseThumbnailUrl = imgResult?.url || imgResult?.data?.url || showcaseThumbnailUrl;
    } catch (imgErr) {
      console.error('Showcase thumbnail generation failed, using original:', imgErr.message);
    }

    const showcase = await base44.asServiceRole.entities.ShowcaseProduction.create({
      title,
      description: description || '',
      production_profile,
      runtime: runtime || '',
      creator_name: user.full_name || user.email || 'Anonymous Creator',
      creator_id: user.id,
      source_production_id,
      source_type: source_type || 'production_package',
      showcase_thumbnail_url: showcaseThumbnailUrl,
      original_thumbnail_url: original_thumbnail_url || '',
      shared_date: new Date().toISOString(),
      is_featured: false,
      is_public: true,
      view_count: 0,
      like_count: 0,
      status: 'approved'
    });

    return Response.json({ success: true, showcase });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});