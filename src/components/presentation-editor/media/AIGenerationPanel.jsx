import React, { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, PenTool, Shapes, BarChart3, Video, Mic, Disc, QrCode, Flag, Palette, FileText, Layout, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const GEN_TYPES = [
  { key: 'image', label: 'Image', icon: ImageIcon },
  { key: 'illustration', label: 'Illustration', icon: PenTool },
  { key: 'svg', label: 'SVG Graphic', icon: Shapes },
  { key: 'icon', label: 'Icon', icon: Shapes },
  { key: 'infographic', label: 'Infographic', icon: BarChart3 },
  { key: 'background', label: 'Background', icon: Layout },
  { key: 'thumbnail', label: 'Thumbnail', icon: ImageIcon },
  { key: 'video_prompt', label: 'Video Prompt', icon: Video },
  { key: 'voiceover', label: 'Voiceover', icon: Mic },
  { key: 'music_prompt', label: 'Music Prompt', icon: Disc },
  { key: 'sfx', label: 'Sound Effects', icon: Disc },
  { key: 'qr_code', label: 'QR Code', icon: QrCode },
  { key: 'logo', label: 'Logo Variation', icon: Flag },
  { key: 'brand_asset', label: 'Brand Asset', icon: Palette },
];

export default function AIGenerationPanel({ isOpen, onClose, onGenerated }) {
  const [genType, setGenType] = useState('image');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      if (['image', 'illustration', 'background', 'thumbnail', 'logo', 'brand_asset'].includes(genType)) {
        const result = await base44.integrations.Core.GenerateImage({ prompt });
        onGenerated?.({ type: 'image', url: result.file_url || result.url, prompt, source: 'generated', isAIGenerated: true });
      } else if (genType === 'voiceover') {
        const result = await base44.integrations.Core.GenerateSpeech({ text: prompt });
        onGenerated?.({ type: 'voiceover', url: result.url, prompt, source: 'generated', isAIGenerated: true });
      } else if (genType === 'video_prompt') {
        const result = await base44.integrations.Core.GenerateVideo({ prompt });
        onGenerated?.({ type: 'video', url: result.url, prompt, source: 'generated', isAIGenerated: true });
      } else {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate a ${genType} based on: ${prompt}`,
          response_json_schema: { type: 'object', properties: { content: { type: 'string' }, description: { type: 'string' } } },
        });
        onGenerated?.({ type: genType, url: result.content, prompt, source: 'generated', isAIGenerated: true, description: result.description });
      }
      setPrompt('');
      onClose();
    } catch (err) {
      setError(err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="cpe-ai-gen-overlay" onClick={onClose}>
      <div className="cpe-ai-gen-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cpe-ai-gen-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles className="w-4 h-4 text-primary" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>AI Media Generation</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'hsl(var(--cpe-text-dim))', cursor: 'pointer' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="cpe-ai-gen-body">
          <div>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--cpe-text-dim))' }}>Generator Type</label>
            <div className="cpe-ai-gen-grid">
              {GEN_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.key}
                    className={`cpe-ai-gen-type ${genType === type.key ? 'active' : ''}`}
                    onClick={() => setGenType(type.key)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="cpe-ai-gen-type-label">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.5625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'hsl(var(--cpe-text-dim))' }}>Prompt</label>
            <textarea
              className="cpe-ai-gen-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Describe the ${genType} you want to generate…`}
              disabled={generating}
            />
          </div>

          {error && <p style={{ fontSize: '0.625rem', color: 'hsl(0 72% 55%)' }}>{error}</p>}
        </div>

        <div className="cpe-ai-gen-footer">
          <button className="cpe-ai-btn" onClick={onClose} style={{ background: 'hsl(var(--cpe-surface-3) / 0.5)', borderColor: 'hsl(var(--cpe-border-soft))', color: 'hsl(var(--cpe-text-dim))' }}>
            Cancel
          </button>
          <button className="cpe-ai-btn" onClick={handleGenerate} disabled={generating || !prompt.trim()} style={{ opacity: (generating || !prompt.trim()) ? 0.5 : 1 }}>
            {generating ? (
              <><Wand2 className="w-3 h-3 animate-pulse" /> Generating…</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Generate</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}