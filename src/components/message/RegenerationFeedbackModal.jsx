import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, MessageSquare, X, RefreshCw } from 'lucide-react';

export default function RegenerationFeedbackModal({ options, onCancel, onSubmit }) {
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');

  const toggleOption = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    onSubmit(selected, notes);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel-navy max-w-2xl w-full p-6 rounded-2xl border border-accent/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-heading font-bold text-white">Help Me Improve</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              The Presentation Director has regenerated twice. Tell us what needs to be better
              and the AI will fix it on the next pass.
            </p>
          </div>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-[45vh] overflow-y-auto pr-1">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                selected.includes(opt.id)
                  ? 'bg-accent/15 border-accent/50 text-white'
                  : 'bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:bg-white/[0.06]'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                selected.includes(opt.id) ? 'bg-accent border-accent' : 'border-white/20'
              }`}>
                {selected.includes(opt.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Describe any other issues or specific changes you want..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 resize-none"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {selected.length} {selected.length === 1 ? 'issue' : 'issues'} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selected.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate with Feedback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}