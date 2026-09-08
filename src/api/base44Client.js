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

function bindIfFunction(value, target) {
  return typeof value === 'function' ? value.bind(target) : value;
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

const entitiesAdapter = new Proxy(sdkBase44.entities, {
  get(target, property) {
    if (property === 'ResearchTopic') {
      return researchTopicAdapter;
    }
    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const functionsAdapter = new Proxy(sdkBase44.functions, {
  get(target, property) {
    if (property === 'invoke') {
      return async (functionName, payload = {}) => {
        if (shouldUseNeonAuth() && functionName === 'deepResearchV2') {
          const result = await creapdApi.post('/research/topic-action', {
            action: 'start',
            topic_id: payload?.topic_id,
            research_depth: payload?.research_depth,
          });
          return { data: result };
        }

        if (shouldUseNeonAuth() && functionName === 'extractResearchPoints') {
          // Vercel Research Engine v1 writes the 10 production points in the
          // same authenticated run that creates the dossier. Preserve the old
          // Base44 function contract as a harmless compatibility no-op.
          return {
            data: {
              success: true,
              topic_id: payload?.topic_id || null,
              already_extracted: true,
              source: 'neon',
            },
          };
        }

        return target.invoke(functionName, payload);
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

// Keep the existing Base44 surface intact for production and for services that
// have not migrated yet. On Vercel Preview, only the explicitly bridged Research
// operations above are redirected to CREAPD's owned backend.
export const base44 = new Proxy(sdkBase44, {
  get(target, property) {
    if (property === 'entities') return entitiesAdapter;
    if (property === 'functions') return functionsAdapter;
    return bindIfFunction(Reflect.get(target, property), target);
  },
});
