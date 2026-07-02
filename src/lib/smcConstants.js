export const SOURCE_TYPES = [
  'API', 'Structured Dataset', 'Bulk Download', 'Metadata Feed', 'Digital Archive',
  'Repository', 'Publisher Portal', 'Official Organization Library', 'Museum Collection',
  'University Collection', 'Government Collection', 'RSS Feed', 'OAI-PMH Endpoint',
  'IIIF Endpoint', 'GitHub Repository', 'Manual Source', 'Unknown'
];

export const PROVIDER_TYPES = [
  'Official Religious Organization', 'University', 'Museum', 'Government', 'Publisher',
  'Digital Library', 'Academic Journal', 'Research Institute', 'Historical Society',
  'Open Source Project', 'Public Domain Repository', 'Open Access Repository',
  'Archive', 'Individual Scholar', 'Community Project', 'Unknown'
];

export const APPROVAL_STATUSES = ['Discovered', 'Candidate', 'Under Review', 'Approved', 'Rejected', 'Paused', 'Archived'];

export const HEALTH_STATUSES = [
  'Healthy', 'Monitoring', 'Slow Response', 'Rate Limited', 'Authentication Error',
  'Schema Changed', 'Connection Failed', 'Documentation Missing',
  'License Review Needed', 'Offline', 'Deprecated', 'Unknown'
];

export const AUTH_TYPES = ['API Key', 'OAuth 2.0', 'Bearer Token', 'Basic Auth', 'JWT', 'Service Account', 'Client ID/Secret', 'Anonymous', 'Custom', 'None'];

export const LICENSE_STATUSES = [
  'Public Domain', 'Creative Commons', 'Open Access', 'Free Redistribution',
  'Personal License', 'Commercial License', 'Subscription Required',
  'Institutional License', 'Negotiation Required', 'Unknown'
];

export const RECOMMENDED_USES = [
  'Seeder Ready', 'CAE Ready', 'Research Only', 'Metadata Only',
  'Manual Review Required', 'License Review Required', 'Not Recommended'
];

export const MONITORING_FREQUENCIES = ['Hourly', 'Every 6 Hours', 'Daily', 'Weekly', 'Monthly', 'Custom'];

export const DISCOVERY_METHODS = [
  'Targeted Search', 'API Directory', 'Developer Documentation Search',
  'Repository Search', 'GitHub Search', 'University Domain Search',
  'Museum Domain Search', 'Organization Search', 'Metadata Endpoint Detection',
  'Linked Documentation Traversal'
];

export const PARSER_TYPES = [
  'Bible Parser', 'Quran Parser', 'XML Parser', 'JSON Parser', 'CSV Parser',
  'HTML Parser', 'Markdown Parser', 'EPUB Parser', 'PDF Parser',
  'IIIF Parser', 'OAI-PMH Parser', 'RSS Parser', 'Plain Text Parser',
  'Image OCR Parser', 'AI Parser', 'Custom Parser'
];

export const PROVIDER_CAPABILITIES = [
  'Full Text', 'Metadata', 'Search', 'Cross References', 'Commentary', 'Lexicons',
  'Dictionaries', 'Maps', 'Images', 'Manuscripts', 'Audio', 'Video', 'Bulk Download',
  'Incremental Updates', 'Version History', 'Language Metadata', 'Translation Metadata',
  'Citation Metadata', 'Knowledge Graph Metadata', 'Authentication', 'Webhook Support',
  'Rate Limiting', 'Batch Requests', 'Pagination', 'Filtering', 'Sorting',
  'Export Support', 'Import Support', 'Provider Health API', 'Licensing API', 'Statistics API'
];

export const ROADMAP_STATUSES = [
  'Missing', 'Discovered', 'Approved', 'Ready to Seed', 'Queued', 'Importing',
  'Imported', 'Needs Update', 'License Required', 'Unavailable', 'Deprecated'
];

export const IMPORT_STATUSES = ['Queued', 'Running', 'Completed', 'Failed', 'Paused', 'Cancelled', 'Retry', 'Validating'];

export const CREDENTIAL_STATUSES = ['Healthy', 'Expiring Soon', 'Expired', 'Authentication Failed', 'Permission Changed', 'Revoked', 'Unknown'];

