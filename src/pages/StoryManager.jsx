import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, Search, Sparkles, Loader2, CheckCircle2, Play, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AddStoriesModal from '@/components/workspace/AddStoriesModal';
import PackageWorkspace from '@/components/production/PackageWorkspace';
import CategoryBadge from '@/components/shared/CategoryBadge';
import OpportunityScore from '@/components/shared/OpportunityScore';
import SortDropdown from '@/components/shared/SortDropdown';
import ShowStartupModal from '@/components/profiles/ShowStartupModal';
import { logActivity } from '@/lib/activityUtils';
import CreapdLoading from '@/components/shared/CreapdLoading';

function getSelectedStoryIds() {
  try {
    return JSON.parse(localStorage.getItem('selectedStoryIds') || '[]');
  } catch {
    return [];
  }
}

function parseRuntime(str) {
  if (!str) return 60;
  if (str.includes(':')) {
    const [m, s] = str.split(':').map(Number);
    return m * 60 + (s || 0);
  }
  const num = parseInt(str);
  return isNaN(num) ? 60 : num * 60;
}

function formatRuntime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m} min`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const DEFAULT_CHECKLIST = {
  briefing_complete: false,
  stories_selected: false,
  story_order_finalized: false,
  scripts_approved: false,
  graphics_ready: false,
  fact_check_complete: false,
  producer_review_complete: false,
  export_ready: false
};

export default function StoryManager() {
  const [production, setProduction] = useState(null);
  const [storyOrder, setStoryOrder] = useState([]);
  const [stories, setStories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [pkgMap, setPkgMap] = useState({});
  const [notesMap, setNotesMap] = useState({});
  const [history, setHistory] = useState([]);
  const [brands, setBrands] = useState([]);
  const [shows, setShows] = useState([]);
  const [globalNotes, setGlobalNotes] = useState('');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStories, setAvailableStories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('productionSort') || 'priority');
  const [search, setSearch] = useState('');
  const [showStartupOpen, setShowStartupOpen] = useState(false);
  const isMobile = useIsMobile();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [contentDomains, setContentDomains] = useState([]);
  const [bulkDomain, setBulkDomain] = useState('news');
  const [newProd, setNewProd] = useState({
    title: '',
    brand_profile_id: '',
    show_profile_id: '',
    production_date: new Date().toISOString().split('T')[0]
  });
  const skipSave = useRef(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, brandList, showList, approved, picks, pkgs] = await Promise.all([
      base44.entities.Production.filter({ status: 'in_progress' }, '-created_date', 1),
      base44.entities.BrandProfile.list(),
      base44.entities.ShowProfile.list(),
      base44.entities.Article.filter({ status: 'approved' }, '-opportunity_score', 50),
      base44.entities.Article.filter({ status: 'bernas_pick' }, '-created_date', 10),
      base44.entities.ProductionPackage.list('-created_date', 200)]
      );
      setBrands(brandList);
      setShows(showList);

      // Story list (approved + bernas_pick) — from old Production page
      const arts = [...picks, ...approved];
      setStories(arts);
      const map = {};
      pkgs.forEach((p) => {if (p.article_id) map[p.article_id] = p;});
      setPkgMap(map);
      if (arts.length > 0 && !selectedStoryId) {
        const firstUnapproved = arts.find(a => {
          const p = map[a.id];
          return !p || p.status !== 'approved';
        });
        setSelectedStoryId((firstUnapproved || arts[0]).id);
      }

      // Load production workspace if exists
      if (prods.length > 0) {
        const prod = prods[0];
        setProduction(prod);
        setStoryOrder(JSON.parse(prod.story_order || '[]'));
        setGlobalNotes(prod.global_notes || '');
        setChecklist({ ...DEFAULT_CHECKLIST, ...JSON.parse(prod.checklist || '{}') });
        await loadRundownData(prod, pkgs);
      }
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
      setTimeout(() => {skipSave.current = false;}, 200);
    }
  };

  const loadRundownData = async (prod, existingPkgs) => {
    const order = JSON.parse(prod.story_order || '[]');
    if (order.length === 0) {
      setPackages([]);
      setNotesMap({});
      return;
    }
    try {
      const [allArticles, allNotes] = await Promise.all([
      base44.entities.Article.filter({ production_id: prod.id }),
      base44.entities.ProducerNote.list('-created_date', 100)]
      );
      const rundownArticles = order.map((id) => allArticles.find((a) => a.id === id)).filter(Boolean);
      const pkgs = (existingPkgs || []).filter((p) => order.includes(p.article_id));
      setPackages(pkgs);
      // Merge rundown articles into the stories list
      setStories((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        const merged = [...prev];
        rundownArticles.forEach((a) => {if (!ids.has(a.id)) merged.push(a);});
        return merged;
      });
      const notes = {};
      allNotes.filter((n) => order.includes(n.article_id)).forEach((n) => {
        notes[n.article_id] = (notes[n.article_id] || 0) + 1;
      });
      setNotesMap(notes);
    } catch (e) {
      console.error('Failed to load rundown:', e);
    }
    try {
      const hist = await base44.entities.ActivityLog.filter(
        { entity_type: 'Production', entity_id: prod.id }, '-created_date', 20
      );
      setHistory(hist);
    } catch (e) {/* ignore */}
  };

  // Estimated runtime
  const estimatedRuntimeSeconds = storyOrder.reduce((total, id) => {
    const pkg = packages.find((p) => p.article_id === id);
    return total + parseRuntime(pkg?.estimated_runtime);
  }, 0);
  const estimatedRuntime = formatRuntime(estimatedRuntimeSeconds);

  const selectedStory = stories.find((s) => s.id === selectedStoryId);
  const selectedPkg = pkgMap[selectedStoryId] || packages.find((p) => p.article_id === selectedStoryId);

  // Sorted story list (from old Production page)
  const sortedStories = useMemo(() => {
    let result = stories.filter((a) => {
      // Hide stories whose package is already approved — they've been sent to Production
      const p = pkgMap[a.id];
      if (p?.status === 'approved') return false;
      return !search || a.title?.toLowerCase().includes(search.toLowerCase());
    });
    switch (sortBy) {
      case 'newest':return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      case 'oldest':return result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical':return result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'package_status':return result.sort((a, b) => {
          const order = { approved: 0, edited: 1, generated: 2, generating: 3, not_generated: 4 };
          return (order[pkgMap[a.id]?.status] || 5) - (order[pkgMap[b.id]?.status] || 5);
        });
      default:return result.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0));
    }
  }, [stories, sortBy, search, pkgMap]);

  const handleGenerateAllStories = async () => {
    setGeneratingAll(true);
    for (const article of stories) {
      try {
        const res = await base44.functions.invoke('generateProductionPackage', {
          article_id: article.id,
          asset_types: null,
          content_domain: bulkDomain,
          tone: 'professional',
          reading_style: 'broadcast_news',
          audience: 'General Public',
          target_runtime: '1 Minute'
        });
        if (res.data?.package) {
          const updatedPkg = res.data.package;
          setPkgMap((prev) => ({ ...prev, [updatedPkg.article_id]: updatedPkg }));
        }
      } catch (err) {console.error(err);}
    }
    setGeneratingAll(false);
    logActivity('generate', {
      entity_type: 'ProductionPackage',
      entity_name: `Bulk generate — ${stories.length} stories`,
      details: `Generated production packages for ${stories.length} approved stories`
    });
  };

  const handlePackageUpdate = (updatedPkg) => {
    setPkgMap((prev) => ({ ...prev, [updatedPkg.article_id]: updatedPkg }));
    setPackages((prev) => {
      const exists = prev.find((p) => p.id === updatedPkg.id);
      if (exists) return prev.map((p) => p.id === updatedPkg.id ? updatedPkg : p);
      return [...prev, updatedPkg];
    });
  };

  const handlePackageApproved = async (article, approvedPkg) => {
    try {
      await base44.entities.Article.update(article.id, {
        status: 'archived',
        archived_date: new Date().toISOString(),
      });
    } catch (e) { console.error('Failed to archive article:', e); }
    // Remove from stories list, pkg map, rundown; auto-select next unapproved story
    const remaining = stories.filter(s => s.id !== article.id);
    const nextPkgMap = { ...pkgMap };
    delete nextPkgMap[article.id];
    const nextStory = remaining.find(s => {
      const p = nextPkgMap[s.id];
      return !p || p.status !== 'approved';
    });
    setStories(remaining);
    setPkgMap(nextPkgMap);
    setPackages(prev => prev.filter(p => p.article_id !== article.id));
    setStoryOrder(prev => prev.filter(id => id !== article.id));
    setSelectedStoryId(nextStory ? nextStory.id : (remaining.length > 0 ? remaining[0].id : null));
    logActivity('approve', {
      entity_type: 'ProductionPackage',
      entity_id: approvedPkg?.id || '',
      entity_name: article.title,
      details: 'Package approved — sent to Production and archived',
    });
  };

  // Auto-save (debounced)
  useEffect(() => {
    if (!production?.id || skipSave.current) return;
    const timer = setTimeout(() => {
      base44.entities.Production.update(production.id, {
        title: production.title,
        brand_profile_id: production.brand_profile_id,
        show_profile_id: production.show_profile_id,
        production_date: production.production_date,
        status: production.status,
        target_runtime: production.target_runtime,
        story_order: JSON.stringify(storyOrder),
        global_notes: globalNotes,
        checklist: JSON.stringify(checklist),
        estimated_runtime: estimatedRuntime
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [production, storyOrder, globalNotes, checklist, estimatedRuntime]);

  // Auto checklist values
  const autoChecklist = {
    briefing: true,
    stories: storyOrder.length > 0,
    scripts: stories.length > 0 && stories.every((s) => s.production_status === 'approved'),
    graphics: packages.length > 0 && packages.every((p) => p.generated_image_url),
    export: production?.status === 'ready_for_export' || production?.status === 'exported'
  };

  const logActivity = async (action, details) => {
    if (!production?.id) return;
    try {
      await base44.entities.ActivityLog.create({
        action,
        entity_type: 'Production',
        entity_id: production.id,
        entity_name: production.title,
        details
      });
      const hist = await base44.entities.ActivityLog.filter(
        { entity_type: 'Production', entity_id: production.id }, '-created_date', 20
      );
      setHistory(hist);
    } catch (e) {/* ignore */}
  };

  const handleCreate = async () => {
    if (!newProd.title) return;
    setCreating(true);
    skipSave.current = true;
    try {
      const selectedIds = getSelectedStoryIds();
      const allArticles = await base44.entities.Article.list('-created_date', 100);
      const selectedArticles = allArticles.filter((a) => selectedIds.includes(a.id));
      const order = selectedArticles.map((a) => a.id);
      const prod = await base44.entities.Production.create({
        title: newProd.title,
        brand_profile_id: newProd.brand_profile_id,
        show_profile_id: newProd.show_profile_id,
        production_date: newProd.production_date,
        status: 'in_progress',
        story_order: JSON.stringify(order),
        target_runtime: '30 Minutes',
        checklist: JSON.stringify(DEFAULT_CHECKLIST)
      });
      await Promise.all(selectedArticles.map((a) =>
      base44.entities.Article.update(a.id, { production_id: prod.id, production_status: 'selected' })
      ));
      setProduction(prod);
      setStoryOrder(order);
      setChecklist(DEFAULT_CHECKLIST);
      await loadRundownData(prod);
      await logActivity('create', `Production created with ${order.length} stories`);
    } catch (e) {
      console.error('Failed to create production:', e);
    } finally {
      setCreating(false);
      setTimeout(() => {skipSave.current = false;}, 200);
    }
  };

  const handleReorder = (newOrder) => {
    setStoryOrder(newOrder);
    logActivity('update', 'Story order changed');
  };

  const handleRemoveStory = async (articleId) => {
    const newOrder = storyOrder.filter((id) => id !== articleId);
    setStoryOrder(newOrder);
    setStories((prev) => prev.filter((s) => s.id !== articleId));
    await base44.entities.Article.update(articleId, { production_id: '', production_status: 'selected' });
    logActivity('delete', 'Story removed from rundown');
  };

  const handleDuplicateStory = async (story) => {
    const { id, created_date, updated_date, created_by_id, ...rest } = story;
    const copy = await base44.entities.Article.create({
      ...rest,
      title: `${story.title} (Copy)`,
      production_id: production.id,
      production_status: 'selected',
      locked: false
    });
    const idx = storyOrder.indexOf(story.id);
    const newOrder = [...storyOrder];
    newOrder.splice(idx + 1, 0, copy.id);
    setStoryOrder(newOrder);
    setStories((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    logActivity('create', `Story duplicated: ${story.title}`);
  };

  const handleArchiveStory = async (articleId) => {
    const newOrder = storyOrder.filter((id) => id !== articleId);
    setStoryOrder(newOrder);
    setStories((prev) => prev.filter((s) => s.id !== articleId));
    await base44.entities.Article.update(articleId, { production_status: 'archived', production_id: '' });
    logActivity('update', 'Story archived from rundown');
  };

  const handleUpdateStoryStatus = async (articleId, status) => {
    await base44.entities.Article.update(articleId, { production_status: status });
    setStories((prev) => prev.map((s) => s.id === articleId ? { ...s, production_status: status } : s));
    logActivity('update', `Story status changed to ${status}`);
  };

  const handleUpdatePriority = async (articleId, priority) => {
    await base44.entities.Article.update(articleId, { production_priority: priority });
    setStories((prev) => prev.map((s) => s.id === articleId ? { ...s, production_priority: priority } : s));
  };

  const handleToggleLock = async (articleId, locked) => {
    await base44.entities.Article.update(articleId, { locked });
    setStories((prev) => prev.map((s) => s.id === articleId ? { ...s, locked } : s));
    logActivity('update', locked ? 'Story locked' : 'Story unlocked');
  };

  const handleOpenAddModal = async () => {
    const selectedIds = getSelectedStoryIds();
    const allArticles = await base44.entities.Article.list('-created_date', 100);
    const available = allArticles.filter((a) => selectedIds.includes(a.id) && !storyOrder.includes(a.id));
    setAvailableStories(available);
    setShowAddModal(true);
  };

  const handleAddStories = async (articleIds) => {
    const newOrder = [...storyOrder, ...articleIds];
    setStoryOrder(newOrder);
    await Promise.all(articleIds.map((id) =>
    base44.entities.Article.update(id, { production_id: production.id, production_status: 'selected' })
    ));
    await loadRundownData({ ...production, story_order: JSON.stringify(newOrder) });
    logActivity('create', `${articleIds.length} stories added to rundown`);
    setShowAddModal(false);
  };

  const handleToggleChecklist = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenPackage = (storyId) => {
    setSelectedStoryId(storyId);
  };

  useEffect(() => {
    base44.entities.ContentDomain.list().then((d) => setContentDomains(d.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))).catch(() => {});
  }, []);

  if (loading) {
    return <CreapdLoading fullHeight profile="news" />;
  }

  const statusStyles = {
    not_generated: { label: 'Not Generated', color: 'text-muted-foreground', dot: 'bg-muted-foreground/40' },
    generating: { label: 'CREAPing…', color: 'text-berna-purple', dot: 'bg-berna-purple animate-pulse' },
    generated: { label: 'Generated', color: 'text-blue-400', dot: 'bg-blue-400' },
    edited: { label: 'Edited', color: 'text-berna-orange', dot: 'bg-berna-orange' },
    approved: { label: 'Approved', color: 'text-berna-emerald', dot: 'bg-berna-emerald' }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">Story Manager</h1>
            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Generate story packages, approve, and manage your rundown</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{stories.length} stories</span>
            <span className="text-xs text-berna-emerald flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {Object.values(pkgMap).filter((p) => p.status === 'approved' || p.status === 'edited').length} approved
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-berna-purple/30 hover:bg-berna-purple/10 text-xs h-8 text-[hsl(var(--accent))]"
            onClick={() => setShowStartupOpen(true)}>
            
            <Play className="w-3 h-3 mr-1" />Start Production
          </Button>
          <Button
            size="sm"
            className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8 flex-1"
            onClick={handleGenerateAllStories}
            disabled={generatingAll || stories.length === 0}>
            
            {generatingAll ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {generatingAll ? 'Generating All...' : 'Generate All Packages'}
          </Button>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search stories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8" />
        </div>
        <SortDropdown value={sortBy} onChange={setSortBy} storageKey="productionSort" options={[
        { value: 'priority', label: 'Story Priority' },
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'alphabetical', label: 'Alphabetical' },
        { value: 'package_status', label: 'Package Status' }]
        } />
      </div>

      {/* Two-column on desktop; master-detail with back button on mobile */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Story list */}
        {(!isMobile || !mobileShowDetail) && (
        <div className="w-full lg:w-72 flex-shrink-0 space-y-2 lg:self-stretch">
          {sortedStories.map((article) => {
            const pkg = pkgMap[article.id];
            const status = pkg?.status || 'not_generated';
            const st = statusStyles[status];
            const isSelected = article.id === selectedStoryId;
            const exportReady = status === 'approved' || status === 'edited';
            return (
              <button
                key={article.id}
                onClick={() => { setSelectedStoryId(article.id); if (isMobile) setMobileShowDetail(true); }}
                className={`w-full text-left glass-panel p-3 transition-all ${isSelected ? 'border-berna-purple/40 glow-purple' : 'hover:border-white/[0.12]'}`}>
                
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot} flex-shrink-0`} />
                  <span className={`text-[9px] uppercase tracking-wider ${st.color}`}>{st.label}</span>
                  {exportReady &&
                  <span className="text-[9px] text-berna-emerald flex items-center gap-0.5" title="Ready for production">
                      <CheckCircle2 className="w-2.5 h-2.5" />Approved
                    </span>
                  }
                </div>
                <h3 className="text-xs font-semibold text-white leading-snug line-clamp-2 mb-1.5">{article.title}</h3>
                <div className="flex items-center gap-2">
                  {article.category && <CategoryBadge category={article.category} />}
                  <OpportunityScore score={article.opportunity_score} />
                </div>
              </button>);

          })}
          {stories.length === 0 &&
          <div className="glass-panel p-8 text-center">
              <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No approved stories yet. Approve stories from the Story Queue first.</p>
            </div>
          }
        </div>
        )}

        {/* Package Detail Panel — Text Generation + AI Media Generation + Approve/Regenerate + Translation */}
        {(!isMobile || mobileShowDetail) && (
        <div className="flex-1 min-w-0">
          {selectedStory ?
          <PackageWorkspace article={selectedStory} pkg={selectedPkg} onPackageUpdate={handlePackageUpdate} onPackageApproved={handlePackageApproved} onBack={() => setMobileShowDetail(false)} /> :

          <div className="glass-panel p-12 text-center h-full flex flex-col items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Select a story to generate its story package</p>
            </div>
          }
        </div>
        )}
      </div>

      {/* Create Production button — inline, not a gate */}
      {!production &&
      <div className="glass-panel p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">No active production</p>
            <p className="text-xs text-muted-foreground">Create a production workspace to build a story rundown</p>
          </div>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8" onClick={() => setShowStartupOpen(true)}>
            <Play className="w-3 h-3 mr-1" />Start Production
          </Button>
        </div>
      }

      <AddStoriesModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        availableStories={availableStories}
        onAdd={handleAddStories} />
      
      <ShowStartupModal open={showStartupOpen} onClose={() => setShowStartupOpen(false)} />
    </div>);

}