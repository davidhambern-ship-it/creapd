// Content Acquisition Engine (CAE) Constants

export const ENGINE_STATUS_OPTIONS = [
  { value: 'running', label: 'Running', color: 'berna-emerald', icon: 'PlayCircle' },
  { value: 'paused', label: 'Paused', color: 'muted-foreground', icon: 'PauseCircle' },
  { value: 'degraded', label: 'Degraded', color: 'accent', icon: 'AlertTriangle' },
  { value: 'error', label: 'Error', color: 'destructive', icon: 'XCircle' },
  { value: 'maintenance', label: 'Maintenance', color: 'chart-4', icon: 'Wrench' },
  { value: 'offline', label: 'Offline', color: 'destructive', icon: 'Power' }
];

export const OPERATING_MODES = [
  { value: 'passive', label: 'Passive Mode', description: '24/7 background scanning and acquisition', icon: 'Activity' },
  { value: 'assisted', label: 'Assisted Mode', description: 'Admin reviews and approves acquisitions', icon: 'UserCheck' },
  { value: 'expedition', label: 'Expedition Mode', description: 'Active acquisition mission in progress', icon: 'Compass' }
];

export const PROVIDER_TYPES = [
  { value: 'university', label: 'University', icon: 'GraduationCap' },
  { value: 'museum', label: 'Museum', icon: 'Landmark' },
  { value: 'government_archive', label: 'Government Archive', icon: 'Building2' },
  { value: 'digital_library', label: 'Digital Library', icon: 'Library' },
  { value: 'publisher', label: 'Publisher', icon: 'BookOpen' },
  { value: 'research_institute', label: 'Research Institute', icon: 'FlaskConical' },
  { value: 'religious_organization', label: 'Religious Organization', icon: 'Church' },
  { value: 'historical_society', label: 'Historical Society', icon: 'ScrollText' },
  { value: 'academic_journal', label: 'Academic Journal', icon: 'FileText' },
  { value: 'language_institute', label: 'Language Institute', icon: 'Languages' },
  { value: 'repository', label: 'Repository', icon: 'Database' },
  { value: 'open_access_archive', label: 'Open Access Archive', icon: 'FolderOpen' },
  { value: 'public_domain_library', label: 'Public Domain Library', icon: 'BookMarked' },
  { value: 'private_collection', label: 'Private Collection', icon: 'Lock' },
  { value: 'community_archive', label: 'Community Archive', icon: 'Users' },
  { value: 'api_provider', label: 'API Provider', icon: 'Code' },
  { value: 'metadata_provider', label: 'Metadata Provider', icon: 'List' }
];

export const DISCOVERY_PIPELINES = [
  { value: 'public_domain', label: 'Public Domain Pipeline', icon: 'BookMarked', description: 'Automatically import public domain texts' },
  { value: 'open_access', label: 'Open Access Pipeline', icon: 'Unlock', description: 'Open-access academic and research content' },
  { value: 'university', label: 'University Pipeline', icon: 'GraduationCap', description: 'University repositories and publications' },
  { value: 'museum', label: 'Museum Pipeline', icon: 'Landmark', description: 'Museum digital collections and catalogs' },
  { value: 'government_archive', label: 'Government Archive Pipeline', icon: 'Building2', description: 'Government historical records and archives' },
  { value: 'publisher', label: 'Publisher Pipeline', icon: 'BookOpen', description: 'Publisher APIs and free publication feeds' },
  { value: 'api', label: 'API Pipeline', icon: 'Code', description: 'Direct API integrations for structured content' },
  { value: 'organization_publication', label: 'Organization Publication Pipeline', icon: 'Church', description: 'Faith organization official publications' },
  { value: 'research_repository', label: 'Research Repository Pipeline', icon: 'FlaskConical', description: 'Academic research repositories and theses' }
];

export const APPROVAL_STATES = [
  { value: 'approved', label: 'Approved', color: 'berna-emerald' },
  { value: 'conditional', label: 'Conditional', color: 'accent' },
  { value: 'under_review', label: 'Under Review', color: 'chart-4' },
  { value: 'rejected', label: 'Rejected', color: 'destructive' }
];

