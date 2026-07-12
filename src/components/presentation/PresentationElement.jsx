import React from 'react';
import '@/styles/presentation-animations.css';
import TypewriterText from '@/components/presentation/TypewriterText';

// Splits text by newlines, renders each line with a staggered reveal animation
function LineReveal({ text, staggerMs = 120 }) {
  const lines = (text || '').split('\n').filter(l => l.trim() !== '');
  if (lines.length === 0) return null;
  return (
    <>
      {lines.map((line, i) => (
        <span
          key={i}
          className="animate-line-reveal"
          style={{ animationDelay: `${i * staggerMs}ms` }}
        >
          {line.trim()}
        </span>
      ))}
    </>
  );
}

// Helper: render text with typewriter or line-reveal based on entrance type
function renderAnimatedText(content, entranceType, shouldShow, staggerMs = 120) {
  if (entranceType === 'typewriter') {
    return <TypewriterText text={content} shouldStart={shouldShow} speedMs={35} />;
  }
  return <LineReveal text={content} staggerMs={staggerMs} />;
}

const ANIMATION_CLASSES = {
  fade: 'animate-fade-in',
  fade_in: 'animate-fade-in',
  fade_bounce: 'animate-fade-bounce',
  slide: 'animate-slide-in',
  slide_in: 'animate-slide-in',
  slide_left: 'animate-slide-in-left',
  slide_up: 'animate-slide-up',
  slide_down: 'animate-slide-down',
  scale: 'animate-zoom-in',
  scale_in: 'animate-zoom-in',
  scale_bounce: 'animate-scale-bounce',
  zoom_in: 'animate-zoom-in',
  reveal: 'animate-reveal',
  wipe: 'animate-wipe',
  expand: 'animate-expand',
  float: 'animate-gentle-float',
  gentle_float: 'animate-gentle-float',
  dissolve: 'animate-dissolve-in',
  dissolve_in: 'animate-dissolve-in',
  fade_out: 'animate-fade-out',
  slide_out: 'animate-slide-out',
  slide_out_left: 'animate-slide-out-left',
  scale_out: 'animate-scale-out',
  dissolve_out: 'animate-dissolve-out',
  collapse: 'animate-fade-in',
  typewriter: 'animate-fade-in',
};

const AMBIENT_CLASSES = {
  none: '',
  pulse: 'animate-ambient-pulse',
  glow_breathe: 'animate-ambient-glow-breathe',
  shimmer: 'animate-ambient-shimmer',
  subtle_float: 'animate-ambient-subtle-float',
  text_shimmer: 'animate-ambient-text-glow',
  border_pulse: 'animate-ambient-border-pulse',
};

const COLOR_MAP = {
  primary:   { text: 'hsl(270 80% 65%)', glow: 'hsl(270 80% 60% / 0.4)',  border: 'hsl(270 80% 60% / 0.5)',  bg: 'hsl(270 80% 60% / 0.08)' },
  accent:    { text: 'hsl(25 95% 60%)',  glow: 'hsl(25 95% 55% / 0.4)',   border: 'hsl(25 95% 55% / 0.5)',   bg: 'hsl(25 95% 55% / 0.08)' },
  emerald:   { text: 'hsl(152 60% 50%)', glow: 'hsl(152 60% 45% / 0.4)',  border: 'hsl(152 60% 45% / 0.5)',  bg: 'hsl(152 60% 45% / 0.08)' },
  cyan:      { text: 'hsl(190 80% 55%)', glow: 'hsl(190 80% 55% / 0.4)',  border: 'hsl(190 80% 55% / 0.5)',  bg: 'hsl(190 80% 55% / 0.08)' },
  gold:      { text: 'hsl(45 95% 55%)',  glow: 'hsl(45 95% 55% / 0.4)',   border: 'hsl(45 95% 55% / 0.5)',   bg: 'hsl(45 95% 55% / 0.08)' },
  rose:      { text: 'hsl(300 80% 65%)', glow: 'hsl(300 80% 60% / 0.4)',  border: 'hsl(300 80% 60% / 0.5)',  bg: 'hsl(300 80% 60% / 0.08)' },
  white:     { text: 'hsl(0 0% 95%)',    glow: 'hsl(0 0% 95% / 0.2)',     border: 'hsl(0 0% 100% / 0.15)',   bg: 'hsl(0 0% 100% / 0.05)' },
  muted:     { text: 'hsl(220 10% 65%)', glow: 'hsl(220 10% 65% / 0.2)',  border: 'hsl(220 10% 30% / 0.4)',  bg: 'hsl(220 10% 20% / 0.1)' },
  crimson:   { text: 'hsl(0 72% 55%)',   glow: 'hsl(0 72% 51% / 0.4)',    border: 'hsl(0 72% 51% / 0.5)',    bg: 'hsl(0 72% 51% / 0.08)' },
};

