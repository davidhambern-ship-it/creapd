import React from 'react';
import { Video, FileText, HelpCircle, Loader2 } from 'lucide-react';

const STYLES = {
  video: { icon: Video, color: 'text-berna-orange', bg: 'bg-berna-orange/10', border: 'border-berna-orange/20', label: 'Video' },
  text: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', label: 'Text' },
  unknown: { icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-white/[0.03]', border: 'border-white/[0.08]', label: 'Unclassified' },
};

const TRANSCRIPTION_STYLES = {
  pending: { color: 'text-muted-foreground', label: 'Pending' },
  processing: { color: 'text-berna-purple', label: 'Processing…', spin: true },
  transcribed: { color: 'text-berna-emerald', label: 'Transcribed' },
  failed: { color: 'text-red-400', label: 'Failed' },
  not_applicable: { color: 'text-muted-foreground', label: 'No Audio' },
};

export default function ContentTypeBadge({ contentType, transcriptionStatus }) {
  const ct = STYLES[contentType] || STYLES.unknown;
  const Icon = ct.icon;

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${ct.bg} border ${ct.border} ${ct.color}`}>
        {transcriptionStatus === 'processing' ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Icon className="w-2.5 h-2.5" />}
        {ct.label}
      </span>
      {contentType === 'video' && transcriptionStatus && transcriptionStatus !== 'pending' && (
        <span className={`text-[9px] ${TRANSCRIPTION_STYLES[transcriptionStatus]?.color || 'text-muted-foreground'}`}>
          {TRANSCRIPTION_STYLES[transcriptionStatus]?.label || transcriptionStatus}
        </span>
      )}
    </span>
  );
}