import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function AssetEditor({ assetKey, label, icon: Icon, value, onChange, onRegenerate, generating, manual }) {
  const [localValue, setLocalValue] = useState(value || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => { setLocalValue(value || ''); }, [value]);

  const isGenerating = generating === assetKey;

  const handleSave = () => {
    onChange(assetKey, localValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-berna-purple" />
          <span className="text-xs font-semibold text-white">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          {saved && <span className="text-[10px] text-berna-emerald flex items-center gap-0.5"><Check className="w-3 h-3" />Saved</span>}
          {!manual && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[10px] text-muted-foreground hover:text-berna-purple hover:bg-berna-purple/10"
              onClick={() => onRegenerate(assetKey)}
              disabled={isGenerating}
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </Button>
          )}
        </div>
      </div>
      <div className="p-3">
        {isGenerating ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 text-berna-purple animate-spin" />
              <span className="text-[10px] text-muted-foreground">Generating {label}...</span>
            </div>
          </div>
        ) : (
          <>
            <Textarea
              value={localValue}
              onChange={e => setLocalValue(e.target.value)}
              className="bg-white/[0.02] border-white/[0.06] text-white text-sm min-h-40 resize-y"
              placeholder={`No ${label.toLowerCase()} generated yet. Click Regenerate to create one.`}
            />
            {localValue !== (value || '') && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-[10px] border-white/10 text-white hover:bg-white/[0.04]"
                onClick={handleSave}
              >
                Save Changes
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}