import React from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/spiritualConstants';

const TRANSITIONS = {
  fade: 'animate-fade-in',
  slide_left: 'animate-slide-in',
  zoom: 'animate-zoom-in',
  dissolve: 'animate-dissolve-in',
  none: ''
};

export default function PresentationSlide({ section, isActive }) {
  const hasImage = !!section.generated_image_url;
  const scripturePopups = safeParse(section.scene_data)?.scripture_popups || [];
  const transitionClass = TRANSITIONS[section.transition] || TRANSITIONS.fade;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-berna-navy ${isActive ? transitionClass : ''}`}>
      {/* Background Image or Gradient */}
      {hasImage ? (
        <img
          src={section.generated_image_url}
          alt={section.slide_title || section.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-berna-navy via-secondary to-primary/20" />
      )}

      {/* Darkening overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Top badges */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <span className="px-3 py-1 rounded-full bg-primary/80 backdrop-blur-sm text-xs font-medium text-white">
          {section.section_type?.replace(/_/g, ' ')}
        </span>
        {section.voice_duration_seconds > 0 && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/90">
            <Clock className="w-3 h-3" /> {formatDuration(section.voice_duration_seconds)}
          </span>
        )}
      </div>

      {/* Scripture popup badges (if scene_data has them) */}
      {scripturePopups.length > 0 && (
        <div className="absolute top-20 left-6 right-6 flex flex-wrap gap-2">
          {scripturePopups.slice(0, 3).map((popup, idx) => (
            <div key={idx} className="px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-md border border-white/20">
              <p className="text-xs font-semibold text-white">{popup.reference}</p>
              <p className="text-xs text-white/70 line-clamp-1">{popup.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
        {section.slide_title && (
          <h2 className="text-3xl md:text-5xl font-heading font-bold text-white mb-3 leading-tight drop-shadow-lg">
            {section.slide_title}
          </h2>
        )}
        {section.slide_content && (
          <div className="max-w-3xl">
            {section.slide_content.split('\n').filter(Boolean).map((line, idx) => (
              <p key={idx} className="text-base md:text-lg text-white/90 mb-1.5 drop-shadow">{line}</p>
            ))}
          </div>
        )}
        {section.scripture_references && !scripturePopups.length && (
          <div className="mt-4 flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-white/70">{section.scripture_references}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function safeParse(str) {
  if (!str) return {};
  try {
    const result = typeof str === 'string' ? JSON.parse(str) : str;
    // Handle double-encoded JSON
    if (typeof result === 'string') return JSON.parse(result);
    return result;
  } catch {
    return {};
  }
}