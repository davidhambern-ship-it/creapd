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
const reportedLegacyFallbacks = new Set();

function reportLegacyFallback(kind, name) {
  if (!shouldUseNeonAuth()) return;
  const key = `${kind}:${String(name || 'unknown')}`;
  if (reportedLegacyFallbacks.has(key)) return;
  reportedLegacyFallbacks.add(key);
  console.warn(
    `[CREAPD MIGRATION] Base44 fallback used on owned Preview: ${kind} ${String(name || 'unknown')}`,
  );
}

function isOwnedAssetSchemaMissing(error) {
  return error?.status === 503 && (
    error?.data?.diagnostic?.code === '42P01'
    || /relation .* does not exist/i.test(String(error?.data?.diagnostic?.message || ''))
  );
}

function sortLegacyRows(rows, sort = '-created_date') {
  const value = String(sort || '').trim();
  if (!value) return rows;
  const descending = value.startsWith('-');
  const field = descending ? value.slice(1) : value;
  return [...rows].sort((left, right) => {
    const a = left?.[field] ?? '';
    const b = right?.[field] ?? '';
    const result = String(a).localeCompare(String(b));
    return descending ? -result : result;
  });
}

function filterLegacyRows(rows, criteria = {}) {
  return rows.filter(row => Object.entries(criteria || {}).every(([key, expected]) => {
    if (expected && typeof expected === 'object' && Array.isArray(expected.$in)) {
      return expected.$in.includes(row?.[key]);
    }
    return row?.[key] === expected;
  }));
}

function bindIfFunction(value, target) {
  return typeof value === 'function' ? value.bind(target) : value;
}


const MUSIC_ENTITY_KEYS = Object.freeze({
  PlaylistItem: 'playlist',
  MusicTopic: 'topics',
  MusicResearchItem: 'research',
  ShowRundownItem: 'rundown',
  MusicAsset: 'assets',
  Top10Item: 'top10',
});

function musicStudioPath(configurationId = null) {
  const params = new URLSearchParams({ studio: 'music' });
  if (configurationId) params.set('configuration_id', String(configurationId));
  return `/production/core?${params.toString()}`;
}

async function readOwnedMusic(configurationId = null) {
  return creapdApi.getFresh(musicStudioPath(configurationId));
}

function makeMusicEntityAdapter(entityName, target) {
  return new Proxy(target, {
    get(entityTarget, property) {
      if (!shouldUseNeonAuth()) {
        return bindIfFunction(Reflect.get(entityTarget, property), entityTarget);
      }

      if (property === 'list') {
        return async (sort = '-created_date', limit = 100) => {
          if (entityName === 'MusicProductionConfiguration') {
            const result = await creapdApi.post('/production/core', {
              action: 'music_list_configurations',
              limit,
            });
            return sortLegacyRows(result?.configurations || [], sort).slice(0, limit || 100);
          }

          const snapshot = await readOwnedMusic();
          const key = MUSIC_ENTITY_KEYS[entityName];
          return sortLegacyRows(snapshot?.[key] || [], sort).slice(0, limit || 100);
        };
      }

      if (property === 'get') {
        return async id => {
          const result = await creapdApi.post('/production/core', {
            action: 'music_entity_get',
            entity: entityName,
            id,
          });
          return result?.item || null;
        };
      }

      if (property === 'filter') {
        return async (criteria = {}, sort = null, limit = 100) => {
          if (entityName === 'MusicProductionConfiguration') {
            const result = await creapdApi.post('/production/core', {
              action: 'music_list_configurations',
              limit: Math.max(Number(limit || 100), 100),
            });
            const rows = filterLegacyRows(result?.configurations || [], criteria);
            return sortLegacyRows(rows, sort || '-created_date').slice(0, limit || 100);
          }

          const snapshot = await readOwnedMusic(criteria?.configuration_id || null);
          const key = MUSIC_ENTITY_KEYS[entityName];
          const rows = filterLegacyRows(snapshot?.[key] || [], criteria);
          return sort ? sortLegacyRows(rows, sort).slice(0, limit || 100) : rows.slice(0, limit || 100);
        };
      }

      if (property === 'create') {
        return async payload => {
          if (entityName === 'MusicProductionConfiguration') {
            const result = await creapdApi.post('/production/core', {
              action: 'music_save_configuration',
              configuration: payload,
            });
            return result?.configuration;
          }

          const result = await creapdApi.post('/production/core', {
            action: 'music_entity_create',
            entity: entityName,
            item: payload,
          });
          return result?.item;
        };
      }

      if (property === 'update') {
        return async (id, patch = {}) => {
          const result = await creapdApi.post('/production/core', {
            action: 'music_entity_update',
            entity: entityName,
            id,
            patch,
          });
          return result?.item;
        };
      }

      if (property === 'bulkUpdate') {
        return async items => {
          const result = await creapdApi.post('/production/core', {
            action: 'music_entity_bulk_update',
            entity: entityName,
            items: Array.isArray(items) ? items : [],
          });
          return result?.items || [];
        };
      }

      if (property === 'delete') {
        return async id => {
          return creapdApi.post('/production/core', {
            action: 'music_entity_delete',
            entity: entityName,
            id,
          });
        };
      }

      if (property === 'subscribe' && entityName === 'MusicProductionConfiguration') {
        return callback => {
          let stopped = false;
          let signature = null;

          const poll = async () => {
            if (stopped) return;
            try {
              const snapshot = await readOwnedMusic();
              const configuration = snapshot?.configuration;
              if (!configuration) return;
              const nextSignature = [
                configuration.id,
                configuration.status,
                configuration.updated_date,
                configuration.build_log,
              ].join('|');

              if (nextSignature !== signature) {
                signature = nextSignature;
                callback?.({ type: 'update', data: configuration });
              }
            } catch (error) {
              console.warn('[CREAPD MUSIC] status poll failed', error?.message || error);
            }
          };

          poll();
          const interval = setInterval(poll, 1800);
          return () => {
            stopped = true;
            clearInterval(interval);
          };
        };
      }

      return bindIfFunction(Reflect.get(entityTarget, property), entityTarget);
    },
  });
}

