import React from 'react';
import { Image as ImageIcon, Video, Music, Shapes, BarChart3, FileText, Mic, Disc, Film, Flag, Palette, Sparkles, Star, Eye, Copy, Trash2, ExternalLink, Wand2 } from 'lucide-react';

const TYPE_ICONS = {
  image: ImageIcon, video: Video, audio: Music, svg: Shapes, icon: Shapes,
  chart: BarChart3, document: FileText, voiceover: Mic, music: Disc, gif: Film,
  logo: Flag, brand_kit: Palette, template: Shapes, generated: Sparkles,
};

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function AssetCard({ asset, isSelected, viewMode, onSelect, onPreview, onFavorite, onDuplicate, onDelete, onDragToCanvas }) {
  const Icon = TYPE_ICONS[asset.type] || ImageIcon;

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: asset.type,
      content: asset.url,
      name: asset.name,
    }));
    onDragToCanvas?.(asset);
  };

  if (viewMode === 'list') {
    return (
      <div
        className={`cpe-asset-card list-mode ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(asset.id)}
        draggable
        onDragStart={handleDragStart}
      >
        <div className="cpe-asset-thumb-wrap">
          {asset.thumbnail ? (
            <img src={asset.thumbnail} alt={asset.altText || asset.name} className="cpe-asset-thumb" />
          ) : (
            <Icon className="w-4 h-4 cpe-asset-thumb-placeholder" />
          )}
        </div>
        <div className="cpe-asset-info">
          <span className="cpe-asset-name">{asset.name}</span>
          <div className="cpe-asset-meta">
            <Icon className="w-2.5 h-2.5 cpe-asset-type-icon" />
            <span>{asset.type}</span>
            {asset.resolution && <span>· {asset.resolution}</span>}
            {asset.usageCount > 0 && <span>· {asset.usageCount} uses</span>}
          </div>
        </div>
        <button
          className={`cpe-asset-fav-btn ${asset.isFavorite ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onFavorite(asset.id); }}
        >
          <Star className={`w-3 h-3 ${asset.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`cpe-asset-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(asset.id)}
      draggable
      onDragStart={handleDragStart}
      onDoubleClick={() => onPreview(asset)}
    >
      <div className="cpe-asset-thumb-wrap">
        {asset.thumbnail ? (
          <img src={asset.thumbnail} alt={asset.altText || asset.name} className="cpe-asset-thumb" loading="lazy" />
        ) : (
          <Icon className="w-8 h-8 cpe-asset-thumb-placeholder" />
        )}

        <div className="cpe-asset-badges">
          {asset.isAIGenerated && (
            <span className="cpe-asset-badge ai"><Sparkles className="w-2 h-2" /> AI</span>
          )}
          {asset.connectorOrigin && (
            <span className="cpe-asset-badge connector">{asset.connectorOrigin}</span>
          )}
          {asset.usageCount > 0 && (
            <span className="cpe-asset-badge usage">{asset.usageCount}×</span>
          )}
        </div>

        <button
          className={`cpe-asset-fav-btn ${asset.isFavorite ? 'active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onFavorite(asset.id); }}
        >
          <Star className={`w-3 h-3 ${asset.isFavorite ? 'fill-current' : ''}`} />
        </button>

        <div className="cpe-asset-hover-actions">
          <button className="cpe-asset-hover-btn" onClick={(e) => { e.stopPropagation(); onPreview(asset); }} title="Preview">
            <Eye className="w-3 h-3" />
          </button>
          <button className="cpe-asset-hover-btn" onClick={(e) => { e.stopPropagation(); onSelect(asset.id); }} title="Inspect">
            <ExternalLink className="w-3 h-3" />
          </button>
          <button className="cpe-asset-hover-btn" onClick={(e) => { e.stopPropagation(); onDuplicate(asset); }} title="Duplicate">
            <Copy className="w-3 h-3" />
          </button>
          {asset.isAIGenerated && (
            <button className="cpe-asset-hover-btn" onClick={(e) => { e.stopPropagation(); }} title="Enhance">
              <Wand2 className="w-3 h-3" />
            </button>
          )}
          <button className="cpe-asset-hover-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(asset); }} title="Delete">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="cpe-asset-info">
        <span className="cpe-asset-name">{asset.name}</span>
        <div className="cpe-asset-meta">
          <Icon className="w-2.5 h-2.5 cpe-asset-type-icon" />
          <span className="capitalize">{asset.type}</span>
          {asset.resolution && <span>· {asset.resolution}</span>}
          {asset.size && <span>· {formatSize(asset.size)}</span>}
        </div>
      </div>
    </div>
  );
}