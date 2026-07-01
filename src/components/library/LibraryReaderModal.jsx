import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, BookOpen, Languages, FileText, Shield, GraduationCap, Sparkles, BookMarked } from 'lucide-react';

export default function LibraryReaderModal({ text, translation, faithTradition, onClose }) {
  const navigate = useNavigate();
  if (!text) return null;

  const goTo = (query) => {
    navigate(`/spiritual/study?query=${encodeURIComponent(query)}&autoRun=true&source=library-reader`);
    onClose();
  };

  const actions = [
    { label: 'Start Study', icon: GraduationCap, onClick: () => goTo(`Study: ${text}`), primary: true },
    { label: 'Research Project', icon: FileText, onClick: () => goTo(`Research project on ${text}`) },
    { label: 'Compare', icon: BookMarked, onClick: () => goTo(`Compare translations of ${text}`) },
    { label: 'Create Production', icon: Sparkles, onClick: () => goTo(`Create production based on ${text}`) }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-panel max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">{text}</h3>
              <p className="text-xs text-muted-foreground">{faithTradition}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
            <Shield className="w-4 h-4 text-berna-emerald shrink-0" />
            <div>
              <p className="text-xs font-medium">Source Integrity</p>
              <p className="text-xs text-muted-foreground">Primary Source — Sacred Text</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
            <Languages className="w-4 h-4 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium">Translation</p>
              <p className="text-xs text-muted-foreground">{translation || 'Default for tradition'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
            <FileText className="w-4 h-4 text-accent shrink-0" />
            <div>
              <p className="text-xs font-medium">Access Level</p>
              <p className="text-xs text-muted-foreground">Full text available within Producer research tools</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {actions.map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  action.primary
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary/50 border border-border hover:bg-secondary/70'
                }`}
              >
                <Icon className="w-4 h-4" /> {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}