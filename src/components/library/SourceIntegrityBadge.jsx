import React from 'react';
import {
  Shield, BookOpen, FileText, CheckCircle2,
  AlertCircle, Lock, ExternalLink
} from 'lucide-react';
import { VERIFICATION_LEVELS, ACCESS_LEVEL_LABELS, LICENSE_LABELS } from '@/lib/spiritualConstants';

const VERIFICATION_STYLES = {
  verified_primary_source: 'bg-berna-emerald/20 text-berna-emerald',
  verified_historical_source: 'bg-berna-emerald/20 text-berna-emerald',
  verified_academic_source: 'bg-accent/20 text-accent',
  official_publisher: 'bg-primary/20 text-primary',
  official_organization: 'bg-primary/20 text-primary',
  public_domain: 'bg-muted text-muted-foreground',
  licensed_content: 'bg-accent/20 text-accent',
  metadata_only: 'bg-muted text-muted-foreground',
  community_resource: 'bg-muted text-muted-foreground'
};

export default function SourceIntegrityBadge({ text }) {
  if (!text) return null;
  const vLevel = VERIFICATION_LEVELS[text.verification_status] || VERIFICATION_LEVELS.metadata_only;
  const vStyle = VERIFICATION_STYLES[text.verification_status] || 'bg-muted text-muted-foreground';
  const accessLabel = ACCESS_LEVEL_LABELS[text.access_level] || 'Metadata Only';
  const licenseLabel = LICENSE_LABELS[text.license_status] || 'Metadata Only';

  const fields = [
    { label: 'Original Language', value: text.original_language || 'Not specified' },
    { label: 'Translation', value: text.translator || 'Default' },
    { label: 'Publisher', value: text.publisher || text.source_provider || 'Not specified' },
    { label: 'Edition', value: text.edition || 'Standard' },
    { label: 'Historical Date', value: text.historical_dating || text.scholarly_dating || 'See notes' },
    { label: 'Last Verification', value: text.last_verification ? new Date(text.last_verification).toLocaleDateString() : 'Recent' }
  ];

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-berna-emerald" />
        <h4 className="text-sm font-heading font-semibold">Source Integrity</h4>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${vStyle}`}>
          <CheckCircle2 className="w-3 h-3" /> {vLevel.label}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-secondary/50 text-muted-foreground">
          {text.access_level === 'full_text' ? <BookOpen className="w-3 h-3" /> : text.access_level === 'external_link' ? <ExternalLink className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
          {accessLabel}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-secondary/50 text-muted-foreground">
          <FileText className="w-3 h-3" /> {licenseLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {fields.map(f => (
          <div key={f.label} className="flex flex-col">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="text-foreground font-medium truncate">{f.value}</span>
          </div>
        ))}
      </div>

      {text.confidence_notes && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30 text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
          <span className="text-muted-foreground">{text.confidence_notes}</span>
        </div>
      )}

      {text.source_url && (
        <a
          href={text.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" /> View official source
        </a>
      )}
    </div>
  );
}