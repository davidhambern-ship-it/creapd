import React from 'react';
import PresentationElement from '@/components/presentation/PresentationElement';

function getCameraStyle(cameraState, sceneProgress) {
  const behavior = cameraState?.behavior || 'static';
  const p = Math.max(0, Math.min(1, sceneProgress));

  switch (behavior) {
    case 'slow_push':
      return { transform: `scale(${1 + 0.15 * p})`, transition: 'none' };
    case 'zoom_in':
      return { transform: `scale(${1 + 0.2 * p})`, transition: 'none' };
    case 'zoom_out':
      return { transform: `scale(${1.2 - 0.2 * p})`, transition: 'none' };
    case 'pan_left':
      return { transform: `translateX(${-5 * p}%) scale(1.1)`, transition: 'none' };
    case 'pan_right':
      return { transform: `translateX(${5 * p}%) scale(1.1)`, transition: 'none' };
    case 'drift':
      return {
        transform: `translateX(${Math.sin(p * Math.PI) * 2}%) translateY(${Math.cos(p * Math.PI) * 1}%) scale(${1 + 0.05 * p})`,
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
  const layers = [...(scene.layers || [])].sort((a, b) => (a.z_order || 0) - (b.z_order || 0));

  return (
    <div className="absolute inset-0 overflow-hidden" style={cameraStyle}>
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
  );
}