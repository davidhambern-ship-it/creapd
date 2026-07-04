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

    // Verify the presentation exists
    const presentation = await base44.asServiceRole.entities.StoriesPresentation.get(presentation_id);
    if (!presentation) {
      return Response.json({ error: 'Presentation not found' }, { status: 404 });
    }

    // Check for existing active export job (prevent duplicates)
    const existingJobs = await base44.asServiceRole.entities.ExportJob.filter(
      { presentation_id, requested_by: user.id },
      '-created_date',
      5
    );
    const activeJob = existingJobs.find(j => j.status === 'queued' || j.status === 'rendering');
    if (activeJob) {
      return Response.json({
        status: 'existing',
        message: 'An export job is already active for this presentation',
        export_job: {
          id: activeJob.id,
          status: activeJob.status,
          progress: activeJob.progress,
          created_date: activeJob.created_date
        }
      });
    }

    // Create the export job
    const exportJob = await base44.asServiceRole.entities.ExportJob.create({
      presentation_id,
      job_type: 'mp4',
      status: 'queued',
      requested_by: user.id,
      progress: 0,
      export_metadata: JSON.stringify({
        resolution: '1920x1080',
        format: 'mp4',
        frame_rate: 30,
        renderer: 'pending_implementation',
        presentation_title: presentation.title,
        production_profile: presentation.production_profile,
        total_runtime_ms: presentation.total_runtime_ms
      })
    });

    return Response.json({
      status: 'success',
      message: 'MP4 export job created — renderer pending implementation',
      export_job: {
        id: exportJob.id,
        status: 'queued',
        progress: 0,
        created_date: exportJob.created_date
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});