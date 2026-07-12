import React from 'react';
import PresentationElement from '@/components/presentation/PresentationElement';

const BACKGROUND_STYLES = {
  gradient_orb: {
    background: 'radial-gradient(ellipse 60% 40% at 30% 30%, hsl(270 80% 30% / 0.35) 0%, transparent 50%), radial-gradient(ellipse 50% 35% at 70% 70%, hsl(25 95% 30% / 0.25) 0%, transparent 50%), hsl(220 20% 6%)',
  },
  particle_field: {
    background: 'hsl(220 20% 6%), radial-gradient(circle, hsl(270 80% 60% / 0.15) 1px, transparent 1px), radial-gradient(circle, hsl(25 95% 55% / 0.1) 1px, transparent 1px)',
    backgroundSize: '40px 40px, 60px 60px',
    backgroundPosition: '0 0, 20px 20px',
  },
  grid_floor: {
    background: 'hsl(220 20% 6%)',
  },
  glassmorphism: {
    background: 'radial-gradient(ellipse at 20% 30%, hsl(270 80% 30% / 0.12) 0%, transparent 40%), radial-gradient(ellipse at 80% 70%, hsl(190 80% 30% / 0.1) 0%, transparent 40%), hsl(220 20% 8%)',
  },
  neon_glow: {
    background: 'hsl(220 20% 4%)',
    boxShadow: 'inset 0 0 100px hsl(270 80% 60% / 0.15), inset 0 0 200px hsl(25 95% 55% / 0.08)',
  },
  scan_lines: {
    background: 'hsl(220 20% 6%)',
  },
  circuit_pattern: {
    background: 'hsl(220 20% 6%), linear-gradient(hsl(190 50% 40% / 0.08) 1px, transparent 1px), linear-gradient(90deg, hsl(190 50% 40% / 0.08) 1px, transparent 1px), radial-gradient(circle at 30% 40%, hsl(270 80% 50% / 0.12) 0%, transparent 30%), radial-gradient(circle at 70% 60%, hsl(25 95% 50% / 0.08) 0%, transparent 30%)',
    backgroundSize: '30px 30px, 30px 30px, 100% 100%, 100% 100%',
  },
  data_stream: {
    background: 'hsl(220 20% 6%)',
  },
  energy_rings: {
    background: 'hsl(220 20% 6%)',
  },
  gradient_mesh: {
    background: 'radial-gradient(ellipse at 20% 20%, hsl(270 80% 25% / 0.2) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, hsl(190 80% 25% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, hsl(25 95% 25% / 0.15) 0%, transparent 50%), hsl(220 20% 6%)',
  },
  dark_gradient: {
    background: 'linear-gradient(180deg, hsl(220 30% 10%) 0%, hsl(220 20% 6%) 50%, hsl(220 25% 8%) 100%)',
  },
  warm_gradient: {
    background: 'linear-gradient(135deg, hsl(25 50% 8%) 0%, hsl(270 50% 8%) 50%, hsl(220 30% 6%) 100%)',
  },
};

const SCENE_TRANSITIONS = {
  fade: 'animate-scene-fade',
  dissolve: 'animate-scene-dissolve',
  slide_left: 'animate-scene-slide-left',
  slide_right: 'animate-scene-slide-right',
  zoom: 'animate-scene-zoom',
  cut: '',
};

function getCameraStyle(cameraState, sceneProgress) {
  const behavior = cameraState?.behavior || 'static';
  const p = Math.max(0, Math.min(1, sceneProgress));

  switch (behavior) {
    case 'slow_push':
      return { transform: `scale(${1 + 0.08 * p})`, transition: 'none' };
    case 'zoom_in':
      return { transform: `scale(${1 + 0.12 * p})`, transition: 'none' };
    case 'zoom_out':
      return { transform: `scale(${1.12 - 0.12 * p})`, transition: 'none' };
    case 'pan_left':
      return { transform: `translateX(${-2 * p}%) scale(1.05)`, transition: 'none' };
    case 'pan_right':
      return { transform: `translateX(${2 * p}%) scale(1.05)`, transition: 'none' };
    case 'drift':
      return {
        transform: `translateX(${Math.sin(p * Math.PI) * 1}%) translateY(${Math.cos(p * Math.PI) * 0.5}%) scale(${1 + 0.03 * p})`,
        transition: 'none'
      };
    case 'static':
    default:
      return { transform: 'scale(1)', transition: 'none' };
  }
}

