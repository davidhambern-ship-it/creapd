import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, Send, Sparkles, Loader2, Zap, Users, Moon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES } from '@/lib/creapdPersonality';
import CreapdMessage from './CreapdMessage';
import ChatTypingIndicator from './ChatTypingIndicator';
import QuickReplyChips from './QuickReplyChips';

const AGENT_NAME = 'creapd';

const MODE_BADGE = {
  [CREAP_MODES.AUTOPILOT]: { icon: Zap, class: 'text-berna-orange', label: 'Full CREAP' },
  [CREAP_MODES.HYBRID]: { icon: Users, class: 'text-berna-purple', label: 'Hybrid CREAP' },
  [CREAP_MODES.FREE]: { icon: Moon, class: 'text-berna-emerald', label: 'Free CREAP' },
};

const MODE_EMPTY_STATE = {
  [CREAP_MODES.AUTOPILOT]: {
    title: "CREAPD's driving.",
    body: "Autopilot's on. Tell me the goal and I'll run the pipeline — sift, select, build packages. You just review the results.",
  },
  [CREAP_MODES.HYBRID]: {
    title: "CREAPD's here.",
    body: "Tell me what you need. Sift stories, build packages, review the queue — I'll drive if you want me to.",
  },
  [CREAP_MODES.FREE]: {
    title: "CREAPD's standing by.",
    body: "Free mode. I'm here when you need me — ask a question, request a package, whatever. Otherwise I'll stay out of your way.",
  },
};

const MODE_PLACEHOLDER = {
  [CREAP_MODES.AUTOPILOT]: "Give me the goal and I'll handle it…",
  [CREAP_MODES.HYBRID]: "Talk to CREAPD…",
  [CREAP_MODES.FREE]: "What do you need?…",
};

export default function CreapdChat({ open, onClose }) {
  const { mode, traits, profile } = useCREAPMode();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages or processing state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const badge = MODE_BADGE[mode] || MODE_BADGE[CREAP_MODES.HYBRID];
  const emptyState = MODE_EMPTY_STATE[mode] || MODE_EMPTY_STATE[CREAP_MODES.HYBRID];
  const placeholder = MODE_PLACEHOLDER[mode] || MODE_PLACEHOLDER[CREAP_MODES.HYBRID];
  const BadgeIcon = badge.icon;

  // Load or create conversation when panel opens
  useEffect(() => {
    if (!open || conversation) return;

    let unsub = () => {};
    (async () => {
      setLoadingConv(true);
      try {
        const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        let conv;
        if (existing && existing.length > 0) {
          conv = existing[0];
        } else {
          conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: 'CREAPD Session', description: 'Active CREAPD production session' },
          });
        }
        const full = await base44.agents.getConversation(conv.id);
        setConversation(full);
        setMessages(full.messages || []);

        // Subscribe to streaming updates
        unsub = base44.agents.subscribeToConversation(full.id, (data) => {
          setMessages(data.messages || []);
        });
      } catch (err) {
        console.error('CREAPD conversation error:', err);
      } finally {
        setLoadingConv(false);
      }
    })();

    return () => unsub();
  }, [open]);

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || !conversation || isSending) return;
    setInput('');
    setIsSending(true);
    try {
      const modeContext = `[CREAP MODE: ${badge.label} — ${traits.subtitle}]\n`;
      await base44.agents.addMessage(conversation, { role: 'user', content: modeContext + text });
    } catch (err) {
      console.error('CREAPD send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-[440px] flex flex-col p-0 gap-0 bg-card border-l border-sidebar-border">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b border-sidebar-border flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-purple relative overflow-hidden"
              animate={isSending ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={{ duration: 1, repeat: isSending ? Infinity : 0 }}
            >
              <Sparkles className="w-5 h-5 text-primary-foreground" />
              {isSending && (
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
              )}
            </motion.div>
            <div>
              <SheetTitle className="text-sm font-heading font-semibold">CREAPD</SheetTitle>
              <div className="flex items-center gap-1.5">
                <BadgeIcon className={`w-2.5 h-2.5 ${badge.class}`} />
                <p className={`text-[10px] font-mono uppercase tracking-wider ${badge.class}`}>{badge.label}</p>
                <span className="text-[10px] text-muted-foreground font-mono">· {traits.subtitle}</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {loadingConv ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Connecting to CREAPD…</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <BadgeIcon className={`w-6 h-6 ${badge.class}`} />
              </div>
              <p className="text-sm font-heading font-semibold">{emptyState.title}</p>
              <p className="text-xs text-muted-foreground max-w-[260px]">{emptyState.body}</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CreapdMessage message={msg} />
              </motion.div>
            ))
          )}
          {isSending && (
            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div className="rounded-lg rounded-bl-sm bg-secondary px-3 py-2.5">
                <ChatTypingIndicator />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick replies */}
        {!isSending && conversation && messages.length === 0 && (
          <div className="px-3 pt-2">
            <QuickReplyChips onSelect={handleSend} />
          </div>
        )}

        {/* Input */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none rounded-lg bg-input border border-border px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[38px] max-h-[120px]"
              disabled={!conversation || isSending}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleSend}
              disabled={!input.trim() || !conversation || isSending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}