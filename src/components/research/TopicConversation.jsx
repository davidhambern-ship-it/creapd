import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import {
  Loader2, Mic, Send, X, Radio
} from 'lucide-react';
import AnimatedText from '@/components/research/AnimatedText';
import TopicWizard from '@/components/research/TopicWizard';

const CREAP_VOICE = 'daniel';
const MAX_NO_ATTEMPTS = 5;

const CREAP_SYSTEM_PROMPT = `You are CREAP, a bold, energetic AI co-producer. You're chatting with a producer to find a research topic worth deep-diving.

Rules:
- Propose ONE controversial, trending, or fascinating topic at a time
- Be conversational, punchy, opinionated — like a co-producer brainstorming
- Keep responses SHORT: 1-3 sentences max (this is spoken dialogue)
- After proposing, WAIT for the user's reaction before offering to research
- If the user seems interested or engaged, ask "Want it CREAPd?!" and include topic_data
- If the user says NO to "Want it CREAPd?!", acknowledge it briefly and immediately propose a DIFFERENT topic
- If the user isn't interested in a topic, pivot to a completely new one
- Crack jokes. Be fun. Have opinions. Be bold and provocative.
- You have a DECLINE_COUNTER that tracks how many times the user has said "No" to "Want it CREAPd?!"

Return JSON:
- message: what you say (spoken, conversational style)
- action: "propose" | "discuss" | "offer" | "acknowledge_yes" | "acknowledge_no"
- topic_data: { title, description, research_query, category } — REQUIRED when action is "offer" or "acknowledge_yes"

Action guide:
- propose: introducing a new topic to explore
- discuss: engaging with the topic, building interest before offering
- offer: asking "Want it CREAPd?!" — MUST include topic_data
- acknowledge_yes: user confirmed they want it CREAPd — MUST include topic_data
- acknowledge_no: user declined "Want it CREAPd?!" — will pivot to a new topic`;

