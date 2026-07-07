import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// LibraryMessage removed — visual library + tour only
import { base44 } from '@/api/base44Client';
import { DEFAULT_CREAP_SETTINGS } from '@/lib/creapSettings';
import { generateGreeting, buildResearchTopicData } from '@/lib/creapr/controllers/topicsController';
import { runCreaprBrain } from '@/lib/creapr/creaprBrain';
import LibraryEnvironment from './LibraryEnvironment';
import LibraryWings from './LibraryWings';
import LibraryResearchTable from './LibraryResearchTable';
import LibraryInput from './LibraryInput';
import LibraryGuidedTour from './LibraryGuidedTour';
import { X, Loader2, BookOpen, Compass } from 'lucide-react';

const TOUR_STEPS = [
  {
    title: 'The CREAPr Library',
    narration: 'Welcome to the CREAPr Library — a guided research experience. Let me walk you through how this works.',
    target: null,
  },
  {
    title: 'Your Research Companion',
    narration: 'This is CREAPr, your AI research librarian. The status indicator pulses while CREAPr searches the stacks for you.',
    target: 'creapr-header',
  },
  {
    title: 'Understanding Meter',
    narration: 'This bar shows how well CREAPr understands your request. As it fills toward green, the library is getting closer to assembling your research assignment.',
    target: 'understanding-meter',
  },
  {
    title: 'The Bookshelves',
    narration: 'When you start exploring, bookshelf wings appear here — each shelf is a category of knowledge. Click any wing to dive into that topic.',
    target: 'library-wings',
  },
  {
    title: 'The Research Table',
    narration: 'Once CREAPr has enough understanding, a research table assembles here. Your compiled assignment appears as an open book — ready to approve and send to deep research.',
    target: 'research-table',
  },
  {
    title: 'Speak or Type',
    narration: 'Type your request here, or tap the microphone to speak. CREAPr will guide you toward a complete research assignment at any time.',
    target: 'library-input',
  },
  {
    title: 'Ready to Begin',
    narration: "That's the tour. Tell CREAPr what you'd like to research, and the library will come alive.",
    target: null,
  },
];

