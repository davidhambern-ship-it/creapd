import React from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssetEditor from '@/components/production/AssetEditor';

const SCRIPT_KEYS = ['teleprompter_script', 'show_script', 'story_summary', 'talking_points', 'lower_third_text', 'headline_suggestions'];

export default function ScriptStage({ pkg, assetDefs, edits, handleAssetChange, handleRegenerate, generating, handleRegenerateAssets }) {
  const scriptAssets = assetDefs.filter(a => SCRIPT_KEYS.includes(a.key));
  const busy = generating !== null;

  return (
    <div className="space-y-3">
      <Button className="w-full bg-berna-purple/80 hover:bg-berna-purple text-white h-9" onClick={() => handleRegenerateAssets(scriptAssets.map(a => a.key))} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        Regenerate Script Assets
      </Button>
      {scriptAssets.map(def => (
        <AssetEditor
          key={def.key}
          assetKey={def.key}
          label={def.label}
          icon={def.icon}
          value={pkg?.[def.key] || ''}
          onChange={handleAssetChange}
          onRegenerate={handleRegenerate}
          generating={generating}
        />
      ))}
    </div>
  );
}