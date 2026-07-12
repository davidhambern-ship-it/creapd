import React, { useState } from 'react';
import { Package, Image as ImageIcon, PenTool, Shapes, Video, Music, Mic, Disc, Film, BarChart3, FileText, Flag, Palette, Sparkles, Layout, Star, Clock, FolderPlus, Folder, HardDrive } from 'lucide-react';
import { ASSET_CATEGORIES } from '@/hooks/useMediaLibrary';

const ICON_MAP = { Package, Image: ImageIcon, PenTool, Shapes, Video, Music, Mic, Disc, Film, BarChart3, FileText, Flag, Palette, Sparkles, Layout };

export default function MediaLibrary({ activeCategory, setActiveCategory, categoryCounts, collections, totalStorage }) {
  const [showCollections, setShowCollections] = useState(true);

  return (
    <div className="cpe-media-library">
      <div className="cpe-media-lib-header">
        <Package className="w-3.5 h-3.5 text-primary" />
        <span className="cpe-panel-title">Media Library</span>
      </div>

      <div className="cpe-media-lib-body">
        <div className="cpe-media-lib-section">
          <div className="cpe-media-lib-section-title">Categories</div>
          {ASSET_CATEGORIES.map(cat => {
            const Icon = ICON_MAP[cat.icon] || Package;
            const isActive = activeCategory === cat.key;
            const count = categoryCounts[cat.key] || 0;
            return (
              <button
                key={cat.key}
                className={`cpe-media-cat-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.key)}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{cat.label}</span>
                <span className="cpe-media-cat-count">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="cpe-media-lib-section">
          <div className="cpe-media-lib-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Collections</span>
            <button className="text-transparent hover:text-primary" title="New Collection">
              <FolderPlus className="w-3 h-3" />
            </button>
          </div>
          {collections.length === 0 ? (
            <p className="text-[0.5rem] text-muted-foreground px-2 py-1">No collections yet</p>
          ) : (
            collections.map(coll => (
              <div key={coll.id} className="cpe-media-coll-item">
                <Folder className="w-3 h-3" />
                <span>{coll.name}</span>
                <span className="cpe-media-cat-count">{coll.assetIds.length}</span>
              </div>
            ))
          )}
        </div>

        <div className="cpe-media-lib-section">
          <div className="cpe-media-lib-section-title">Quick Access</div>
          <div className="cpe-media-coll-item">
            <Star className="w-3 h-3" />
            <span>Favorites</span>
            <span className="cpe-media-cat-count">{categoryCounts.favorites || 0}</span>
          </div>
          <div className="cpe-media-coll-item">
            <Clock className="w-3 h-3" />
            <span>Recently Added</span>
          </div>
          <div className="cpe-media-coll-item">
            <Clock className="w-3 h-3" />
            <span>Recently Used</span>
          </div>
        </div>
      </div>

      <div className="cpe-media-lib-footer">
        <div className="flex items-center gap-1.5">
          <HardDrive className="w-3 h-3 text-muted-foreground" />
          <span className="text-[0.5625rem] text-muted-foreground">Storage</span>
        </div>
        <div className="cpe-media-storage-bar">
          <div className="cpe-media-storage-fill" style={{ width: `${Math.min(100, (totalStorage / 500) * 100)}%` }} />
        </div>
        <div className="text-[0.5rem] text-muted-foreground mt-0.5 font-mono">
          {totalStorage.toFixed(1)} MB used
        </div>
      </div>
    </div>
  );
}