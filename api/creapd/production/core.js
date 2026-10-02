import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { handleUpload } from '@vercel/blob/client';
import { getSql, hasDatabaseConfig } from '../../../server/db.js';
import { getMusicSql, hasMusicDatabaseConfig } from '../../../server/musicDb.js';
import { ensureMusicSchema } from '../../../server/musicSchema.js';
import { requireCreapdUser, getRequestedAuthProvider } from '../../../server/creapdUser.js';
import { requireNeonUser } from '../../../server/neonAuth.js';
import { requireBase44User } from '../../../server/base44Auth.js';
import { readProductionCore } from '../../../server/productionCore.js';
import { generateStructuredGatewayResponse } from '../../../server/aiGateway.js';
import { readTalkStudio, runTalkStudioAction } from '../../../server/talkStudio.js';
import { readMusicStudio, readMusicStatus, runMusicStudioAction } from '../../../server/musicStudio.js';
import { readTalkLiveState } from '../../../server/talkLiveState.js';
import { runTalkResearchStage } from '../../../server/talkResearchEngine.js';
import { runTalkProductionStage } from '../../../server/talkProductionEngine.js';
import { buildPodcastAssembly } from '../../../server/podcastAssemblyEngine.js';
import { regeneratePodcastScript } from '../../../server/podcastScriptEngine.js';
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

async function resolveMusicIdentity(request) {
  const provider = getRequestedAuthProvider(request);

  if (provider === 'neon') {
    const user = await requireNeonUser(request);
    return {
      provider,
      id: String(user.id),
      email: user.email || null,
      display_name: null,
    };
  }

  if (provider === 'base44') {
    const user = await requireBase44User(request);
    return {
      provider,
      id: String(user.id),
      email: user.email || null,
      display_name: user.full_name || user.display_name || user.name || null,
    };
  }

  const error = new Error('Unsupported authentication provider');
  error.status = 400;
  error.code = 'UNSUPPORTED_AUTH_PROVIDER';
  throw error;
}

async function ensureMusicUser(sql, identity) {
  const [existingById] = await sql`
    SELECT id, email, display_name
    FROM creapd.users
    WHERE id=${identity.id}
    LIMIT 1
  `;

  if (existingById) {
    const [updated] = await sql`
      UPDATE creapd.users
      SET
        email=COALESCE(${identity.email}, email),
        display_name=COALESCE(${identity.display_name}, display_name),
        source_system=${identity.provider},
        source_payload=${JSON.stringify({
          provider: identity.provider,
          external_id: identity.id,
        })}::jsonb,
        updated_at=now()
      WHERE id=${identity.id}
      RETURNING *
    `;
    return updated;
  }

  if (identity.email) {
    const [existingByEmail] = await sql`
      SELECT id, email, display_name
      FROM creapd.users
      WHERE lower(email)=lower(${identity.email})
      LIMIT 1
    `;
    if (existingByEmail) return existingByEmail;
  }

  const [created] = await sql`
    INSERT INTO creapd.users (
      id, email, display_name, source_system, source_payload
    ) VALUES (
      ${identity.id},
      ${identity.email},
      ${identity.display_name},
      ${identity.provider},
      ${JSON.stringify({
        provider: identity.provider,
        external_id: identity.id,
      })}::jsonb
    )
    RETURNING *
  `;

  return created;
}

