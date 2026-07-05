import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getNarration as getHardcodedNarration } from '@/lib/systemNarration';
import { resolveTourIcon } from '@/lib/tourIcons';

// Module-level cache so repeated visits to the same route don't re-fetch
const scriptCache = {};

/**
 * useTourScript — fetches the tour script + scenes for a route from the
 * database (TourScript / TourScene entities). Falls back to the hardcoded
 * narration in systemNarration.js if no DB script exists for the route.
 *
 * Returns { narration, isLoading, refresh }
 */
export function useTourScript(pathname) {
  const [narration, setNarration] = useState(scriptCache[pathname] || null);
  const [isLoading, setIsLoading] = useState(!scriptCache[pathname]);

  const load = async () => {
    setIsLoading(true);
    try {
      const scripts = await base44.entities.TourScript.filter({
        route_path: pathname,
        is_active: true,
      });

      if (!scripts || scripts.length === 0) {
        const hardcoded = getHardcodedNarration(pathname);
        scriptCache[pathname] = hardcoded;
        setNarration(hardcoded);
        setIsLoading(false);
        return;
      }

      const script = scripts[0];
      let scenes = await base44.entities.TourScene.filter({
        tour_script_id: script.id,
      });
      scenes.sort((a, b) => (a.scene_order || 0) - (b.scene_order || 0));

      const built = {
        name: script.script_name,
        default_voice: script.default_voice || 'storm',
        default_elevenlabs_voice_id: script.default_elevenlabs_voice_id || '',
        _source: 'database',
        _scriptId: script.id,
        scenes: scenes.map(s => ({
          id: s.scene_id || String(s.id),
          _entityId: s.id,
          text: s.text,
          speech: s.speech_text || s.text,
          visual: s.visual_type || 'reveal',
          icon: resolveTourIcon(s.icon_name),
          icon_name: s.icon_name || '',
          color: s.icon_color || 'text-berna-purple',
          font_style: s.font_style || 'heading',
          voice_override: s.voice_override || null,
          elevenlabs_voice_id: s.elevenlabs_voice_id || '',
          speech_speed: s.speech_speed ?? 1,
          voice_stability: s.voice_stability ?? 0.5,
          voice_similarity: s.voice_similarity ?? 0.75,
          pause_after_ms: s.pause_after_ms ?? 500,
          text_color: s.text_color || 'text-white',
          text_size: s.text_size || 'lg',
          text_alignment: s.text_alignment || 'center',
          background_type: s.background_type || 'default',
          element_layout: s.element_layout || 'centered',
          transition_in: s.transition_in || 'fade',
          transition_out: s.transition_out || 'fade',
          animation_speed: s.animation_speed || 'normal',
          generated_image_url: s.generated_image_url || '',
          image_prompt: s.image_prompt || '',
        })),
      };

      scriptCache[pathname] = built;
      setNarration(built);
    } catch (err) {
      console.error('useTourScript error, falling back to hardcoded:', err);
      const hardcoded = getHardcodedNarration(pathname);
      scriptCache[pathname] = hardcoded;
      setNarration(hardcoded);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, [pathname]);

  const refresh = () => {
    delete scriptCache[pathname];
    load();
  };

  return { narration, isLoading, refresh };
}

/** Clear the cache for a specific route (call after editing in Control Center) */
export function clearTourScriptCache(routePath) {
  if (routePath) {
    delete scriptCache[routePath];
  } else {
    Object.keys(scriptCache).forEach(k => delete scriptCache[k]);
  }
}