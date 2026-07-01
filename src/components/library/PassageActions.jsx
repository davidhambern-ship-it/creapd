import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, FileText, BookMarked, Sparkles, Columns2, Languages, PenTool } from 'lucide-react';

export default function PassageActions({ textTitle, passageRef, onSelectWord, onClose }) {
  const navigate = useNavigate();

  const goTo = (query) => {
    navigate(`/spiritual/study?query=${encodeURIComponent(query)}&autoRun=true&source=library-reader`);
    onClose?.();
  };

  const actions = [
    { label: 'Study Passage', icon: GraduationCap, onClick: () => goTo(`Study passage: ${passageRef} from ${textTitle}`) },
    { label: 'Compare Passage', icon: Columns2, onClick: () => goTo(`Compare passage ${passageRef} across translations`) },
    { label: 'Research This Passage', icon: FileText, onClick: () => goTo(`Research: ${passageRef} in ${textTitle}`) },
    { label: 'Word Study', icon: Languages, onClick: () => onSelectWord?.() },
    { label: 'Discussion Questions', icon: BookMarked, onClick: () => goTo(`Discussion questions for ${passageRef} in ${textTitle}`) },
    { label: 'Message Builder', icon: PenTool, onClick: () => navigate('/spiritual/message') },
    { label: 'Create Production', icon: Sparkles, onClick: () => navigate('/spiritual/configure') }
  ];

  return (
    <div className="glass-panel p-3">
      <h4 className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">Passage Actions</h4>
      <div className="grid grid-cols-1 gap-1">
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-secondary/50 transition-colors"
            >
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}