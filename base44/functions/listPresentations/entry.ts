import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load presentations via service role — backend functions create these as
    // service-owned records, so user-scoped queries return empty (RLS).
    const presentations = await base44.asServiceRole.entities.StoriesPresentation.list('-created_date', 50);
    return Response.json({ presentations });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});