import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { readProductionCore } from '../../../server/productionCore.js';
import { readTalkStudio, runTalkStudioAction } from '../../../server/talkStudio.js';
import { runTalkResearchStage } from '../../../server/talkResearchEngine.js';
import { runTalkProductionStage } from '../../../server/talkProductionEngine.js';
import {
  isObsBridgeAgentAction,
  runObsBridgeAgentAction,
  runObsBridgeUserAction,
} from '../../../server/obsBridge.js';
import { assembleResearchPresentation } from '../../../server/researchPresentationAssembly.js';
import { runPresentationStudioWorkers } from '../../../server/presentationStudioWorkers.js';
import {
  rewritePresentationStudioText,
  runPresentationStudioQa,
  sharePresentationStudioProject,
} from '../../../server/presentationStudioActions.js';
import {
  handoffPackageToPresentationStudio,
  loadPresentationStudioEditor,
  updateEditorPresentation,
  createEditorSlide,
  updateEditorSlide,
  deleteEditorSlide,
  listEditorElements,
  createEditorElement,
  updateEditorElement,
  deleteEditorElements,
  directPresentationStudioProject,
} from '../../../server/presentationStudio.js';

export const config = {
  // Hobby + Fluid Compute currently supports up to 300 seconds. Talk's
  // checkpointed stages each stay below this ceiling while allowing live web
  // research enough time to finish without an arbitrary 50-second cutoff.
  maxDuration: 300,
};

function safeError(error) {
  return {
    code: error?.code || null,
    message: String(error?.message || 'production_core_request_failed').slice(0, 220),
    ...(error?.details && typeof error.details === 'object' ? { details: error.details } : {}),
  };
}