function getColor(colorTheme) {
  return COLOR_MAP[colorTheme] || COLOR_MAP.white;
}

// Default visual effects per element type — ensures every element is visually rich
function getDefaultVisualEffects(elementType) {
  switch (elementType) {
    case 'headline':       return ['glass_panel', 'glow_border', 'neon_shadow'];
    case 'statistic':      return ['glass_panel', 'neon_shadow'];
    case 'quote':          return ['glass_panel', 'gradient_border'];
    case 'callout':        return ['glass_panel', 'glow_border'];
    case 'talking_point_card':
    case 'discussion_response':
                           return ['glass_panel', 'glow_border'];
    case 'body_text':      return ['drop_shadow'];
    default:               return [];
  }
}

// Default ambient animation per element type
function getDefaultAmbient(elementType) {
  switch (elementType) {
    case 'headline':  return 'glow_breathe';
    case 'statistic': return 'pulse';
    case 'quote':     return 'subtle_float';
    case 'callout':   return 'border_pulse';
    case 'talking_point_card':
    case 'discussion_response':
                      return 'subtle_float';
    default:          return 'none';
  }
}

// Merge default effects with LLM-specified effects
function getEffectiveVisualEffects(element) {
  const defaults = getDefaultVisualEffects(element.element_type);
  const specified = element.visual_effects || [];
  return [...new Set([...defaults, ...specified])];
}

function getEffectiveAmbient(element) {
  return element.ambient_animation || getDefaultAmbient(element.element_type);
}

// Build inline CSS from visual_effects array
function getVisualStyles(effects, color) {
  const styles = {};
  const hasPanel = effects.includes('glass_panel') || effects.includes('glow_border') || effects.includes('gradient_border');

  if (effects.includes('glass_panel')) {
    styles.background = color.bg;
    styles.backdropFilter = 'blur(12px)';
    styles.webkitBackdropFilter = 'blur(12px)';
    styles.border = `1px solid ${color.border}`;
    styles.borderRadius = '0.75rem';
  }
  if (effects.includes('glow_border')) {
    styles.border = `1px solid ${color.border}`;
    styles.boxShadow = `0 0 16px ${color.glow}, inset 0 0 12px ${color.glow}`;
    styles.borderRadius = '0.75rem';
  }
  if (effects.includes('neon_shadow')) {
    styles.textShadow = `0 0 8px ${color.text}, 0 0 24px ${color.glow}`;
  }
  if (effects.includes('drop_shadow')) {
    styles.filter = `drop-shadow(0 4px 8px rgba(0,0,0,0.5))`;
  }
  if (effects.includes('gradient_border')) {
    styles.border = `1px solid ${color.border}`;
    styles.boxShadow = `0 0 1px ${color.text}, 0 0 12px ${color.glow}`;
    styles.borderRadius = '0.75rem';
  }
  if (effects.includes('inner_glow')) {
    const existing = styles.boxShadow || '';
    styles.boxShadow = `${existing} inset 0 0 20px ${color.glow}`.trim();
  }
  if (hasPanel) {
    styles.padding = '0.6cqw 1.2cqw';
  }

  return styles;
}

// CSS custom properties for ambient border pulse
function getAmbientVars(color) {
  return {
    '--effect-color': color.border,
    '--effect-glow': color.glow,
  };
}

