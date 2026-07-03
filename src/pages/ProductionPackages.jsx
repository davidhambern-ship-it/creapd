import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Film, Sparkles, Loader2, CheckCircle2, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import ApprovedPackageCard from '@/components/production/ApprovedPackageCard';
import { logActivity } from '@/lib/activityUtils';

export default function ProductionPackages() {
  const [packages, setPackages] = useState([]);
  const [articleMap, setArticleMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const pkgs = await base44.entities.ProductionPackage.filter({ status: 'approved' }, '-created_date', 100);
      const articleIds = [...new Set(pkgs.map(p => p.article_id).filter(Boolean))];
      const map = {};
      if (articleIds.length > 0) {
        const allArticles = await base44.entities.Article.list('-created_date', 200);
        allArticles.forEach(a => { if (articleIds.includes(a.id)) map[a.id] = a; });
      }
      setPackages(pkgs);
      setArticleMap(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePresentation = async () => {
    setGeneratingPresentation(true);
    try {
      const res = await base44.functions.invoke('generateNewsPresentation', {
        package_ids: packages.map(p => p.id),
      });
      if (res.data?.success) {
        toast({
          title: "Presentation Generated",
          description: res.data.message || `Generated presentation from ${packages.length} approved packages.`,
        });
        logActivity('generate', {
          entity_type: 'PresentationScene',
          entity_name: `Full Presentation — ${packages.length} stories`,
          details: `APD generated presentation from ${packages.length} approved packages`,
        });
      } else {
        toast({
          title: "AI Presentation Director",
          description: "Presentation generation will be available once the APD backend is configured.",
        });
      }
    } catch (err) {
      toast({
        title: "APD Not Ready",
        description: "The AI Presentation Director backend is being set up. Check back soon.",
      });
    } finally {
      setGeneratingPresentation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Production</h1>
          <p className="text-xs text-muted-foreground mt-1">Approved story packages ready for presentation generation</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{packages.length} approved</span>
          <span className="text-xs text-berna-emerald flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />Ready for APD
          </span>
        </div>
      </div>

      {/* APD Section */}
      <div className="glass-panel glow-purple p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-berna-purple/20 flex items-center justify-center flex-shrink-0">
              <Clapperboard className="w-5 h-5 text-berna-purple" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Presentation Director</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-2xl">
                Generates a full timed presentation from all approved packages. The APD analyzes each story's voiceover timing,
                scripts, and media to create a synchronized visual presentation with scene transitions, text overlays, and media cues.
              </p>
            </div>
          </div>
          <Button
            className="bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 text-white glow-purple flex-shrink-0"
            onClick={handleGeneratePresentation}
            disabled={generatingPresentation || packages.length < 5}
          >
            {generatingPresentation ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {generatingPresentation ? 'Generating...' : 'Generate Full Presentation'}
          </Button>
        </div>
        {packages.length < 5 && (
          <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t border-white/[0.04]">
            {packages.length === 0
              ? 'No approved packages yet. Approve packages from the Story Manager to generate a presentation.'
              : `${packages.length}/5 approved packages. The APD requires a minimum of 5 approved packages to generate a presentation.`}
          </p>
        )}
      </div>

      {/* Approved Packages */}
      <div>
        <h2 className="text-sm font-semibold text-white neon-underline mb-3">Approved Packages</h2>
        {packages.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No approved packages yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Approve packages from the Story Manager to see them here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {packages.map((pkg, idx) => (
              <ApprovedPackageCard key={pkg.id} pkg={pkg} article={articleMap[pkg.article_id]} index={idx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}