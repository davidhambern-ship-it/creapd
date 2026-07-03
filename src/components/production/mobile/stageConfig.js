export const STAGES = [
  { key: 'overview', label: 'Overview', short: 'Overview' },
  { key: 'script', label: 'Script', short: 'Script' },
  { key: 'voice', label: 'Voice Package', short: 'Voice' },
  { key: 'media', label: 'AI Media', short: 'Media' },
  { key: 'presentation', label: 'Presentation', short: 'Slides' },
  { key: 'factcheck', label: 'Fact Check', short: 'Fact' },
  { key: 'social', label: 'Social', short: 'Social' },
  { key: 'approve', label: 'Approve', short: 'Approve' },
];

export const STATUS_STYLES = {
  not_started: { label: 'Not Started', color: 'text-muted-foreground', dot: 'bg-muted-foreground/40' },
  generating: { label: 'Generating', color: 'text-berna-purple', dot: 'bg-berna-purple animate-pulse' },
  generated: { label: 'Generated', color: 'text-blue-400', dot: 'bg-blue-400' },
  edited: { label: 'Edited', color: 'text-berna-orange', dot: 'bg-berna-orange' },
  needs_review: { label: 'Needs Review', color: 'text-amber-400', dot: 'bg-amber-400' },
  approved: { label: 'Approved', color: 'text-berna-emerald', dot: 'bg-berna-emerald' },
  error: { label: 'Error', color: 'text-destructive', dot: 'bg-destructive' },
};

export function getStageStatus(stageKey, pkg, edits) {
  const hasEdits = Object.keys(edits || {}).length > 0;
  switch (stageKey) {
    case 'overview':
      return pkg ? (pkg.status === 'approved' ? 'approved' : 'generated') : 'not_started';
    case 'script':
      if (!pkg?.teleprompter_script && !pkg?.show_script) return 'not_started';
      if (pkg.is_edited || hasEdits) return 'edited';
      return 'generated';
    case 'voice':
      if (!pkg?.voice_package_id && !pkg?.generated_audio_url) return 'not_started';
      return 'generated';
    case 'media':
      if (!pkg?.generated_image_url && !pkg?.generated_thumbnail_url && !pkg?.generated_video_url) return 'not_started';
      return 'generated';
    case 'presentation':
      return 'not_started';
    case 'factcheck':
      if (!pkg?.fact_check_notes) return 'not_started';
      return 'generated';
    case 'social':
      if (!pkg?.social_caption) return 'not_started';
      return 'generated';
    case 'approve':
      if (pkg?.status === 'approved') return 'approved';
      if (pkg) return 'needs_review';
      return 'not_started';
    default:
      return 'not_started';
  }
}

export function getStageAction(stageKey) {
  switch (stageKey) {
    case 'overview': return { label: 'Generate', key: 'generate_all' };
    case 'script': return { label: 'Regen Script', key: 'regenerate_script' };
    case 'voice': return { label: 'Gen Voice', key: 'generate_voice' };
    case 'media': return { label: 'Gen Media', key: 'generate_media' };
    case 'presentation': return { label: 'Gen Slides', key: 'generate_presentation' };
    case 'factcheck': return { label: 'Mark Done', key: 'mark_factcheck' };
    case 'social': return { label: 'Copy', key: 'copy_caption' };
    case 'approve': return { label: 'Approve', key: 'approve' };
    default: return null;
  }
}