const musicEntityAdapters = Object.freeze({
  MusicProductionConfiguration: makeMusicEntityAdapter('MusicProductionConfiguration', sdkBase44.entities.MusicProductionConfiguration),
  PlaylistItem: makeMusicEntityAdapter('PlaylistItem', sdkBase44.entities.PlaylistItem),
  MusicTopic: makeMusicEntityAdapter('MusicTopic', sdkBase44.entities.MusicTopic),
  MusicResearchItem: makeMusicEntityAdapter('MusicResearchItem', sdkBase44.entities.MusicResearchItem),
  ShowRundownItem: makeMusicEntityAdapter('ShowRundownItem', sdkBase44.entities.ShowRundownItem),
  MusicAsset: makeMusicEntityAdapter('MusicAsset', sdkBase44.entities.MusicAsset),
  Top10Item: makeMusicEntityAdapter('Top10Item', sdkBase44.entities.Top10Item),
});


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

const imageAssetAdapter = new Proxy(sdkBase44.entities.ImageAsset, {
  get(target, property) {
    if (property === 'list') {
      return async (sort = '-created_date', limit = 100) => {
        if (!shouldUseNeonAuth()) return target.list(sort, limit);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'image_asset_list',
            limit,
          });
          return sortLegacyRows(result?.assets || [], sort);
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'ImageAsset.list (schema pending)');
          return target.list(sort, limit);
        }
      };
    }

    if (property === 'filter') {
      return async (criteria = {}, sort = '-created_date', limit = 100) => {
        if (!shouldUseNeonAuth()) return target.filter(criteria, sort, limit);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'image_asset_list',
            limit: Math.max(Number(limit || 100), 100),
          });
          return sortLegacyRows(filterLegacyRows(result?.assets || [], criteria), sort).slice(0, limit || 100);
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'ImageAsset.filter (schema pending)');
          return target.filter(criteria, sort, limit);
        }
      };
    }

    if (property === 'create') {
      return async payload => {
        if (!shouldUseNeonAuth()) return target.create(payload);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'image_asset_create',
            asset: payload,
          });
          return result?.asset;
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'ImageAsset.create (schema pending)');
          return target.create(payload);
        }
      };
    }

    if (property === 'update') {
      return async (assetId, payload = {}) => {
        if (!shouldUseNeonAuth()) return target.update(assetId, payload);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'image_asset_update',
            asset_id: assetId,
            patch: payload,
          });
          return result?.asset;
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'ImageAsset.update (schema pending)');
          return target.update(assetId, payload);
        }
      };
    }

    if (property === 'delete') {
      return async assetId => {
        if (!shouldUseNeonAuth()) return target.delete(assetId);
        try {
          return await creapdApi.post('/production/core', {
            action: 'image_asset_delete',
            asset_id: assetId,
          });
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'ImageAsset.delete (schema pending)');
          return target.delete(assetId);
        }
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const assetRegistryAdapter = new Proxy(sdkBase44.entities.AssetRegistry, {
  get(target, property) {
    if (property === 'list') {
      return async (sort = '-created_date', limit = 100) => {
        if (!shouldUseNeonAuth()) return target.list(sort, limit);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'asset_registry_list',
            limit,
          });
          return sortLegacyRows(result?.assets || [], sort);
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'AssetRegistry.list (schema pending)');
          return target.list(sort, limit);
        }
      };
    }

    if (property === 'filter') {
      return async (criteria = {}, sort = '-created_date', limit = 100) => {
        if (!shouldUseNeonAuth()) return target.filter(criteria, sort, limit);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'asset_registry_list',
            limit: Math.max(Number(limit || 100), 100),
          });
          return sortLegacyRows(filterLegacyRows(result?.assets || [], criteria), sort).slice(0, limit || 100);
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'AssetRegistry.filter (schema pending)');
          return target.filter(criteria, sort, limit);
        }
      };
    }

    if (property === 'create') {
      return async payload => {
        if (!shouldUseNeonAuth()) return target.create(payload);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'asset_registry_create',
            asset: payload,
          });
          return result?.asset;
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'AssetRegistry.create (schema pending)');
          return target.create(payload);
        }
      };
    }

    if (property === 'update') {
      return async (assetId, payload = {}) => {
        if (!shouldUseNeonAuth()) return target.update(assetId, payload);
        try {
          const result = await creapdApi.post('/production/core', {
            action: 'asset_registry_update',
            asset_id: assetId,
            patch: payload,
          });
          return result?.asset;
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'AssetRegistry.update (schema pending)');
          return target.update(assetId, payload);
        }
      };
    }

    if (property === 'delete') {
      return async assetId => {
        if (!shouldUseNeonAuth()) return target.delete(assetId);
        try {
          return await creapdApi.post('/production/core', {
            action: 'asset_registry_delete',
            asset_id: assetId,
          });
        } catch (error) {
          if (!isOwnedAssetSchemaMissing(error)) throw error;
          reportLegacyFallback('entity', 'AssetRegistry.delete (schema pending)');
          return target.delete(assetId);
        }
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

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
    if (property === 'ImageAsset') return imageAssetAdapter;
    if (property === 'AssetRegistry') return assetRegistryAdapter;
    if (property === 'ResearchTopic') return researchTopicAdapter;
    if (property === 'ResearchPoint') return researchPointAdapter;
    if (property === 'ProductionPackage') return productionPackageAdapter;
    if (property === 'StoriesPresentation') return storiesPresentationAdapter;
    if (property === 'StorySlide') return storySlideAdapter;
    if (property === 'SlideElement') return slideElementAdapter;
    if (musicEntityAdapters[property]) return musicEntityAdapters[property];
    reportLegacyFallback('entity', property);
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


        if (shouldUseNeonAuth() && functionName === 'buildMusicProduction') {
          const result = await creapdApi.post('/production/core', {
            action: 'music_build',
            configuration_id: payload?.configuration_id,
          });
          return { data: result?.result || result };
        }

        if (shouldUseNeonAuth() && functionName === 'regenerateMusicSection') {
          const result = await creapdApi.post('/production/core', {
            action: 'music_regenerate_section',
            configuration_id: payload?.configuration_id,
            section: payload?.section,
          });
          return { data: result?.result || result };
        }

        if (shouldUseNeonAuth() && functionName === 'generateMusicTop10') {
          const result = await creapdApi.post('/production/core', {
            action: 'music_generate_top10',
            configuration_id: payload?.configuration_id,
          });
          return { data: { success: true, top10_count: result?.top10?.length || 0 } };
        }

        if (shouldUseNeonAuth() && functionName === 'fetchYoutubeMetadata') {
          const result = await creapdApi.post('/production/core', {
            action: 'music_fetch_youtube_metadata',
            url: payload?.url,
          });
          return { data: result };
        }

        if (
          shouldUseNeonAuth() &&
          functionName === 'runDepartmentPipeline' &&
          String(payload?.production_profile || '').toLowerCase() === 'music'
        ) {
          const result = await creapdApi.post('/production/core', {
            action: 'music_department_pipeline',
            configuration_id: payload?.configuration_id,
            department_action: payload?.action,
            target_department: payload?.target_department,
            department_status: payload?.department_status,
          });
          return { data: { pipeline: result?.pipeline || null } };
        }


        reportLegacyFallback('function', functionName);
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

        const isMusicPrompt =
          shouldUseNeonAuth() &&
          /\bmusic\b/i.test(prompt) &&
          /(show|production|segment|playlist|artist|song|radio|rundown)/i.test(prompt) &&
          payload?.response_json_schema;

        if (isMusicPrompt) {
          const result = await creapdApi.post('/production/core', {
            action: 'music_generate_structured',
            prompt,
            schema: payload.response_json_schema,
            schema_name: 'creapd_music_inline_v1',
            max_output_tokens: 3000,
          });
          return result?.result || {};
        }


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

        reportLegacyFallback('integration', 'Core.InvokeLLM');
        return target.InvokeLLM(payload);
      };
    }

    return bindIfFunction(Reflect.get(target, property), target);
  },
});

const integrationsAdapter = new Proxy(sdkBase44.integrations, {
  get(target, property) {
    if (property === 'Core') return coreIntegrationsAdapter;
    reportLegacyFallback('integration', property);
    return bindIfFunction(Reflect.get(target, property), target);
  },
});


const authAdapter = new Proxy(sdkBase44.auth, {
  get(target, property) {
    if (property === 'updateMe') {
      return async payload => {
        if (
          shouldUseNeonAuth() &&
          Object.keys(payload || {}).every(key =>
            ['default_production_type', 'default_production_config_id'].includes(key)
          )
        ) {
          return { ...(payload || {}), source: 'neon_compat' };
        }
        return target.updateMe(payload);
      };
    }

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
    if (property === 'auth') return authAdapter;
    if (property === 'entities') return entitiesAdapter;
    if (property === 'functions') return functionsAdapter;
    if (property === 'integrations') return integrationsAdapter;
    return bindIfFunction(Reflect.get(target, property), target);
  },
});