export default function SceneCanvas({ scene, slideLocalTime }) {
  if (!scene) return null;

  const sceneStart = scene.scene_start_time || 0;
  const sceneEnd = scene.scene_end_time || 999999;
  const sceneDuration = sceneEnd - sceneStart;
  const sceneProgress = sceneDuration > 0
    ? (slideLocalTime - sceneStart) / sceneDuration
    : 0;

  const cameraStyle = getCameraStyle(scene.camera_state, sceneProgress);
  const bgStyle = BACKGROUND_STYLES[scene.background_design] || BACKGROUND_STYLES.dark_gradient;
  const layers = [...(scene.layers || [])].sort((a, b) => (a.z_order || 0) - (b.z_order || 0));

  const transitionClass = SCENE_TRANSITIONS[scene.transition_type || 'dissolve'] || SCENE_TRANSITIONS.dissolve;

  return (
    <div key={scene.scene_id} className={`absolute inset-0 overflow-hidden ${transitionClass}`}>
      <div className="absolute inset-0" style={bgStyle} />
      {/* Decorative background overlays for designs that need extra visual elements */}
      {(scene.background_design === 'grid_floor' || scene.background_design === 'scan_lines' || scene.background_design === 'data_stream' || scene.background_design === 'energy_rings' || scene.background_design === 'neon_glow') && (
        <>
          {(scene.background_design === 'grid_floor') && (
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'linear-gradient(hsl(190 60% 45% / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(190 60% 45% / 0.12) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              maskImage: 'linear-gradient(to top, black, transparent)',
              WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
            }} />
          )}
          {(scene.background_design === 'neon_glow') && (
            <>
              <div className="absolute top-0 left-0 w-1/3 h-1/3 pointer-events-none" style={{ background: 'radial-gradient(circle at 0% 0%, hsl(270 80% 60% / 0.15) 0%, transparent 70%)' }} />
              <div className="absolute bottom-0 right-0 w-1/3 h-1/3 pointer-events-none" style={{ background: 'radial-gradient(circle at 100% 100%, hsl(25 95% 55% / 0.1) 0%, transparent 70%)' }} />
            </>
          )}
          {(scene.background_design === 'energy_rings') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute w-[600px] h-[600px] rounded-full border pointer-events-none" style={{ borderColor: 'hsl(270 80% 60% / 0.15)', boxShadow: 'inset 0 0 60px hsl(270 80% 60% / 0.06), 0 0 80px hsl(270 80% 60% / 0.04)' }} />
              <div className="absolute w-[400px] h-[400px] rounded-full border pointer-events-none" style={{ borderColor: 'hsl(25 95% 55% / 0.1)', borderStyle: 'dashed' }} />
            </div>
          )}
          {(scene.background_design === 'scan_lines') && (
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, hsl(190 80% 55% / 0.03) 3px, hsl(190 80% 55% / 0.03) 4px)',
            }} />
          )}
          {(scene.background_design === 'data_stream') && (
            <div className="absolute inset-0 pointer-events-none" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 20px, hsl(152 60% 45% / 0.04) 20px, hsl(152 60% 45% / 0.04) 21px)',
            }} />
          )}
        </>
      )}
      <div className="absolute inset-0" style={cameraStyle}>
        {layers.map((layer) => (
          <div key={layer.layer_id} className="absolute inset-0">
            {(layer.elements || []).map((elem) => (
              <PresentationElement
                key={elem.element_id}
                element={elem}
                slideLocalTime={slideLocalTime}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}