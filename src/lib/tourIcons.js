/**
 * Tour Icon Registry
 *
 * Maps lucide-react icon names to components so the Tour Control Center
 * can let producers pick icons by name, and the runtime can resolve them
 * back to components for rendering.
 */
import {
  Sparkles, Bot, Newspaper, Music, Mic2, Trophy, ChefHat, Church, Users,
  Package, Presentation, Download, ArrowDown, ArrowRight, Zap, Calendar,
  FileText, Inbox, Search, Image as ImageIcon, Settings, Archive, Wrench,
  Tag, ListMusic, Users2, Sliders, LayoutDashboard, Library, GraduationCap,
  MessageSquare, PenTool, Layers, Shield, Upload, Database, FileSearch,
  Bell, User, FlaskConical, BookMarked, Palette, Clock, ShoppingBag,
  Dumbbell, Heart, FileCheck, Clapperboard, Moon, Sun, Star, CheckCircle,
  AlertCircle, Info, Play, SkipForward, Volume2, Mic, Headphones,
  Camera, Video, Film, Radio, Tv, Wifi, Globe, Map, Compass, Target,
  TrendingUp, Award, Crown, Flame, Rocket, Lightbulb, MessageCircle,
} from 'lucide-react';

const ICON_MAP = {
  Sparkles, Bot, Newspaper, Music, Mic2, Trophy, ChefHat, Church, Users,
  Package, Presentation, Download, ArrowDown, ArrowRight, Zap, Calendar,
  FileText, Inbox, Search, ImageIcon, Settings, Archive, Wrench,
  Tag, ListMusic, Users2, Sliders, LayoutDashboard, Library, GraduationCap,
  MessageSquare, PenTool, Layers, Shield, Upload, Database, FileSearch,
  Bell, User, FlaskConical, BookMarked, Palette, Clock, ShoppingBag,
  Dumbbell, Heart, FileCheck, Clapperboard, Moon, Sun, Star, CheckCircle,
  AlertCircle, Info, Play, SkipForward, Volume2, Mic, Headphones,
  Camera, Video, Film, Radio, Tv, Wifi, Globe, Map, Compass, Target,
  TrendingUp, Award, Crown, Flame, Rocket, Lightbulb, MessageCircle,
};

export const TOUR_ICON_NAMES = Object.keys(ICON_MAP).sort();

export function resolveTourIcon(name) {
  if (!name) return Sparkles;
  return ICON_MAP[name] || Sparkles;
}

/** Reverse lookup: find the icon name string from a component reference */
export function findIconName(iconComponent) {
  if (!iconComponent) return '';
  for (const [name, comp] of Object.entries(ICON_MAP)) {
    if (comp === iconComponent) return name;
  }
  return '';
}

export const VISUAL_TYPES = [
  { value: 'page-icon', label: 'Page Icon', description: 'Single icon in a glass card' },
  { value: 'persona', label: 'CREAPD Persona', description: 'Animated bot avatar with orbiting particles' },
  { value: 'pipeline', label: 'Pipeline', description: 'Sift → Build → Direct → Deliver flow' },
  { value: 'tagline', label: 'Tagline', description: 'CREAPD logo + Create/Automate/Produce/Direct' },
  { value: 'profiles', label: 'Profiles', description: 'Grid of production profile icons' },
  { value: 'arrow-down', label: 'Arrow Down', description: 'Pulsing downward arrow' },
  { value: 'reveal', label: 'Reveal', description: 'Glowing energy orb' },
];

export const VOICE_OPTIONS = [
  { value: 'storm', label: 'Storm — Formal, authoritative' },
  { value: 'river', label: 'River — Calm, neutral' },
  { value: 'honey', label: 'Honey — Warm, soft' },
  { value: 'sunny', label: 'Sunny — Bright, upbeat' },
  { value: 'spark', label: 'Spark — Energetic, quick' },
];

export const FONT_OPTIONS = [
  { value: 'heading', label: 'Heading (Poppins)' },
  { value: 'body', label: 'Body (Inter)' },
  { value: 'display', label: 'Display (Oswald)' },
  { value: 'mono', label: 'Mono (JetBrains)' },
];

export const FONT_CLASSES = {
  heading: 'font-heading',
  body: 'font-body',
  display: 'font-display',
  mono: 'font-mono',
};

export const ICON_COLOR_OPTIONS = [
  { value: 'text-berna-purple', label: 'Purple' },
  { value: 'text-berna-orange', label: 'Orange' },
  { value: 'text-berna-emerald', label: 'Emerald' },
  { value: 'text-amber-400', label: 'Amber' },
  { value: 'text-pink-400', label: 'Pink' },
  { value: 'text-blue-400', label: 'Blue' },
  { value: 'text-white', label: 'White' },
  { value: 'text-muted-foreground', label: 'Muted' },
];