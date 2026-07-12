import React from 'react';
import PresentationElement from '@/components/presentation/PresentationElement';

const BACKGROUND_CLASS = {
  gradient_orb: 'scene-bg-gradient-orb',
  particle_field: 'scene-bg-particle-field',
  grid_floor: 'scene-bg-grid-floor',
  glassmorphism: 'scene-bg-glassmorphism',
  neon_glow: 'scene-bg-neon-glow',
  scan_lines: 'scene-bg-scan-lines',
  circuit_pattern: 'scene-bg-circuit-pattern',
  data_stream: 'scene-bg-data-stream',
  energy_rings: 'scene-bg-energy-rings',
  gradient_mesh: 'scene-bg-gradient-mesh',
  dark_gradient: 'scene-bg-dark-gradient',
  warm_gradient: 'scene-bg-warm-gradient',
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
  const bgClass = BACKGROUND_CLASS[scene.background_design] || BACKGROUND_CLASS.dark_gradient;
  const layers = [...(scene.layers || [])].sort((a, b) => (a.z_order || 0) - (b.z_order || 0));

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className={`absolute inset-0 ${bgClass}`} />
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