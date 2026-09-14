import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const sdkBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Presentation ids created by Base44 may also look like UUIDs, so a UUID alone
// is not enough to decide data authority. A presentation becomes "owned" only
// after the Presentation Studio loader successfully resolves it from Neon in
// this browser tab.
const ownedPresentationIds = new Set();
let activeOwnedPresentationId = null;

function bindIfFunction(value, target) {
  return typeof value === 'function' ? value.bind(target) : value;
}

function looksLikePresentationId(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function isOwnedPresentationId(value) {
  return ownedPresentationIds.has(String(value || ''));
}

function presentationIdFromChildId(value, marker) {
  const text = String(value || '');
  const index = text.indexOf(marker);
  if (index <= 0) return null;
  const candidate = text.slice(0, index);
  return isOwnedPresentationId(candidate) ? candidate : null;
}

function isOwnedNotFound(error) {
  return error?.status === 404 && (
    error?.data?.error === 'PRESENTATION_NOT_FOUND' ||
    error?.data?.diagnostic?.code === 'PRESENTATION_NOT_FOUND'
  );
}

function extractEditorRewriteText(prompt) {
  const prefix = 'Improve this presentation text: "';
  const suffix = '". Return JSON:';
  const start = prompt.indexOf(prefix);
  const end = prompt.lastIndexOf(suffix);
  if (start < 0 || end <= start) return null;
  return prompt.slice(start + prefix.length, end);
}

const researchTopicAdapter = new Proxy(sdkBase44.entities.ResearchTopic, {
  get(target, property) {
    if (property === 'create') {
      return async payload => {
        if (!shouldUseNeonAuth()) {
          return target.create(payload);
        }

        const result = await creapdApi.post('/research/topic-action', {
          action: 'create',
          topic: payload,
        });
        return result?.topic;
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const researchPointAdapter = new Proxy(sdkBase44.entities.ResearchPoint, {
  get(target, property) {
    if (property === 'update') {
      return async (pointId, payload = {}) => {
        if (!shouldUseNeonAuth()) {
          return target.update(pointId, payload);
        }

        if (payload?.status) {
          const result = await creapdApi.post('/research/production', {
            action: 'set_point_status',
            point_id: pointId,
            status: payload.status,
            rejection_reason: payload.rejection_reason,
          });
          return result?.point;
        }

        // package_id is written atomically by the Vercel package engine. The
        // legacy UI may repeat that write after package creation; return a
        // compatibility shape rather than sending a Neon-only session to Base44.
        if (Object.keys(payload || {}).every(key => key === 'package_id')) {
          return { id: pointId, ...payload };
        }

        return target.update(pointId, payload);
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const productionPackageAdapter = new Proxy(sdkBase44.entities.ProductionPackage, {
  get(target, property) {
    if (property === 'create') {
      return async payload => {
        if (!shouldUseNeonAuth() || payload?.source_entity_type !== 'ResearchPoint' || !payload?.source_entity_id) {
          return target.create(payload);
        }

        const result = await creapdApi.post('/research/production', {
          action: 'approve_point',
          point_id: payload.source_entity_id,
        });
        return result?.package;
      };
    }

    if (property === 'update') {
      return async (packageId, payload = {}) => {
        if (!shouldUseNeonAuth()) {
          return target.update(packageId, payload);
        }

        const result = await creapdApi.post('/research/production', {
          action: 'update_package',
          package_id: packageId,
          patch: payload,
        });
        return result?.package;
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const storiesPresentationAdapter = new Proxy(sdkBase44.entities.StoriesPresentation, {
  get(target, property) {
    if (property === 'update') {
      return async (presentationId, payload = {}) => {
        if (!shouldUseNeonAuth() || !isOwnedPresentationId(presentationId)) {
          return target.update(presentationId, payload);
        }

        const result = await creapdApi.post('/production/core', {
          action: 'update_editor_presentation',
          presentation_id: presentationId,
          patch: payload,
        });
        return result?.result || result?.presentation;
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const storySlideAdapter = new Proxy(sdkBase44.entities.StorySlide, {
  get(target, property) {
    if (property === 'create') {
      return async (payload = {}) => {
        const presentationId = payload?.stories_presentation_id || payload?.presentation_id;
        if (!shouldUseNeonAuth() || !isOwnedPresentationId(presentationId)) {
          return target.create(payload);
        }

        const result = await creapdApi.post('/production/core', {
          action: 'create_editor_slide',
          presentation_id: presentationId,
          slide: payload,
        });
        return result?.slide || result?.result;
      };
    }

    if (property === 'update') {
      return async (slideId, payload = {}) => {
        const presentationId = presentationIdFromChildId(slideId, ':slide:');
        if (!shouldUseNeonAuth() || !presentationId) {
          return target.update(slideId, payload);
        }

        const result = await creapdApi.post('/production/core', {
          action: 'update_editor_slide',
          slide_id: slideId,
          patch: payload,
        });
        return result?.slide || result?.result;
      };
    }

    if (property === 'delete') {
      return async slideId => {
        const presentationId = presentationIdFromChildId(slideId, ':slide:');
        if (!shouldUseNeonAuth() || !presentationId) {
          return target.delete(slideId);
        }

        return creapdApi.post('/production/core', {
          action: 'delete_editor_slide',
          slide_id: slideId,
        });
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const slideElementAdapter = new Proxy(sdkBase44.entities.SlideElement, {
  get(target, property) {
    if (property === 'filter') {
      return async (criteria = {}, ...rest) => {
        const slideId = criteria?.slide_id;
        const presentationId = presentationIdFromChildId(slideId, ':slide:');
        if (!shouldUseNeonAuth() || !presentationId) {
          return target.filter(criteria, ...rest);
        }

        const result = await creapdApi.post('/production/core', {
          action: 'list_editor_elements',
          slide_id: slideId,
        });
        return result?.elements || [];
      };
    }

    if (property === 'create') {
      return async (payload = {}) => {
        const presentationId = payload?.presentation_id || presentationIdFromChildId(payload?.slide_id, ':slide:');
        if (!shouldUseNeonAuth() || !isOwnedPresentationId(presentationId)) {
          return target.create(payload);
        }

        const result = await creapdApi.post('/production/core', {
          action: 'create_editor_element',
          presentation_id: presentationId,
          element: payload,
        });
        return result?.element || result?.result;
      };
    }

    if (property === 'update') {
      return async (elementId, payload = {}) => {
        const presentationId = presentationIdFromChildId(elementId, ':element:');
        if (!shouldUseNeonAuth() || !presentationId) {
          return target.update(elementId, payload);
        }

        const result = await creapdApi.post('/production/core', {
          action: 'update_editor_element',
          element_id: elementId,
          patch: payload,
        });
        return result?.element || result?.result;
      };
    }

    if (property === 'deleteMany') {
      return async (criteria = {}) => {
        const slideId = criteria?.slide_id;
        const presentationId = presentationIdFromChildId(slideId, ':slide:');
        if (!shouldUseNeonAuth() || !presentationId) {
          return target.deleteMany(criteria);
        }

        const ids = Array.isArray(criteria?.id?.$in) ? criteria.id.$in : [];
        return creapdApi.post('/production/core', {
          action: 'delete_editor_elements',
          slide_id: slideId,
          element_ids: ids,
        });
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const entitiesAdapter = new Proxy(sdkBase44.entities, {
  get(target, property) {
    if (property === 'ResearchTopic') return researchTopicAdapter;
    if (property === 'ResearchPoint') return researchPointAdapter;
    if (property === 'ProductionPackage') return productionPackageAdapter;
    if (property === 'StoriesPresentation') return storiesPresentationAdapter;
    if (property === 'StorySlide') return storySlideAdapter;
    if (property === 'SlideElement') return slideElementAdapter;
    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const functionsAdapter = new Proxy(sdkBase44.functions, {
  get(target, property) {
    if (property === 'invoke') {
      return async (functionName, payload = {}) => {
        if (shouldUseNeonAuth() && functionName === 'loadEditorData' && looksLikePresentationId(payload?.presentation_id)) {
          try {
            const result = await creapdApi.post('/production/core', {
              action: 'load_presentation_editor',
              presentation_id: payload.presentation_id,
            });
            ownedPresentationIds.add(String(payload.presentation_id));
            activeOwnedPresentationId = String(payload.presentation_id);
            return {
              data: {
                presentation: result?.presentation,
                slides: result?.slides || [],
                // Leave this intentionally empty so the editor asks the owned
                // SlideElement adapter for fresh state after every save.
                elementsBySlide: {},
                presentation_studio: true,
                source: 'neon',
              },
            };
          } catch (error) {
            if (!isOwnedNotFound(error)) throw error;
            activeOwnedPresentationId = null;
            return target.invoke(functionName, payload);
          }
        }

        if (shouldUseNeonAuth() && functionName === 'directPresentation' && isOwnedPresentationId(payload?.presentation_id)) {
          const result = await creapdApi.post('/production/core', {
            action: 'direct_presentation_studio',
            presentation_id: payload.presentation_id,
          });
          return {
            data: {
              success: true,
              presentation: result?.presentation,
              director_plan: result?.director_plan,
              source: 'neon',
            },
          };
        }

        if (shouldUseNeonAuth() && functionName === 'cpeController' && activeOwnedPresentationId) {
          const workerAction = payload?.action === 'review'
            ? 'presentation_workers_review'
            : 'presentation_workers_improve';
          const result = await creapdApi.post('/production/core', {
            action: workerAction,
            presentation_id: activeOwnedPresentationId,
            presentation_data: payload?.presentation_data || {},
            revision_context: payload?.revision_context || null,
            revision_count: payload?.revision_count || 0,
          });
          return { data: result };
        }

        if (
          shouldUseNeonAuth() &&
          functionName === 'dispatchWorker' &&
          activeOwnedPresentationId &&
          String(payload?.production_id || '') === activeOwnedPresentationId
        ) {
          const result = await creapdApi.post('/production/core', {
            action: 'run_presentation_qa',
            presentation_id: activeOwnedPresentationId,
          });
          return { data: result };
        }

        if (
          shouldUseNeonAuth() &&
          (functionName === 'sharePresentation' || functionName === 'shareToCreapd') &&
          isOwnedPresentationId(payload?.presentation_id)
        ) {
          const result = await creapdApi.post('/production/core', {
            action: 'share_presentation_studio',
            presentation_id: payload.presentation_id,
            visibility: payload?.visibility || 'team',
          });
          return {
            data: {
              showcase: result,
              ...result,
            },
          };
        }

        if (
          shouldUseNeonAuth() &&
          functionName === 'generateNewsPresentation' &&
          activeOwnedPresentationId &&
          payload?.regenerate === true
        ) {
          const result = await creapdApi.post('/production/core', {
            action: 'direct_presentation_studio',
            presentation_id: activeOwnedPresentationId,
          });
          return {
            data: {
              success: true,
              presentation_id: activeOwnedPresentationId,
              presentation: result?.presentation,
              director_plan: result?.director_plan,
              source: 'neon',
            },
          };
        }

        if (shouldUseNeonAuth() && functionName === 'deepResearchV2') {
          const result = await creapdApi.post('/research/topic-action', {
            action: 'start',
            topic_id: payload?.topic_id,
            research_depth: payload?.research_depth,
          });
          return { data: result };
        }

        if (shouldUseNeonAuth() && functionName === 'extractResearchPoints') {
          return {
            data: {
              success: true,
              topic_id: payload?.topic_id || null,
              already_extracted: true,
              source: 'neon',
            },
          };
        }

        if (shouldUseNeonAuth() && functionName === 'buildResearchProduction') {
          const result = await creapdApi.post('/research/production', {
            action: 'generate_package',
            point_id: payload?.research_point_id,
          });
          return { data: result };
        }

        return target.invoke(functionName, payload);
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const coreIntegrationsAdapter = new Proxy(sdkBase44.integrations.Core, {
  get(target, property) {
    if (property === 'InvokeLLM') {
      return async payload => {
        const prompt = String(payload?.prompt || '');
        const isResearchApprovalPrompt =
          shouldUseNeonAuth() &&
          prompt.includes('broadcast news producer and fact-checker') &&
          prompt.includes('teleprompter_script');

        if (isResearchApprovalPrompt) {
          // The legacy Point Manager asks Base44 for a three-field draft and then
          // immediately creates a ProductionPackage. On Neon Preview, package
          // creation itself invokes our Vercel package engine, so avoid paying
          // for a duplicate LLM pass and preserve the old call contract.
          return {
            teleprompter_script: '',
            story_summary: '',
            talking_points: '',
          };
        }

        const rewriteText = activeOwnedPresentationId && extractEditorRewriteText(prompt);
        if (shouldUseNeonAuth() && activeOwnedPresentationId && rewriteText !== null) {
          const result = await creapdApi.post('/production/core', {
            action: 'rewrite_presentation_text',
            presentation_id: activeOwnedPresentationId,
            content: rewriteText,
          });
          return { content: result?.content || rewriteText };
        }

        return target.InvokeLLM(payload);
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const integrationsAdapter = new Proxy(sdkBase44.integrations, {
  get(target, property) {
    if (property === 'Core') return coreIntegrationsAdapter;
    return bindIfFunction(Reflect.get(target, property), target);
  },
});

// Keep the existing Base44 surface intact for services that have not migrated
// yet. On the owned Preview, explicitly bridged operations are redirected to
// CREAPD's Neon/Vercel backend. There is still only one Presentation Editor;
// this compatibility layer changes its data authority for Presentation Studio
// projects without creating a second editor implementation.
export const base44 = new Proxy(sdkBase44, {
  get(target, property) {
    if (property === 'entities') return entitiesAdapter;
    if (property === 'functions') return functionsAdapter;
    if (property === 'integrations') return integrationsAdapter;
    return bindIfFunction(Reflect.get(target, property), target);
  },
});
