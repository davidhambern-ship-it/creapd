import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Clock,
  FileStack,
  TrendingUp,
  Film,
  Loader2,
  Search,
  Pencil,
  Trash2,
  ArrowRight,
  Building2,
} from 'lucide-react';

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function getMetrics(presentation) {
  const sourcePayload = asObject(presentation?.source_payload);
  const studio = asObject(sourcePayload.presentation_studio);
  const editorState = asObject(studio.editor_state);
  const editorPresentation = asObject(editorState.presentation);
  const slides = asArray(editorState.slides);
  const directorPlan = asObject(presentation?.director_plan);
  const qaReport = asObject(studio.qa_report);

  const runtimeMs =
    Number(editorPresentation.total_runtime_ms || 0) ||
    Number(directorPlan.total_runtime_seconds || 0) * 1000 ||
    slides.reduce((sum, slide) => {
      const timing = asObject(slide?.timing);
      return sum + Number(timing.duration_ms || slide?.duration_ms || 0);
    }, 0);

  return {
    studioKey: presentation?.production_studio || presentation?.production_profile || studio.source_studio || 'unknown',
    storyCount: Number(editorPresentation.story_count || slides.length || 0),
    confidence: Number(editorPresentation.confidence_score || qaReport.overall_score || 0),
    runtimeMs,
    handoffStatus: studio.handoff_status || null,
    sourcePackageId: studio.source_package_id || presentation?.source_entity_id || null,
  };
}

export default function Presentations() {
  const navigate = useNavigate();
  const ownedPreview = shouldUseNeonAuth();
  const [presentations, setPresentations] = useState([]);
  const [studios, setStudios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [studioFilter, setStudioFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadPresentations();
  }, []);

  const loadPresentations = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (ownedPreview) {
        const data = await creapdApi.get('/production/core?limit=200');
        setPresentations(data?.presentations || []);
        setStudios(data?.studios || data?.profiles || []);
        return;
      }

      const res = await base44.functions.invoke('listPresentations', {});
      const data = res.data || res;
      setPresentations(data.presentations || []);
    } catch (error) {
      console.error('Failed to load presentations:', error);
      setLoadError(error?.data?.diagnostic?.message || error?.message || 'Failed to load Presentation Studio projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (presId) => {
    if (!confirm('Delete this Presentation Studio project? This removes its editor state and cannot be undone.')) return;
    setDeletingId(presId);
    try {
      if (ownedPreview) {
        await creapdApi.post('/production/core', {
          action: 'delete_presentation_studio',
          presentation_id: presId,
        });
      } else {
        const slides = await base44.entities.StorySlide.filter({ stories_presentation_id: presId }, 'slide_number', 200);
        if (slides && slides.length > 0) {
          await base44.entities.SlideElement.deleteMany({ presentation_id: presId });
          for (const slide of slides) {
            await base44.entities.StorySlide.delete(slide.id);
          }
        }
        await base44.entities.StoriesPresentation.delete(presId);
      }
      setPresentations(prev => prev.filter(p => p.id !== presId));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed: ' + (error?.data?.diagnostic?.message || error?.message || 'Unknown error'));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => presentations.filter(presentation => {
    const metrics = getMetrics(presentation);
    const matchesSearch = !search || String(presentation.title || '').toLowerCase().includes(search.toLowerCase());
    const matchesStudio = studioFilter === 'all' || metrics.studioKey === studioFilter;
    return matchesSearch && matchesStudio;
  }), [presentations, search, studioFilter]);

  const activeStudioKeys = useMemo(() => {
    const keys = new Set(presentations.map(p => getMetrics(p).studioKey).filter(Boolean));
    return studios.length
      ? studios.filter(studio => keys.has(studio.studio_key || studio.key))
      : Array.from(keys).map(key => ({ key, studio_key: key, studio_name: `${key} Studio` }));
  }, [presentations, studios]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center gap-1">
            ← Home
          </Link>
          <Film className="w-8 h-8 text-primary ml-2" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-heading font-bold">Presentation Studio</h1>
              {ownedPreview && (
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">OWNED</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              One studio for every CREAPD production · Presentation Director · Editor · Review · Present
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card/60 px-4 py-3 max-w-md">
          <div className="flex gap-2 items-start">
            <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              New projects arrive here when an approved Production Package is dispatched from a Production Studio.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search Presentation Studio projects..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        {activeStudioKeys.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Button size="sm" variant={studioFilter === 'all' ? 'default' : 'outline'} onClick={() => setStudioFilter('all')}>
              All Studios
            </Button>
            {activeStudioKeys.map(studio => {
              const key = studio.studio_key || studio.key;
              return (
                <Button
                  key={key}
                  size="sm"
                  variant={studioFilter === key ? 'default' : 'outline'}
                  onClick={() => setStudioFilter(key)}
                  className="whitespace-nowrap"
                >
                  {studio.studio_name || studio.name || `${key} Studio`}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {loadError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No Presentation Studio projects yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Finish a Production Package in a Production Studio, approve it, and send it here through Dispatch.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((pres) => {
            const metrics = getMetrics(pres);
            return (
              <div
                key={pres.id}
                className="group bg-card rounded-xl border border-border p-4 hover:border-primary/50 transition-colors"
              >
                <Link to={`/editor/${pres.id}`}>
                  <div className="aspect-video bg-gradient-to-br from-berna-navy to-black rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    <Film className="w-10 h-10 text-white/20 group-hover:text-primary/40 transition-colors" />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="capitalize text-xs">{metrics.studioKey} Studio</Badge>
                    </div>
                    <div className="absolute bottom-2 left-2 flex gap-1.5">
                      <Badge variant="outline" className="text-xs bg-black/50 capitalize">{pres.status || 'editing'}</Badge>
                      {metrics.handoffStatus && (
                        <Badge variant="outline" className="text-xs bg-black/50 capitalize">{metrics.handoffStatus.replace(/_/g, ' ')}</Badge>
                      )}
                    </div>
                  </div>
                  <h3 className="font-heading font-semibold text-sm truncate group-hover:text-primary transition-colors">
                    {pres.title || 'Untitled Presentation'}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(metrics.runtimeMs)}</span>
                    <span className="flex items-center gap-1"><FileStack className="w-3 h-3" /> {metrics.storyCount}</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {metrics.confidence || '—'}</span>
                  </div>
                </Link>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5"
                    onClick={() => navigate(`/editor/${pres.id}`)}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Open Studio
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 hover:border-destructive hover:text-destructive"
                    onClick={() => handleDelete(pres.id)}
                    disabled={deletingId === pres.id}
                    title="Delete Presentation Studio project"
                  >
                    {deletingId === pres.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
