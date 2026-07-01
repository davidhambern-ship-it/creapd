import React from 'react';
import { Link } from 'react-router-dom';
import { Pin, Clock, Compass, BookOpen, Lightbulb, HelpCircle, Scroll, Languages, Type, User, UserSquare, MapPin, Landmark, GitCompare, Newspaper, Shield, Palette, Globe, Brain, Church } from 'lucide-react';
import { STUDY_TYPE_LABELS, STUDY_TYPE_ICONS, safeJsonParse } from '@/lib/studyConstants';

const ICON_MAP = {
  BookOpen, Lightbulb, HelpCircle, Scroll, Languages, Type, User, UserSquare,
  MapPin, Landmark, GitCompare, Newspaper, Shield, Palette, Clock, Globe,
  Brain, Church, Compass
};

export default function SessionCard({ session }) {
  const Icon = ICON_MAP[STUDY_TYPE_ICONS[session.study_type] || 'Compass'] || Compass;
  const plan = safeJsonParse(session.research_plan, []);

  return (
    <Link
      to={`/spiritual/study/${session.id}`}
      className="glass-panel p-4 hover:border-primary/40 transition-colors group block"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {session.title}
            </h3>
            {session.is_pinned && <Pin className="w-3.5 h-3.5 text-accent shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{session.research_question}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-secondary/50">{STUDY_TYPE_LABELS[session.study_type] || 'Custom Research'}</span>
            {session.status === 'researching' && (
              <span className="flex items-center gap-1 text-primary">
                <Clock className="w-3 h-3 animate-spin" /> Researching...
              </span>
            )}
            {session.status === 'ready' && plan.length > 0 && (
              <span>{plan.length} steps</span>
            )}
            {session.status === 'failed' && (
              <span className="text-destructive">Failed</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}