export const COLLECTION_CATEGORIES = [
  'Abrahamic', 'Christianity', 'Judaism', 'Islam', 'Hinduism', 'Buddhism', 'Taoism',
  'Confucianism', 'Sikhism', 'Jainism', 'Ancient Near Eastern', 'Egyptian',
  'Greek Philosophy', 'Roman Philosophy', 'Gnostic', 'Apocrypha', 'Dead Sea Scrolls',
  'Church Fathers', 'Mysticism', 'Ancient History', 'Lexicons', 'Dictionaries',
  'Commentaries', 'Academic Theology', 'Religious Studies', 'Comparative Religion',
  'Language Resources'
];

export const RIGHTS_CLASSIFICATIONS = [
  'Public Domain', 'Creative Commons', 'Open Access', 'Free Redistribution',
  'Personal License', 'Commercial License', 'Subscription Required',
  'Institutional License', 'Negotiation Required', 'Unknown'
];

export const OPPORTUNITY_TYPES = [
  'Temporary Discount', 'Open Access Release', 'Public Domain Entry',
  'Free Trial', 'Educational Discount', 'Institutional Partnership',
  'Grant Opportunity', 'New Free API'
];

export const RELIABILITY_FORECASTS = ['Very Stable', 'Likely Stable', 'Moderate Risk', 'High Risk', 'End-of-Life Risk', 'Unknown'];

export const APPROVAL_STATUS_COLORS = {
  'Discovered': 'bg-blue-500/20 text-blue-400',
  'Candidate': 'bg-cyan-500/20 text-cyan-400',
  'Under Review': 'bg-amber-500/20 text-amber-400',
  'Approved': 'bg-berna-emerald/20 text-berna-emerald',
  'Rejected': 'bg-red-500/20 text-red-400',
  'Paused': 'bg-orange-500/20 text-orange-400',
  'Archived': 'bg-muted/40 text-muted-foreground'
};

export const HEALTH_STATUS_COLORS = {
  'Healthy': 'bg-berna-emerald/20 text-berna-emerald',
  'Monitoring': 'bg-blue-500/20 text-blue-400',
  'Slow Response': 'bg-amber-500/20 text-amber-400',
  'Rate Limited': 'bg-orange-500/20 text-orange-400',
  'Authentication Error': 'bg-red-500/20 text-red-400',
  'Schema Changed': 'bg-purple-500/20 text-purple-400',
  'Connection Failed': 'bg-red-500/20 text-red-400',
  'Documentation Missing': 'bg-amber-500/20 text-amber-400',
  'License Review Needed': 'bg-orange-500/20 text-orange-400',
  'Offline': 'bg-red-500/20 text-red-400',
  'Deprecated': 'bg-muted/40 text-muted-foreground',
  'Unknown': 'bg-muted/30 text-muted-foreground'
};

export const ROADMAP_STATUS_COLORS = {
  'Missing': 'bg-red-500/20 text-red-400',
  'Discovered': 'bg-blue-500/20 text-blue-400',
  'Approved': 'bg-cyan-500/20 text-cyan-400',
  'Ready to Seed': 'bg-amber-500/20 text-amber-400',
  'Queued': 'bg-purple-500/20 text-purple-400',
  'Importing': 'bg-primary/20 text-primary',
  'Imported': 'bg-berna-emerald/20 text-berna-emerald',
  'Needs Update': 'bg-orange-500/20 text-orange-400',
  'License Required': 'bg-red-500/20 text-red-400',
  'Unavailable': 'bg-muted/40 text-muted-foreground',
  'Deprecated': 'bg-muted/30 text-muted-foreground'
};

export const SMC_TABS = [
  { key: 'overview', label: 'Dashboard', icon: 'LayoutDashboard' },
  { key: 'sources', label: 'Source Registry', icon: 'Database' },
  { key: 'discovery', label: 'Discovery', icon: 'Search' },
  { key: 'vault', label: 'Key Vault', icon: 'KeyRound' },
  { key: 'monitoring', label: 'Monitoring', icon: 'Activity' },
  { key: 'seeder', label: 'Seeder Integration', icon: 'Download' },
  { key: 'collection', label: 'Collection Manager', icon: 'BookMarked' },
  { key: 'licensing', label: 'Licensing & Budget', icon: 'Scale' },
  { key: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { key: 'parsers', label: 'Parser Registry', icon: 'FileCode' }
];