export const RELATIONSHIP_STATUSES = [
  { value: 'discovered', label: 'Discovered', color: 'muted-foreground' },
  { value: 'under_review', label: 'Under Review', color: 'chart-4' },
  { value: 'verified', label: 'Verified', color: 'berna-emerald' },
  { value: 'connected', label: 'Connected', color: 'berna-emerald' },
  { value: 'account_created', label: 'Account Created', color: 'primary' },
  { value: 'api_connected', label: 'API Connected', color: 'primary' },
  { value: 'import_enabled', label: 'Import Enabled', color: 'berna-emerald' },
  { value: 'metadata_only', label: 'Metadata Only', color: 'muted-foreground' },
  { value: 'license_negotiation', label: 'License Negotiation', color: 'accent' },
  { value: 'inactive', label: 'Inactive', color: 'muted-foreground' },
  { value: 'blocked', label: 'Blocked', color: 'destructive' }
];

export const DISCOVERY_STAGES = [
  { value: 'discovered', label: 'Discovered', color: 'chart-4' },
  { value: 'metadata_harvested', label: 'Metadata Harvested', color: 'chart-4' },
  { value: 'verified', label: 'Verified', color: 'primary' },
  { value: 'rights_checked', label: 'Rights Checked', color: 'primary' },
  { value: 'registration_checked', label: 'Registration Checked', color: 'primary' },
  { value: 'queued', label: 'Queued', color: 'chart-4' },
  { value: 'importing', label: 'Importing', color: 'accent' },
  { value: 'processing', label: 'Processing', color: 'accent' },
  { value: 'indexed', label: 'Indexed', color: 'berna-emerald' },
  { value: 'published', label: 'Published', color: 'berna-emerald' },
  { value: 'failed', label: 'Failed', color: 'destructive' },
  { value: 'blocked', label: 'Blocked', color: 'destructive' }
];

export const RIGHTS_CLASSIFICATIONS = [
  { value: 'public_domain', label: 'Public Domain', color: 'berna-emerald', free: true },
  { value: 'open_license', label: 'Open License', color: 'berna-emerald', free: true },
  { value: 'creative_commons', label: 'Creative Commons', color: 'berna-emerald', free: true },
  { value: 'official_free_access', label: 'Official Free Access', color: 'berna-emerald', free: true },
  { value: 'free_with_registration', label: 'Free With Registration', color: 'primary', free: true },
  { value: 'educational_access', label: 'Educational Access', color: 'primary', free: false },
  { value: 'institutional_access', label: 'Institutional Access', color: 'primary', free: false },
  { value: 'api_access', label: 'API Access', color: 'primary', free: false },
  { value: 'publisher_license_required', label: 'Publisher License Required', color: 'accent', free: false },
  { value: 'permission_required', label: 'Permission Required', color: 'accent', free: false },
  { value: 'commercial_license_required', label: 'Commercial License Required', color: 'destructive', free: false },
  { value: 'subscription_required', label: 'Subscription Required', color: 'destructive', free: false },
  { value: 'copyright_restricted', label: 'Copyright Restricted', color: 'destructive', free: false },
  { value: 'unavailable', label: 'Unavailable', color: 'muted-foreground', free: false },
  { value: 'unknown', label: 'Unknown', color: 'muted-foreground', free: false }
];

export const RECOMMENDED_STRATEGIES = [
  { value: 'acquire_immediately', label: 'Acquire Immediately', color: 'berna-emerald' },
  { value: 'wait', label: 'Wait', color: 'muted-foreground' },
  { value: 'monitor', label: 'Monitor', color: 'chart-4' },
  { value: 'negotiate', label: 'Negotiate', color: 'accent' },
  { value: 'request_permission', label: 'Request Permission', color: 'accent' },
  { value: 'request_api_access', label: 'Request API Access', color: 'accent' },
  { value: 'request_institutional_access', label: 'Request Institutional Access', color: 'accent' },
  { value: 'join_free_program', label: 'Join Free Program', color: 'primary' },
  { value: 'register_provider_account', label: 'Register Provider Account', color: 'primary' },
  { value: 'purchase_license', label: 'Purchase License', color: 'accent' },
  { value: 'use_public_domain_alternative', label: 'Use Public Domain Alternative', color: 'berna-emerald' },
  { value: 'use_official_external_reader', label: 'Use Official External Reader', color: 'primary' },
  { value: 'await_public_domain_status', label: 'Await Public Domain Status', color: 'muted-foreground' },
  { value: 'manual_review', label: 'Manual Review', color: 'chart-4' }
];

