import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import CreapdMessage from './CreapdMessage';

const AGENT_NAME = 'creapd';

export default function CreapdChat({ open, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);

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

  const handleSend = async () => {
    if (!input.trim() || !conversation || isSending) return;
    const text = input.trim();
    setInput('');
    setIsSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text });
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
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center glow-purple">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-sm font-heading font-semibold">CREAPD</SheetTitle>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Seasoned Showrunner</p>
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
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-heading font-semibold">CREAPD's here.</p>
              <p className="text-xs text-muted-foreground max-w-[260px]">
                Tell me what you need. Sift stories, build packages, review the queue — I'll drive if you want me to.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <CreapdMessage key={idx} message={msg} />
            ))
          )}
          {isSending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>CREAPD's working…</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to CREAPD…"
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