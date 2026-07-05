import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Image as ImageIcon, Loader2, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AISceneTools({ scene, onChange }) {
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are writing narration text for a guided tour scene in CREAPD, an AI production studio app (pronounced "Creeped").

Context:
- Scene ID: ${scene.scene_id || 'unknown'}
- Current text: ${scene.text || '(empty)'}

${aiPrompt ? `Additional instruction: ${aiPrompt}` : 'Generate a compelling, concise narration scene (1-2 sentences) that guides the user through this page.'}

Write in a conversational, confident tone. Return the display text and the speech text (use "Creeped" phonetic spelling in speech text).`,
        response_json_schema: {
          type: 'object',
          properties: {
            display_text: { type: 'string', description: 'Text shown on screen' },
            speech_text: { type: 'string', description: 'Text spoken by TTS (use "Creeped" for CREAPD)' },
          },
        },
      });
      if (result.display_text) onChange('text', result.display_text);
      if (result.speech_text) onChange('speech_text', result.speech_text);
    } catch (err) {
      console.error('AI script generation failed:', err);
    }
    setIsGeneratingScript(false);
  };

  const handleGenerateImage = async () => {
    const prompt = scene.image_prompt || scene.text || '';
    if (!prompt) return;
    setIsGeneratingImage(true);
    try {
      const result = await base44.integrations.Core.GenerateImage({
        prompt: `A cinematic, modern, abstract illustration for a guided tour scene. Scene context: "${prompt}". Style: dark background with purple and orange neon accents, glassmorphism, futuristic UI aesthetic, clean and minimal.`,
      });
      if (result.url) onChange('generated_image_url', result.url);
    } catch (err) {
      console.error('AI image generation failed:', err);
    }
    setIsGeneratingImage(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Wand2 className="w-3 h-3" /> AI Script Generation
        </Label>
        <Textarea
          value={aiPrompt}
          onChange={e => setAiPrompt(e.target.value)}
          rows={2}
          className="bg-white/[0.03] border-white/[0.08] text-sm"
          placeholder="Optional: describe what the narration should cover (e.g. 'Explain the story queue scoring system')"
        />
        <Button variant="outline" size="sm" className="w-full" onClick={handleGenerateScript} disabled={isGeneratingScript}>
          {isGeneratingScript ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
          Generate Script Text
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> AI Scene Image
        </Label>
        <Textarea
          value={scene.image_prompt || ''}
          onChange={e => onChange('image_prompt', e.target.value)}
          rows={2}
          className="bg-white/[0.03] border-white/[0.08] text-sm"
          placeholder="Image prompt (describe the visual you want)"
        />
        {scene.generated_image_url && (
          <div className="rounded-lg overflow-hidden border border-white/[0.08]">
            <img src={scene.generated_image_url} alt="Generated scene" className="w-full h-32 object-cover" />
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={handleGenerateImage}
          disabled={isGeneratingImage || (!scene.image_prompt && !scene.text)}>
          {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <ImageIcon className="w-3.5 h-3.5 mr-1" />}
          Generate Image
        </Button>
      </div>
    </div>
  );
}