export const SUBSYSTEMS = [
  { name: 'source_discovery', label: 'Source Discovery Engine', description: 'Discovers new knowledge sources across the internet', icon: 'Search' },
  { name: 'metadata_harvester', label: 'Metadata Harvester', description: 'Harvests titles, authors, dates, languages, and identifiers', icon: 'FileSearch' },
  { name: 'rights_licensing', label: 'Rights & Licensing Engine', description: 'Classifies legal rights and licensing status', icon: 'Shield' },
  { name: 'source_verification', label: 'Source Verification Engine', description: 'Verifies authenticity and trustworthiness of sources', icon: 'BadgeCheck' },
  { name: 'duplicate_detection', label: 'Duplicate Detection Engine', description: 'Prevents redundant imports by detecting duplicates', icon: 'Copy' },
  { name: 'translation_discovery', label: 'Translation Discovery Engine', description: 'Discovers and links multiple translations', icon: 'Languages' },
  { name: 'edition_discovery', label: 'Edition Discovery Engine', description: 'Identifies editions and revisions', icon: 'Layers' },
  { name: 'manuscript_discovery', label: 'Manuscript Discovery Engine', description: 'Discovers ancient manuscripts and codices', icon: 'ScrollText' },
  { name: 'import_engine', label: 'Import Engine', description: 'Imports and processes discovered resources', icon: 'Download' },
  { name: 'ocr_text_processing', label: 'OCR & Text Processing Engine', description: 'Performs OCR on scanned documents', icon: 'ScanText' },
  { name: 'search_index', label: 'Search Index Engine', description: 'Indexes content for full-text search', icon: 'SearchCode' },
  { name: 'ai_classification', label: 'AI Classification Engine', description: 'Classifies resources using AI', icon: 'BrainCircuit' },
  { name: 'registry_sync', label: 'Registry Synchronization Engine', description: 'Keeps World Scripture Registry in sync', icon: 'RefreshCw' },
  { name: 'opportunity_engine', label: 'Opportunity Engine', description: 'Identifies free acquisition opportunities', icon: 'Lightbulb' },
  { name: 'budget_acquisition', label: 'Budget & Acquisition Strategy Engine', description: 'Manages wallet and purchasing decisions', icon: 'Wallet' },
  { name: 'account_provider_manager', label: 'Account & Provider Manager', description: 'Manages provider accounts and credentials', icon: 'KeyRound' },
  { name: 'live_library_publisher', label: 'Live Library Publisher', description: 'Publishes approved resources to the library', icon: 'BookOpen' },
  { name: 'admin_review_center', label: 'Admin Review Center', description: 'Queues items for admin review', icon: 'ClipboardCheck' },
  { name: 'monitoring_health', label: 'Monitoring & Health Engine', description: 'Monitors engine and subsystem health', icon: 'HeartPulse' }
];

