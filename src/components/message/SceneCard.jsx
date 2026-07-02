import React from 'react';
import { Image as ImageIcon, Clock, BookOpen, Volume2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDuration, estimateSpeakingTime, SECTION_TYPE_LABELS } from '@/lib/spiritualConstants';

export default function SceneCard({ section, index, onClick }) {
  const hasImage = !!section.generated_image_url;
  const hasVoice = !!section.voice_url;
  const estimatedSeconds = estimateSpeakingTime(section.content);
  const voiceSeconds = section.voice_duration_seconds || estimatedSeconds;
  const targetSeconds = section.target_runtime_seconds || estimatedSeconds;
  const runtimeStatus = section.runtime_status || 'pending';
  const isTooShort = runtimeStatus === 'too_short';
  const isTooLong = runtimeStatus === 'too_long';
  const isOnTarget = runtimeStatus === 'on_target';

  return (
    <div
      onClick={onClick}
      className="glass-panel overflow-hidden cursor-pointer hover:border-primary/40 transition-all group"
    >
      {/* Slide preview (16:9) */}
      <div className="relative aspect-video bg-berna-navy overflow-hidden">
        {hasImage ? (
          <img
            src={section.generated_image_url}
            alt={section.slide_title || section.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-berna-navy via-secondary to-primary/15">
            <ImageIcon className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground/60">No image yet</p>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/90">
            {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-xs text-white/90">
            <Clock className="w-3 h-3" /> {formatDuration(voiceSeconds)}
          </span>
        </div>

        {/* Runtime status indicator */}
        <div className="absolute top-2 right-2" style={{ marginTop: '28px' }}>
          {isTooShort && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/80 text-xs text-white">
              <AlertTriangle className="w-3 h-3" /> Short
            </span>
          )}
          {isTooLong && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/80 text-xs text-white">
              <AlertTriangle className="w-3 h-3" /> Long
            </span>
          )}
          {isOnTarget && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-berna-emerald/80 text-xs text-white">
              <CheckCircle2 className="w-3 h-3" /> On target
            </span>
          )}
        </div>

        {/* Scene number */}
        <span className="absolute bottom-2 left-2 text-xs font-mono text-white/50">
          Scene #{section.order || index + 1}
        </span>

        {/* Voice indicator */}
        {hasVoice && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/80 text-xs text-white">
            <Volume2 className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Scene info */}
      <div className="p-3">
        <h4 className="font-heading font-semibold text-sm mb-1 truncate">
          {section.slide_title || section.title}
        </h4>
        {section.slide_content && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {section.slide_content.split('\n')[0]}
          </p>
        )}
        {section.scripture_references && (
          <div className="flex items-center gap-1 text-xs text-primary">
            <BookOpen className="w-3 h-3" />
            <span className="truncate">{section.scripture_references.split('\n')[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}