export default function CreaprLibrary({ config, onClose, embedded = false }) {
  const navigate = useNavigate();

  const [view, setView] = useState('overview');
  const [wings, setWings] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [tablePhase, setTablePhase] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingGreeting, setLoadingGreeting] = useState(true);
  const [focusedWing, setFocusedWing] = useState(null);
  const [completionConfidence, setCompletionConfidence] = useState(0);
  const [tourActive, setTourActive] = useState(false);

  const isMountedRef = useRef(true);
  const conversationHistoryRef = useRef([]);
  const assignmentRef = useRef({});
  const creapSettingsRef = useRef(DEFAULT_CREAP_SETTINGS);
  const userNameRef = useRef('');
  const processingRef = useRef(false);
  const loadingGreetingRef = useRef(true);

  const handleGenerateGreeting = useCallback(async () => {
    if (!isMountedRef.current) return;
    const enhancedConfig = { ...config, _userName: userNameRef.current };
    try {
      const result = await generateGreeting(
        { full_name: userNameRef.current },
        creapSettingsRef.current,
        enhancedConfig
      );
      if (!isMountedRef.current) return;
      loadingGreetingRef.current = false;
      setLoadingGreeting(false);
      conversationHistoryRef.current.push({ role: 'assistant', content: result.spoken_lines.join(' ') });
      setCompletionConfidence(result.completion_confidence || 0);
      setInputEnabled(true);
    } catch {
      if (!isMountedRef.current) return;
      loadingGreetingRef.current = false;
      setLoadingGreeting(false);
      const fallback = ["Welcome to the library.", "What are we looking for today?"];
      conversationHistoryRef.current.push({ role: 'assistant', content: fallback.join(' ') });
      setInputEnabled(true);
    }
  }, [config]);

  useEffect(() => {
    let timeoutId;
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

      timeoutId = setTimeout(() => {
        if (!isMountedRef.current) return;
        if (loadingGreetingRef.current) {
          loadingGreetingRef.current = false;
          setLoadingGreeting(false);
          const fallback = ["Welcome to the library.", "What are we looking for today?"];
          conversationHistoryRef.current.push({ role: 'assistant', content: fallback.join(' ') });
          setInputEnabled(true);
        }
      }, 12000);
    })();

    return () => {
      isMountedRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleProducerInput = useCallback(async (input, selectedCategory = null) => {
    if (!isMountedRef.current || processingRef.current) return;
    processingRef.current = true;
    setInputEnabled(false);
    setWings(null);
    setFocusedWing(null);

    const userMessage = selectedCategory ? `[Selected: ${selectedCategory}]` : input;
    conversationHistoryRef.current.push({ role: 'user', content: userMessage });

    setThinking(true);
    const brainResponse = await runCreaprBrain({
      userMessage: selectedCategory || input,
      activeProductionProfile: 'Research',
      activeDepartment: 'Topics',
      activeProjectId: config?.id,
      conversationHistory: conversationHistoryRef.current,
      pageContext: {
        route: '/research/topics',
        assignment: assignmentRef.current,
        selectedCategory,
      },
      creapMode: 'hybrid',
      directDelegate: true,
    });
    setThinking(false);

    if (!isMountedRef.current) return;

    const result = brainResponse.department_result || {};
    const spokenLines = result.spoken_lines || (brainResponse.message_to_user ? [brainResponse.message_to_user] : ["Let me try that again."]);

    conversationHistoryRef.current.push({ role: 'assistant', content: spokenLines.join(' ') });

    if (result.assignment_update) {
      assignmentRef.current = { ...assignmentRef.current, ...result.assignment_update };
      setAssignment(assignmentRef.current);
    }

    const newConfidence = result.completion_confidence || 0;
    setCompletionConfidence(newConfidence);

    if (result.phase === 'assembling' || result.phase === 'reveal' || (newConfidence >= 0.8 && result.assignment)) {
      setView('table');
      setTablePhase('assembling');
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setTablePhase('reveal');
        if (!result.assignment) return;
        const fullAssignment = {
          ...result.assignment,
          research_depth: result.assignment.research_depth || config?.research_depth || 'standard',
          audience: result.assignment.audience || config?.target_audience || 'General Public',
        };
        setAssignment(fullAssignment);
        assignmentRef.current = fullAssignment;
      }, 2500);
      setInputEnabled(true);
      processingRef.current = false;
      return;
    }

    const hasWings = (result.categories?.length > 0) || (result.featured_books?.length > 0);

    if (hasWings) {
      if (result.categories) {
        setWings({ items: result.categories, variant: 'category', title: 'Explore the Library' });
      } else {
        setWings({ items: result.featured_books, variant: 'featured', title: 'Featured Discoveries' });
      }
    }

    setInputEnabled(true);
    processingRef.current = false;
  }, [config]);

  const handleCategorySelect = useCallback((item) => {
    setFocusedWing(item.name);
    setTimeout(() => handleProducerInput(item.name, item.name), 400);
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
    setTablePhase(null);
    setView('overview');
    setWings(null);
    setInputEnabled(true);
  }, []);

  const handleRestart = useCallback(() => {
    setTablePhase(null);
    setView('overview');
    setWings(null);
    setAssignment(null);
    assignmentRef.current = {};
    conversationHistoryRef.current = [];
    setCompletionConfidence(0);
    loadingGreetingRef.current = true;
    setLoadingGreeting(true);
    handleGenerateGreeting();
  }, [handleGenerateGreeting]);

  const envIntensity = tablePhase === 'assembling' ? 'assembling' : thinking ? 'active' : 'calm';
  const showLoading = loadingGreeting && !thinking;
  const canShowInput = view === 'overview' && tablePhase === null;

  return (
    <div className={`${embedded ? 'absolute inset-0' : 'fixed inset-0 z-50'} overflow-hidden`} style={{ background: 'hsl(28 22% 8%)' }}>
      <LibraryEnvironment intensity={envIntensity} />

      {/* Loading state */}
      {showLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ zIndex: 15 }}>
          <div className="text-center">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'hsl(35 25% 12% / 0.4)', border: '1px solid hsl(35 22% 25% / 0.3)' }}>
              <BookOpen className="w-7 h-7" style={{ color: 'hsl(38 50% 52%)' }} />
            </div>
            <h2 className="font-heading font-semibold text-xl mb-2" style={{ color: 'hsl(35 18% 88%)' }}>
              The CREAPr Library
            </h2>
            <div className="flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'hsl(38 50% 52%)' }} />
              <span className="text-sm" style={{ color: 'hsl(40 25% 50%)', fontFamily: 'Georgia, serif' }}>Opening the stacks...</span>
            </div>
          </div>
        </div>
      )}

      {/* Header — CREAPr identity */}
      <div className="absolute top-4 left-4 flex items-center gap-3" style={{ zIndex: 15 }} data-tour="creapr-header">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${thinking ? 'animate-pulse' : ''}`}
          style={{
            background: thinking ? 'hsl(38 45% 38% / 0.2)' : 'hsl(35 22% 12% / 0.5)',
            border: `1px solid ${thinking ? 'hsl(38 45% 42% / 0.4)' : 'hsl(35 18% 24% / 0.3)'}`,
          }}
        >
          <span className="text-sm font-mono font-bold" style={{ color: 'hsl(38 50% 55%)' }}>Cr</span>
        </div>
        <div>
          <h3 className="font-heading font-semibold text-sm" style={{ color: 'hsl(35 18% 88%)' }}>CREAPr</h3>
          <p className="text-xs" style={{ color: 'hsl(40 22% 50%)', fontFamily: 'Georgia, serif' }}>
            {thinking ? 'Searching the stacks...' : 'Library Online'}
          </p>
        </div>
        <button
          onClick={() => setTourActive(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
          style={{ background: 'hsl(30 10% 8% / 0.5)', border: '1px solid hsl(35 18% 24% / 0.3)', color: 'hsl(38 45% 52%)' }}
        >
          <Compass className="w-3.5 h-3.5" />
          Tour
        </button>
      </div>

      {/* Knowledge dashboard — confidence indicator */}
      {completionConfidence > 0 && view === 'overview' && (
        <div className="absolute top-4 right-4 hidden md:flex plib-dashboard" style={{ zIndex: 15 }} data-tour="understanding-meter">
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(40 22% 48%)', fontFamily: '"Oswald", sans-serif' }}>
            Understanding
          </span>
          <div className="plib-dashboard-bar">
            <div
              className="plib-dashboard-fill"
              style={{ width: `${Math.min(100, completionConfidence * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Close button */}
      {!embedded && (
        <button
          onClick={() => { onClose?.(); }}
          className="absolute top-4 right-4 p-2.5 rounded-lg transition-all hover:bg-white/5 md:right-44"
          style={{ zIndex: 20, background: 'hsl(30 10% 8% / 0.5)', border: '1px solid hsl(35 18% 24% / 0.3)' }}
        >
          <X className="w-5 h-5" style={{ color: 'hsl(35 12% 58%)' }} />
        </button>
      )}

      {/* Wings — spatial category browsing */}
      {wings && view === 'overview' && (
        <LibraryWings
          items={wings.items}
          variant={wings.variant}
          title={wings.title}
          focusedWing={focusedWing}
          onSelect={handleCategorySelect}
        />
      )}

      {/* Research table — completion state */}
      {view === 'table' && (
        <LibraryResearchTable
          assignment={assignment}
          phase={tablePhase}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onRestart={handleRestart}
        />
      )}

      {/* Input — producer response */}
      {canShowInput && (
        <LibraryInput
          onSend={(text) => handleProducerInput(text)}
          onStartTyping={() => {}}
          disabled={!inputEnabled || submitting}
          thinking={thinking}
          placeholder={view === 'overview' && !wings ? "What are we looking for today?" : "Continue exploring..."}
        />
      )}

      {/* Guided tour overlay */}
      {tourActive && (
        <LibraryGuidedTour
          steps={TOUR_STEPS}
          onClose={() => setTourActive(false)}
          onComplete={() => setTourActive(false)}
        />
      )}
    </div>
  );
}