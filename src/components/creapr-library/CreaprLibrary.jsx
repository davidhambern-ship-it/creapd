import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { DEFAULT_CREAP_SETTINGS } from '@/lib/creapSettings';
import { generateGreeting, buildResearchTopicData } from '@/lib/creapr/controllers/topicsController';
import { runCreaprBrain } from '@/lib/creapr/creaprBrain';
import { X, Loader2, Send, Sparkles, ArrowRight, Edit3, RotateCcw, BookOpen } from 'lucide-react';

export default function CreaprLibrary({ config, onClose, embedded = false }) {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [categories, setCategories] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [inputEnabled, setInputEnabled] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingGreeting, setLoadingGreeting] = useState(true);
  const [input, setInput] = useState('');
  const [showAssignment, setShowAssignment] = useState(false);
  const [completionConfidence, setCompletionConfidence] = useState(0);

  const isMountedRef = useRef(true);
  const conversationHistoryRef = useRef([]);
  const assignmentRef = useRef({});
  const creapSettingsRef = useRef(DEFAULT_CREAP_SETTINGS);
  const userNameRef = useRef('');
  const processingRef = useRef(false);
  const messagesEndRef = useRef(null);

  const sessionKey = `creapr_conv_${config?.id || 'default'}`;

  const coerceLines = (lines) => (Array.isArray(lines) ? lines : []).map(l =>
    typeof l === 'string' ? l : (l?.text || l?.message || l?.content || String(l ?? ''))
  );

  const persistSession = useCallback(() => {
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        history: conversationHistoryRef.current,
        assignment: assignmentRef.current,
      }));
    } catch {}
  }, [sessionKey]);

  const restoreSession = useCallback(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed.history?.length > 0) {
        const cleanHistory = parsed.history.filter(m =>
          typeof m?.content === 'string' && !m.content.includes('[object Object]')
        );
        if (cleanHistory.length === 0) return null;
        conversationHistoryRef.current = cleanHistory;
        assignmentRef.current = parsed.assignment || {};
        return { ...parsed, history: cleanHistory };
      }
    } catch {}
    return null;
  }, [sessionKey]);

  const clearSession = useCallback(() => {
    try { sessionStorage.removeItem(sessionKey); } catch {}
  }, [sessionKey]);

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
      setLoadingGreeting(false);
      const greetingText = coerceLines(result.spoken_lines).join(' ');
      conversationHistoryRef.current.push({ role: 'assistant', content: greetingText });
      setMessages([{ role: 'assistant', content: greetingText }]);
      setCompletionConfidence(result.completion_confidence || 0);
      setInputEnabled(true);
    } catch {
      if (!isMountedRef.current) return;
      setLoadingGreeting(false);
      const fallback = "Welcome to the research library. What are we looking for today?";
      conversationHistoryRef.current.push({ role: 'assistant', content: fallback });
      setMessages([{ role: 'assistant', content: fallback }]);
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

      const restored = restoreSession();
      if (restored) {
        setLoadingGreeting(false);
        setMessages(restored.history);
        setAssignment(restored.assignment || null);
        setCompletionConfidence(restored.assignment?.completion_confidence || 0);
        setInputEnabled(true);
        return;
      }

      handleGenerateGreeting();

      timeoutId = setTimeout(() => {
        if (!isMountedRef.current) return;
        setLoadingGreeting(false);
        if (conversationHistoryRef.current.length === 0) {
          const fallback = "Welcome to the research library. What are we looking for today?";
          conversationHistoryRef.current.push({ role: 'assistant', content: fallback });
          setMessages([{ role: 'assistant', content: fallback }]);
          setInputEnabled(true);
        }
      }, 12000);
    })();

    return () => {
      isMountedRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleProducerInput = useCallback(async (input, selectedCategory = null) => {
    if (!isMountedRef.current || processingRef.current) return;
    processingRef.current = true;
    setInputEnabled(false);
    setCategories(null);

    const userMessage = selectedCategory ? `[Selected: ${selectedCategory}]` : input;
    conversationHistoryRef.current.push({ role: 'user', content: userMessage });
    setMessages(prev => [...prev, { role: 'user', content: selectedCategory || input }]);
    setInput('');

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
    const rawLines = result.spoken_lines || (brainResponse.message_to_user ? [brainResponse.message_to_user] : ["Let me try that again."]);
    const spokenLines = coerceLines(rawLines);

    const responseText = spokenLines.join(' ');
    conversationHistoryRef.current.push({ role: 'assistant', content: responseText });
    setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    persistSession();

    if (result.assignment_update) {
      assignmentRef.current = { ...assignmentRef.current, ...result.assignment_update };
      setAssignment(assignmentRef.current);
    }

    const newConfidence = result.completion_confidence || 0;
    setCompletionConfidence(newConfidence);

    if (result.phase === 'assembling' || result.phase === 'reveal' || (newConfidence >= 0.8 && result.assignment)) {
      const fullAssignment = {
        ...result.assignment,
        research_depth: result.assignment.research_depth || config?.research_depth || 'standard',
        audience: result.assignment.audience || config?.target_audience || 'General Public',
      };
      setAssignment(fullAssignment);
      assignmentRef.current = fullAssignment;
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setShowAssignment(true);
      }, 1500);
      setInputEnabled(true);
      processingRef.current = false;
      return;
    }

    if (result.categories?.length > 0) {
      setCategories({ items: result.categories, title: 'Explore the Library' });
    } else if (result.featured_books?.length > 0) {
      setCategories({ items: result.featured_books, title: 'Featured Discoveries' });
    }

    setInputEnabled(true);
    processingRef.current = false;
  }, [config]);

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
    setShowAssignment(false);
    setCategories(null);
    setInputEnabled(true);
  }, []);

  const handleRestart = useCallback(() => {
    setShowAssignment(false);
    setCategories(null);
    setAssignment(null);
    assignmentRef.current = {};
    conversationHistoryRef.current = [];
    setCompletionConfidence(0);
    setLoadingGreeting(true);
    setMessages([]);
    clearSession();
    handleGenerateGreeting();
  }, [handleGenerateGreeting, clearSession]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !inputEnabled || thinking) return;
    handleProducerInput(trimmed);
  };

  const showLoading = loadingGreeting && !thinking;

  return (
    <div className={`${embedded ? 'h-full w-full' : 'fixed inset-0 z-50'} flex flex-col bg-transparent overflow-hidden`}>

      {/* Header — CREAPr identity */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-berna-purple/20 to-berna-orange/10 border border-white/[0.08] flex items-center justify-center">
            <span className="text-sm font-mono font-bold text-berna-purple">Cr</span>
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm text-white">CREAPr</h3>
            <p className="text-[10px] flex items-center gap-1.5 text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${thinking ? 'bg-berna-orange' : 'bg-berna-emerald'}`} style={{ boxShadow: '0 0 6px currentColor' }} />
              {thinking ? 'Searching...' : 'Research Library'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Understanding meter */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Understanding</span>
            <div className="w-20 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, completionConfidence * 100)}%`,
                  background: 'linear-gradient(90deg, hsl(270 80% 60%), hsl(25 95% 55%), hsl(152 60% 45%))',
                }}
              />
            </div>
          </div>
          <button
            onClick={handleRestart}
            title="Clear conversation"
            className="p-2 rounded-lg hover:bg-white/5 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </button>
          {!embedded && (
            <button
              onClick={() => onClose?.()}
              className="p-2 rounded-lg hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {showLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-berna-purple/10 border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-berna-purple" />
            </div>
            <div className="flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-berna-purple" />
              <span className="text-sm text-muted-foreground">Opening the library...</span>
            </div>
          </div>
        </div>
      )}

      {/* Messages — chat area */}
      {!showLoading && !showAssignment && (
        <div className="flex-1 overflow-y-auto px-4 py-6 relative z-10">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-berna-purple/15 border border-berna-purple/20 text-white'
                      : 'glass-panel text-white/90'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {/* Thinking indicator */}
            {thinking && (
              <div className="flex justify-start">
                <div className="glass-panel px-4 py-3 rounded-xl">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-berna-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-berna-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-berna-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Category chips */}
            {categories && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="pt-2"
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 text-center">{categories.title}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {categories.items.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleCategorySelect(item)}
                      className="glass-panel px-3 py-2 rounded-lg text-xs font-medium text-white/80 hover:border-berna-purple/30 hover:text-white transition-all group"
                    >
                      <span className="flex items-center gap-1.5">
                        {item.name}
                        <ArrowRight className="w-3 h-3 text-berna-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Assignment card — completion state */}
      <AnimatePresence>
        {showAssignment && assignment && (
          <motion.div
            className="flex-1 overflow-y-auto px-4 py-6 relative z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="max-w-2xl mx-auto glass-panel p-6"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-lg bg-berna-emerald/10 border border-berna-emerald/20 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-berna-emerald" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-base text-white">Research Assignment</h2>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Compiled by CREAPr</p>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                {assignment.title && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Title</p>
                    <p className="text-sm text-white">{assignment.title}</p>
                  </div>
                )}
                {assignment.objective && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Objective</p>
                    <p className="text-sm text-white/80">{assignment.objective}</p>
                  </div>
                )}
                {assignment.primary_research_question && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Primary Question</p>
                    <p className="text-sm text-white/80">{assignment.primary_research_question}</p>
                  </div>
                )}
                {assignment.supporting_questions?.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Supporting Questions</p>
                    <ul className="space-y-1">
                      {assignment.supporting_questions.map((q, i) => (
                        <li key={i} className="text-sm text-white/70 flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-berna-purple shrink-0" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {assignment.scope && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Scope</p>
                      <p className="text-xs text-white/70">{assignment.scope}</p>
                    </div>
                  )}
                  {assignment.audience && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Audience</p>
                      <p className="text-xs text-white/70">{assignment.audience}</p>
                    </div>
                  )}
                  {assignment.intent && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Intent</p>
                      <p className="text-xs text-white/70">{assignment.intent}</p>
                    </div>
                  )}
                  {assignment.research_depth && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Depth</p>
                      <p className="text-xs text-white/70">{assignment.research_depth}</p>
                    </div>
                  )}
                </div>
                {assignment.deliverables && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Deliverables</p>
                    <p className="text-xs text-white/70">{assignment.deliverables}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-5 mt-5 border-t border-white/[0.06]">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm bg-gradient-to-r from-berna-emerald to-berna-emerald/80 hover:opacity-90 text-white transition-all disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Launching...' : 'Approve & Research'}
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  Refine
                </button>
                <button
                  onClick={handleRestart}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Start Over
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      {!showLoading && !showAssignment && (
        <div className="relative z-10 px-4 py-3 border-t border-white/[0.06]">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <div className="flex-1 glass-panel flex items-center gap-2 px-3">
              <Sparkles className="w-4 h-4 text-berna-purple shrink-0" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                disabled={!inputEnabled || thinking}
                placeholder={thinking ? 'CREAPr is thinking...' : 'What are we looking for today?'}
                className="flex-1 h-11 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              {thinking && <Loader2 className="w-4 h-4 animate-spin text-berna-purple" />}
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || !inputEnabled || thinking}
              className="w-11 h-11 rounded-lg bg-gradient-to-r from-berna-purple to-berna-purple/80 hover:opacity-90 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}