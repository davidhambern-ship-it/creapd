import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PresentationPlayer from '@/components/presentation/PresentationPlayer';
import {
  ArrowLeft, CheckCircle, XCircle, RefreshCw, Clock, FileStack,
  TrendingUp, AlertTriangle, Share2, Download
} from 'lucide-react';

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function ScoreBar({ label, score }) {
  const color = score >= 90 ? 'bg-emerald-500' : score >= 80 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono w-8 text-right">{score}</span>
    </div>
  );
}

export default function PresentationReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState(null);
  const [storySlides, setStorySlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadPresentation();
  }, [id]);

  const loadPresentation = async () => {
    try {
      const pres = await base44.entities.StoriesPresentation.get(id);
      setPresentation(pres);

      const slideIds = (() => { try { return JSON.parse(pres.story_slide_ids || '[]'); } catch { return []; } })();
      const slides = [];
      for (const slideId of slideIds) {
        try {
          const slide = await base44.entities.StorySlide.get(slideId);
          slides.push(slide);
        } catch (e) {}
      }
      setStorySlides(slides);
    } catch (error) {
      console.error('Failed to load presentation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      await base44.entities.StoriesPresentation.update(id, {
        status: 'approved',
        producer_metadata: JSON.stringify({
          review_state: 'approved',
          approval_status: 'approved',
          approval_timestamp: new Date().toISOString(),
          locked: true
        })
      });
      await loadPresentation();
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      await base44.entities.StoriesPresentation.update(id, {
        status: 'reviewing',
        producer_metadata: JSON.stringify({
          review_state: 'changes_requested',
          approval_status: 'rejected',
          locked: false
        })
      });
      await loadPresentation();
    } catch (error) {
      console.error('Reject failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Presentation not found</p>
        <Link to="/presentations"><Button variant="outline">Back to Presentations</Button></Link>
      </div>
    );
  }

  const metadata = (() => { try { return JSON.parse(presentation.presentation_metadata || '{}'); } catch { return {}; } })();
  const qaScores = (() => { try { return JSON.parse(presentation.qa_scores || '{}'); } catch { return {}; } })();
  const producerMeta = (() => { try { return JSON.parse(presentation.producer_metadata || '{}'); } catch { return {}; } })();
  const isApproved = presentation.status === 'approved';

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/presentations')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold">{presentation.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="capitalize">{presentation.production_profile}</Badge>
              <Badge variant={isApproved ? 'default' : 'outline'} className="capitalize">{presentation.status}</Badge>
              {presentation.qa_result === 'pass' && <Badge className="bg-emerald-600">QA Pass</Badge>}
              {presentation.qa_result === 'warning' && <Badge className="bg-yellow-600">QA Warning</Badge>}
              {presentation.qa_result === 'fail' && <Badge className="bg-red-600">QA Fail</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Player — spans 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {storySlides.length > 0 ? (
            <PresentationPlayer storySlides={storySlides} />
          ) : (
            <div className="w-full aspect-video bg-card rounded-xl flex items-center justify-center border border-border">
              <p className="text-muted-foreground">No story slides available</p>
            </div>
          )}

          {/* Slide list */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-heading font-semibold mb-3">Story Slides ({storySlides.length})</h3>
            <div className="space-y-2">
              {storySlides.map((slide, idx) => {
                const meta = (() => { try { return JSON.parse(slide.slide_metadata || '{}'); } catch { return {}; } })();
                const sg = (() => { try { return JSON.parse(slide.scene_graph || '{}'); } catch { return {}; } })();
                return (
                  <div key={slide.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{meta.headline || `Story ${idx + 1}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {sg.scenes?.length || 0} scenes · {formatTime(slide.duration_ms || 0)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{slide.status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar — metadata & controls */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-heading font-semibold">Production Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatTime(presentation.total_runtime_ms || 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileStack className="w-4 h-4 text-muted-foreground" />
                <span>{presentation.story_count} stories</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span>{presentation.confidence_score}/100</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">v{presentation.presentation_version}</span>
              </div>
            </div>
            {metadata.creator && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                Created by {metadata.creator} on {new Date(metadata.generation_timestamp || presentation.created_date).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* QA Scores */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-heading font-semibold">Quality Assurance</h3>
              <Badge variant={presentation.confidence_score >= 90 ? 'default' : 'outline'}>
                {presentation.confidence_score >= 95 ? 'Broadcast Ready' :
                 presentation.confidence_score >= 90 ? 'Review Recommended' :
                 presentation.confidence_score >= 80 ? 'Minor Issues' : 'Regenerate'}
              </Badge>
            </div>
            {Object.entries(qaScores).map(([key, val]) => (
              <ScoreBar key={key} label={key.replace(/_/g, ' ')} score={val} />
            ))}
          </div>

          {/* Producer Actions */}
          {!isApproved ? (
            <div className="bg-card rounded-xl border border-border p-4 space-y-3">
              <h3 className="text-sm font-heading font-semibold">Producer Review</h3>
              <p className="text-xs text-muted-foreground">
                Review the presentation and approve or request changes.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleApprove} disabled={approving} className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle className="w-4 h-4" /> Approve Presentation
                </Button>
                <Button onClick={handleReject} variant="outline" className="w-full">
                  <XCircle className="w-4 h-4" /> Request Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-heading font-semibold text-emerald-500">Approved</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                This presentation has been approved and is ready for export.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full">
                  <Download className="w-4 h-4" /> Export MP4
                </Button>
                <Button variant="outline" className="w-full">
                  <Share2 className="w-4 h-4" /> Share with CREAPD
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}