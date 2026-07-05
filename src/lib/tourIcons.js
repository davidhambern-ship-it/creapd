/**
 * Tour Icon & Style Registry
 *
 * Maps lucide-react icon names to components so the Tour Control Center
 * can let producers pick icons by name, and the runtime can resolve them
 * back to components for rendering.
 *
 * Also defines selectable option sets for visual types, voices, fonts,
 * colors, transitions, animations, and layout options.
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

// ═══════════════════════════════════════════════
// VISUAL TYPES
// ═══════════════════════════════════════════════
export const VISUAL_TYPES = [
  { value: 'page-icon', label: 'Page Icon', description: 'Single icon in a glass card' },
  { value: 'persona', label: 'CREAPD Persona', description: 'Animated bot avatar with orbiting particles' },
  { value: 'pipeline', label: 'Pipeline', description: 'Sift → Build → Direct → Deliver flow' },
  { value: 'tagline', label: 'Tagline', description: 'CREAPD logo + Create/Automate/Produce/Direct' },
  { value: 'profiles', label: 'Profiles', description: 'Grid of production profile icons' },
  { value: 'arrow-down', label: 'Arrow Down', description: 'Pulsing downward arrow' },
  { value: 'reveal', label: 'Reveal', description: 'Glowing energy orb' },
];

// ═══════════════════════════════════════════════
// VOICES (built-in)
// ═══════════════════════════════════════════════
export const VOICE_OPTIONS = [
  { value: 'storm', label: 'Storm — Formal, authoritative' },
  { value: 'river', label: 'River — Calm, neutral' },
  { value: 'honey', label: 'Honey — Warm, soft' },
  { value: 'sunny', label: 'Sunny — Bright, upbeat' },
  { value: 'spark', label: 'Spark — Energetic, quick' },
];

// ═══════════════════════════════════════════════
// FONTS
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════
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

export const TEXT_COLOR_OPTIONS = ICON_COLOR_OPTIONS;

// ═══════════════════════════════════════════════
// TEXT SIZES
// ═══════════════════════════════════════════════
export const TEXT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small' },
  { value: 'base', label: 'Base' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
  { value: '2xl', label: '2XL' },
];

export const TEXT_SIZE_CLASSES = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

export const TEXT_ALIGNMENT_OPTIONS = [
  { value: 'center', label: 'Center' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

export const TEXT_ALIGN_CLASSES = {
  center: 'text-center',
  left: 'text-left',
  right: 'text-right',
};

// ═══════════════════════════════════════════════
// BACKGROUNDS
// ═══════════════════════════════════════════════
export const BACKGROUND_TYPE_OPTIONS = [
  { value: 'default', label: 'Default (ambient glow)' },
  { value: 'gradient-purple', label: 'Purple Gradient' },
  { value: 'gradient-orange', label: 'Orange Gradient' },
  { value: 'gradient-emerald', label: 'Emerald Gradient' },
  { value: 'gradient-navy', label: 'Navy Gradient' },
  { value: 'solid-dark', label: 'Solid Dark' },
  { value: 'image', label: 'AI Generated Image' },
];

export const BACKGROUND_CLASSES = {
  default: 'bg-background',
  'gradient-purple': 'bg-gradient-to-br from-berna-purple/30 to-background',
  'gradient-orange': 'bg-gradient-to-br from-berna-orange/30 to-background',
  'gradient-emerald': 'bg-gradient-to-br from-berna-emerald/30 to-background',
  'gradient-navy': 'bg-gradient-to-br from-berna-navy to-background',
  'solid-dark': 'bg-black',
  image: 'bg-background',
};

// ═══════════════════════════════════════════════
// LAYOUT
// ═══════════════════════════════════════════════
export const ELEMENT_LAYOUT_OPTIONS = [
  { value: 'centered', label: 'Centered (stacked)' },
  { value: 'split-left', label: 'Split — visual on left' },
  { value: 'split-right', label: 'Split — visual on right' },
  { value: 'fullscreen', label: 'Fullscreen image' },
];

// ═══════════════════════════════════════════════
// TRANSITIONS & ANIMATIONS
// ═══════════════════════════════════════════════
export const TRANSITION_OPTIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide-left', label: 'Slide In (Left)' },
  { value: 'slide-up', label: 'Slide In (Up)' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'none', label: 'None (instant)' },
];

export const TRANSITION_OPTIONS_OUT = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide-right', label: 'Slide Out (Right)' },
  { value: 'slide-down', label: 'Slide Out (Down)' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'dissolve', label: 'Dissolve' },
  { value: 'none', label: 'None (instant)' },
];

export const ANIMATION_SPEED_OPTIONS = [
  { value: 'slow', label: 'Slow (1.5×)' },
  { value: 'normal', label: 'Normal (1.0×)' },
  { value: 'fast', label: 'Fast (0.6×)' },
];

export const ANIMATION_SPEED_MULTIPLIER = {
  slow: 1.5,
  normal: 1.0,
  fast: 0.6,
};