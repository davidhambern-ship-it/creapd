import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, Sparkles, ChevronRight, Loader2, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CategoryBadge from '@/components/shared/CategoryBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';
import PackageDetailPanel from '@/components/production/PackageDetailPanel';
import { logActivity } from '@/lib/activityUtils';

export default function ProductionPackages() {
  const [articles, setArticles] = useState([]);
  const [packages, setPackages] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [approved, picks, pkgs] = await Promise.all([
        base44.entities.Article.filter({ status: 'approved' }, '-opportunity_score', 50),
        base44.entities.Article.filter({ status: 'bernas_pick' }, '-created_date', 10),
        base44.entities.ProductionPackage.list('-created_date', 200),
      ]);
      const arts = [...picks, ...approved];
      setArticles(arts);
      const pkgMap = {};
      pkgs.forEach(p => { if (p.article_id) pkgMap[p.article_id] = p; });
      setPackages(pkgMap);
      if (arts.length > 0 && !selectedId) setSelectedId(arts[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePackageUpdate = (updatedPkg) => {
    setPackages(prev => ({ ...prev, [updatedPkg.article_id]: updatedPkg }));
  };

  const handleGenerateAllStories = async () => {
    setGeneratingAll(true);
    for (const article of articles) {
      try {
        const res = await base44.functions.invoke('generateProductionPackage', {
          article_id: article.id,
          asset_types: null,
          tone: 'professional',
          reading_style: 'broadcast_news',
          audience: 'General Public',
          target_runtime: '1 Minute',
        });
        if (res.data?.package) handlePackageUpdate(res.data.package);
      } catch (err) { console.error(err); }
    }
    setGeneratingAll(false);
    logActivity('generate', {
      entity_type: 'ProductionPackage',
      entity_name: `Bulk generate — ${articles.length} stories`,
      details: `Generated production packages for ${articles.length} approved stories`,
    });
  };

  const selectedArticle = articles.find(a => a.id === selectedId);
  const selectedPkg = selectedId ? packages[selectedId] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  const statusStyles = {
    not_generated: { label: 'Not Generated', color: 'text-muted-foreground', dot: 'bg-muted-foreground/40' },
    generating: { label: 'Generating', color: 'text-berna-purple', dot: 'bg-berna-purple animate-pulse' },
    generated: { label: 'Generated', color: 'text-blue-400', dot: 'bg-blue-400' },
    edited: { label: 'Edited', color: 'text-berna-orange', dot: 'bg-berna-orange' },
    approved: { label: 'Approved', color: 'text-berna-emerald', dot: 'bg-berna-emerald' },
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-white">Production Packages</h1>
          <p className="text-xs text-muted-foreground mt-1">Generate scripts, talking points, lower thirds, and assets for each story</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{articles.length} stories ready</span>
          <Button
            size="sm"
            className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8"
            onClick={handleGenerateAllStories}
            disabled={generatingAll || articles.length === 0}
          >
            {generatingAll ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {generatingAll ? 'Generating All...' : 'Generate All Packages'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-180px)]">
        {/* Story list */}
        <div className="w-full lg:w-72 flex-shrink-0 overflow-y-auto space-y-2 lg:max-h-full">
          {articles.map(article => {
            const pkg = packages[article.id];
            const status = pkg?.status || 'not_generated';
            const st = statusStyles[status];
            const isSelected = article.id === selectedId;
            return (
              <button
                key={article.id}
                onClick={() => setSelectedId(article.id)}
                className={`w-full text-left glass-panel p-3 transition-all ${isSelected ? 'border-berna-purple/40 glow-purple' : 'hover:border-white/[0.12]'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot} flex-shrink-0`} />
                  <span className={`text-[9px] uppercase tracking-wider ${st.color}`}>{st.label}</span>
                  {pkg?.estimated_runtime && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                      <Clock className="w-2.5 h-2.5" />{pkg.estimated_runtime}
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2 mb-1.5">{article.title}</h3>
                <div className="flex items-center gap-2">
                  {article.category && <CategoryBadge category={article.category} />}
                  <OpportunityScore score={article.opportunity_score} />
                </div>
              </button>
            );
          })}
          {articles.length === 0 && (
            <div className="glass-panel p-8 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No approved stories yet. Approve stories from the Story Queue first.</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 min-w-0">
          {selectedArticle ? (
            <PackageDetailPanel article={selectedArticle} pkg={selectedPkg} onPackageUpdate={handlePackageUpdate} />
          ) : (
            <div className="glass-panel p-12 text-center h-full flex flex-col items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a story to generate its production package</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}