async function handleMusicRequest(request, response, action = '') {
  if (!hasMusicDatabaseConfig()) {
    return response.status(503).json({
      ok: false,
      service: 'creapd-production-core',
      error: 'music_database_not_configured',
    });
  }

  const sql = getMusicSql();
  await ensureMusicSchema(sql);

  const identity = await resolveMusicIdentity(request);
  const user = await ensureMusicUser(sql, identity);
  const ownerUserId = String(user.id);
  const ownerEmail = user.email || identity.email || null;

  if (request.method === 'GET') {
    const view = String(request.query?.view || '').trim().toLowerCase();
    const data = view === 'status'
      ? await readMusicStatus(sql, ownerUserId, request.query?.configuration_id)
      : await readMusicStudio(sql, ownerUserId, request.query?.configuration_id);

    return response.status(200).json({
      ok: true,
      service: 'creapd-production-core',
      action: view === 'status' ? 'music_status' : 'music_read',
      source: process.env.MUSIC_DATABASE_URL ? 'music_database' : 'default_database',
      data_authority: 'owned',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const result = await runMusicStudioAction({
    sql,
    ownerUserId,
    ownerEmail,
    action,
    body,
  });

  return response.status(200).json({
    ok: true,
    service: 'creapd-production-core',
    action,
    source: process.env.MUSIC_DATABASE_URL ? 'music_database' : 'default_database',
    data_authority: 'owned',
    ...result,
    timestamp: new Date().toISOString(),
  });
}

function safePodcastResearchText(value, max = 18000) {
  return String(value || '').trim().slice(0, max);
}

const SOURCE_FETCH_MAX_HTML_CHARS = 2_000_000;
const SOURCE_FETCH_MAX_BODY_CHARS = 60_000;

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      const n = Number.parseInt(code, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    });
}

function stripTags(value) {
  return decodeHtmlEntities(
    String(value || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n\n')
      .replace(/<\/h[1-6]\s*>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPrivateSourceHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  if (host === '::1' || host === '0.0.0.0') return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^169\.254\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  return false;
}

function safePublicSourceUrl(value) {
  let url;
  try {
    url = new URL(String(value || '').trim());
  } catch {
    const error = new Error('The source URL is invalid.');
    error.code = 'PODCAST_SOURCE_URL_INVALID';
    error.status = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(url.protocol) || isPrivateSourceHost(url.hostname)) {
    const error = new Error('The source URL is not a public HTTP(S) address.');
    error.code = 'PODCAST_SOURCE_URL_UNSAFE';
    error.status = 400;
    throw error;
  }
  return url;
}

async function fetchPublicSourceHtml(sourceUrl) {
  let current = safePublicSourceUrl(sourceUrl);

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    const response = await fetch(current, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36 CREAPD/1.0',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.7',
        'Accept-Language': 'en-US,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(18000),
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) break;
      current = safePublicSourceUrl(new URL(location, current).href);
      continue;
    }

    if (!response.ok) {
      const error = new Error(`Source returned HTTP ${response.status}.`);
      error.code = 'PODCAST_SOURCE_FETCH_FAILED';
      error.status = 502;
      throw error;
    }

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      const error = new Error('The source did not return an HTML article page.');
      error.code = 'PODCAST_SOURCE_NOT_HTML';
      error.status = 422;
      throw error;
    }

    const html = (await response.text()).slice(0, SOURCE_FETCH_MAX_HTML_CHARS);
    return { html, finalUrl: current.href };
  }

  const error = new Error('The source redirected too many times.');
  error.code = 'PODCAST_SOURCE_REDIRECT_LIMIT';
  error.status = 502;
  throw error;
}

function findArticleBodyInJsonLd(html) {
  const scripts = String(html || '').match(/<script\b[^>]*type=["'][^"']*ld\+json[^"']*["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const inspect = value => {
    if (!value) return '';
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = inspect(item);
        if (found) return found;
      }
      return '';
    }
    if (typeof value !== 'object') return '';

    if (typeof value.articleBody === 'string' && value.articleBody.trim().length >= 300) {
      return decodeHtmlEntities(value.articleBody).trim();
    }

    if (Array.isArray(value['@graph'])) {
      const graph = inspect(value['@graph']);
      if (graph) return graph;
    }

    for (const nested of Object.values(value)) {
      if (nested && typeof nested === 'object') {
        const found = inspect(nested);
        if (found) return found;
      }
    }
    return '';
  };

  for (const script of scripts) {
    const raw = script
      .replace(/^<script\b[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim();
    try {
      const found = inspect(JSON.parse(raw));
      if (found) return found;
    } catch {}
  }
  return '';
}

function removeNonArticleHtml(html) {
  return String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form\b[\s\S]*?<\/form>/gi, ' ');
}

function paragraphLooksLikeBoilerplate(text) {
  const value = String(text || '').trim();
  if (value.length < 35) return true;
  return /^(advertisement|related:|read more|sign up|subscribe|newsletter|cookie|privacy policy|terms of use|all rights reserved)/i.test(value)
    || /(accept all cookies|manage your privacy|subscribe to our newsletter|sign up for our newsletter)/i.test(value);
}

function extractParagraphArticle(html) {
  const cleaned = removeNonArticleHtml(html);
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const region = articleMatch?.[1] || mainMatch?.[1] || cleaned;

  const blocks = [];
  const seen = new Set();
  const blockRe = /<(p|h2|h3|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockRe.exec(region)) !== null) {
    const tag = String(match[1] || '').toLowerCase();
    const text = stripTags(match[2]);
    if (!text) continue;
    if (tag === 'p' && paragraphLooksLikeBoilerplate(text)) continue;
    if ((tag === 'h2' || tag === 'h3') && text.length < 3) continue;
    const key = text.toLowerCase().replace(/\W+/g, ' ').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    blocks.push(tag === 'h2' || tag === 'h3' ? `## ${text}` : tag === 'blockquote' ? `> ${text}` : text);
  }

  return blocks.join('\n\n').slice(0, SOURCE_FETCH_MAX_BODY_CHARS).trim();
}

