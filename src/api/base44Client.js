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

const entitiesAdapter = new Proxy(sdkBase44.entities, {
  get(target, property) {
    if (property === 'ResearchTopic') return researchTopicAdapter;
    if (property === 'ResearchPoint') return researchPointAdapter;
    if (property === 'ProductionPackage') return productionPackageAdapter;
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

// Keep the existing Base44 surface intact for production and for services that
// have not migrated yet. On Vercel Preview, only the explicitly bridged Research
// operations above are redirected to CREAPD's owned backend.
export const base44 = new Proxy(sdkBase44, {
  get(target, property) {
    if (property === 'entities') return entitiesAdapter;
    if (property === 'functions') return functionsAdapter;
    if (property === 'integrations') return integrationsAdapter;
    return bindIfFunction(Reflect.get(target, property), target);
  },
});