export const ACTIVITY_EVENT_LABELS = {
  new_discovery: { label: 'New Discovery', color: 'chart-4', icon: 'Search' },
  registry_record_created: { label: 'Registry Record Created', color: 'primary', icon: 'FilePlus' },
  public_domain_imported: { label: 'Public Domain Imported', color: 'berna-emerald', icon: 'BookMarked' },
  open_license_imported: { label: 'Open License Imported', color: 'berna-emerald', icon: 'Unlock' },
  metadata_updated: { label: 'Metadata Updated', color: 'chart-4', icon: 'FileEdit' },
  translation_found: { label: 'Translation Found', color: 'primary', icon: 'Languages' },
  manuscript_found: { label: 'Manuscript Found', color: 'primary', icon: 'ScrollText' },
  license_required: { label: 'License Required', color: 'accent', icon: 'Lock' },
  permission_required: { label: 'Permission Required', color: 'accent', icon: 'KeyRound' },
  import_complete: { label: 'Import Complete', color: 'berna-emerald', icon: 'CheckCircle2' },
  indexing_complete: { label: 'Indexing Complete', color: 'berna-emerald', icon: 'SearchCode' },
  published_to_library: { label: 'Published to Library', color: 'berna-emerald', icon: 'BookOpen' },
  failed_job: { label: 'Failed Job', color: 'destructive', icon: 'XCircle' },
  admin_review_needed: { label: 'Admin Review Needed', color: 'accent', icon: 'AlertCircle' },
  provider_account_created: { label: 'Provider Account Created', color: 'primary', icon: 'UserPlus' },
  budget_decision_made: { label: 'Budget Decision Made', color: 'accent', icon: 'Wallet' },
  provider_discovered: { label: 'Provider Discovered', color: 'chart-4', icon: 'Globe' },
  rights_classified: { label: 'Rights Classified', color: 'primary', icon: 'Shield' },
  duplicate_detected: { label: 'Duplicate Detected', color: 'accent', icon: 'Copy' },
  collection_goal_progress: { label: 'Collection Goal Progress', color: 'berna-emerald', icon: 'Target' },
  mission_progress: { label: 'Mission Progress', color: 'primary', icon: 'Compass' },
  provider_health_alert: { label: 'Provider Health Alert', color: 'destructive', icon: 'HeartPulse' },
  milestone_reached: { label: 'Milestone Reached', color: 'berna-emerald', icon: 'Trophy' }
};

export const RESOURCE_TYPES = [
  { value: 'book', label: 'Book' },
  { value: 'sacred_text', label: 'Sacred Text' },
  { value: 'historical_document', label: 'Historical Document' },
  { value: 'ancient_manuscript', label: 'Ancient Manuscript' },
  { value: 'journal_article', label: 'Journal Article' },
  { value: 'research_paper', label: 'Research Paper' },
  { value: 'dissertation', label: 'Dissertation' },
  { value: 'thesis', label: 'Thesis' },
  { value: 'conference_proceeding', label: 'Conference Proceeding' },
  { value: 'map', label: 'Map' },
  { value: 'lexicon', label: 'Lexicon' },
  { value: 'dictionary', label: 'Dictionary' },
  { value: 'concordance', label: 'Concordance' },
  { value: 'commentary', label: 'Commentary' },
  { value: 'study_guide', label: 'Study Guide' },
  { value: 'language_resource', label: 'Language Resource' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'lecture_transcript', label: 'Lecture Transcript' },
  { value: 'government_publication', label: 'Government Publication' },
  { value: 'museum_catalog', label: 'Museum Catalog' },
  { value: 'archaeological_report', label: 'Archaeological Report' },
  { value: 'reference_work', label: 'Reference Work' },
  { value: 'structured_dataset', label: 'Structured Dataset' }
];

export const FILE_FORMATS = [
  { value: 'native_digital_text', label: 'Native Digital Text' },
  { value: 'scanned_pdf', label: 'Scanned PDF' },
  { value: 'image_based_pdf', label: 'Image-Based PDF' },
  { value: 'epub', label: 'EPUB' },
  { value: 'xml', label: 'XML' },
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
  { value: 'txt', label: 'TXT' },
  { value: 'csv', label: 'CSV' },
  { value: 'iiif', label: 'IIIF' },
  { value: 'tei_xml', label: 'TEI XML' },
  { value: 'structured_api_response', label: 'Structured API Response' },
  { value: 'unknown_format', label: 'Unknown Format' }
];

