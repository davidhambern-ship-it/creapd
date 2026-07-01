import React, { useState, useEffect, useRef } from 'react';
import { Notebook, Save, Check } from 'lucide-react';

export default function ResearchNotebook({ session, onSave }) {
  const [content, setContent] = useState(session.notebook_content || '');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setContent(session.notebook_content || '');
  }, [session.id]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (content === (session.notebook_content || '')) return;

    timerRef.current = setTimeout(async () => {
      await onSave(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 2000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [content]);

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Notebook className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Research Notebook</h3>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-berna-emerald">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add your notes, observations, questions, ideas, and draft conclusions..."
        className="w-full min-h-[300px] p-3 rounded-lg bg-secondary/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
      />
    </div>
  );
}