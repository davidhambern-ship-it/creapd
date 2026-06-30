import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import ProductionRundown from '@/components/workspace/ProductionRundown';
import WorkspaceProgress from '@/components/workspace/WorkspaceProgress';
import WorkspaceChecklist from '@/components/workspace/WorkspaceChecklist';
import GlobalNotes from '@/components/workspace/GlobalNotes';
import WorkspaceHistory from '@/components/workspace/WorkspaceHistory';
import AddStoriesModal from '@/components/workspace/AddStoriesModal';

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
  export_ready: false,
};

export default function StoryManager() {
  const navigate = useNavigate();
  const [production, setProduction] = useState(null);
  const [storyOrder, setStoryOrder] = useState([]);
  const [stories, setStories] = useState([]);
  const [packages, setPackages] = useState([]);
  const [notesMap, setNotesMap] = useState({});
  const [history, setHistory] = useState([]);
  const [brands, setBrands] = useState([]);
  const [shows, setShows] = useState([]);

  const [currentProfile, setCurrentProfile] = useState(null);
  const [globalNotes, setGlobalNotes] = useState('');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStories, setAvailableStories] = useState([]);


  const skipSave = useRef(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, brandList, showList, profileList] = await Promise.all([
        base44.entities.Production.filter({ status: 'in_progress' }, '-created_date', 1),
        base44.entities.BrandProfile.list(),
        base44.entities.ShowProfile.list(),
        base44.entities.ProductionProfile.filter({ is_active: true }, 'sort_order', 50),
      ]);
      setBrands(brandList);
      setShows(showList);
      if (prods.length > 0) {
        const prod = prods[0];
        setProduction(prod);
        setStoryOrder(JSON.parse(prod.story_order || '[]'));
        setGlobalNotes(prod.global_notes || '');
        setChecklist({ ...DEFAULT_CHECKLIST, ...JSON.parse(prod.checklist || '{}') });
        if (prod.production_profile_id) {
          const profile = profileList.find(p => p.id === prod.production_profile_id);
          setCurrentProfile(profile || null);
        }
        await loadStoriesData(prod);
      } else {
        // No production in progress - redirect to setup
        navigate('/production/new');
        return;
      }
    } catch (e) {
      console.error('Failed to load production:', e);
    } finally {
      setLoading(false);
      setTimeout(() => { skipSave.current = false; }, 200);
    }
  };

  const loadStoriesData = async (prod) => {
    const order = JSON.parse(prod.story_order || '[]');
    if (order.length === 0) {
      setStories([]);
      setPackages([]);
      setNotesMap({});
      return;
    }
    try {
      const [allArticles, allPkgs, allNotes] = await Promise.all([
        base44.entities.Article.filter({ production_id: prod.id }),
        base44.entities.ProductionPackage.list('-created_date', 100),
        base44.entities.ProducerNote.list('-created_date', 100),
      ]);
      const sorted = order.map(id => allArticles.find(a => a.id === id)).filter(Boolean);
      setStories(sorted);
      setPackages(allPkgs.filter(p => order.includes(p.article_id)));
      const notes = {};
      allNotes.filter(n => order.includes(n.article_id)).forEach(n => {
        notes[n.article_id] = (notes[n.article_id] || 0) + 1;
      });
      setNotesMap(notes);
    } catch (e) {
      console.error('Failed to load stories:', e);
    }
    try {
      const hist = await base44.entities.ActivityLog.filter(
        { entity_type: 'Production', entity_id: prod.id }, '-created_date', 20
      );
      setHistory(hist);
    } catch (e) { /* ignore */ }
  };

  // Estimated runtime
  const estimatedRuntimeSeconds = storyOrder.reduce((total, id) => {
    const pkg = packages.find(p => p.article_id === id);
    return total + parseRuntime(pkg?.estimated_runtime);
  }, 0);
  const estimatedRuntime = formatRuntime(estimatedRuntimeSeconds);

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
        estimated_runtime: estimatedRuntime,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [production, storyOrder, globalNotes, checklist, estimatedRuntime]);

  // Auto checklist values
  const autoChecklist = {
    briefing: true,
    stories: storyOrder.length > 0,
    scripts: stories.length > 0 && stories.every(s => s.production_status === 'approved'),
    graphics: packages.length > 0 && packages.every(p => p.generated_image_url),
    export: production?.status === 'ready_for_export' || production?.status === 'exported',
  };

  const logActivity = async (action, details) => {
    if (!production?.id) return;
    try {
      await base44.entities.ActivityLog.create({
        action,
        entity_type: 'Production',
        entity_id: production.id,
        entity_name: production.title,
        details,
      });
      const hist = await base44.entities.ActivityLog.filter(
        { entity_type: 'Production', entity_id: production.id }, '-created_date', 20
      );
      setHistory(hist);
    } catch (e) { /* ignore */ }
  };



  // Get profile-specific terminology
  const getItemLabel = () => currentProfile?.item_type_label || 'Story';
  const getItemLabelPlural = () => currentProfile?.item_type_label_plural || 'Stories';

  const handleReorder = (newOrder) => {
    setStoryOrder(newOrder);
    logActivity('update', 'Story order changed');
  };

  const handleRemoveStory = async (articleId) => {
    const newOrder = storyOrder.filter(id => id !== articleId);
    setStoryOrder(newOrder);
    setStories(prev => prev.filter(s => s.id !== articleId));
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
      locked: false,
    });
    const idx = storyOrder.indexOf(story.id);
    const newOrder = [...storyOrder];
    newOrder.splice(idx + 1, 0, copy.id);
    setStoryOrder(newOrder);
    setStories(prev => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
    logActivity('create', `Story duplicated: ${story.title}`);
  };

  const handleArchiveStory = async (articleId) => {
    const newOrder = storyOrder.filter(id => id !== articleId);
    setStoryOrder(newOrder);
    setStories(prev => prev.filter(s => s.id !== articleId));
    await base44.entities.Article.update(articleId, { production_status: 'archived', production_id: '' });
    logActivity('update', 'Story archived from rundown');
  };

  const handleUpdateStoryStatus = async (articleId, status) => {
    await base44.entities.Article.update(articleId, { production_status: status });
    setStories(prev => prev.map(s => s.id === articleId ? { ...s, production_status: status } : s));
    logActivity('update', `Story status changed to ${status}`);
  };

  const handleUpdatePriority = async (articleId, priority) => {
    await base44.entities.Article.update(articleId, { production_priority: priority });
    setStories(prev => prev.map(s => s.id === articleId ? { ...s, production_priority: priority } : s));
  };

  const handleToggleLock = async (articleId, locked) => {
    await base44.entities.Article.update(articleId, { locked });
    setStories(prev => prev.map(s => s.id === articleId ? { ...s, locked } : s));
    logActivity('update', locked ? 'Story locked' : 'Story unlocked');
  };

  const handleOpenAddModal = async () => {
    const selectedIds = getSelectedStoryIds();
    const allArticles = await base44.entities.Article.list('-created_date', 100);
    const available = allArticles.filter(a => selectedIds.includes(a.id) && !storyOrder.includes(a.id));
    setAvailableStories(available);
    setShowAddModal(true);
  };

  const handleAddStories = async (articleIds) => {
    const newOrder = [...storyOrder, ...articleIds];
    setStoryOrder(newOrder);
    await Promise.all(articleIds.map(id =>
      base44.entities.Article.update(id, { production_id: production.id, production_status: 'selected' })
    ));
    await loadStoriesData({ ...production, story_order: JSON.stringify(newOrder) });
    logActivity('create', `${articleIds.length} stories added to rundown`);
    setShowAddModal(false);
  };

  const handleToggleChecklist = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleOpenPackage = () => {
    navigate('/production');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  if (!production) {
    // Redirect to ProductionSetup page for profile-aware creation
    navigate('/production/new');
    return null;
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-white">
          <Home className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>

      <WorkspaceHeader
        production={production}
        brands={brands}
        shows={shows}
        storyCount={storyOrder.length}
        estimatedRuntime={estimatedRuntime}
        onUpdate={setProduction}
        packages={packages}
        articles={stories}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white neon-underline">
              {currentProfile?.profile_type === 'news' ? 'Production Rundown' : `${getItemLabelPlural()} Rundown`}
            </h2>
            <span className="text-[10px] text-muted-foreground">Drag to reorder</span>
          </div>
          <ProductionRundown
            stories={stories}
            packages={packages}
            notesMap={notesMap}
            storyOrder={storyOrder}
            onReorder={handleReorder}
            onRemoveStory={handleRemoveStory}
            onDuplicateStory={handleDuplicateStory}
            onArchiveStory={handleArchiveStory}
            onUpdateStoryStatus={handleUpdateStoryStatus}
            onUpdateStoryPriority={handleUpdatePriority}
            onToggleLock={handleToggleLock}
            onOpenPackage={handleOpenPackage}
            onAddStories={handleOpenAddModal}
          />
        </div>

        <div className="space-y-4">
          <WorkspaceProgress stories={stories} packages={packages} production={production} />
          <WorkspaceChecklist checklist={checklist} onToggle={handleToggleChecklist} autoValues={autoChecklist} />
          <GlobalNotes notes={globalNotes} onChange={setGlobalNotes} />
          <WorkspaceHistory history={history} />
        </div>
      </div>

      <AddStoriesModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        availableStories={availableStories}
        onAdd={handleAddStories}
        itemLabel={getItemLabel()}
        itemLabelPlural={getItemLabelPlural()}
      />
    </div>
  );
}