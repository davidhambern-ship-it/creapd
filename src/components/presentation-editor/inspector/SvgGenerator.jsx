import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from './shared';
import { Wand2, Loader2, FileCode } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SvgGenerator({ colorScheme, onInsert }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const colors = colorScheme
        ? ` You MUST use these exact presentation colors in the SVG: primary color ${colorScheme.primary || '#7c3aed'} (use for the main icon/focal elements), accent color ${colorScheme.accent || '#ffffff'} (use for highlights, outlines, and secondary details), background color ${colorScheme.background || '#0a0a0a'} (the slide background the icon will sit on — do not fill the SVG with this, but ensure the icon contrasts well against it). Apply the primary color to the dominant shapes and the accent color to supporting elements so the icon looks native to this presentation's palette.`
        : '';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a clean, scalable SVG illustration for the following request. Output ONLY valid SVG markup — no markdown, no code fences, no explanation. Use proper viewBox, semantic groups, and clean paths. Keep it self-contained (inline styles or attributes, no external refs).${colors} Request: "${prompt.trim()}"`,
        response_json_schema: {
          type: 'object',
          properties: {
            svg: { type: 'string', description: 'Complete valid SVG markup' },
          },
        },
      });

      let svgMarkup = result.svg || (typeof result === 'string' ? result : '');
      // Strip markdown code fences if present
      svgMarkup = svgMarkup.replace(/^```(?:svg|xml|html)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

      if (!svgMarkup.startsWith('<svg')) {
        throw new Error('AI did not return valid SVG markup');
      }

      setPreview({ markup: svgMarkup, dataUri: `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}` });
    } catch (err) {
      setError(err.message || 'Failed to generate SVG');
    } finally {
      setLoading(false);
    }
  };

  const insert = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const blob = new Blob([preview.markup], { type: 'image/svg+xml' });
      const file = new File([blob], `ai-svg-${Date.now()}.svg`, { type: 'image/svg+xml' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onInsert(file_url);
      setPreview(null);
      setPrompt('');
    } catch (err) {
      setError(err.message || 'Failed to upload SVG');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Field label="Describe the SVG">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="e.g. A minimalist mountain landscape with sun, flat design, blue and orange"
          className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5"
        />
      </Field>

      {preview && (
        <div className="border border-border rounded-md p-2 bg-background/50">
          <div className="flex items-center justify-center bg-muted/30 rounded h-24 overflow-hidden">
            <img src={preview.dataUri} alt="SVG preview" className="max-w-full max-h-24" />
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      <div className="flex gap-1">
        {preview ? (
          <>
            <Button variant="default" size="sm" className="flex-1 h-7 text-[10px]" disabled={loading} onClick={insert}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCode className="w-3 h-3" />}
              {loading ? 'Saving...' : 'Insert SVG'}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" disabled={loading} onClick={() => setPreview(null)}>
              Discard
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="w-full h-7 text-[10px]" disabled={loading || !prompt.trim()} onClick={generate}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
            {loading ? 'Generating...' : 'Generate SVG'}
          </Button>
        )}
      </div>
    </div>
  );
}