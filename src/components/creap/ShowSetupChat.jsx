import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { X, Send, Mic, Loader2, Sparkles, Newspaper, Church, Mic2, Music, Trophy, ChefHat, Brush } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CreapdMessage from './CreapdMessage';

const AGENT_NAME = 'creapd';

const QUICK_ACTIONS = [
  { label: 'News', message: 'I want to build a news show', icon: Newspaper },
  { label: 'Spiritual', message: 'Set up a spiritual production', icon: Church },
  { label: 'Talk', message: 'I want to create a talk show', icon: Mic2 },
  { label: 'Music', message: 'Build a music show', icon: Music },
  { label: 'Sports', message: 'Set up a sports show', icon: Trophy },
  { label: 'Cooking', message: 'I want a cooking show', icon: ChefHat },
  { label: 'Cosmo', message: 'Build a cosmo show', icon: Brush },
];

const SETUP_CONTEXT = '[SHOW SETUP — The producer is building a new show profile. Help them configure it conversationally. Infer the production domain from their description, ask for show name and host if not provided, create the ShowProfile and a matching ProductionModule when you have enough info. Use sensible defaults for anything not specified.]\n';

export default function ShowSetupChat({ open, onClose, onCreated }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const createdNotifiedRef = useRef(false);

  useEffect(() => {
    if (!open || conversation) return;

    let unsub = () => {};
    (async () => {
      setLoadingConv(true);
      try {
        const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        let conv = existing?.find(c => c.metadata?.type === 'show_setup');
        if (!conv) {
          conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: 'Show Setup', type: 'show_setup', description: 'Conversational show profile builder' },
          });
        }
        const full = await base44.agents.getConversation(conv.id);
        setConversation(full);
        setMessages(full.messages || []);
        createdNotifiedRef.current = false;

        unsub = base44.agents.subscribeToConversation(full.id, (data) => {
          setMessages(data.messages || []);
        });
      } catch (err) {
        console.error('Show setup conversation error:', err);
      } finally {
        setLoadingConv(false);
      }
    })();

    return () => unsub();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect ShowProfile creation via tool calls and notify parent
  useEffect(() => {
    if (!onCreated || createdNotifiedRef.current || messages.length === 0) return;
    const hasCreateCall = messages.some(msg =>
      msg.tool_calls?.some(tc => {
        const name = (tc.name || '').toLowerCase();
        const status = tc.status || '';
        return name.includes('showprofile') && name.includes('create') &&
          ['success', 'completed'].includes(status);
      })
    );
    if (hasCreateCall) {
      createdNotifiedRef.current = true;
      onCreated();
    }
  }, [messages, onCreated]);

  const handleSendText = async (text) => {
    if (!text.trim() || !conversation || isSending) return;
    setIsSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: SETUP_CONTEXT + text.trim() });
    } catch (err) {
      console.error('Show setup send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    handleSendText(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-input.webm', { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());

        setIsTranscribing(true);
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: audioFile });
          const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          if (transcript && transcript.trim()) {
            await handleSendText(transcript.trim());
          }
        } catch (err) {
          console.error('Voice transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const showQuickActions = messages.length === 0 && !loadingConv && !isSending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[440px] flex flex-col p-0 gap-0 bg-card border-l border-sidebar-border">
        <SheetHeader className="px-4 py-3 border-b border-sidebar-border flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-berna-emerald to-berna-purple flex items-center justify-center glow-purple">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-sm font-heading font-semibold">Build a Show</SheetTitle>
              <p className="text-[10px] text-muted-foreground">Talk to CREAPD — no forms</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {loadingConv ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Starting setup session…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-berna-emerald/20 to-berna-purple/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-berna-purple" />
              </div>
              <div>
                <p className="text-sm font-heading font-semibold mb-1">What are we building?</p>
                <p className="text-xs text-muted-foreground max-w-[260px]">Tell me about your show. I'll handle the config — name, tone, audience, the works.</p>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <CreapdMessage key={idx} message={msg} />
            ))
          )}
          {(isSending || isTranscribing) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>{isTranscribing ? 'Transcribing voice…' : "CREAPD's working…"}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showQuickActions && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ACTIONS.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => handleSendText(action.message)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-muted-foreground hover:bg-white/[0.08] hover:text-white transition-all"
                  >
                    <Icon className="w-3 h-3" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell CREAPD about your show…"
              rows={1}
              className="flex-1 resize-none rounded-lg bg-input border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[38px] max-h-[120px]"
              disabled={!conversation || isSending || isTranscribing || isRecording}
            />
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              disabled={!conversation || isSending || isTranscribing}
              className={`shrink-0 w-9 h-9 rounded-md flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-destructive text-destructive-foreground pulse-glow'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              } disabled:opacity-50 disabled:pointer-events-none`}
              title="Hold to speak"
            >
              <Mic className="w-4 h-4" />
            </button>
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || !conversation || isSending || isTranscribing}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {isRecording && (
            <p className="text-[10px] text-destructive mt-1 pulse-glow">● Recording — release to transcribe</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}