import React, { useState } from 'react';
import { Share2, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';

export default function ShareWithCreapdButton({ pkg, article }) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await base44.functions.invoke('shareWithCreapd', {
        source_production_id: pkg.id,
        source_type: 'production_package',
        title: article?.title || 'Untitled Production',
        description: pkg.story_summary || '',
        production_profile: 'news',
        runtime: pkg.estimated_runtime || '',
        original_thumbnail_url: pkg.generated_thumbnail_url || '',
      });

      if (res.data?.success) {
        setShared(true);
        toast({
          title: 'Shared with CREAPD',
          description: 'Your production is now in the CREAPD Showcase.',
        });
      } else {
        toast({
          title: 'Already Shared',
          description: res.data?.error || 'This production has already been shared.',
          variant: 'default',
        });
        setShared(true);
      }
    } catch (err) {
      toast({
        title: 'Share Failed',
        description: 'Could not share this production. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSharing(false);
    }
  };

  if (shared) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] text-berna-emerald px-2 py-1 rounded-md bg-berna-emerald/10 border border-berna-emerald/20">
        <CheckCircle className="w-3 h-3" />
        Showcased
      </span>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="inline-flex items-center gap-1 text-[9px] text-berna-purple px-2 py-1 rounded-md bg-berna-purple/10 border border-berna-purple/20 hover:bg-berna-purple/20 transition-colors disabled:opacity-50"
    >
      {sharing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
      {sharing ? 'Sharing...' : 'Share with CREAPD'}
    </button>
  );
}