import React, { useCallback } from 'react';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import MediaLibrary from './MediaLibrary';
import AssetBrowser from './AssetBrowser';
import AssetInspector from './AssetInspector';
import AssetPreview from './AssetPreview';
import AIGenerationPanel from './AIGenerationPanel';
import './media.css';

export default function MediaModeLayout({ ed }) {
  const ml = useMediaLibrary(ed.slides, ed.elements, ed.presentation);

  const totalStorage = React.useMemo(() => {
    return (ml.assets || []).reduce((sum, a) => sum + (a.size || 0), 0) / 1048576;
  }, [ml.assets]);

  const handleSelect = useCallback((assetId) => {
    ml.setSelectedAssetId(assetId);
  }, [ml]);

  const handlePreview = useCallback((asset) => {
    ml.setPreviewAsset(asset);
  }, [ml]);

  const handleFavorite = useCallback((assetId) => {
    ml.toggleFavorite(assetId);
  }, [ml]);

  const handleDuplicate = useCallback((asset) => {
    if (!asset) return;
    ed.addElement?.(asset.type, { content: asset.url, name: `${asset.name} copy` });
  }, [ed]);

  const handleDelete = useCallback((asset) => {
    if (!asset) return;
    if (asset.usageCount > 0) {
      const proceed = window.confirm(`"${asset.name}" is used in ${asset.usageCount} slide(s). Delete anyway?`);
      if (!proceed) return;
    }
    // In a full implementation, this would remove the asset from the library
    ml.setSelectedAssetId(null);
  }, [ml, ed]);

  const handleDragToCanvas = useCallback((asset) => {
    // Dragging to canvas is handled by the canvas drop handler
  }, []);

  const handleAIGenerated = useCallback((result) => {
    // Add generated asset to the current slide
    ed.addElement?.(result.type || 'image', {
      content: result.url,
      name: result.prompt?.substring(0, 30) || 'Generated Asset',
      is_ai_generated: true,
      generation_prompt: result.prompt,
      source: 'generated',
    });
  }, [ed]);

  const handleAddTag = useCallback((assetId, tag) => {
    // Tags managed in memory; full implementation would persist
  }, []);

  const handleRemoveTag = useCallback((assetId, tag) => {
    // Tags managed in memory; full implementation would persist
  }, []);

  return (
    <>
      <div className="cpe-media-layout">
        <MediaLibrary
          activeCategory={ml.activeCategory}
          setActiveCategory={ml.setActiveCategory}
          categoryCounts={ml.categoryCounts}
          collections={ml.collections}
          totalStorage={totalStorage}
        />

        <AssetBrowser
          assets={ml.assets}
          filteredAssets={ml.filteredAssets}
          searchQuery={ml.searchQuery}
          setSearchQuery={ml.setSearchQuery}
          activeFilters={ml.activeFilters}
          toggleFilter={ml.toggleFilter}
          sortOrder={ml.sortOrder}
          setSortOrder={ml.setSortOrder}
          viewMode={ml.viewMode}
          setViewMode={ml.setViewMode}
          selectedAssetId={ml.selectedAssetId}
          onSelect={handleSelect}
          onPreview={handlePreview}
          onFavorite={handleFavorite}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onDragToCanvas={handleDragToCanvas}
          onOpenAI={() => ml.setAiPanelOpen(true)}
          onImport={() => ed.addElement?.('image')}
        />

        <AssetInspector
          asset={ml.selectedAsset}
          collections={ml.collections}
          onAddToCollection={ml.addToCollection}
          onCreateCollection={ml.createCollection}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
        />
      </div>

      {ml.previewAsset && (
        <AssetPreview asset={ml.previewAsset} onClose={() => ml.setPreviewAsset(null)} />
      )}

      <AIGenerationPanel
        isOpen={ml.aiPanelOpen}
        onClose={() => ml.setAiPanelOpen(false)}
        onGenerated={handleAIGenerated}
      />
    </>
  );
}