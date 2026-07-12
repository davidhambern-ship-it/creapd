import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { presentation_id } = body;
    if (!presentation_id) return Response.json({ error: 'presentation_id required' }, { status: 400 });

    // Load presentation (service role — bypasses RLS for service-created records)
    let presentation;
    try {
      presentation = await base44.asServiceRole.entities.StoriesPresentation.get(presentation_id);
    } catch {
      const results = await base44.asServiceRole.entities.StoriesPresentation.filter({ id: presentation_id }, '-created_date', 1);
      presentation = results?.[0];
    }
    if (!presentation) return Response.json({ error: 'Presentation not found' }, { status: 404 });

    // Load slides
    const slideIds = JSON.parse(presentation.slide_order || presentation.story_slide_ids || '[]');
    const slides = [];
    if (slideIds.length > 0) {
      for (const sid of slideIds) {
        try {
          const s = await base44.asServiceRole.entities.StorySlide.get(sid);
          if (s) slides.push(s);
        } catch {
          try {
            const results = await base44.asServiceRole.entities.StorySlide.filter({ id: sid }, 'slide_number', 1);
            if (results?.[0]) slides.push(results[0]);
          } catch {}
        }
      }
    }

    // Load elements for all slides
    const elementsBySlide = {};
    for (const slide of slides) {
      try {
        const els = await base44.asServiceRole.entities.SlideElement.filter({ slide_id: slide.id });
        elementsBySlide[slide.id] = els || [];
      } catch {
        elementsBySlide[slide.id] = [];
      }
    }

    return Response.json({ presentation, slides, elementsBySlide });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});