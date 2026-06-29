import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Languages, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const LANGUAGES = [
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ru', label: 'Russian' },
];

export default function TranslationPanel({ pkg, onPackageUpdate }) {
  const [translating, setTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('es');
  const [error, setError] = useState(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const handleTranslate = async () => {
    setTranslating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('translateContent', {
        package_id: pkg.id,
        target_language: targetLang,
        fields: ['teleprompter_script', 'social_caption'],
      });
      onPackageUpdate(res.data.package);
      setShowTranslated(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const langLabel = LANGUAGES.find(l => l.value === pkg.translation_language)?.label || '';

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Languages className="w-3.5 h-3.5 text-berna-emerald" />
          <span className="text-xs font-semibold text-white">Translation</span>
        </div>
        {pkg.translation_language && (
          <span className="text-[9px] text-berna-emerald bg-berna-emerald/10 px-1.5 py-0.5 rounded">{langLabel}</span>
        )}
      </div>
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Translate to:</span>
          <Select value={targetLang} onValueChange={setTargetLang}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-[10px] h-7 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[10px] border-berna-emerald/20 text-berna-emerald hover:bg-berna-emerald/10"
            onClick={handleTranslate}
            disabled={translating || !pkg.teleprompter_script}
          >
            {translating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Languages className="w-3 h-3 mr-1" />}
            {translating ? 'Translating...' : 'Translate'}
          </Button>
        </div>

        {error && <p className="text-[10px] text-red-400">{error}</p>}

        {pkg.translated_script && (
          <div className="space-y-1.5">
            <button
              onClick={() => setShowTranslated(!showTranslated)}
              className="flex items-center gap-1 text-[10px] text-berna-emerald hover:underline"
            >
              <Check className="w-3 h-3" />
              {showTranslated ? 'Hide' : 'Show'} {langLabel} translation
            </button>
            {showTranslated && (
              <div className="space-y-2">
                <div>
                  <p className="text-[9px] text-muted-foreground font-semibold mb-0.5">Translated Script</p>
                  <p className="text-[10px] text-white/80 whitespace-pre-wrap bg-white/[0.02] p-2 rounded border border-white/[0.04]">{pkg.translated_script}</p>
                </div>
                {pkg.translated_caption && (
                  <div>
                    <p className="text-[9px] text-muted-foreground font-semibold mb-0.5">Translated Caption</p>
                    <p className="text-[10px] text-white/80 bg-white/[0.02] p-2 rounded border border-white/[0.04]">{pkg.translated_caption}</p>
                  </div>
                )}
                {pkg.translated_at && (
                  <p className="text-[9px] text-muted-foreground">Translated on {new Date(pkg.translated_at).toLocaleString()}</p>
                )}
              </div>
            )}
          </div>
        )}

        {!pkg.translated_script && !translating && (
          <p className="text-[9px] text-muted-foreground">Translate the teleprompter script and social caption into another language while preserving the original tone (PRD 9.19).</p>
        )}
      </div>
    </div>
  );
}