export const BLOCKER_TYPES = [
  { value: 'none', label: 'None', color: 'berna-emerald' },
  { value: 'license_required', label: 'License Required', color: 'accent' },
  { value: 'permission_required', label: 'Permission Required', color: 'accent' },
  { value: 'copyright_restricted', label: 'Copyright Restricted', color: 'destructive' },
  { value: 'registration_required', label: 'Registration Required', color: 'chart-4' },
  { value: 'manual_review_required', label: 'Manual Review Required', color: 'chart-4' },
  { value: 'source_quality_failed', label: 'Source Quality Failed', color: 'destructive' },
  { value: 'duplicate_detected', label: 'Duplicate Detected', color: 'accent' },
  { value: 'technical_import_failed', label: 'Technical Import Failed', color: 'destructive' }
];

export const MISSION_STATUSES = [
  { value: 'active', label: 'Active', color: 'berna-emerald' },
  { value: 'paused', label: 'Paused', color: 'muted-foreground' },
  { value: 'completed', label: 'Completed', color: 'primary' },
  { value: 'cancelled', label: 'Cancelled', color: 'destructive' }
];

export const COLLECTION_GOAL_TEMPLATES = [
  'Complete Public Domain Sacred Text Collection',
  'Complete Church Fathers Collection',
  'Complete Dead Sea Scroll Collection',
  'Complete Nag Hammadi Collection',
  'Complete Apocrypha Collection',
  'Complete Greek Lexicon Collection',
  'Complete Hebrew Lexicon Collection',
  'Complete Buddhist Canon',
  'Complete Hindu Canon',
  'Complete Sikh Scripture Collection',
  'Complete Islamic Source Collection',
  'Complete Comparative Religion Collection',
  'Complete Ancient Near East Collection',
  'Complete Public Theology Journal Collection',
  'Complete Open Access Dissertation Collection'
];

export const DISCOVERY_LAYER_LABELS = {
  known_trusted: { label: 'Known Trusted', color: 'berna-emerald' },
  trusted_expansion: { label: 'Trusted Expansion', color: 'primary' },
  intelligent_exploration: { label: 'Intelligent Exploration', color: 'chart-4' }
};

export const BUDGET_TRANSACTION_LABELS = {
  deposit: { label: 'Deposit', color: 'berna-emerald' },
  manual_deposit: { label: 'Manual Deposit', color: 'berna-emerald' },
  purchase: { label: 'Purchase', color: 'destructive' },
  reservation: { label: 'Reservation', color: 'accent' },
  refund: { label: 'Refund', color: 'berna-emerald' },
  adjustment: { label: 'Adjustment', color: 'chart-4' },
  savings_allocation: { label: 'Savings Allocation', color: 'primary' }
};

export const APPROVAL_STATUS_LABELS = {
  pending: { label: 'Pending', color: 'chart-4' },
  approved: { label: 'Approved', color: 'berna-emerald' },
  denied: { label: 'Denied', color: 'destructive' },
  auto_approved: { label: 'Auto Approved', color: 'berna-emerald' },
  purchased: { label: 'Purchased', color: 'primary' }
};

export const HEALTH_STATUS_COLORS = {
  running: 'berna-emerald',
  paused: 'muted-foreground',
  degraded: 'accent',
  error: 'destructive',
  offline: 'destructive'
};

export const PROVIDER_HEALTH_LABELS = {
  healthy: { label: 'Healthy', color: 'berna-emerald' },
  degraded: { label: 'Degraded', color: 'accent' },
  down: { label: 'Down', color: 'destructive' },
  unknown: { label: 'Unknown', color: 'muted-foreground' }
};

export const FREE_RIGHTS_TYPES = ['public_domain', 'open_license', 'creative_commons', 'official_free_access', 'free_with_registration'];

export const CAE_NAV_TABS = [
  { key: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { key: 'activity', label: 'Activity Feed', icon: 'Activity' },
  { key: 'discovery', label: 'Discovery Pipeline', icon: 'Search' },
  { key: 'providers', label: 'Source Intelligence', icon: 'Globe' },
  { key: 'missions', label: 'Acquisition Missions', icon: 'Compass' },
  { key: 'collection', label: 'Collection Goals', icon: 'Target' },
  { key: 'budget', label: 'Budget & Wallet', icon: 'Wallet' },
  { key: 'subsystems', label: 'Engine Subsystems', icon: 'Cpu' },
  { key: 'operations', label: 'Operations Log', icon: 'ScrollText' }
];