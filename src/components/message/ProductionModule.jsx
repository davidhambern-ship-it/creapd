import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SECTION_TYPE_LABELS, formatDuration, estimateSpeakingTime } from '@/lib/spiritualConstants';
import {
  PenTool, Presentation, StickyNote, Clock, BookOpen, Save, X,
  AlertTriangle, CheckCircle2, FileText, Volume2, Play
} from 'lucide-react';

const TABS = [
  { key: 'script', label: 'Script', icon: PenTool },
  { key: 'slide', label: 'Slide', icon: Presentation },
  { key: 'notes', label: 'Notes', icon: StickyNote },
  { key: 'timing', label: 'Timing', icon: Clock },
  { key: 'references', label: 'References', icon: BookOpen }
];

export default function ProductionModule({ section, slide, index, onRefresh }) {
  const [activeTab, setActiveTab] = useState('script');
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const estimatedSeconds = estimateSpeakingTime(section.content);
  const targetSeconds = section.target_runtime_seconds || section.estimated_duration_seconds || estimatedSeconds;
  const voiceSeconds = section.voice_duration_seconds || estimatedSeconds;
  const runtimeStatus = section.runtime_status || 'pending';
  const completionPct = targetSeconds > 0 ? Math.min(100, Math.round((voiceSeconds / targetSeconds) * 100)) : 0;
  const isTooShort = estimatedSeconds < targetSeconds * 0.7;
  const isTooLong = estimatedSeconds > targetSeconds * 1.3;
  const wordCount = (section.content || '').split(/\s+/).filter(Boolean).length;

  const handleSave = async (field) => {
    setSaving(true);
    try {
      await base44.entities.SpiritualMessageSection.update(section.id, {
        [field]: editValue,
        status: 'edited'
      });
      setEditingField(null);
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const startEdit = (field) => {
    setEditingField(field);
    setEditValue(section[field] || '');
  };

  return (
    <div className="glass-panel overflow-hidden">
      {/* Module Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground w-6">#{section.order || index + 1}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
            {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
          </span>
          <span className={`text-xs flex items-center gap-1 ${runtimeStatus === 'too_short' ? 'text-accent' : runtimeStatus === 'too_long' ? 'text-destructive' : 'text-berna-emerald'}`}>
            <Clock className="w-3 h-3" /> {formatDuration(voiceSeconds)} / {formatDuration(targetSeconds)}
          </span>
          {section.voice_url && (
            <a href={section.voice_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
              <Volume2 className="w-3 h-3" /> Voice
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                  activeTab === tab.key ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3 h-3" /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Title */}
      <div className="px-4 py-2">
        <h3 className="font-heading font-semibold text-base">{section.title}</h3>
      </div>

      {/* Module Content */}
      <div className="px-4 pb-4">
        {/* Script Tab */}
        {activeTab === 'script' && (
          <div>
            {editingField === 'content' ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  rows={10}
                  className="font-body text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave('content')} disabled={saving}>
                    <Save className="w-3 h-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div onClick={() => startEdit('content')} className="cursor-text group">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{section.content}</p>
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost"><PenTool className="w-3 h-3 mr-1" /> Edit Script</Button>
                  <span className="text-xs text-muted-foreground">{wordCount} words · {formatDuration(estimatedSeconds)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Slide Tab */}
        {activeTab === 'slide' && (
          <div>
            {slide ? (
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Presentation className="w-4 h-4 text-primary" />
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary capitalize">
                    {slide.asset_type?.replace(/_/g, ' ')}
                  </span>
                </div>
                <h4 className="font-heading font-semibold text-sm mb-2">{slide.title}</h4>
                <div className="text-sm text-foreground/80 whitespace-pre-wrap">{slide.content}</div>
                {slide.generated_image_url && (
                  <img src={slide.generated_image_url} alt={slide.title} className="mt-3 rounded-lg max-h-48 object-cover" />
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Presentation className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No slide generated for this section.</p>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div>
            {editingField === 'speaker_notes' ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  rows={6}
                  className="font-body text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave('speaker_notes')} disabled={saving}>
                    <Save className="w-3 h-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingField(null)}>
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div onClick={() => startEdit('speaker_notes')} className="cursor-text group">
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs font-semibold text-accent mb-1">Speaker Notes (Private)</p>
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap">
                    {section.speaker_notes || 'Click to add speaker notes...'}
                  </p>
                </div>
                <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="sm" variant="ghost"><PenTool className="w-3 h-3 mr-1" /> Edit Notes</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Timing Tab */}
        {activeTab === 'timing' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Target Runtime</p>
                <p className="text-lg font-heading font-bold">{formatDuration(targetSeconds)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Voice Runtime</p>
                <p className="text-lg font-heading font-bold">{formatDuration(voiceSeconds)}</p>
              </div>
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-1">Difference</p>
                <p className={`text-lg font-heading font-bold ${voiceSeconds < targetSeconds ? 'text-accent' : voiceSeconds > targetSeconds ? 'text-destructive' : 'text-berna-emerald'}`}>
                  {voiceSeconds >= targetSeconds ? '+' : ''}{formatDuration(Math.abs(voiceSeconds - targetSeconds))}
                </p>
              </div>
            </div>

            {section.voice_url && (
              <div className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Voiceover
                </p>
                <audio controls src={section.voice_url} className="w-full h-8" />
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Runtime Completion</span>
                <span className={isTooShort ? 'text-accent' : isTooLong ? 'text-destructive' : 'text-berna-emerald'}>
                  {completionPct}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isTooShort ? 'bg-accent' : isTooLong ? 'bg-destructive' : 'bg-berna-emerald'
                  }`}
                  style={{ width: `${Math.min(100, completionPct)}%` }}
                />
              </div>
            </div>

            {isTooShort && (
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-accent">Content Too Short</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Needs ~{targetSeconds - estimatedSeconds}s more content. Consider:
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Expand Script', 'Add Illustration', 'Add Historical Context', 'Add Story', 'Add Scripture', 'Add Discussion', 'Add Application'].map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded text-xs bg-secondary/40">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {isTooLong && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-destructive">Content Too Long</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exceeds target by {estimatedSeconds - targetSeconds}s. Consider trimming content.
                  </p>
                </div>
              </div>
            )}
            {!isTooShort && !isTooLong && (
              <div className="p-3 rounded-lg bg-berna-emerald/10 border border-berna-emerald/20 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-berna-emerald" />
                <p className="text-xs text-berna-emerald">Runtime is well-balanced.</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" /> {wordCount} words at ~130 words per minute
            </div>
          </div>
        )}

        {/* References Tab */}
        {activeTab === 'references' && (
          <div className="space-y-2">
            {section.scripture_references && (
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold mb-1">Scripture References</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{section.scripture_references}</p>
                  </div>
                </div>
              </div>
            )}
            {section.citations && (
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold mb-1">Citations</p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{section.citations}</p>
                  </div>
                </div>
              </div>
            )}
            {!section.scripture_references && !section.citations && (
              <p className="text-xs text-muted-foreground text-center py-4">No references for this section.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}