import React, { useState, useEffect } from 'react';
import { FileText, Clock, Mic, MessageSquare, StickyNote } from 'lucide-react';

function parseTiming(str) {
  try { return JSON.parse(str || '{}') ?? {}; } catch { return {}; }
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateReadTime(words, wpm = 150) {
  return Math.ceil((words / wpm) * 60);
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ScriptPanel({ slide, presentation, onUpdateSlide }) {
  const [speakerNotes, setSpeakerNotes] = useState(slide?.speaker_notes || '');
  const [bodyText, setBodyText] = useState(slide?.body_text || '');
  const [title, setTitle] = useState(slide?.title || '');
  const [activeTab, setActiveTab] = useState('script');

  useEffect(() => {
    setSpeakerNotes(slide?.speaker_notes || '');
    setBodyText(slide?.body_text || '');
    setTitle(slide?.title || '');
  }, [slide?.id]);

  const handleNotesChange = (val) => {
    setSpeakerNotes(val);
    onUpdateSlide?.(slide?.id, { speaker_notes: val });
  };

  const handleScriptChange = (val) => {
    setBodyText(val);
    onUpdateSlide?.(slide?.id, { body_text: val });
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    onUpdateSlide?.(slide?.id, { title: val });
  };

  const slideTimeline = parseTiming(slide?.slide_timeline);
  const sentences = Array.isArray(slideTimeline.sentence_timeline) ? slideTimeline.sentence_timeline : [];
  const voiceDuration = slideTimeline.duration_ms ? slideTimeline.duration_ms / 1000 : 0;

  const scriptWords = countWords(bodyText);
  const notesWords = countWords(speakerNotes);
  const estTime = estimateReadTime(scriptWords);

  return (
    <div className="cpe-side-panel flex flex-col h-full">
      <div className="cpe-panel-header">
        <FileText className="w-4 h-4" />
        <span className="cpe-panel-title">Script</span>
        <span className="cpe-panel-sub">{slide?.title || 'Slide'}</span>
      </div>

      <div className="cpe-ws-tabs">
        <button className={activeTab === 'script' ? 'active' : ''} onClick={() => setActiveTab('script')}>Script</button>
        <button className={activeTab === 'notes' ? 'active' : ''} onClick={() => setActiveTab('notes')}>Notes</button>
        <button className={activeTab === 'timing' ? 'active' : ''} onClick={() => setActiveTab('timing')}>Timing</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'script' && (
          <>
            <div className="cpe-ws-stats">
              <div className="cpe-ws-stat"><FileText className="w-3 h-3" /> {scriptWords} words</div>
              <div className="cpe-ws-stat"><Clock className="w-3 h-3" /> ~{fmtTime(estTime)}</div>
              <div className="cpe-ws-stat"><Mic className="w-3 h-3" /> {voiceDuration ? fmtTime(voiceDuration) : '—'}</div>
            </div>
            <label className="cpe-ws-field-label">Slide Title</label>
            <input
              className="cpe-ws-input"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Slide title..."
            />
            <label className="cpe-ws-field-label">Teleprompter Script</label>
            <textarea
              className="cpe-script-editor"
              value={bodyText}
              onChange={(e) => handleScriptChange(e.target.value)}
              placeholder="Teleprompter script..."
              rows={20}
            />
          </>
        )}

        {activeTab === 'notes' && (
          <>
            <div className="cpe-ws-stats">
              <div className="cpe-ws-stat"><StickyNote className="w-3 h-3" /> {notesWords} words</div>
            </div>
            <label className="cpe-ws-field-label">Speaker Notes</label>
            <textarea
              className="cpe-script-editor"
              value={speakerNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Speaker notes..."
              rows={20}
            />
          </>
        )}

        {activeTab === 'timing' && (
          <div className="space-y-2">
            <div className="cpe-ws-stats">
              <div className="cpe-ws-stat"><Clock className="w-3 h-3" /> Voice: {voiceDuration ? fmtTime(voiceDuration) : '—'}</div>
              <div className="cpe-ws-stat"><MessageSquare className="w-3 h-3" /> {sentences.length} sentences</div>
            </div>
            {sentences.length === 0 ? (
              <p className="text-xs text-muted-foreground p-2">No voiceover timeline available for this slide.</p>
            ) : (
              sentences.map((s, i) => (
                <div key={i} className="cpe-sentence-row">
                  <span className="cpe-sentence-time">{fmtTime((s.start_time || 0) / 1000)}</span>
                  <span className="cpe-sentence-text">{s.sentence_text || s.text || ''}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}