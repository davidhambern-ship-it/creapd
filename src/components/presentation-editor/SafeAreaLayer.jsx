import React from 'react';

export default function SafeAreaLayer({ showGrid, showSafeAreas }) {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9998 }}>
      {showGrid && (
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(0 0% 100% / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, hsl(0 0% 100% / 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />
      )}
      {showSafeAreas && (
        <>
          {/* Action safe (5% margin) */}
          <div className="absolute" style={{
            left: '5%', top: '5%', right: '5%', bottom: '5%',
            border: '1px dashed hsl(0 0% 100% / 0.12)',
          }} />
          {/* Title safe (10% margin) */}
          <div className="absolute" style={{
            left: '10%', top: '10%', right: '10%', bottom: '10%',
            border: '1px dashed hsl(38 80% 52% / 0.25)',
          }} />
          {/* Center cross */}
          <div className="absolute" style={{
            left: '50%', top: 0, bottom: 0, width: 1,
            background: 'hsl(0 0% 100% / 0.06)',
          }} />
          <div className="absolute" style={{
            top: '50%', left: 0, right: 0, height: 1,
            background: 'hsl(0 0% 100% / 0.06)',
          }} />
        </>
      )}
    </div>
  );
}