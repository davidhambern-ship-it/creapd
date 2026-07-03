import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AssetEditor from '@/components/production/AssetEditor';

export default function SocialStage({ pkg, assetDefs, edits, handleAssetChange, handleRegenerate, generating }) {
  const [copied, setCopied] = useState(false);
  const socialAsset = assetDefs.find(a => a.key === 'social_caption');

  const handleCopy = () => {
    const caption = edits.social_caption ?? pkg?.social_caption ?? '';
    navigator.clipboard.writeText(caption).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      {socialAsset && (
        <AssetEditor
          assetKey="social_caption"
          label="Social Media Caption"
          icon={socialAsset.icon}
          value={pkg?.social_caption || ''}
          onChange={handleAssetChange}
          onRegenerate={handleRegenerate}
          generating={generating}
        />
      )}
      <Button className="w-full h-9" variant="outline" onClick={handleCopy} disabled={!pkg?.social_caption && !edits.social_caption}>
        {copied
          ? <><Check className="w-4 h-4 mr-2 text-berna-emerald" />Copied!</>
          : <><Copy className="w-4 h-4 mr-2" />Copy Caption</>}
      </Button>
    </div>
  );
}