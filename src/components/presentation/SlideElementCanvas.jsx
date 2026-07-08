import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const CANVAS_W = 1280;
const CANVAS_H = 720;

function parseStyle(el) {
  try { return JSON.parse(el.style || '{}'); } catch { return {}; }
}

function parseBG(slide) {
  try {
    const bg = JSON.parse(slide?.background || '{}');
    if (bg.image_url) return { backgroundImage: `url(${bg.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (bg.gradient) return { background: bg.gradient };
    if (bg.color) return { background: bg.color };
  } catch {}
  return { background: '#0a0a0a' };
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

function ElementRenderer({ element }) {
  if (!element.visible) return null;

  const style = parseStyle(element);

  const elStyle = {
    position: 'absolute',
    left: element.x, top: element.y,
    width: element.width, height: element.height,
    transform: `rotate(${element.rotation || 0}deg)`,
    opacity: (element.opacity ?? 100) / 100,
    zIndex: element.z_index || 0,
    fontSize: `${style.fontSize || 16}px`,
    fontFamily: style.fontFamily || 'inherit',
    color: style.color || '#fff',
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    textAlign: style.align || 'left',
    backgroundColor: element.type === 'shape' ? (style.backgroundColor || '#3b82f6') : (style.backgroundColor || 'transparent'),
    borderRadius: style.borderRadius || (element.type === 'shape' ? '4px' : 0),
    borderWidth: style.borderWidth ? `${style.borderWidth}px` : 0,
    borderColor: style.borderColor || 'transparent',
    borderStyle: style.borderWidth ? 'solid' : 'none',
    padding: style.padding ? `${style.padding}px` : '4px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  const renderContent = () => {
    switch (element.type) {
      case 'image':
        return element.content
          ? <img src={element.content} alt="" className="w-full h-full object-cover" draggable={false} />
          : null;
      case 'video':
        return element.content
          ? <video src={element.content} className="w-full h-full object-cover" autoPlay muted loop />
          : null;
      case 'audio':
        return element.content
          ? <audio src={element.content} controls autoPlay className="w-full" />
          : null;
      case 'shape':
        return null;
      default:
        return <div className="whitespace-pre-wrap break-words">{element.content}</div>;
    }
  };

  return <div style={elStyle}>{renderContent()}</div>;
}

export default function SlideElementCanvas({ slide }) {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const { width: containerWidth } = useElementSize(containerRef);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slide?.id) { setLoading(false); return; }
      setLoading(true);
      try {
        const els = await base44.entities.SlideElement.filter({ slide_id: slide.id });
        if (!cancelled) setElements(els || []);
      } catch {
        if (!cancelled) setElements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [slide?.id]);

  const scale = containerWidth > 0 ? containerWidth / CANVAS_W : 1;
  const sorted = [...elements].sort((a, b) => (a.z_index || 0) - (b.z_index || 0));

  return (
    <div ref={containerRef} className="absolute inset-0 flex items-center justify-center">
      <div
        className="relative shadow-2xl overflow-hidden"
        style={{
          width: containerWidth || '100%',
          height: (containerWidth || CANVAS_W) * (CANVAS_H / CANVAS_W),
          ...parseBG(slide),
        }}
      >
        {/* Fixed 1280×720 canvas scaled to fit */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: CANVAS_W, height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          ) : sorted.length > 0 ? (
            sorted.map(el => <ElementRenderer key={el.id} element={el} />)
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              {slide?.title && (
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                  {slide.title}
                </h2>
              )}
              {slide?.body_text && (
                <p className="text-sm md:text-base text-white/80 whitespace-pre-wrap max-w-2xl">
                  {slide.body_text}
                </p>
              )}
              {!slide?.title && !slide?.body_text && (
                <p className="text-white/30 text-sm">No content on this slide</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}