const STAGE_LABELS = {
  query_expansion: 'Breaking down the query',
  discovery: 'Searching the web',
  source_verification: 'Verifying sources',
  synthesis: 'Synthesizing findings',
  verification: 'Fact-checking claims',
  critical_analysis: 'Critical analysis',
  complete: 'Complete'
};

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function TopicConversation({ config, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [phase, setPhase] = useState('greeting');
  const [researchStage, setResearchStage] = useState('');
  const [audioUrl, setAudioUrl] = useState(null);
  const [interimText, setInterimText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [noCount, setNoCount] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const pollTimerRef = useRef(null);
  const conversationHistoryRef = useRef([]);
  const lastOfferedTopicRef = useRef(null);
  const phaseRef = useRef('greeting');
  const speakingRef = useRef(false);
  const noCountRef = useRef(0);
  const initializedRef = useRef(false);
  const researchReadyRef = useRef(null);
  const completionAnnouncedRef = useRef(false);
  const closeAfterSpeakingRef = useRef(false);
  const pendingNavigationRef = useRef(null);
  const voicePendingRef = useRef(false);
  const thinkingRef = useRef(false);
  const userNameRef = useRef('');
  const showWizardRef = useRef(false);

  const navigate = useNavigate();

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { speakingRef.current = speaking; }, [speaking]);
  useEffect(() => { thinkingRef.current = thinking; }, [thinking]);
  useEffect(() => { noCountRef.current = noCount; }, [noCount]);
  useEffect(() => { showWizardRef.current = showWizard; }, [showWizard]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = async (text) => {
    if (!text) return;
    voicePendingRef.current = true;
    try {
      const response = await base44.functions.invoke('generateCreapSpeech', {
        text: text.substring(0, 5000),
        voice: CREAP_VOICE,
      });
      voicePendingRef.current = false;
      if (response?.data?.url) {
        setAudioUrl(response.data.url);
        setSpeaking(true);
      }
    } catch (err) {
      voicePendingRef.current = false;
      console.error('TTS failed:', err);
    }
  };

  useEffect(() => {
    if (!audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = audioUrl;
    audio.play().catch(() => setSpeaking(false));
  }, [audioUrl]);

  const handleAudioEnded = () => {
    voicePendingRef.current = false;
    setSpeaking(false);
    setAudioUrl(null);
    if (closeAfterSpeakingRef.current) {
      closeAfterSpeakingRef.current = false;
      const navUrl = pendingNavigationRef.current;
      pendingNavigationRef.current = null;
      if (navUrl) navigate(navUrl);
      else onClose();
      return;
    }
    maybeAnnounceCompletion();
  };

  const stopAudio = () => {
    voicePendingRef.current = false;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSpeaking(false);
    setAudioUrl(null);
  };

  const startPolling = (topicId) => {
    const poll = async () => {
      try {
        const dossiers = await base44.entities.ResearchDossier.filter(
          { topic_id: topicId }, '-created_date', 1
        );
        if (dossiers?.length > 0) {
          const d = dossiers[0];
          const meta = safeParse(d.orchestration_metadata, {});
          if (meta.current_stage) setResearchStage(meta.current_stage);
          if (d.status === 'ready') { stopPolling(); handleResearchComplete(topicId, d); return; }
          if (d.status === 'failed') { stopPolling(); handleResearchFailed(topicId, d); return; }
        }
      } catch {}
      pollTimerRef.current = setTimeout(poll, 2000);
    };
    poll();
  };

  const stopPolling = () => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
  };

  const maybeAnnounceCompletion = () => {
    if (!researchReadyRef.current || completionAnnouncedRef.current) return;
    if (showWizardRef.current) return;
    if (voicePendingRef.current || speakingRef.current || thinkingRef.current) return;
    announceCompletion();
  };

  const announceCompletion = () => {
    completionAnnouncedRef.current = true;
    setPhase('asking_to_view');
    phaseRef.current = 'asking_to_view';
    const { topicId, pointCount, sourceCount } = researchReadyRef.current;
    const firstName = (userNameRef.current || 'there').split(' ')[0];
    const msg = `Alright ${firstName}, I'm done CREAPing! ${pointCount} research points are locked and loaded. Ready to check them out?`;
    conversationHistoryRef.current.push({ role: 'assistant', content: msg });
    setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    speak(msg);
  };

  const handleResearchComplete = async (topicId, dossier) => {
    setResearchStage('complete');
    try {
      await base44.functions.invoke('extractResearchPoints', { topic_id: topicId });
    } catch (err) {
      console.error('Extraction failed:', err);
    }
    let pCount = 0;
    try {
      const points = await base44.entities.ResearchPoint.filter({ topic_id: topicId }, '-created_date', 50);
      pCount = points.length;
    } catch {}
    const sourceCount = safeParse(dossier.sources, []).length;
    researchReadyRef.current = { topicId, pointCount: pCount, sourceCount };
    completionAnnouncedRef.current = false;
    maybeAnnounceCompletion();
  };

  const handleResearchFailed = (topicId, dossier) => {
    const msg = `Looks like the research hit a snag. ${dossier?.error_message || 'Something went wrong on my end.'} We can try again or pick a different topic.`;
    conversationHistoryRef.current.push({ role: 'assistant', content: msg });
    setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    speak(msg);
  };

  const handleStartResearch = async (topicData) => {
    setPhase('researching');
    try {
      const topic = await base44.entities.ResearchTopic.create({
        configuration_id: config.id,
        title: topicData.title,
        description: topicData.description || '',
        research_query: topicData.research_query || topicData.title,
        category: topicData.category || 'general',
        priority: 'standard',
        research_depth: config.research_depth || 'standard',
        status: 'researching'
      });
      const launchMsg = `Let's go! Spinning up the research pipeline now — I'll be here while it cooks.`;
      conversationHistoryRef.current.push({ role: 'assistant', content: launchMsg });
      setMessages(prev => [...prev, { role: 'assistant', content: launchMsg }]);
      speak(launchMsg);
      base44.functions.invoke('deepResearchV2', {
        topic_id: topic.id,
        research_depth: topic.research_depth
      }).catch(err => console.error('Research invocation failed:', err));
      startPolling(topic.id);
    } catch (err) {
      console.error('Failed to start research:', err);
    }
  };

  const handleNoDecline = () => {
    const newCount = noCountRef.current + 1;
    setNoCount(newCount);
    noCountRef.current = newCount;
    if (newCount >= MAX_NO_ATTEMPTS) {
      const wizardMsg = `Alright, I get it — you're not feeling my picks today. No worries! Let me set you up with the Topic Guide Wizard so you can steer the ship.`;
      conversationHistoryRef.current.push({ role: 'assistant', content: wizardMsg });
      setMessages(prev => [...prev, { role: 'assistant', content: wizardMsg }]);
      speak(wizardMsg);
      setTimeout(() => setShowWizard(true), 2000);
      return true;
    }
    return false;
  };

  const handleViewResponse = async () => {
    const lastUserMsg = conversationHistoryRef.current.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Determine if the user's response means YES (ready to view now) or NO (not right now).\n\nUser said: "${lastUserMsg}"\n\nReturn JSON.`,
        model: 'gpt_5_mini',
        response_json_schema: {
          type: 'object',
          properties: {
            response: { type: 'string', enum: ['yes', 'no'] }
          }
        }
      });

      if (result?.response === 'yes') {
        const { topicId } = researchReadyRef.current;
        const navMsg = `Let's go!`;
        conversationHistoryRef.current.push({ role: 'assistant', content: navMsg });
        setMessages(prev => [...prev, { role: 'assistant', content: navMsg }]);
        speak(navMsg);
        pendingNavigationRef.current = `/research/manager?topic_id=${topicId}`;
        closeAfterSpeakingRef.current = true;
      } else {
        const firstName = (userNameRef.current || 'there').split(' ')[0];
        const msg = `No worries, ${firstName}. You can find those points in the Research Manager whenever you're ready. We'll talk later...`;
        conversationHistoryRef.current.push({ role: 'assistant', content: msg });
        setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
        speak(msg);
        closeAfterSpeakingRef.current = true;
      }
    } catch (err) {
      console.error('View response failed:', err);
    }
  };

  const creapRespond = async () => {
    thinkingRef.current = true;
    setThinking(true);
    try {
      // If research is ready but not announced, announce instead of normal chat
      if (researchReadyRef.current && !completionAnnouncedRef.current) {
        announceCompletion();
        return;
      }

      // If we're asking the user if they want to view points
      if (phaseRef.current === 'asking_to_view') {
        await handleViewResponse();
        return;
      }

      const history = conversationHistoryRef.current
        .map(m => `${m.role === 'user' ? 'USER' : 'CREAP'}: ${m.content}`)
        .join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${CREAP_SYSTEM_PROMPT}\n\nDECLINE_COUNTER: ${noCountRef.current} (user has said "No" to "Want it CREAPd?!" ${noCountRef.current} times out of ${MAX_NO_ATTEMPTS} before fallback to wizard)\n\nConversation so far:\n${history}\n\nGenerate your next response.`,
        model: 'gpt_5_mini',
        response_json_schema: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            action: { type: 'string' },
            topic_data: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                research_query: { type: 'string' },
                category: { type: 'string' }
              }
            }
          }
        }
      });

      const creapMessage = result?.message || 'Hmm, let me think about that...';
      const action = result?.action || 'discuss';
      const topicData = result?.topic_data;

      conversationHistoryRef.current.push({ role: 'assistant', content: creapMessage });
      setMessages(prev => [...prev, { role: 'assistant', content: creapMessage }]);
      speak(creapMessage);

      if (action === 'offer' && topicData) {
        lastOfferedTopicRef.current = topicData;
        setPhase('offering');
      } else if (action === 'acknowledge_yes') {
        const td = topicData || lastOfferedTopicRef.current;
        if (td) handleStartResearch(td);
      } else if (action === 'acknowledge_no') {
        handleNoDecline();
      }
    } catch (err) {
      console.error('CREAP response failed:', err);
      const errorMsg = 'Sorry, I glitched for a second. What were you saying?';
      conversationHistoryRef.current.push({ role: 'assistant', content: errorMsg });
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      speak(errorMsg);
    } finally {
      thinkingRef.current = false;
      setThinking(false);
      setTimeout(() => maybeAnnounceCompletion(), 500);
    }
  };

  const handleSend = (text) => {
    if (!text.trim() || thinking) return;
    stopAudio();
    setInput('');
    setInterimText('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    conversationHistoryRef.current.push({ role: 'user', content: text });
    creapRespond();
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    stopAudio();
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) setInterimText(interim);
      if (final) { setInterimText(''); handleSend(final); }
    };
    recognition.onerror = () => { setListening(false); setInterimText(''); };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setListening(false);
  };

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.full_name) userNameRef.current = user.full_name;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const init = async () => {
      setThinking(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `${CREAP_SYSTEM_PROMPT}\n\nDECLINE_COUNTER: 0\n\nStart the conversation. Greet the producer and propose ONE controversial or fascinating topic that would make a great research subject. Try to find something trending or timely.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              action: { type: 'string' },
              topic_data: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  research_query: { type: 'string' },
                  category: { type: 'string' }
                }
              }
            }
          }
        });
        const creapMessage = result?.message || "Hey! I've got some wild topics today. What are you curious about?";
        conversationHistoryRef.current.push({ role: 'assistant', content: creapMessage });
        setMessages([{ role: 'assistant', content: creapMessage }]);
        speak(creapMessage);
        if (result?.topic_data) lastOfferedTopicRef.current = result.topic_data;
      } catch (err) {
        const fallback = "Hey! I'm CREAP. What topic should we dig into today?";
        conversationHistoryRef.current.push({ role: 'assistant', content: fallback });
        setMessages([{ role: 'assistant', content: fallback }]);
        speak(fallback);
      } finally {
        setThinking(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    return () => {
      stopPolling();
      if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const canSend = !thinking && !listening;

  if (showWizard) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto pt-8">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-md hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
          <TopicWizard
            config={config}
            onComplete={() => { setShowWizard(false); onClose(); }}
            onCancel={() => onClose()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      <audio ref={audioRef} onEnded={handleAudioEnded} onError={handleAudioEnded} />

      {/* Animated background — non-interactive, behind everything */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 creap-grid-bg" />
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/8 blur-3xl animate-orb-1" />
        <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-accent/8 blur-3xl animate-orb-2" />
        <div className="absolute -bottom-24 left-1/4 w-72 h-72 rounded-full bg-chart-3/8 blur-3xl animate-orb-3" />
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="particle-dot"
            style={{
              left: `${(i * 8.3) % 100}%`,
              bottom: '-10px',
              animationDuration: `${15 + (i % 5) * 4}s`,
              animationDelay: `${i * 1.5}s`,
              background: i % 3 === 0 ? 'hsl(25 95% 60% / 0.4)' : i % 3 === 1 ? 'hsl(270 80% 70% / 0.4)' : 'hsl(152 60% 50% / 0.3)',
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between p-4 border-b border-border shrink-0" style={{ zIndex: 1 }}>
        <div className="flex items-center gap-3">
          <div className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            speaking ? 'bg-primary glow-purple scale-110' :
            thinking ? 'bg-primary/50' :
            listening ? 'bg-red-500/80' :
            'bg-primary/30'
          }`}>
            {speaking && <div className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />}
            {listening ? (
              <Mic className="w-6 h-6 text-white animate-pulse" />
            ) : (
              <Radio className={`w-6 h-6 text-primary-foreground ${speaking ? 'animate-pulse' : ''}`} />
            )}
          </div>
          <div>
            <h3 className="font-heading font-semibold text-lg">CREAP</h3>
            <p className="text-sm text-muted-foreground">
              {speaking ? 'Speaking...' :
               thinking ? 'Thinking...' :
               listening ? 'Listening...' :
               phase === 'researching' ? 'Researching...' :
               phase === 'asking_to_view' ? 'Points Ready' :
               'Ready to chat'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {noCount > 0 && noCount < MAX_NO_ATTEMPTS && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-orange-500/10 text-sm text-orange-400">
              {noCount}/{MAX_NO_ATTEMPTS} skips
            </div>
          )}
          {phase === 'researching' && researchStage && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-sm text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              {STAGE_LABELS[researchStage] || researchStage}
            </div>
          )}
          <button onClick={onClose} className="p-2.5 rounded-md hover:bg-secondary transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto p-4 md:p-6" style={{ zIndex: 1 }}>
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-3xl px-7 py-5 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'bg-secondary/90 text-secondary-foreground backdrop-blur-sm border border-border/50'
              }`}>
                <AnimatedText
                  text={msg.content}
                  variant={msg.role === 'user' ? 'user' : 'creap'}
                  className={`whitespace-pre-line leading-relaxed ${msg.role === 'user' ? 'text-lg' : 'font-conv text-xl'}`}
                  speed={msg.role === 'user' ? 50 : 75}
                />
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start">
              <div className="bg-secondary/90 backdrop-blur-sm border border-border/50 rounded-3xl px-6 py-5 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-3 h-3 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-3 h-3 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="relative p-4 border-t border-border shrink-0 bg-background/80 backdrop-blur-sm" style={{ zIndex: 1 }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          {speechSupported && (
            <button
              onClick={listening ? stopListening : startListening}
              disabled={thinking}
              className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${
                listening ? 'bg-red-500 text-white animate-pulse' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 relative">
            <Input
              value={interimText || input}
              onChange={e => { setInput(e.target.value); setInterimText(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && canSend && input.trim()) handleSend(input); }}
              placeholder={listening ? 'Listening...' : speaking ? 'CREAP is talking — type to interrupt' : 'Type or speak your response...'}
              disabled={thinking}
              className="pr-12 h-12 text-lg"
            />
            {canSend && (input.trim() || interimText) && (
              <button
                onClick={() => handleSend(input || interimText)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-primary hover:bg-primary/10 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        {listening && (
          <p className="text-sm text-center text-red-400 mt-2 animate-pulse">Listening... speak now</p>
        )}
      </div>
    </div>
  );
}