function extractSourceArticle(html) {
  const jsonLdBody = findArticleBodyInJsonLd(html);
  if (jsonLdBody && jsonLdBody.split(/\s+/).length >= 120) {
    return {
      bodyContent: jsonLdBody.slice(0, SOURCE_FETCH_MAX_BODY_CHARS),
      extractionMethod: 'json_ld_article_body',
    };
  }

  const paragraphBody = extractParagraphArticle(html);
  return {
    bodyContent: paragraphBody,
    extractionMethod: 'article_paragraphs',
  };
}

async function fetchPodcastSourceArticle(body = {}) {
  const sourceUrl = String(body.url || '').trim();
  if (!sourceUrl) {
    const error = new Error('A source URL is required.');
    error.code = 'PODCAST_SOURCE_URL_REQUIRED';
    error.status = 400;
    throw error;
  }

  const { html, finalUrl } = await fetchPublicSourceHtml(sourceUrl);
  const extracted = extractSourceArticle(html);
  const bodyContent = String(extracted.bodyContent || '').trim();
  const wordCount = bodyContent ? bodyContent.split(/\s+/).filter(Boolean).length : 0;

  if (wordCount < 120 || bodyContent.length < 600) {
    const error = new Error(
      'CREAPD reached the source, but the page did not expose enough readable article text. It may be paywalled, JavaScript-only, or primarily video.',
    );
    error.code = 'PODCAST_SOURCE_FULL_TEXT_UNAVAILABLE';
    error.status = 422;
    error.details = {
      final_url: finalUrl,
      extracted_word_count: wordCount,
      extraction_method: extracted.extractionMethod,
    };
    throw error;
  }

  return {
    body_content: bodyContent,
    word_count: wordCount,
    final_url: finalUrl,
    fetched_at: new Date().toISOString(),
    extraction_method: extracted.extractionMethod,
  };
}

