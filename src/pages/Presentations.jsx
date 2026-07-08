import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileStack, TrendingUp, Plus, Film, Loader2, Search, Pencil, Trash2, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function Presentations() {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('news');
  const [presentationTitle, setPresentationTitle] = useState('');
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    try {
      const list = await base44.entities.StoriesPresentation.filter({}, '-created_date', 50);
      setPresentations(list);
    } catch (error) {
      console.error('Failed to load presentations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePackages = async () => {
    setLoadingPackages(true);
    try {
      const packages = await base44.entities.ProductionPackage.filter({ status: 'approved', production_profile: 'news' }, '-created_date', 50);
      setAvailablePackages(packages);
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const togglePackage = (pkgId) => {
    setSelectedPackages(prev =>
      prev.includes(pkgId) ? prev.filter(id => id !== pkgId) : [...prev, pkgId]
    );
  };

  const handleGenerate = async () => {
    if (selectedPackages.length === 0) return;
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateStoriesPresentation', {
        story_package_ids: selectedPackages,
        production_profile: selectedProfile,
        presentation_title: presentationTitle || undefined
      });
      const result = response.data || response;
      if (result.presentation?.id) {
        setShowGenerate(false);
        setSelectedPackages([]);
        setPresentationTitle('');
        await loadPresentations();
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Generation failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setGenerating(false);
    }
  };

  const openGenerateDialog = () => {
    setShowGenerate(true);
    loadAvailablePackages();
  };

  const handleDelete = async (presId) => {
    if (!confirm('Delete this presentation? This will also delete all slides and elements. This cannot be undone.')) return;
    setDeletingId(presId);
    try {
      // Delete all slide elements for this presentation
      const slides = await base44.entities.StorySlide.filter({ stories_presentation_id: presId }, 'slide_number', 200);
      if (slides && slides.length > 0) {
        await base44.entities.SlideElement.deleteMany({ presentation_id: presId });
        for (const slide of slides) {
          await base44.entities.StorySlide.delete(slide.id);
        }
      }
      // Delete the presentation
      await base44.entities.StoriesPresentation.delete(presId);
      setPresentations(prev => prev.filter(p => p.id !== presId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportPptx = async (presId) => {
    try {
      const res = await base44.functions.invoke('exportToPptx', { presentation_id: presId });
      const url = res.data?.signed_url || res.signed_url;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('PPTX export failed:', error);
      alert('Export failed: ' + (error.response?.data?.error || error.message));
    }
  };

  const filtered = presentations.filter(p =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Film className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-bold">Stories Presentations</h1>
            <p className="text-sm text-muted-foreground">AI Presentation Director productions</p>
          </div>
        </div>
        <Button onClick={openGenerateDialog} className="bg-primary">
          <Plus className="w-4 h-4" /> Generate Presentation
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search presentations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Presentations Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Film className="w-12 h-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No presentations yet</p>
          <Button onClick={openGenerateDialog}>
            <Plus className="w-4 h-4" /> Generate Your First Presentation
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pres) => (
            <div
              key={pres.id}
              className="group bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
            >
              <Link to={`/news/presentations/${pres.id}`}>
                <div className="aspect-video bg-gradient-to-br from-berna-navy to-black rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                  <Film className="w-10 h-10 text-white/20 group-hover:text-primary/40 transition-colors" />
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="capitalize text-xs">{pres.production_profile}</Badge>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="outline" className="text-xs bg-black/50">{pres.status}</Badge>
                  </div>
                </div>
                <h3 className="font-heading font-semibold text-sm truncate group-hover:text-primary transition-colors">
                  {pres.title}
                </h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(pres.total_runtime_ms || 0)}</span>
                  <span className="flex items-center gap-1"><FileStack className="w-3 h-3" /> {pres.story_count}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {pres.confidence_score}</span>
                </div>
              </Link>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => navigate(`/editor/${pres.id}`)}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => handleExportPptx(pres.id)}
                  title="Export as PPTX (Google Slides compatible)"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 hover:border-destructive hover:text-destructive"
                  onClick={() => handleDelete(pres.id)}
                  disabled={deletingId === pres.id}
                  title="Delete presentation"
                >
                  {deletingId === pres.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Stories Presentation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Presentation Title</label>
              <Input
                placeholder="Auto-generated if left empty"
                value={presentationTitle}
                onChange={(e) => setPresentationTitle(e.target.value)}
              />
            </div>



            {/* Story Package Selection */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Select Approved Story Packages ({selectedPackages.length} selected)
              </label>
              {loadingPackages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                </div>
              ) : availablePackages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No approved Story Packages found. Approve Production Packages first.
                </p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto border border-border rounded-lg p-2">
                  {availablePackages.map((pkg) => (
                    <label
                      key={pkg.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPackages.includes(pkg.id)}
                        onChange={() => togglePackage(pkg.id)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {pkg.article_id || pkg.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {pkg.story_summary?.slice(0, 80) || 'No summary'}
                        </p>
                      </div>
                      {pkg.voice_package_id && (
                        <Badge variant="outline" className="text-xs">Voice ✓</Badge>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Cancel</Button>
            <Button
              onClick={handleGenerate}
              disabled={selectedPackages.length === 0 || generating}
              className="bg-primary"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
              ) : (
                <><Plus className="w-4 h-4" /> Generate ({selectedPackages.length})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}