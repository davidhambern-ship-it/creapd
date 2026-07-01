export const REGISTRY_ACCESS_STATUS = {
  available_in_producer: { label: 'Available In Producer', color: 'emerald', short: 'Available' },
  available_through_official_link: { label: 'Available Through Official Link', color: 'blue', short: 'Official Link' },
  available_through_api: { label: 'Available Through API', color: 'blue', short: 'API' },
  available_through_licensed_provider: { label: 'Available Through Licensed Provider', color: 'purple', short: 'Licensed Provider' },
  public_domain_import_available: { label: 'Public Domain Import Available', color: 'emerald', short: 'PD Import' },
  metadata_only: { label: 'Metadata Only', color: 'muted', short: 'Metadata' },
  license_required: { label: 'License Required', color: 'orange', short: 'License Req.' },
  permission_required: { label: 'Permission Required', color: 'orange', short: 'Permission Req.' },
  unavailable: { label: 'Unavailable', color: 'red', short: 'Unavailable' },
  unknown: { label: 'Unknown', color: 'muted', short: 'Unknown' }
};

export const REGISTRY_LICENSE_STATUS = {
  public_domain: { label: 'Public Domain', color: 'emerald' },
  open_license: { label: 'Open License', color: 'emerald' },
  official_free_access: { label: 'Official Free Access', color: 'blue' },
  licensed: { label: 'Licensed', color: 'purple' },
  license_needed: { label: 'License Needed', color: 'orange' },
  permission_needed: { label: 'Permission Needed', color: 'orange' },
  copyright_restricted: { label: 'Copyright Restricted', color: 'red' },
  unknown: { label: 'Unknown', color: 'muted' },
  under_review: { label: 'Under Review', color: 'yellow' },
  negotiating: { label: 'Negotiating', color: 'yellow' },
  rejected: { label: 'Rejected', color: 'red' }
};

export const REGISTRY_IMPORT_STATUS = {
  not_imported: { label: 'Not Imported', color: 'muted' },
  import_available: { label: 'Import Available', color: 'blue' },
  import_queued: { label: 'Import Queued', color: 'yellow' },
  importing: { label: 'Importing', color: 'blue' },
  imported: { label: 'Imported', color: 'emerald' },
  indexed: { label: 'Indexed', color: 'emerald' },
  failed: { label: 'Failed', color: 'red' },
  needs_review: { label: 'Needs Review', color: 'orange' },
  blocked_by_license: { label: 'Blocked by License', color: 'red' },
  blocked_by_permission: { label: 'Blocked by Permission', color: 'red' }
};

export const REGISTRY_COPYRIGHT_STATUS = {
  public_domain: { label: 'Public Domain', color: 'emerald' },
  copyrighted: { label: 'Copyrighted', color: 'red' },
  creative_commons: { label: 'Creative Commons', color: 'blue' },
  open_access: { label: 'Open Access', color: 'emerald' },
  unknown: { label: 'Unknown', color: 'muted' }
};

export const REGISTRY_VERIFICATION_STATUS = {
  unverified: { label: 'Unverified', color: 'muted' },
  source_verified: { label: 'Source Verified', color: 'blue' },
  admin_verified: { label: 'Admin Verified', color: 'emerald' },
  automated_verified: { label: 'Automated Verified', color: 'blue' },
  needs_verification: { label: 'Needs Verification', color: 'orange' },
  disputed: { label: 'Disputed', color: 'red' }
};

export const REGISTRY_PRIORITY = {
  critical: { label: 'Critical', color: 'red' },
  high: { label: 'High', color: 'orange' },
  medium: { label: 'Medium', color: 'yellow' },
  low: { label: 'Low', color: 'muted' },
  none: { label: 'None', color: 'muted' }
};

export const REGISTRY_LICENSE_REQUEST_STATUS = {
  none: { label: 'None', color: 'muted' },
  requested: { label: 'Requested', color: 'yellow' },
  in_negotiation: { label: 'In Negotiation', color: 'blue' },
  approved: { label: 'Approved', color: 'emerald' },
  denied: { label: 'Denied', color: 'red' },
  expired: { label: 'Expired', color: 'muted' }
};

export const REGISTRY_ISSUE_TYPE = {
  license_needed: { label: 'License Needed', color: 'orange' },
  permission_needed: { label: 'Permission Needed', color: 'orange' },
  copyright_restricted: { label: 'Copyright Restricted', color: 'red' },
  paywall: { label: 'Paywall', color: 'red' },
  removed: { label: 'Content Removed', color: 'red' },
  broken_link: { label: 'Broken Link', color: 'orange' },
  disputed_source: { label: 'Disputed Source', color: 'red' },
  other: { label: 'Other', color: 'muted' }
};

export const REGISTRY_ISSUE_ADMIN_STATUS = {
  open: { label: 'Open', color: 'orange' },
  under_review: { label: 'Under Review', color: 'yellow' },
  in_progress: { label: 'In Progress', color: 'blue' },
  resolved: { label: 'Resolved', color: 'emerald' },
  wont_fix: { label: "Won't Fix", color: 'muted' },
  blocked: { label: 'Blocked', color: 'red' }
};

export const REGISTRY_COLLECTIONS = {
  sacred_scriptures: 'Sacred Scriptures',
  historical_documents: 'Historical Documents',
  ancient_manuscripts: 'Ancient Manuscripts',
  apocryphal: 'Apocryphal',
  original_languages: 'Original Languages',
  lexicons: 'Lexicons',
  historical_records: 'Historical Records',
  reference_works: 'Reference Works',
  organization_publications: 'Organization Publications',
  language_learning: 'Language Learning',
  research_collections: 'Research Collections',
  personal_collections: 'Personal Collections'
};

export const REGISTRY_SOURCE_TYPES = {
  sacred_text: 'Sacred Text',
  historical_document: 'Historical Document',
  ancient_manuscript: 'Ancient Manuscript',
  apocryphal: 'Apocryphal',
  lexicon: 'Lexicon',
  reference_work: 'Reference Work',
  commentary: 'Commentary',
  translation: 'Translation',
  organization_publication: 'Organization Publication',
  language_learning_resource: 'Language Learning Resource',
  research_collection: 'Research Collection'
};

const COLOR_CLASSES = {
  emerald: 'bg-berna-emerald/20 text-berna-emerald',
  blue: 'bg-chart-4/20 text-chart-4',
  purple: 'bg-primary/20 text-primary',
  orange: 'bg-accent/20 text-accent',
  red: 'bg-destructive/20 text-destructive',
  yellow: 'bg-yellow-500/20 text-yellow-500',
  muted: 'bg-muted text-muted-foreground'
};

export function getStatusBadge(statusMap, key) {
  const entry = statusMap[key] || { label: key || 'Unknown', color: 'muted' };
  const cls = COLOR_CLASSES[entry.color] || COLOR_CLASSES.muted;
  return { label: entry.label, className: cls };
}