import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { handleUpload } from '@vercel/blob/client';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { requireCreapdUser } from '../../../server/creapdUser.js';
import { readProductionCore } from '../../../server/productionCore.js';
import { readTalkStudio, runTalkStudioAction } from '../../../server/talkStudio.js';
import { readMusicStudio, readMusicStatus, runMusicStudioAction } from '../../../server/musicStudio.js';
import { readTalkLiveState } from '../../../server/talkLiveState.js';
import { runTalkResearchStage } from '../../../server/talkResearchEngine.js';
import { runTalkProductionStage } from '../../../server/talkProductionEngine.js';
import { generateTalkImages } from '../../../server/talkMedia.js';
import {
  isObsBridgeAgentAction,
  runObsBridgeAgentAction,
  runObsBridgeUserAction,
} from '../../../server/obsBridge.js';
import { assembleResearchPresentation } from '../../../server/researchPresentationAssembly.js';
import {
  listImageAssets,
  createImageAsset,
  updateImageAsset,
  deleteImageAsset,
  listRegistryAssets,
  createRegistryAsset,
  updateRegistryAsset,
  deleteRegistryAsset,
} from '../../../server/assetLibrary.js';
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
  maxDuration: 300,
};


const OBS_MEDIA_TICKET_TTL_MS = 15 * 60 * 1000;
const OBS_IMAGE_MAX_BYTES = 40 * 1024 * 1024;
const OBS_VIDEO_MAX_BYTES = 1024 * 1024 * 1024;
const OBS_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
]);
const OBS_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
  'video/mpeg',
]);

function safeObsUploadText(value, max = 300) {
  return String(value || '').trim().slice(0, max);
}

function obsMediaTicketSecret() {
  const secret = String(
    process.env.CREAPD_UPLOAD_SIGNING_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    '',
  ).trim();

  if (!secret) {
    const error = new Error('OBS media upload signing is not configured');
    error.code = 'OBS_UPLOAD_SIGNING_NOT_CONFIGURED';
    throw error;
  }

  return secret;
}

function obsAllowedMediaType(contentType) {
  if (OBS_IMAGE_TYPES.has(contentType)) {
    return { kind: 'image', maxBytes: OBS_IMAGE_MAX_BYTES };
  }
  if (OBS_VIDEO_TYPES.has(contentType)) {
    return { kind: 'video', maxBytes: OBS_VIDEO_MAX_BYTES };
  }
  return null;
}

function obsMediaExtension(filename, contentType) {
  const match = String(filename || '').toLowerCase().match(/\.([a-z0-9]{2,6})$/);
  if (match) return match[1];

  const map = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-m4v': 'm4v',
    'video/mpeg': 'mpeg',
  };

  return map[contentType] || 'bin';
}

function signObsMediaTicket(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', obsMediaTicketSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifyObsMediaTicket(ticket) {
  const [encoded, suppliedSignature] = String(ticket || '').split('.');
  if (!encoded || !suppliedSignature) {
    const error = new Error('Invalid OBS upload ticket');
    error.code = 'OBS_UPLOAD_TICKET_INVALID';
    throw error;
  }

  const expectedSignature = createHmac('sha256', obsMediaTicketSecret())
    .update(encoded)
    .digest('base64url');

  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    const error = new Error('Invalid OBS upload ticket');
    error.code = 'OBS_UPLOAD_TICKET_INVALID';
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    const error = new Error('Invalid OBS upload ticket payload');
    error.code = 'OBS_UPLOAD_TICKET_INVALID';
    throw error;
  }

  if (
    !['creapd_obs_media', 'creapd_asset_media'].includes(payload?.purpose) ||
    !payload?.ownerUserId ||
    !payload?.pathname ||
    !payload?.contentType ||
    Number(payload?.expiresAt || 0) < Date.now()
  ) {
    const error = new Error('Expired or invalid OBS upload ticket');
    error.code = 'OBS_UPLOAD_TICKET_EXPIRED';
    throw error;
  }

  return payload;
}

function authorizeObsMediaUpload(response, ownerUserId, body, options = {}) {
  const filename = safeObsUploadText(body.filename, 240);
  const contentType = safeObsUploadText(body.content_type, 120).toLowerCase();
  const byteSize = Number(body.byte_size || 0);
  const allowed = obsAllowedMediaType(contentType);

  if (!filename || !allowed) {
    return response.status(400).json({ ok: false, error: 'unsupported_obs_media_type' });
  }

  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > allowed.maxBytes) {
    return response.status(400).json({
      ok: false,
      error: 'obs_media_size_invalid',
      max_bytes: allowed.maxBytes,
    });
  }

  const extension = obsMediaExtension(filename, contentType);
  const safeOwner = String(ownerUserId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const purpose = options.purpose || 'creapd_obs_media';
  const folder = options.folder || 'obs';
  const pathname = [
    'creapd',
    folder,
    safeOwner,
    `${Date.now()}-${randomUUID()}.${extension}`,
  ].join('/');

  const expiresAt = Date.now() + OBS_MEDIA_TICKET_TTL_MS;
  const ticket = signObsMediaTicket({
    purpose,
    ownerUserId: String(ownerUserId),
    pathname,
    contentType,
    maxBytes: Math.round(byteSize),
    kind: allowed.kind,
    expiresAt,
  });

  return response.status(200).json({
    ok: true,
    service: 'creapd-production-core',
    action: options.action || 'director_media_upload_authorize',
    pathname,
    upload_ticket: ticket,
    content_type: contentType,
    media_kind: allowed.kind,
    max_bytes: allowed.maxBytes,
    valid_until: new Date(expiresAt).toISOString(),
  });
}

