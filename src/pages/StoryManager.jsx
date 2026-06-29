import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import ProductionRundown from '@/components/workspace/ProductionRundown';
import WorkspaceProgress from '@/components/workspace/WorkspaceProgress';
import WorkspaceChecklist from '@/components/workspace/WorkspaceChecklist';
import GlobalNotes from '@/components/workspace/GlobalNotes';
import WorkspaceHistory from '@/components/workspace/WorkspaceHistory';
import AddStoriesModal from '@/components/workspace/AddStoriesModal';

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
  const [globalNotes, setGlobalNotes] = useState('');
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableStories, setAvailableStories] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newProd, setNewProd] = useState({
    title: '',
    brand_profile_id: '',
    show_profile_id: '',
    production_date: new Date().toISOString().split('T')[0],
  });
  const skipSave = useRef(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prods, brandList, showList] = await Promise.all([
        base44.entities.Production.filter({ status: 'in_progress' }, '-created_date', 1),
        base44.entities.BrandProfile.list(),
        base44.entities.ShowProfile.list(),
      ]);
      setBrands(brandList);
      setShows(showList);
      if (prods.length > 0) {
        const prod = prods[0];
        setProduction(prod);
        setStoryOrder(JSON.parse(prod.story_order || '[]'));
        setGlobalNotes(prod.global_notes || '');
        setChecklist({ ...DEFAULT_CHECKLIST, ...JSON.parse(prod.checklist || '{}') });
        await loadStoriesData(prod);
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

  const handleCreate = async () => {
    if (!newProd.title) return;
    setCreating(true);
    skipSave.current = true;
    try {
      const selectedArticles = await base44.entities.Article.filter({ status: 'selected' });
      const order = selectedArticles.map(a => a.id);
      const prod = await base44.entities.Production.create({
        title: newProd.title,
        brand_profile_id: newProd.brand_profile_id,
        show_profile_id: newProd.show_profile_id,
        production_date: newProd.production_date,
        status: 'in_progress',
        story_order: JSON.stringify(order),
        target_runtime: '30 Minutes',
        checklist: JSON.stringify(DEFAULT_CHECKLIST),
      });
      await Promise.all(selectedArticles.map(a =>
        base44.entities.Article.update(a.id, { production_id: prod.id, production_status: 'selected' })
      ));
      setProduction(prod);
      setStoryOrder(order);
      setChecklist(DEFAULT_CHECKLIST);
      await loadStoriesData(prod);
      await logActivity('create', `Production created with ${order.length} stories`);
    } catch (e) {
      console.error('Failed to create production:', e);
    } finally {
      setCreating(false);
      setTimeout(() => { skipSave.current = false; }, 200);
    }
  };

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
    const available = await base44.entities.Article.filter({ status: 'selected' });
    setAvailableStories(available.filter(a => !storyOrder.includes(a.id)));
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
    return (
      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        <div className="glass-panel glow-purple p-6 lg:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-berna-purple" />
            <h1 className="text-2xl font-bold text-white">Create Production</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Create a new production workspace. All selected stories from the Story Queue will be added automatically.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Production Title</label>
              <Input
                value={newProd.title}
                onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                placeholder="e.g. TNN Morning Brief - June 29"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Brand Profile</label>
                <Select value={newProd.brand_profile_id} onValueChange={(v) => setNewProd({ ...newProd, brand_profile_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map(b => <SelectItem key={b.id} value={b.id}>{b.brand_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Show Profile</label>
                <Select value={newProd.show_profile_id} onValueChange={(v) => setNewProd({ ...newProd, show_profile_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select show" /></SelectTrigger>
                  <SelectContent>
                    {shows.map(s => <SelectItem key={s.id} value={s.id}>{s.show_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Production Date</label>
              <Input
                type="date"
                value={newProd.production_date}
                onChange={(e) => setNewProd({ ...newProd, production_date: e.target.value })}
              />
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:from-berna-purple/90 text-white glow-purple"
            onClick={handleCreate}
            disabled={creating || !newProd.title}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {creating ? 'Creating...' : 'Create Production'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-7xl mx-auto">
      <WorkspaceHeader
        production={production}
        brands={brands}
        shows={shows}
        storyCount={storyOrder.length}
        estimatedRuntime={estimatedRuntime}
        onUpdate={setProduction}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white neon-underline">Production Rundown</h2>
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
      />
    </div>
  );
}