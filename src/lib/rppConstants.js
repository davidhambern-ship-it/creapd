import {
  Building2, Library, Archive, FileText, Clapperboard, Package,
  Search, Bell, Volume2, VolumeX, ChevronRight, CheckCircle2,
  Circle, Clock, ArrowRight, RefreshCw, Send
} from 'lucide-react';

export const RPP_DEPARTMENTS = [
  {
    id: 'lobby',
    name: 'Lobby',
    path: '/research',
    icon: Building2,
    description: 'Reception and navigation hub for the Research Studio',
    subtitle: 'Research Studio Lobby',
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
    detailed_description: 'The CREAPr Library is where your research journey begins. Work with CREAPr to discover, refine, and finalize your research topic through an immersive conversational process. Define your subject area, scope, depth, and key questions. The output is a formal Research Assignment that guides every downstream Research Studio department.',
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
    description: 'Turn approved research into a complete Production Package',
    subtitle: 'Production Department',
    output: 'Production Package',
    detailed_description: 'The Production Department turns approved Research Studio knowledge into a complete Production Package. Its workers create the teleprompter script, talking points, visual concepts, generated images, B-roll suggestions, lower thirds, voice assets, citations, fact-check notes, and other materials the Presentation Studio will need. Research Studio workers stop at the package; they do not build the presentation.',
  },
  {
    id: 'packet',
    name: 'Dispatch',
    path: '/research/export',
    icon: Send,
    description: 'Approve packages and hand them to the Presentation Studio',
    subtitle: 'Dispatch Room',
    output: 'Presentation Studio Handoff',
    detailed_description: 'The Dispatch Room is the boundary between the Research Studio and the shared Presentation Studio. Review the completed Production Package, approve it, and send an immutable snapshot across the CREAPD lot. The Presentation Director and Presentation Editor then use that package copy to direct, assemble, edit, rehearse, present, and export the actual presentation.',
  },
  {
    id: 'archive',
    name: 'Archive',
    path: '/research/archive',
    icon: Archive,
    description: 'Browse past research productions, dossiers, and packages',
    subtitle: 'Records Vault',
    output: 'Historical Records',
    detailed_description: 'The Records Vault stores all past Research Studio work. Browse completed research configurations, approved dossiers, generated Production Packages, and past projects. Search, filter, and revisit any prior research work — your full Research Studio history in one place.',
  },
];

export const RPP_PROGRESS_STAGES = [
  { id: 'assignment', label: 'Research Assignment', department: 'topics' },
  { id: 'research', label: 'Raw Research Dataset', department: 'research' },
  { id: 'dossier', label: 'Approved Research Dossier', department: 'dossier' },
  { id: 'package', label: 'Production Package', department: 'develop' },
  { id: 'handoff', label: 'Presentation Studio Handoff', department: 'packet' },
];

export const ICON_MAP = {
  Building2, Library, Archive, FileText, Clapperboard, Package, Send,
  Search, Bell, Volume2, VolumeX, ChevronRight, CheckCircle2,
  Circle, Clock, ArrowRight, RefreshCw
};
