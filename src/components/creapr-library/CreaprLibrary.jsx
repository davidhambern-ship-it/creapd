import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { DEFAULT_CREAP_SETTINGS } from '@/lib/creapSettings';
import { generateGreeting, processProducerInput, buildResearchTopicData } from '@/lib/creaprLibraryEngine';
import LibraryAmbience from './LibraryAmbience';
import LibrarySubtitle from './LibrarySubtitle';
import LibraryShelves from './LibraryShelves';
import LibraryDesk from './LibraryDesk';
import LibraryInput from './LibraryInput';
import { X, Loader2 } from 'lucide-react';

// Module-level audio lock — prevents overlapping TTS across instances
let _audioLock = false;

export default function CreaprLibrary({ config, onClose, embedded = false }) {
  const navigate = useNavigate();

  const [stage, setStage] = useState('greeting');
  const [subtitleLines, setSubtitleLines] = useState(null);
  const [shelves, setShelves] = useState(null);
  const [assignment, setAssignment] = useState({});
  const [deskPhase, setDeskPhase] = useState(null);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingGreeting, setLoadingGreeting] = useState(true);

  const conversationHistoryRef = useRef([]);
  const assignmentRef = useRef({});
  const creapSettingsRef = useRef(DEFAULT_CREAP_SETTINGS);
  const userNameRef = useRef('');
  const audioRef = useRef(null);
  const speakGenRef = useRef(0);
  const isMountedRef = useRef(true);
  const subtitleDoneRef = useRef(null);
  const completionRef = useRef(0);
  const processingRef = useRef(false);

  const speakLine = useCallback((text) => {
    return new Promise(async (resolve) => {
      if (!text || !isMountedRef.current) { resolve(); return; }
      if (_audioLock) { resolve(); return; }
      _audioLock = true;
      const gen = ++speakGenRef.current;
      try {
        const response = await base44.functions.invoke('generateCreapSpeech', {
          text: text.substring(0, 5000),
          voice: creapSettingsRef.current.voice_id || 'daniel',
        });
        if (gen !== speakGenRef.current || !isMountedRef.current) { _audioLock = false; resolve(); return; }
        const url = response?.data?.url;
        if (!url) { _audioLock = false; resolve(); return; }
        setSpeaking(true);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { _audioLock = false; setSpeaking(false); resolve(); };
        audio.onerror = () => { _audioLock = false; setSpeaking(false); resolve(); };
        audio.play().catch(() => { _audioLock = false; setSpeaking(false); resolve(); });
      } catch {
        _audioLock = false;
        setSpeaking(false);
        resolve();
      }
    });
  }, []);

  const stopAudio = useCallback(() => {
    speakGenRef.current++;
    _audioLock = false;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const speakLines = useCallback(async (lines, onComplete) => {
    if (!lines || lines.length === 0) { onComplete?.(); return; }
    setSubtitleLines(lines);
    subtitleDoneRef.current = onComplete;
    for (let i = 0; i < lines.length; i++) {
      if (!isMountedRef.current) return;
      await speakLine(lines[i]);
      if (!isMountedRef.current) return;
      await new Promise(r => setTimeout(r, 600));
    }
  }, [speakLine]);

  const handleSubtitlesDone = useCallback(() => {
    if (subtitleDoneRef.current) {
      const cb = subtitleDoneRef.current;
      subtitleDoneRef.current = null;
      cb();
    }
  }, []);

  const handleGenerateGreeting = useCallback(async () => {
    if (!isMountedRef.current) return;
    const enhancedConfig = { ...config, _userName: userNameRef.current };
    const result = await generateGreeting(
      { full_name: userNameRef.current },
      creapSettingsRef.current,
      enhancedConfig
    );
    if (!isMountedRef.current) return;
    setLoadingGreeting(false);
    conversationHistoryRef.current.push({ role: 'assistant', content: result.spoken_lines.join(' ') });
    completionRef.current = result.completion_confidence || 0;
    speakLines(result.spoken_lines, () => {
      if (!isMountedRef.current) return;
      setInputEnabled(true);
    });
  }, [config, speakLines]);

  useEffect(() => {
    (async () => {
      try {
        const settingsRes = await base44.entities.CreapSettings.filter({ is_active: true }, '-updated_date', 1);
        if (settingsRes.length > 0) creapSettingsRef.current = settingsRes[0];
      } catch {}
      try {
        const user = await base44.auth.me();
        if (user?.full_name) userNameRef.current = user.full_name;
      } catch {}
      handleGenerateGreeting();
    })();

    return () => {
      isMountedRef.current = false;
      _audioLock = false;
      stopAudio();
    };
  }, []);

  const handleProducerInput = useCallback(async (input, selectedCategory = null) => {
    if (!isMountedRef.current || processingRef.current) return;
    processingRef.current = true;
    setInputEnabled(false);
    setShelves(null);
    setSubtitleLines(null);
    stopAudio();

    const userMessage = selectedCategory ? `[Selected: ${selectedCategory}]` : input;
    conversationHistoryRef.current.push({ role: 'user', content: userMessage });

    setThinking(true);
    const enhancedConfig = { ...config, _userName: userNameRef.current };
    const result = await processProducerInput(
      input,
      conversationHistoryRef.current,
      assignmentRef.current,
      creapSettingsRef.current,
      enhancedConfig,
      selectedCategory
    );
    setThinking(false);

    if (!isMountedRef.current) return;

    conversationHistoryRef.current.push({ role: 'assistant', content: result.spoken_lines.join(' ') });

    if (result.assignment_update) {
      assignmentRef.current = { ...assignmentRef.current, ...result.assignment_update };
      setAssignment(assignmentRef.current);
    }
    completionRef.current = result.completion_confidence || completionRef.current;

    if (result.phase === 'assembling' || result.phase === 'reveal' || (result.completion_confidence >= 0.8 && result.assignment)) {
      speakLines(result.spoken_lines, () => {
        if (!isMountedRef.current) return;
        setStage('reveal');
        setDeskPhase('assembling');
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setDeskPhase('reveal');
          if (!result.assignment) return;
          const fullAssignment = {
            ...result.assignment,
            research_depth: result.assignment.research_depth || config?.research_depth || 'standard',
            audience: result.assignment.audience || config?.target_audience || 'General Public',
          };
          setAssignment(fullAssignment);
          assignmentRef.current = fullAssignment;
        }, 2500);
      });
      processingRef.current = false;
      return;
    }

    const hasShelves = (result.categories?.length > 0) || (result.featured_books?.length > 0);

    speakLines(result.spoken_lines, () => {
      if (!isMountedRef.current) return;
      if (hasShelves) {
        if (result.categories) {
          setShelves({ items: result.categories, variant: 'category', title: 'Explore the Library' });
        } else {
          setShelves({ items: result.featured_books, variant: 'featured', title: 'Featured Discoveries' });
        }
      }
      setInputEnabled(true);
    });

    processingRef.current = false;
  }, [config, speakLines, stopAudio]);

  const handleCategorySelect = useCallback((item) => {
    handleProducerInput(item.name, item.name);
  }, [handleProducerInput]);

  const handleApprove = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setInputEnabled(false);
    try {
      const topicData = buildResearchTopicData(assignmentRef.current, config);
      const topic = await base44.entities.ResearchTopic.create(topicData);
      base44.functions.invoke('deepResearchV2', {
        topic_id: topic.id,
        research_depth: topic.research_depth,
      }).catch(err => console.error('Research launch failed:', err));
      navigate(`/research/manager?topic_id=${topic.id}`);
    } catch (err) {
      console.error('Failed to create topic:', err);
      setSubmitting(false);
      setInputEnabled(true);
    }
  }, [config, navigate, submitting]);

  const handleEdit = useCallback(() => {
    setDeskPhase(null);
    setStage('conversation');
    setShelves(null);
    setInputEnabled(true);
    speakLines(["Let's refine this.", "What would you like to change?"], () => {
      if (!isMountedRef.current) return;
      setInputEnabled(true);
    });
  }, [speakLines]);

  const handleRestart = useCallback(() => {
    stopAudio();
    setDeskPhase(null);
    setStage('greeting');
    setShelves(null);
    setAssignment({});
    assignmentRef.current = {};
    conversationHistoryRef.current = [];
    completionRef.current = 0;
    setSubtitleLines(null);
    setLoadingGreeting(true);
    handleGenerateGreeting();
  }, [handleGenerateGreeting, stopAudio]);

  const canShowInput = (stage === 'greeting' || stage === 'conversation') && deskPhase === null;
  const showLoading = loadingGreeting && !subtitleLines && !speaking && !thinking;

  return (
    <div className={`${embedded ? 'absolute inset-0' : 'fixed inset-0 z-50'} bg-black overflow-hidden`}>
      <LibraryAmbience intensity={deskPhase === 'assembling' ? 'assembling' : speaking ? 'active' : 'calm'} />

      {showLoading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 15 }}>
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(40 40% 55%)' }} />
            <span className="text-sm" style={{ color: 'hsl(40 30% 60%)' }}>Entering the library...</span>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 flex items-center gap-3" style={{ zIndex: 15 }}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          speaking ? 'bg-primary/40 glow-purple' : thinking ? 'bg-primary/20' : 'bg-primary/15'
        }`}>
          <span className="text-sm font-heading font-bold text-primary-foreground">Cr</span>
        </div>
        <div>
          <h3 className="font-heading font-semibold text-sm" style={{ color: 'hsl(40 30% 88%)' }}>CREAPr</h3>
          <p className="text-xs" style={{ color: 'hsl(220 10% 45%)' }}>
            {speaking ? 'Speaking...' : thinking ? 'Thinking...' : listening ? 'Listening...' : 'The Library'}
          </p>
        </div>
      </div>

      {!embedded && (
        <button
          onClick={() => { stopAudio(); onClose?.(); }}
          className="absolute top-4 right-4 p-2.5 rounded-full transition-all hover:bg-white/5"
          style={{ zIndex: 15, border: '1px solid hsl(40 30% 20% / 0.3)' }}
        >
          <X className="w-5 h-5" style={{ color: 'hsl(220 10% 55%)' }} />
        </button>
      )}

      {shelves && (
        <LibraryShelves
          items={shelves.items}
          variant={shelves.variant}
          title={shelves.title}
          onSelect={handleCategorySelect}
        />
      )}

      {deskPhase && (
        <LibraryDesk
          assignment={assignment}
          phase={deskPhase}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onRestart={handleRestart}
        />
      )}

      {subtitleLines && (
        <LibrarySubtitle lines={subtitleLines} onAllLinesShown={handleSubtitlesDone} />
      )}

      {canShowInput && (
        <LibraryInput
          onSend={(text) => handleProducerInput(text)}
          disabled={!inputEnabled || submitting}
          listening={listening}
          onToggleListen={setListening}
          thinking={thinking}
          placeholder={stage === 'greeting' ? 'Speak or type what you\'re looking for...' : 'Continue the conversation...'}
        />
      )}

      {deskPhase === null && completionRef.current > 0 && (
        <div className="absolute top-4 right-16 hidden md:flex items-center gap-2" style={{ zIndex: 15 }}>
          <div className="w-24 h-1 rounded-full overflow-hidden" style={{ background: 'hsl(40 30% 15% / 0.4)' }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, completionRef.current * 100)}%`,
                background: 'linear-gradient(90deg, hsl(40 50% 45%), hsl(152 60% 45%))',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}