function success(response, action, payload = {}) {
  return response.status(200).json({
    ok: true,
    service: 'creapd-production-core',
    action,
    source: 'neon',
    data_authority: 'neon',
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

async function handlePost(request, response, sql, ownerUserId, ownerEmail) {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const action = String(body.action || '').trim();

  if (!action) {
    return response.status(400).json({ ok: false, error: 'action_required' });
  }

  try {
    if (action.startsWith('obs_')) {
      const result = await runObsBridgeUserAction({
        sql,
        ownerUserId,
        action,
        body,
      });
      return success(response, action, result);
    }

    // Talk's expensive AI work is deliberately split into separate requests.
    // Research is checkpointed in Neon before the production stage starts, so
    // a later failure can be retried without losing completed intelligence.
    if (action === 'talk_build_research') {
      const result = await runTalkResearchStage({
        sql,
        ownerUserId,
        configurationId: body.configuration_id,
      });
      return success(response, action, { result });
    }

    if (action === 'talk_build_production') {
      const result = await runTalkProductionStage({
        sql,
        ownerUserId,
        configurationId: body.configuration_id,
      });
      return success(response, action, { result });
    }

    if (action.startsWith('talk_')) {
      const result = await runTalkStudioAction({
        sql,
        ownerUserId,
        ownerEmail,
        action,
        body,
      });
      return success(response, action, result);
    }

    switch (action) {
      case 'approve_package_and_handoff': {
        const result = await handoffPackageToPresentationStudio({
          sql,
          ownerUserId,
          packageId: body.package_id,
          approve: true,
        });
        return success(response, action, result);
      }

      case 'handoff_package_to_presentation_studio': {
        const result = await handoffPackageToPresentationStudio({
          sql,
          ownerUserId,
          packageId: body.package_id,
          approve: false,
        });
        return success(response, action, result);
      }

      case 'load_presentation_editor': {
        const result = await loadPresentationStudioEditor({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
        });
        return success(response, action, result);
      }

      case 'list_editor_elements': {
        const elements = await listEditorElements({
          sql,
          ownerUserId,
          slideId: body.slide_id,
        });
        return success(response, action, { elements });
      }

      case 'update_editor_presentation': {
        const result = await updateEditorPresentation({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
          patch: body.patch || {},
        });
        return success(response, action, result);
      }

      case 'create_editor_slide': {
        const result = await createEditorSlide({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
          slide: body.slide || {},
        });
        return success(response, action, { slide: result.result, ...result });
      }

      case 'update_editor_slide': {
        const result = await updateEditorSlide({
          sql,
          ownerUserId,
          slideId: body.slide_id,
          patch: body.patch || {},
        });
        return success(response, action, { slide: result.result, ...result });
      }

      case 'delete_editor_slide': {
        const result = await deleteEditorSlide({
          sql,
          ownerUserId,
          slideId: body.slide_id,
        });
        return success(response, action, result);
      }

      case 'create_editor_element': {
        const result = await createEditorElement({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
          element: body.element || {},
        });
        return success(response, action, { element: result.result, ...result });
      }

      case 'update_editor_element': {
        const result = await updateEditorElement({
          sql,
          ownerUserId,
          elementId: body.element_id,
          patch: body.patch || {},
        });
        return success(response, action, { element: result.result, ...result });
      }

      case 'delete_editor_elements': {
        const result = await deleteEditorElements({
          sql,
          ownerUserId,
          slideId: body.slide_id,
          elementIds: body.element_ids || [],
        });
        return success(response, action, result);
      }

      case 'direct_presentation_studio': {
        const result = await directPresentationStudioProject({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
        });
        return success(response, action, result);
      }

      case 'rewrite_presentation_text': {
        const result = await rewritePresentationStudioText({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
          content: body.content,
        });
        return success(response, action, result);
      }

      case 'run_presentation_qa': {
        const result = await runPresentationStudioQa({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
        });
        return success(response, action, result);
      }

      case 'share_presentation_studio': {
        const result = await sharePresentationStudioProject({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
          visibility: body.visibility || 'team',
        });
        return success(response, action, result);
      }

      case 'delete_presentation_studio': {
        const presentationId = String(body.presentation_id || '').trim();
        if (!presentationId) {
          return response.status(400).json({ ok: false, error: 'presentation_id_required' });
        }

        const deleted = await sql`
          DELETE FROM creapd.presentations
          WHERE id = ${presentationId}
            AND owner_user_id = ${String(ownerUserId)}
          RETURNING id
        `;

        if (!deleted.length) {
          return response.status(404).json({
            ok: false,
            service: 'creapd-production-core',
            action,
            error: 'PRESENTATION_NOT_FOUND',
          });
        }

        return success(response, action, {
          presentation_id: presentationId,
          deleted: true,
        });
      }

      case 'presentation_workers_improve':
      case 'presentation_workers_review': {
        const workerAction = action === 'presentation_workers_improve' ? 'improve' : 'review';
        const result = await runPresentationStudioWorkers({
          sql,
          ownerUserId,
          presentationId: body.presentation_id,
          action: workerAction,
          presentationData: body.presentation_data || {},
          revisionContext: body.revision_context || null,
          revisionCount: body.revision_count || 0,
        });
        return success(response, action, result);
      }

      // Temporary compatibility action. New CREAPD architecture hands approved
      // Production Packages to the Presentation Studio and directs them there.
      case 'assemble_research_presentation': {
        const result = await assembleResearchPresentation({
          sql,
          ownerUserId,
          configurationId: body.configuration_id || body.config_id,
        });

        return success(response, action, {
          presentation: result.presentation,
          configuration: result.configuration,
          package_count: result.packages.length,
          compatibility_path: true,
        });
      }

      default:
        return response.status(400).json({ ok: false, error: 'unsupported_action' });
    }
  } catch (error) {
    const status = Number(error?.status || 0);
    if ([400, 404, 409].includes(status)) {
      return response.status(status).json({
        ok: false,
        service: 'creapd-production-core',
        action,
        error: error.code || 'production_core_action_failed',
        diagnostic: safeError(error),
        timestamp: new Date().toISOString(),
      });
    }
    throw error;
  }
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!['GET', 'POST'].includes(request.method)) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!hasDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-production-core',
      error: 'database_not_configured',
    });
  }

  try {
    const sql = getSql();

    // The desktop/local OBS bridge cannot reuse a browser login session. It
    // authenticates with a one-time-shown, hashed device token and only gets
    // access to its own heartbeat/command queue operations. Keeping this on the
    // existing Production Core route avoids another Vercel function.
    if (request.method === 'POST') {
      const body = request.body && typeof request.body === 'object' ? request.body : {};
      const action = String(body.action || '').trim();
      if (isObsBridgeAgentAction(action)) {
        const result = await runObsBridgeAgentAction({ sql, action, body });
        return success(response, action, result);
      }
    }

    const { user } = await requireCreapdUser(request);
    const ownerUserId = String(user.id);

    if (request.method === 'POST') {
      return await handlePost(request, response, sql, ownerUserId, user.email || null);
    }

    if (String(request.query?.studio || '').toLowerCase() === 'talk') {
      const talkData = await readTalkStudio(sql, ownerUserId, request.query?.configuration_id);
      return success(response, 'talk_read', talkData);
    }

    const data = await readProductionCore(sql, ownerUserId, {
      limit: request.query?.limit,
    });

    return response.status(200).json({
      ok: true,
      service: 'creapd-production-core',
      source: 'neon',
      data_authority: 'neon',
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if ([400, 401, 403, 404, 409].includes(error?.status)) {
      return response.status(error.status).json({
        ok: false,
        service: 'creapd-production-core',
        error: error.code || 'authentication_required',
        diagnostic: safeError(error),
      });
    }

    console.error('[CREAPD PRODUCTION CORE]', error);
    return response.status(503).json({
      ok: false,
      service: 'creapd-production-core',
      error: 'production_core_request_failed',
      diagnostic: safeError(error),
      timestamp: new Date().toISOString(),
    });
  }
}
