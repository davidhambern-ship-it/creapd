import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, LayoutGrid, List, Sparkles, Upload, Package } from 'lucide-react';
import { FILTER_CHIPS } from '@/hooks/useMediaLibrary';
import AssetCard from './AssetCard';

export default function AssetBrowser({
  assets, filteredAssets, searchQuery, setSearchQuery,
  activeFilters, toggleFilter, sortOrder, setSortOrder,
  viewMode, setViewMode, selectedAssetId,
  onSelect, onPreview, onFavorite, onDuplicate, onDelete, onDragToCanvas,
  onOpenAI, onImport,
}) {
  return (
    <div className="cpe-media-browser">
      <div className="cpe-media-toolbar">
        <div className="cpe-media-search">
          <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search assets, tags, metadata…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button className="cpe-ai-btn" onClick={onOpenAI}>
          <Sparkles className="w-3 h-3" /> Generate
        </button>

        <button className="cpe-ai-btn" onClick={onImport} style={{ background: 'hsl(var(--cpe-surface-3) / 0.5)', borderColor: 'hsl(var(--cpe-border-soft))', color: 'hsl(var(--cpe-text-dim))' }}>
          <Upload className="w-3 h-3" /> Import
        </button>

        <div className="cpe-media-sort-select" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <ArrowUpDown className="w-2.5 h-2.5" />
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="bg-transparent border-none outline-none cursor-pointer" style={{ fontSize: '0.5625rem', color: 'inherit' }}>
            <option value="recent">Recent</option>
            <option value="name">Name A-Z</option>
            <option value="usage">Most Used</option>
          </select>
        </div>

        <div className="cpe-media-view-toggle">
          <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid View">
            <LayoutGrid className="w-3 h-3" />
          </button>
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List View">
            <List className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="cpe-media-filter-row">
        <SlidersHorizontal className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.key}
            className={`cpe-media-filter-chip ${activeFilters.includes(chip.key) ? 'active' : ''}`}
            onClick={() => toggleFilter(chip.key)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="cpe-media-grid">
        {filteredAssets.length > 0 ? (
          <div className={`cpe-media-grid-inner ${viewMode === 'list' ? 'list-mode' : ''}`}>
            {filteredAssets.map(asset => (
              <AssetCard
                key={asset.id}
                asset={asset}
                isSelected={selectedAssetId === asset.id}
                viewMode={viewMode}
                onSelect={onSelect}
                onPreview={onPreview}
                onFavorite={onFavorite}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onDragToCanvas={onDragToCanvas}
              />
            ))}
          </div>
        ) : (
          <div className="cpe-asset-empty">
            <Package className="w-12 h-12 opacity-30" />
            <p className="text-sm">{searchQuery || activeFilters.length > 0 ? 'No assets match your filters' : 'No assets in library yet'}</p>
            <p className="text-xs text-muted-foreground">Generate AI media or import files to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}