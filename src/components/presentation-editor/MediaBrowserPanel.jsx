import React from 'react';
import { Image as ImageIcon, Video, Music, Plus, Shapes, BarChart3 } from 'lucide-react';

const TYPE_ICONS = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  icon: Shapes,
  shape: Shapes,
  chart: BarChart3,
};

export default function MediaBrowserPanel({ elements, slide, onAddElement, onSelectElement, selectedId }) {
  const mediaElements = (elements || []).filter(e =>
    ['image', 'video', 'audio', 'icon', 'shape', 'chart'].includes(e.type)
  );

  const grouped = {
    Images: mediaElements.filter(e => e.type === 'image'),
    Videos: mediaElements.filter(e => e.type === 'video'),
    Audio: mediaElements.filter(e => e.type === 'audio'),
    Graphics: mediaElements.filter(e => ['icon', 'shape', 'chart'].includes(e.type)),
  };

  return (
    <div className="cpe-side-panel flex flex-col h-full">
      <div className="cpe-panel-header">
        <ImageIcon className="w-4 h-4" />
        <span className="cpe-panel-title">Media Browser</span>
        <span className="cpe-panel-sub">{mediaElements.length} assets</span>
      </div>

      <div className="cpe-ws-add-row">
        <button className="cpe-tool-btn" onClick={() => onAddElement?.('image')}><ImageIcon className="w-3.5 h-3.5" /> Image</button>
        <button className="cpe-tool-btn" onClick={() => onAddElement?.('video')}><Video className="w-3.5 h-3.5" /> Video</button>
        <button className="cpe-tool-btn" onClick={() => onAddElement?.('audio')}><Music className="w-3.5 h-3.5" /> Audio</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {Object.entries(grouped).map(([label, items]) =>
          items.length > 0 && (
            <div key={label}>
              <h4 className="cpe-media-group-label">{label} ({items.length})</h4>
              <div className="grid grid-cols-2 gap-2">
                {items.map(el => {
                  const Icon = TYPE_ICONS[el.type] || ImageIcon;
                  const isSelected = selectedId === el.id;
                  return (
                    <button
                      key={el.id}
                      className={`cpe-media-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectElement?.(el.id)}
                    >
                      {el.type === 'image' && el.content ? (
                        <img src={el.content} alt="" className="cpe-media-thumb" />
                      ) : (
                        <div className="cpe-media-placeholder">
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                      <span className="cpe-media-label">
                        {(el.content || el.type).substring(0, 24)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )
        )}

        {mediaElements.length === 0 && (
          <div className="cpe-empty-media">
            <p className="text-xs text-muted-foreground">No media on this slide.</p>
            <button className="cpe-tool-btn" onClick={() => onAddElement?.('image')}>
              <Plus className="w-3.5 h-3.5" /> Add Media
            </button>
          </div>
        )}
      </div>
    </div>
  );
}