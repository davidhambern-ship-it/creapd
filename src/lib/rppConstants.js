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
  },
  {
    id: 'research',
    name: 'Research',
    path: '/research/manager',
    icon: Archive,
    description: 'Acquire knowledge through deep research',
    subtitle: 'Research Archives',
    output: 'Raw Research',
  },
  {
    id: 'dossier',
    name: 'Dossier',
    path: '/research/dossier',
    icon: FileText,
    description: 'Transform research into structured knowledge',
    subtitle: 'Briefing Room',
    output: 'Approved Dossier',
  },
  {
    id: 'develop',
    name: 'Develop',
    path: '/research/assets',
    icon: Clapperboard,
    description: 'Generate production assets from the dossier',
    subtitle: 'Development Studio',
    output: 'Production Assets',
  },
  {
    id: 'packet',
    name: 'Packet',
    path: '/research/export',
    icon: Package,
    description: 'Assemble the complete Production Packet',
    subtitle: 'Assembly Office',
    output: 'Production Packet',
  },
];

export const RPP_PROGRESS_STAGES = [
  { id: 'assignment', label: 'Research Assignment', department: 'topics' },
  { id: 'research', label: 'Research Complete', department: 'research' },
  { id: 'dossier', label: 'Dossier Approved', department: 'dossier' },
  { id: 'assets', label: 'Assets Generated', department: 'develop' },
  { id: 'packet', label: 'Packet Ready', department: 'packet' },
];

export const ICON_MAP = {
  Building2, Library, Archive, FileText, Clapperboard, Package,
  Search, Bell, Volume2, VolumeX, ChevronRight, CheckCircle2,
  Circle, Clock, ArrowRight, RefreshCw
};