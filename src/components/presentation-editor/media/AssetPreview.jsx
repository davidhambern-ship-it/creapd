import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Play, Pause } from 'lucide-react';

export default function AssetPreview({ asset, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);

  if (!asset) return null;

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.5, Math.min(5, z + delta)));
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    const startX = e.clientX - pan.x;
    const startY = e.clientY - pan.y;
    const onMove = (ev) => setPan({ x: ev.clientX - startX, y: ev.clientY - startY });
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  return (
    <div className="cpe-asset-preview-overlay" onClick={onClose}>
      <div className="cpe-asset-preview-container" onClick={(e) => e.stopPropagation()}>
        <button className="cpe-asset-preview-close" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>

        <div className="cpe-asset-preview-main" onWheel={handleWheel} onMouseDown={handleMouseDown} style={{ cursor: zoom > 1 ? 'grab' : 'default' }}>
          {asset.type === 'image' || asset.type === 'gif' || asset.type === 'svg' ? (
            <img
              src={asset.url}
              alt={asset.altText || asset.name}
              className="cpe-asset-preview-img"
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transition: zoom === 1 ? 'transform 0.2s ease' : 'none' }}
            />
          ) : asset.type === 'video' ? (
            <video
              src={asset.url}
              className="cpe-asset-preview-img"
              controls
              autoPlay={isPlaying}
              onClick={() => setIsPlaying(!isPlaying)}
            />
          ) : asset.type === 'audio' || asset.type === 'voiceover' || asset.type === 'music' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem' }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'hsl(var(--cpe-accent) / 0.15)', border: '1px solid hsl(var(--cpe-accent) / 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--cpe-accent))', cursor: 'pointer' }}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>
              <audio src={asset.url} autoPlay={isPlaying} onEnded={() => setIsPlaying(false)} controls style={{ width: '300px' }} />
              <div style={{ width: '300px', height: '40px', background: 'hsl(var(--cpe-bg))', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '1px', alignItems: 'center', height: '100%' }}>
                  {Array.from({ length: 60 }).map((_, i) => (
                    <div key={i} style={{ width: '2px', height: `${Math.random() * 80 + 10}%`, background: 'hsl(var(--cpe-accent) / 0.4)', borderRadius: '1px' }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.75rem' }}>Preview not available for this asset type</p>
              <p style={{ fontSize: '0.5625rem', color: 'hsl(0 0% 60%)', marginTop: '0.5rem' }}>{asset.url}</p>
            </div>
          )}
        </div>

        {(asset.type === 'image' || asset.type === 'gif' || asset.type === 'svg') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <button className="cpe-asset-hover-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}><ZoomOut className="w-3 h-3" /></button>
            <span style={{ fontSize: '0.5625rem', color: 'hsl(0 0% 60%)', fontFamily: 'monospace', minWidth: '3rem', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button className="cpe-asset-hover-btn" onClick={() => setZoom(z => Math.min(5, z + 0.25))}><ZoomIn className="w-3 h-3" /></button>
            <button className="cpe-asset-hover-btn" onClick={resetView}><RotateCcw className="w-3 h-3" /></button>
          </div>
        )}

        <div className="cpe-asset-preview-info">
          <span className="cpe-asset-preview-name">{asset.name}</span>
          <span className="cpe-asset-preview-meta">{asset.type.toUpperCase()}</span>
          {asset.resolution && <span className="cpe-asset-preview-meta">{asset.resolution}</span>}
          {asset.isAIGenerated && <span className="cpe-asset-preview-meta" style={{ color: 'hsl(270 80% 70%)' }}>AI Generated</span>}
        </div>
      </div>
    </div>
  );
}