async function setPodcastSourceApproval({ sql, ownerUserId, body = {} }) {
  const configId = String(body.configuration_id || '').trim();
  const articleId = String(body.article_id || '').trim();
  const approved = Boolean(body.approved);

  if (!configId || !articleId) {
    const error = new Error('Podcast source approval requires configuration_id and article_id.');
    error.code = 'PODCAST_SOURCE_APPROVAL_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [configuration] = await sql`
    SELECT build_metadata
    FROM creapd.talk_production_configurations
    WHERE id=${configId} AND owner_user_id=${String(ownerUserId)}
    LIMIT 1
  `;

  if (!configuration) {
    const error = new Error('Podcast configuration was not found.');
    error.code = 'PODCAST_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const metadata = configuration.build_metadata && typeof configuration.build_metadata === 'object'
    ? configuration.build_metadata
    : {};
  const current = Array.isArray(metadata.podcast_approved_source_ids)
    ? metadata.podcast_approved_source_ids.map(String)
    : [];
  const ids = new Set(current);

  if (approved) ids.add(articleId);
  else ids.delete(articleId);

  const nextMeta = {
    ...metadata,
    podcast_approved_source_ids: [...ids],
    podcast_source_selection_updated_at: new Date().toISOString(),
  };

  await sql`
    UPDATE creapd.talk_production_configurations
    SET build_metadata=${JSON.stringify(nextMeta)}::jsonb, updated_at=now()
    WHERE id=${configId} AND owner_user_id=${String(ownerUserId)}
  `;

  return {
    configuration_id: configId,
    article_id: articleId,
    approved,
    approved_source_ids: [...ids],
  };
}

async function approvePodcastAssembly({ sql, ownerUserId, body = {} }) {
  const configId = String(body.configuration_id || '').trim();

  if (!configId) {
    const error = new Error('Podcast Assembly approval requires configuration_id.');
    error.code = 'PODCAST_ASSEMBLY_APPROVAL_INPUT_INVALID';
    error.status = 400;
    throw error;
  }

  const [configuration] = await sql`
    SELECT build_metadata
    FROM creapd.talk_production_configurations
    WHERE id=${configId} AND owner_user_id=${String(ownerUserId)}
    LIMIT 1
  `;

  if (!configuration) {
    const error = new Error('Podcast configuration was not found.');
    error.code = 'PODCAST_CONFIGURATION_NOT_FOUND';
    error.status = 404;
    throw error;
  }

  const current = configuration.build_metadata && typeof configuration.build_metadata === 'object'
    ? configuration.build_metadata
    : {};

  if (!Array.isArray(current.assembly_segments) || !current.assembly_segments.length) {
    const error = new Error('Episode Assembly must be completed before it can be approved.');
    error.code = 'PODCAST_ASSEMBLY_REQUIRED';
    error.status = 409;
    throw error;
  }

  const approvedAt = new Date().toISOString();
  const nextMeta = {
    ...current,
    stage: 'assembly_approved',
    assembly_approved_at: approvedAt,
    assembly_approved: true,
  };

  await sql`
    UPDATE creapd.talk_production_configurations
    SET status='assembled', build_metadata=${JSON.stringify(nextMeta)}::jsonb, updated_at=now()
    WHERE id=${configId} AND owner_user_id=${String(ownerUserId)}
  `;

  return {
    configuration_id: configId,
    approved: true,
    approved_at: approvedAt,
  };
}

async function runPodcastResearchAssist(body = {}) {
  const mode = String(body.mode || 'custom').trim().toLowerCase();
  const article = body.article && typeof body.article === 'object' ? body.article : {};
  const show = body.show && typeof body.show === 'object' ? body.show : {};
  const userPrompt = safePodcastResearchText(body.prompt, 1200);

  const modeInstructions = {
    summary: 'Create a clean producer summary of the material. Capture the central point, the strongest supporting facts, and why it may matter to this podcast. Do not turn this into a host script.',
    talking_points: 'Create useful host talking points from the material. Organize them in a natural discussion order and include specific facts or angles the host can use. These are research notes, not the final script.',
    opposing_viewpoints: 'Identify credible counterarguments, competing interpretations, caveats, and perspectives that would help the host avoid a one-sided treatment. Clearly distinguish sourced facts from interpretation.',
    fact_check: 'Identify the key factual claims that should be verified before production. For each claim, explain what needs verification and whether the supplied material itself supports it. Do not claim live verification unless current source evidence is actually available.',
    broll: 'Suggest practical B-roll, graphics, screenshots, data visuals, archival material, or other visual support that matches this material and the configured podcast format.',
    custom: userPrompt || 'Analyze this material and give the producer the most useful next-step research notes for the configured podcast.',
  };

  const showTopics = Array.isArray(show.topics)
    ? show.topics.join(', ')
    : safePodcastResearchText(show.topics, 1600);

  const sourceText = safePodcastResearchText(
    article.body_content ||
    article.transcript ||
    article.full_text_excerpt ||
    article.summary ||
    '',
  );

  const prompt = [
    'You are Echo, the research assistant inside CREAPD.',
    'Your job at this stage is to help the producer understand source material. Do NOT write the finished podcast episode unless explicitly asked.',
    '',
    'PODCAST CONFIGURATION:',
    `Show: ${safePodcastResearchText(show.production_name || show.show_name || 'Podcast', 300)}`,
    `Description: ${safePodcastResearchText(show.show_description, 1200) || 'Not provided'}`,
    `Format: ${safePodcastResearchText(show.show_format, 240) || 'Podcast'}`,
    `Tone: ${safePodcastResearchText(show.show_tone, 240) || 'Conversational'}`,
    `Target runtime: ${safePodcastResearchText(show.total_show_runtime, 120) || 'Not specified'}`,
    `Configured topics: ${showTopics || 'Not specified'}`,
    '',
    'SOURCE MATERIAL:',
    `Title: ${safePodcastResearchText(article.title, 500)}`,
    `Source: ${safePodcastResearchText(article.source_name || article.publication, 300) || 'Unknown'}`,
    `Author: ${safePodcastResearchText(article.author, 200) || 'Unknown'}`,
    `Published: ${safePodcastResearchText(article.published_at, 120) || 'Unknown'}`,
    `Existing summary: ${safePodcastResearchText(article.summary, 2200) || 'None'}`,
    '',
    sourceText || 'No full source text is available.',
    '',
    'TASK:',
    modeInstructions[mode] || modeInstructions.custom,
    '',
    'Keep the output useful for a producer who will later combine multiple research items into one coherent episode.',
  ].join('\n');

  const result = await generateStructuredGatewayResponse({
    prompt,
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
      },
      required: ['content'],
    },
    schemaName: 'creapd_podcast_research_assist_v1',
    webSearch: mode === 'fact_check',
    maxOutputTokens: 1400,
    timeoutMs: 50000,
  });

  return {
    mode,
    content: result?.data?.content || '',
    provider: result?.provider || null,
    model: result?.model || null,
    web_search_used: Boolean(result?.webSearchUsed),
  };
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

    if (action === 'podcast_set_source_approval') {
      const result = await setPodcastSourceApproval({ sql, ownerUserId, body });
      return success(response, action, { result });
    }

    if (action === 'podcast_regenerate_script') {
      const result = await regeneratePodcastScript({
        sql,
        ownerUserId,
        configurationId: body.configuration_id,
        assetId: body.asset_id,
        instruction: body.instruction || '',
      });
      return success(response, action, { result });
    }

    if (action === 'podcast_approve_assembly') {
      const result = await approvePodcastAssembly({ sql, ownerUserId, body });
      return success(response, action, { result });
    }

    if (action === 'podcast_build_assembly') {
      const result = await buildPodcastAssembly({
        sql,
        ownerUserId,
        configurationId: body.configuration_id,
        articles: Array.isArray(body.articles) ? body.articles : [],
      });
      return success(response, action, { result });
    }

    if (action === 'podcast_fetch_source_article') {
      const result = await fetchPodcastSourceArticle(body);
      return success(response, action, result);
    }

    if (action === 'podcast_research_assist') {
      const result = await runPodcastResearchAssist(body);
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

  // Music is intentionally routed before the default CREAPD database check.
  // This lets Music run entirely on Prisma Postgres while Talk and the rest of
  // CREAPD remain on the existing database during the migration.
  const earlyBody = request.method === 'POST' && request.body && typeof request.body === 'object'
    ? request.body
    : {};
  const earlyAction = String(earlyBody.action || '').trim();
  const isMusicRequest =
    (request.method === 'GET' && String(request.query?.studio || '').toLowerCase() === 'music') ||
    (request.method === 'POST' && earlyAction.startsWith('music_'));

  if (isMusicRequest) {
    try {
      return await handleMusicRequest(request, response, earlyAction);
    } catch (error) {
      if ([400, 401, 403, 404, 409].includes(error?.status)) {
        return response.status(error.status).json({
          ok: false,
          service: 'creapd-production-core',
          error: error.code || 'music_request_failed',
          diagnostic: safeError(error),
        });
      }

      console.error('[CREAPD MUSIC CORE]', error);
      return response.status(503).json({
        ok: false,
        service: 'creapd-production-core',
        error: 'music_request_failed',
        diagnostic: safeError(error),
        timestamp: new Date().toISOString(),
      });
    }
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
