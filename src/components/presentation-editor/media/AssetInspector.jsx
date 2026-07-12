import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Tag, Folder, Link2, Accessibility, History, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';

function Section({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="cpe-ai-section">
      <button className="cpe-ai-section-header" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {Icon && <Icon className="w-3 h-3" />}
        <span>{title}</span>
      </button>
      {open && <div className="cpe-ai-section-body">{children}</div>}
    </div>
  );
}

export default function AssetInspector({ asset, collections, onAddToCollection, onCreateCollection, onAddTag, onRemoveTag }) {
  const [newTag, setNewTag] = useState('');
  const [newCollName, setNewCollName] = useState('');

  if (!asset) {
    return (
      <div className="cpe-asset-inspector">
        <div className="cpe-media-lib-header">
          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="cpe-panel-title">Asset Inspector</span>
        </div>
        <div className="cpe-asset-empty" style={{ padding: '2rem 1rem' }}>
          <p className="text-xs text-muted-foreground">Select an asset to inspect its properties</p>
        </div>
      </div>
    );
  }

  const handleAddTag = () => {
    if (newTag.trim()) { onAddTag(asset.id, newTag.trim()); setNewTag(''); }
  };

  const handleCreateColl = () => {
    if (newCollName.trim()) { onCreateCollection(newCollName.trim()); setNewCollName(''); }
  };

  return (
    <div className="cpe-asset-inspector">
      <div className="cpe-media-lib-header">
        <ImageIcon className="w-3.5 h-3.5 text-primary" />
        <span className="cpe-panel-title">Asset Inspector</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Asset Preview */}
        <div style={{ padding: '0.625rem', borderBottom: '1px solid hsl(var(--cpe-border-soft))' }}>
          <div style={{ aspectRatio: '16/10', borderRadius: '0.375rem', overflow: 'hidden', background: 'hsl(var(--cpe-bg) / 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {asset.thumbnail ? (
              <img src={asset.thumbnail} alt={asset.altText || asset.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <ImageIcon className="w-8 h-8" style={{ color: 'hsl(var(--cpe-text-dim) / 0.3)' }} />
            )}
          </div>
          <p style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'hsl(var(--cpe-text))', marginTop: '0.375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</p>
        </div>

        <Section title="Metadata" icon={Layers} defaultOpen>
          <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Asset ID</span><span className="cpe-ai-field-value" style={{ fontSize: '0.5rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.id}</span></div>
          <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Type</span><span className="cpe-ai-field-value capitalize">{asset.type}</span></div>
          <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Source</span><span className="cpe-ai-field-value capitalize">{asset.source}</span></div>
          {asset.resolution && <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Resolution</span><span className="cpe-ai-field-value">{asset.resolution}</span></div>}
          {asset.metadata?.aspectRatio && <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Aspect</span><span className="cpe-ai-field-value capitalize">{asset.metadata.aspectRatio}</span></div>}
          {asset.duration && <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Duration</span><span className="cpe-ai-field-value">{asset.duration}s</span></div>}
          {asset.metadata?.colorSpace && <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Color Space</span><span className="cpe-ai-field-value">{asset.metadata.colorSpace}</span></div>}
          {asset.created_date && <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Created</span><span className="cpe-ai-field-value" style={{ fontSize: '0.5rem' }}>{new Date(asset.created_date).toLocaleDateString()}</span></div>}
        </Section>

        <Section title="Usage" icon={Link2} defaultOpen>
          <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Slides Using</span><span className="cpe-ai-field-value">{asset.usedInSlides.length}</span></div>
          <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Usage Count</span><span className="cpe-ai-field-value">{asset.usageCount}</span></div>
          {asset.slideTitle && <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Last Slide</span><span className="cpe-ai-field-value" style={{ fontSize: '0.5rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset.slideTitle}</span></div>}
          {asset.usageCount === 0 && <p className="cpe-ai-hint" style={{ fontSize: '0.5rem', color: 'hsl(var(--cpe-text-dim) / 0.6)' }}>This asset is not currently used in any slide.</p>}
        </Section>

        <Section title="Tags" icon={Tag}>
          <div className="cpe-ai-tag-row">
            {asset.tags.map(tag => (
              <span key={tag} className="cpe-ai-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {tag}
                <button onClick={() => onRemoveTag(asset.id, tag)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
            {asset.tags.length === 0 && <span style={{ fontSize: '0.5rem', color: 'hsl(var(--cpe-text-dim) / 0.5)' }}>No tags yet</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
            <input className="cpe-ai-input" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} placeholder="Add tag…" />
            <button className="cpe-ai-btn" onClick={handleAddTag}><Plus className="w-2.5 h-2.5" /></button>
          </div>
        </Section>

        <Section title="Collections" icon={Folder}>
          <div className="cpe-ai-tag-row">
            {collections.map(coll => (
              <button
                key={coll.id}
                className="cpe-ai-tag"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                onClick={() => onAddToCollection(coll.id, asset.id)}
              >
                <Folder className="w-2 h-2" /> {coll.name}
              </button>
            ))}
            {collections.length === 0 && <span style={{ fontSize: '0.5rem', color: 'hsl(var(--cpe-text-dim) / 0.5)' }}>No collections yet</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
            <input className="cpe-ai-input" value={newCollName} onChange={(e) => setNewCollName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateColl()} placeholder="New collection…" />
            <button className="cpe-ai-btn" onClick={handleCreateColl}><Plus className="w-2.5 h-2.5" /></button>
          </div>
        </Section>

        <Section title="Licensing" icon={Link2}>
          <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">License</span><span className="cpe-ai-field-value">{asset.license || 'Unknown'}</span></div>
          <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Connector</span><span className="cpe-ai-field-value">{asset.connectorOrigin || 'None'}</span></div>
        </Section>

        <Section title="Accessibility" icon={Accessibility}>
          <div style={{ marginBottom: '0.375rem' }}>
            <label className="cpe-ai-field-label" style={{ display: 'block', marginBottom: '0.1875rem' }}>Alt Text</label>
            <textarea className="cpe-ai-gen-textarea" style={{ minHeight: '40px' }} value={asset.altText || ''} placeholder="Describe this asset for screen readers…" />
          </div>
          <button className="cpe-ai-btn" style={{ width: '100%', justifyContent: 'center' }}>
            <Sparkles className="w-2.5 h-2.5" /> Generate Alt Text
          </button>
        </Section>

        {asset.isAIGenerated && (
          <Section title="AI Generation History" icon={Sparkles}>
            <div className="cpe-ai-field-row"><span className="cpe-ai-field-label">Worker</span><span className="cpe-ai-field-value">{asset.aiWorkerOrigin || 'Unknown'}</span></div>
            {asset.generationPrompt && (
              <div style={{ marginTop: '0.375rem' }}>
                <span className="cpe-ai-field-label" style={{ display: 'block', marginBottom: '0.1875rem' }}>Prompt</span>
                <p style={{ fontSize: '0.5rem', color: 'hsl(var(--cpe-text) / 0.7)', lineHeight: 1.4, padding: '0.375rem', background: 'hsl(var(--cpe-bg) / 0.4)', borderRadius: '0.25rem' }}>{asset.generationPrompt}</p>
              </div>
            )}
          </Section>
        )}

        <Section title="Version History" icon={History}>
          <p className="cpe-ai-hint" style={{ fontSize: '0.5rem', color: 'hsl(var(--cpe-text-dim) / 0.5)' }}>Version history available for AI-generated assets.</p>
        </Section>
      </div>
    </div>
  );
}