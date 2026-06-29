import React, { useState, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, Edit, Check, X, Copy, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function EditableSection({ icon: Icon, title, content, field, isApproved, onSave, onApprove, highlight, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || '');

  useEffect(() => { setDraft(content || ''); }, [content]);

  const handleSave = () => {
    onSave(field, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(content || '');
    setEditing(false);
  };

  return (
    <div className={`glass-panel overflow-hidden transition-all ${
      highlight ? 'glow-orange border-berna-orange/20' : ''
    } ${isApproved ? 'border-berna-emerald/20' : ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors ${highlight ? 'bg-gradient-to-r from-berna-orange/5 to-berna-purple/5' : ''}`}
      >
        <Icon className={`w-4 h-4 ${isApproved ? 'text-berna-emerald' : highlight ? 'text-berna-orange' : 'text-berna-purple'} flex-shrink-0`} />
        <h3 className="text-sm font-semibold text-white flex-1">{title}</h3>
        {isApproved && (
          <span className="inline-flex items-center gap-1 text-[10px] text-berna-emerald">
            <CheckCircle className="w-3 h-3" />Approved
          </span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-white/[0.04]">
          {editing ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={6}
                className="bg-white/[0.03] border-white/[0.08] text-white text-sm leading-relaxed"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-7">
                  <Check className="w-3 h-3 mr-1" />Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel} className="border-white/10 text-white text-xs h-7">
                  <X className="w-3 h-3 mr-1" />Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className={`mt-3 p-4 rounded-lg border ${
                highlight
                  ? 'bg-gradient-to-r from-berna-purple/5 to-berna-orange/5 border-berna-purple/10'
                  : 'bg-white/[0.02] border-white/[0.06]'
              }`}>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{content}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-berna-purple hover:bg-berna-purple/10 text-xs h-7">
                  <Edit className="w-3 h-3 mr-1" />Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onApprove(field, !isApproved)}
                  className={`text-xs h-7 ${isApproved ? 'text-berna-emerald hover:bg-berna-emerald/10' : 'text-muted-foreground hover:text-berna-emerald hover:bg-berna-emerald/10'}`}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />{isApproved ? 'Approved' : 'Approve'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(content || '')} className="text-muted-foreground hover:text-white text-xs h-7">
                  <Copy className="w-3 h-3 mr-1" />Copy
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}