async function handleObsMediaClientUpload(request, response, body) {
  const result = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      let payload = null;
      try {
        payload = clientPayload ? JSON.parse(clientPayload) : null;
      } catch {
        payload = null;
      }

      const ticket = verifyObsMediaTicket(payload?.ticket);
      if (String(pathname) !== String(ticket.pathname)) {
        const error = new Error('OBS upload pathname does not match its ticket');
        error.code = 'OBS_UPLOAD_PATH_MISMATCH';
        throw error;
      }

      const allowed = obsAllowedMediaType(ticket.contentType);
      if (!allowed) {
        const error = new Error('OBS upload content type is no longer allowed');
        error.code = 'OBS_UPLOAD_TYPE_INVALID';
        throw error;
      }

      return {
        allowedContentTypes: [ticket.contentType],
        maximumSizeInBytes: Math.min(
          allowed.maxBytes,
          Math.max(1, Number(ticket.maxBytes || allowed.maxBytes)),
        ),
        addRandomSuffix: false,
        tokenPayload: JSON.stringify({
          ownerUserId: ticket.ownerUserId,
          pathname: ticket.pathname,
          contentType: ticket.contentType,
          kind: ticket.kind,
        }),
      };
    },
    onUploadCompleted: async ({ blob }) => {
      console.info('[CREAPD OBS MEDIA UPLOAD COMPLETE]', {
        pathname: blob?.pathname || null,
        url: blob?.url || null,
      });
    },
  });

  return response.status(200).json(result);
}

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
    if (action === 'director_media_upload_authorize') {
      return authorizeObsMediaUpload(response, ownerUserId, body);
    }

    if (action === 'asset_media_upload_authorize') {
      return authorizeObsMediaUpload(response, ownerUserId, body, {
        purpose: 'creapd_asset_media',
        folder: 'assets',
        action: 'asset_media_upload_authorize',
      });
    }

    if (action === 'image_asset_list') {
      return success(response, action, {
        assets: await listImageAssets({ sql, ownerUserId, limit: body.limit }),
      });
    }

    if (action === 'image_asset_create') {
      return success(response, action, {
        asset: await createImageAsset({ sql, ownerUserId, asset: body.asset || body }),
      });
    }

    if (action === 'image_asset_update') {
      return success(response, action, {
        asset: await updateImageAsset({
          sql,
          ownerUserId,
          assetId: body.asset_id,
          patch: body.patch || {},
        }),
      });
    }

    if (action === 'image_asset_delete') {
      return success(response, action, await deleteImageAsset({
        sql,
        ownerUserId,
        assetId: body.asset_id,
      }));
    }

    if (action === 'asset_registry_list') {
      return success(response, action, {
        assets: await listRegistryAssets({ sql, ownerUserId, limit: body.limit }),
      });
    }

    if (action === 'asset_registry_create') {
      return success(response, action, {
        asset: await createRegistryAsset({ sql, ownerUserId, asset: body.asset || body }),
      });
    }

    if (action === 'asset_registry_update') {
      return success(response, action, {
        asset: await updateRegistryAsset({
          sql,
          ownerUserId,
          assetId: body.asset_id,
          patch: body.patch || {},
        }),
      });
    }

    if (action === 'asset_registry_delete') {
      return success(response, action, await deleteRegistryAsset({
        sql,
        ownerUserId,
        assetId: body.asset_id,
      }));
    }

    if (action.startsWith('obs_')) {
      const result = await runObsBridgeUserAction({
        sql,
        ownerUserId,
        action,
        body,
      });
      return success(response, action, result);
    }

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

    if (action === 'talk_generate_media') {
      const result = await generateTalkImages({
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

    if (action.startsWith('music_')) {
      const result = await runMusicStudioAction({
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

    if (request.method === 'POST') {
      const body = request.body && typeof request.body === 'object' ? request.body : {};
      const action = String(body.action || '').trim();
      if (isObsBridgeAgentAction(action)) {
        const result = await runObsBridgeAgentAction({ sql, action, body });
        return success(response, action, result);
      }

      if (String(body.type || '').startsWith('blob.')) {
        return await handleObsMediaClientUpload(request, response, body);
      }
    }

    const { user } = await requireCreapdUser(request);
    const ownerUserId = String(user.id);

    if (request.method === 'POST') {
      return await handlePost(request, response, sql, ownerUserId, user.email || null);
    }

    if (String(request.query?.studio || '').toLowerCase() === 'talk') {
      const view = String(request.query?.view || '').trim().toLowerCase();
      const talkData = view === 'live_state'
        ? await readTalkLiveState(sql, ownerUserId, request.query?.configuration_id)
        : await readTalkStudio(sql, ownerUserId, request.query?.configuration_id);
      return success(response, view === 'live_state' ? 'talk_live_state' : 'talk_read', talkData);
    }

    if (String(request.query?.studio || '').toLowerCase() === 'music') {
      const view = String(request.query?.view || '').trim().toLowerCase();
      const musicData = view === 'status'
        ? await readMusicStatus(sql, ownerUserId, request.query?.configuration_id)
        : await readMusicStudio(sql, ownerUserId, request.query?.configuration_id);
      return success(response, view === 'status' ? 'music_status' : 'music_read', musicData);
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
