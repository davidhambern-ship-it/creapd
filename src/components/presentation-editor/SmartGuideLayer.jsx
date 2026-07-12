import React from 'react';
import { CANVAS_W, CANVAS_H } from '@/lib/canvasUtils';

export default function SmartGuideLayer({ guides }) {
  if (!guides || guides.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      {guides.map((g, i) => {
        if (g.type === 'vertical') {
          return (
            <div key={i} style={{
              position: 'absolute', left: g.x, top: 0,
              width: 1, height: CANVAS_H,
              background: 'hsl(152 60% 50%)',
              boxShadow: '0 0 4px hsl(152 60% 50% / 0.5)',
            }} />
          );
        }
        return (
          <div key={i} style={{
            position: 'absolute', top: g.y, left: 0,
            width: CANVAS_W, height: 1,
            background: 'hsl(152 60% 50%)',
            boxShadow: '0 0 4px hsl(152 60% 50% / 0.5)',
          }} />
        );
      })}
    </div>
  );
}