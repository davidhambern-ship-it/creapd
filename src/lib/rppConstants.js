import {
  Building2, Library, Archive, FileText, Clapperboard, Package,
  Search, Bell, Volume2, VolumeX, ChevronRight, CheckCircle2,
  Circle, Clock, ArrowRight, RefreshCw
} from 'lucide-react';

export const RPP_DEPARTMENTS = [
  {
    id: 'lobby',
    name: 'Lobby',
    path: '/research',
    icon: Building2,
    description: 'Reception and navigation hub',
    subtitle: 'Start here',
    output: null,
  },
  {
    id: 'topics',
    name: 'Topics',
    path: '/research/topics',
    icon: Library,
    description: 'Discover and define the research topic',
    subtitle: 'CREAPr Library',
    output: 'Research Assignment',
    detailed_description: 'The CREAPr Library is where your research journey begins. Work with CREAPr to discover, refine, and finalize your research topic through an immersive conversational process. Define your subject area, scope, depth, and key questions. The output is a formal Research Assignment that guides every downstream department.',
  },
  {
    id: 'research',
    name: 'Research',
    path: '/research/manager',
    icon: Archive,
    description: 'Acquire knowledge through deep research',
    subtitle: 'Research Archives',
    output: 'Raw Research Dataset',
    detailed_description: 'The Research Archives department executes deep research on your assigned topic. Multiple research specialists work in parallel to discover sources, verify facts, extract key data points, and synthesize findings. This is where raw knowledge is acquired from across the web, books, articles, and databases — producing the raw research material that will be structured in the next stage.',
  },
  {
    id: 'dossier',
    name: 'Dossier',
    path: '/research/dossier',
    icon: FileText,
    description: 'Transform research into structured knowledge',
    subtitle: 'Briefing Room',
    output: 'Approved Research Dossier',
    detailed_description: 'The Briefing Room transforms raw research into a structured, approved Dossier. Key findings are organized into categories, verified for accuracy, and formatted into a comprehensive briefing document. This is where scattered research notes become a polished, authoritative knowledge base ready to inform production. The Dossier must be reviewed and approved before development can begin.',
  },
  {
    id: 'develop',
    name: 'Develop',
    path: '/research/assets',
    icon: Clapperboard,
    description: 'Generate production assets from the dossier',
    subtitle: 'Development Studio',
    output: 'Presentation Assets',
    detailed_description: 'The Development Studio takes your approved Dossier and generates production-ready assets. This includes scripts, talking points, visual concepts, image generations, B-roll suggestions, social media content, and lower-thirds graphics. Each asset is derived directly from the structured knowledge in your Dossier and tailored to your production profile and brand standards.',
  },
  {
    id: 'packet',
    name: 'Packet',
    path: '/research/export',
    icon: Package,
    description: 'Assemble the complete Production Packet',
    subtitle: 'Assembly Office',
    output: 'Production Packet',
    detailed_description: 'The Assembly Office brings everything together. All approved assets from the Development Studio are collected, organized, and packaged into a single, exportable Production Packet. This is the final deliverable — a complete, ready-to-use production package containing your research dossier, scripts, visual assets, voice packages, and all supporting materials in your chosen export format.',
  },
  {
    id: 'archive',
    name: 'Archive',
    path: '/research/archive',
    icon: Archive,
    description: 'Browse past research productions, dossiers, and packages',
    subtitle: 'Records Vault',
    output: 'Historical Records',
    detailed_description: 'The Records Vault stores all past research productions. Browse completed research configurations, approved dossiers, and generated packages. Search, filter, and revisit any past research work — your full research history in one place.',
  },
];

export const RPP_PROGRESS_STAGES = [
  { id: 'assignment', label: 'Research Assignment', department: 'topics' },
  { id: 'research', label: 'Raw Research Dataset', department: 'research' },
  { id: 'dossier', label: 'Approved Research Dossier', department: 'dossier' },
  { id: 'assets', label: 'Presentation Assets', department: 'develop' },
  { id: 'packet', label: 'Production Packet', department: 'packet' },
];

export const ICON_MAP = {
  Building2, Library, Archive, FileText, Clapperboard, Package,
  Search, Bell, Volume2, VolumeX, ChevronRight, CheckCircle2,
  Circle, Clock, ArrowRight, RefreshCw
};