export default function PresentationElement({ element, slideLocalTime }) {
  const timelineEvent = element.timeline_events?.[0];
  if (!timelineEvent) return null;

  const startMs = timelineEvent.start_time || 0;
  const endMs = timelineEvent.end_time || 999999;
  const isVisible = slideLocalTime >= startMs && slideLocalTime <= endMs;

  if (!isVisible && !element.visibility) return null;

  const shouldShow = isVisible || element.visibility;

  const entranceAnim = element.entrance_animation?.type || 'fade';
  const fontClass = element.font_style || '';
  const isFloat = entranceAnim === 'gentle_float' || entranceAnim === 'float';
  const entranceClass = isFloat
    ? ANIMATION_CLASSES['gentle_float']
    : (ANIMATION_CLASSES[entranceAnim] || 'animate-fade-in');
  const isTypewriter = entranceAnim === 'typewriter';

  // Clamp positions to safe area
  const rawX = element.position?.x ?? 0.5;
  const rawY = element.position?.y ?? 0.5;
  const clampedX = Math.max(0.08, Math.min(0.92, rawX));
  const clampedY = Math.max(0.08, Math.min(0.92, rawY));
  const clampedScale = Math.max(0.5, Math.min(1.5, element.scale || 1));

  const color = getColor(element.color_theme);
  const visualEffects = getEffectiveVisualEffects(element);
  const visualStyles = getVisualStyles(visualEffects, color);
  const ambientAnim = getEffectiveAmbient(element);
  const ambientClass = AMBIENT_CLASSES[ambientAnim] || '';
  const ambientVars = getAmbientVars(color);

  const baseStyle = {
    position: 'absolute',
    left: `${clampedX * 100}%`,
    top: `${clampedY * 100}%`,
    transform: `translate(-50%, -50%) scale(${clampedScale})`,
    opacity: shouldShow ? (element.opacity || 1) : 0,
    transition: 'opacity 0.3s ease',
    ...ambientVars,
  };

  const content = element.content || '';
  // For typewriter, skip entrance animation class on the wrapper (TypewriterText handles its own reveal)
  // For other types, apply entrance + ambient
  const animWrap = shouldShow
    ? (isTypewriter ? ambientClass : `${entranceClass} ${ambientClass}`.trim())
    : '';

  // ── IMAGE ──
  if (element.element_type === 'image') {
    const imgSrc = element.asset_reference || (content.startsWith('http') ? content : '');
    if (!imgSrc) return null;

    const isCentered = rawX >= 0.35 && rawX <= 0.65 && rawY >= 0.35 && rawY <= 0.65;

    if (isCentered) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: shouldShow ? (element.opacity || 1) : 0,
            transition: 'opacity 0.5s ease',
          }}
          className={animWrap}
        >
          <img
            src={imgSrc}
            alt=""
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.85)' }}
          />
          {/* Subtle vignette + gradient overlay for depth */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, hsl(220 30% 4% / 0.6) 100%)', pointerEvents: 'none' }} />
        </div>
      );
    }

    return (
      <div style={baseStyle} className={animWrap}>
        <div style={{
          borderRadius: '0.75rem',
          overflow: 'hidden',
          border: `1px solid ${color.border}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 16px ${color.glow}`,
        }}>
          <img
            src={imgSrc}
            alt={content}
            className="object-contain"
            style={{ maxWidth: '70cqw', maxHeight: '70cqh' }}
          />
        </div>
      </div>
    );
  }

  // Skip icon/chart/logo — no renderer
  if (element.element_type === 'icon' || element.element_type === 'chart' || element.element_type === 'logo') {
    return null;
  }

  // ── HEADLINE ──
  if (element.element_type === 'headline') {
    return (
      <div style={{ ...baseStyle, ...visualStyles }} className={animWrap}>
        <h2
          className={`${fontClass || 'font-heading'} font-bold text-center`}
          style={{ fontSize: '3.2cqw', color: color.text, textShadow: visualStyles.textShadow || `0 0 12px ${color.glow}` }}
        >
          {isTypewriter
            ? <TypewriterText text={content} shouldStart={shouldShow} speedMs={45} />
            : content}
        </h2>
      </div>
    );
  }

  // ── BODY TEXT ──
  if (element.element_type === 'body_text') {
    const lines = content.split('\n').filter(l => l.trim());
    const useLineReveal = lines.length > 1 || content.length > 80;
    return (
      <div style={{ ...baseStyle, ...visualStyles }} className={isTypewriter || useLineReveal ? ambientClass : animWrap}>
        <div
          className={`${fontClass || 'font-body'} text-center`}
          style={{ fontSize: '1.8cqw', maxWidth: '60cqw', color: color.text, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
        >
          {isTypewriter ? (
            <TypewriterText text={content} shouldStart={shouldShow} speedMs={35} />
          ) : useLineReveal ? (
            <LineReveal text={content} staggerMs={150} />
          ) : (
            <p>{content}</p>
          )}
        </div>
      </div>
    );
  }

  // ── TALKING POINT CARD / DISCUSSION RESPONSE ──
  if (element.element_type === 'talking_point_card' || element.element_type === 'discussion_response') {
    return (
      <div style={{ ...baseStyle, ...visualStyles }} className={animWrap}>
        <div className={`${fontClass || 'font-body'} font-medium`} style={{ fontSize: '1.6cqw', color: color.text, textShadow: `0 0 8px ${color.glow}` }}>
          {renderAnimatedText(content, entranceAnim, shouldShow, 120)}
        </div>
      </div>
    );
  }

  // ── LOWER THIRD ──
  if (element.element_type === 'lower_third') {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '5%',
          opacity: shouldShow ? 1 : 0,
          transition: 'opacity 0.3s ease',
          ...ambientVars,
        }}
        className={animWrap}
      >
        <div
          className="backdrop-blur-sm rounded-r-lg"
          style={{ padding: '0.5cqw 1.5cqw', background: `${color.text}cc`, borderLeft: `4px solid ${color.text}`, boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${color.glow}` }}
        >
          <p className={`${fontClass || 'font-condensed'} font-medium`} style={{ fontSize: '1.4cqw', color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {isTypewriter
              ? <TypewriterText text={content} shouldStart={shouldShow} speedMs={30} />
              : content}
          </p>
        </div>
      </div>
    );
  }

  // ── STATISTIC ──
  if (element.element_type === 'statistic') {
    return (
      <div style={{ ...baseStyle, ...visualStyles }} className={animWrap}>
        <div className="text-center">
          <p
            className={`${fontClass || 'font-display'} font-bold`}
            style={{ fontSize: '5cqw', color: color.text, textShadow: `0 0 16px ${color.glow}, 0 0 32px ${color.glow}` }}
          >
            {isTypewriter
              ? <TypewriterText text={content} shouldStart={shouldShow} speedMs={50} />
              : content}
          </p>
        </div>
      </div>
    );
  }

  // ── QUOTE ──
  if (element.element_type === 'quote') {
    const quoteText = content.replace(/^[""]|[""]$/g, '');
    return (
      <div style={{ ...baseStyle, ...visualStyles }} className={animWrap}>
        <blockquote
          className={`${fontClass || 'font-serif'} italic text-center`}
          style={{ fontSize: '2.2cqw', maxWidth: '55cqw', paddingLeft: '1cqw', borderLeft: `4px solid ${color.text}`, color: color.text, textShadow: `0 0 12px ${color.glow}` }}
        >
          {renderAnimatedText(`"${quoteText}"`, entranceAnim, shouldShow, 200)}
        </blockquote>
      </div>
    );
  }

  // ── CALLOUT ──
  if (element.element_type === 'callout') {
    return (
      <div style={{ ...baseStyle, ...visualStyles }} className={animWrap}>
        <div className={`${fontClass || 'font-body'} font-semibold text-center`} style={{ fontSize: '1.6cqw', color: color.text, textShadow: `0 0 8px ${color.glow}` }}>
          {renderAnimatedText(content, entranceAnim, shouldShow, 120)}
        </div>
      </div>
    );
  }

  // ── DEFAULT ──
  return (
    <div style={{ ...baseStyle, ...visualStyles }} className={animWrap}>
      <p className={`${fontClass || 'font-body'}`} style={{ fontSize: '1.5cqw', color: color.text, textShadow: `0 0 8px ${color.glow}` }}>
        {isTypewriter
          ? <TypewriterText text={content} shouldStart={shouldShow} speedMs={35} />
          : content}
      </p>
    </div>
  );
}