import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PenTool, Plus, Clock, FileText, BookOpen, Save } from 'lucide-react';
import { SECTION_TYPE_LABELS, formatDuration } from '@/lib/spiritualConstants';

export default function SpiritualMessage() {
  const { config, messageSections, loading, refresh } = useSpiritualProduction();
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <PenTool className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  if (messageSections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <PenTool className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No message sections generated yet. Refresh your production to build the message.</p>
          <Button asChild><Link to="/spiritual/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const totalDuration = messageSections.reduce((sum, s) => sum + (s.estimated_duration_seconds || 0), 0);
  const totalWords = messageSections.reduce((sum, s) => sum + (s.content || '').split(/\s+/).filter(Boolean).length, 0);

  const handleSave = async (sectionId) => {
    setSaving(true);
    try {
      await base44.entities.SpiritualMessageSection.update(sectionId, { content: editContent, status: 'edited' });
      setEditingId(null);
      await refresh();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const startEdit = (section) => {
    setEditingId(section.id);
    setEditContent(section.content || '');
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold mb-1">Message Builder</h1>
            <p className="text-sm text-muted-foreground">{config.production_type} · {config.speaker_tone} tone</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDuration(totalDuration)}</span>
            <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {totalWords} words</span>
          </div>
        </div>

        <div className="space-y-4">
          {messageSections.map((section, idx) => (
            <div key={section.id} className="glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">#{section.order || idx + 1}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                    {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                  </span>
                  {section.estimated_duration_seconds > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(section.estimated_duration_seconds)}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => editingId === section.id ? setEditingId(null) : startEdit(section)}>
                  {editingId === section.id ? 'Cancel' : 'Edit'}
                </Button>
              </div>

              <h3 className="font-heading font-semibold text-lg mb-2">{section.title}</h3>

              {editingId === section.id ? (
                <div className="space-y-3">
                  <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8} className="font-body" />
                  <Button size="sm" onClick={() => handleSave(section.id)} disabled={saving}>
                    <Save className="w-3.5 h-3.5 mr-1" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{section.content}</p>
              )}

              {section.scripture_references && (
                <div className="mt-3 p-3 rounded-lg bg-secondary/30 flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{section.scripture_references}</p>
                </div>
              )}

              {section.speaker_notes && (
                <div className="mt-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs font-semibold text-accent mb-1">Speaker Notes (Private)</p>
                  <p className="text-xs text-foreground/80 whitespace-pre-wrap">{section.speaker_notes}</p>
                </div>
              )}

              {section.citations && (
                <div className="mt-2 flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{section.citations}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}