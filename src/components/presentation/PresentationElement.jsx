import React from 'react';
import '@/styles/presentation-animations.css';

const ANIMATION_CLASSES = {
  // Entrance
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
  // Exit
  fade_out: 'animate-fade-out',
  slide_out: 'animate-slide-out',
  slide_out_left: 'animate-slide-out-left',
  scale_out: 'animate-scale-out',
  dissolve_out: 'animate-dissolve-out',
  collapse: 'animate-fade-in',
};

const COLOR_MAP = {
  primary:   { text: 'hsl(270 80% 65%)', glow: 'hsl(270 80% 60% / 0.4)' },
  accent:    { text: 'hsl(25 95% 60%)',  glow: 'hsl(25 95% 55% / 0.4)' },
  emerald:   { text: 'hsl(152 60% 50%)', glow: 'hsl(152 60% 45% / 0.4)' },
  cyan:      { text: 'hsl(190 80% 55%)', glow: 'hsl(190 80% 55% / 0.4)' },
  gold:      { text: 'hsl(45 95% 55%)',  glow: 'hsl(45 95% 55% / 0.4)' },
  rose:      { text: 'hsl(300 80% 65%)', glow: 'hsl(300 80% 60% / 0.4)' },
  white:     { text: 'hsl(0 0% 95%)',    glow: 'hsl(0 0% 95% / 0.2)' },
  muted:     { text: 'hsl(220 10% 65%)', glow: 'hsl(220 10% 65% / 0.2)' },
  crimson:   { text: 'hsl(0 72% 55%)',   glow: 'hsl(0 72% 51% / 0.4)' },
};

function getColor(colorTheme) {
  return COLOR_MAP[colorTheme] || COLOR_MAP.white;
}

export default function PresentationElement({ element, slideLocalTime }) {
  const timelineEvent = element.timeline_events?.[0];
  if (!timelineEvent) return null;

  const startMs = timelineEvent.start_time || 0;
  const endMs = timelineEvent.end_time || 999999;
  const isVisible = slideLocalTime >= startMs && slideLocalTime <= endMs;

  if (!isVisible && !element.visibility) return null;

  const entranceAnim = element.entrance_animation?.type || 'fade';
  const fontClass = element.font_style || '';
  const isFloat = entranceAnim === 'gentle_float' || entranceAnim === 'float';
  const animClass = isFloat
    ? ANIMATION_CLASSES['gentle_float']
    : (ANIMATION_CLASSES[entranceAnim] || 'animate-fade-in');

  // Clamp positions to safe area (0.08–0.92) so elements never overflow
  const rawX = element.position?.x ?? 0.5;
  const rawY = element.position?.y ?? 0.5;
  const clampedX = Math.max(0.08, Math.min(0.92, rawX));
  const clampedY = Math.max(0.08, Math.min(0.92, rawY));
  const clampedScale = Math.max(0.5, Math.min(1.5, element.scale || 1));

  const color = getColor(element.color_theme);
  const glowShadow = `0 0 20px ${color.glow}`;

  const style = {
    position: 'absolute',
    left: `${clampedX * 100}%`,
    top: `${clampedY * 100}%`,
    transform: `translate(-50%, -50%) scale(${clampedScale})`,
    opacity: isVisible ? (element.opacity || 1) : 0,
    transition: 'opacity 0.3s ease',
  };

  const content = element.content || '';
  const animWrap = isVisible ? animClass : '';

  if (element.element_type === 'image' && element.asset_reference) {
    return (
      <div style={style} className={animWrap}>
        <img
          src={element.asset_reference}
          alt={content}
          className="rounded-lg shadow-2xl object-contain"
          style={{ maxWidth: '50cqw', maxHeight: '50cqh' }}
        />
      </div>
    );
  }

  if (element.element_type === 'headline') {
    return (
      <div style={style} className={animWrap}>
        <h2
          className={`${fontClass || 'font-heading'} font-bold text-center`}
          style={{ fontSize: '3.5cqw', padding: '0.5cqw 1cqw', color: color.text, textShadow: glowShadow }}
        >
          {content}
        </h2>
      </div>
    );
  }

  if (element.element_type === 'body_text') {
    return (
      <div style={style} className={animWrap}>
        <p
          className={`${fontClass || 'font-body'} text-center`}
          style={{ fontSize: '1.8cqw', maxWidth: '60cqw', padding: '0 1cqw', color: color.text, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
        >
          {content}
        </p>
      </div>
    );
  }

  if (element.element_type === 'talking_point_card' || element.element_type === 'discussion_response') {
    return (
      <div style={style} className={animWrap}>
        <div
          className="backdrop-blur-md rounded-xl"
          style={{ padding: '1cqw 1.5cqw', maxWidth: '45cqw', background: `${color.text}1a`, border: `1px solid ${color.text}66`, boxShadow: glowShadow }}
        >
          <p className={`${fontClass || 'font-body'} font-medium`} style={{ fontSize: '1.6cqw', color: color.text }}>
            {content}
          </p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'lower_third') {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '5%',
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        className={animWrap}
      >
        <div
          className="backdrop-blur-sm rounded-r-lg"
          style={{ padding: '0.5cqw 1.5cqw', background: `${color.text}cc`, borderLeft: `4px solid ${color.text}` }}
        >
          <p className={`${fontClass || 'font-body'} font-medium`} style={{ fontSize: '1.4cqw', color: 'white' }}>
            {content}
          </p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'statistic') {
    return (
      <div style={style} className={animWrap}>
        <div className="text-center">
          <p
            className={`${fontClass || 'font-display'} font-bold`}
            style={{ fontSize: '5cqw', color: color.text, textShadow: glowShadow }}
          >
            {content}
          </p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'quote') {
    return (
      <div style={style} className={animWrap}>
        <blockquote
          className={`${fontClass || 'font-serif'} italic text-center`}
          style={{ fontSize: '2.2cqw', maxWidth: '60cqw', paddingLeft: '1cqw', borderLeft: `4px solid ${color.text}`, color: color.text, textShadow: glowShadow }}
        >
          "{content}"
        </blockquote>
      </div>
    );
  }

  if (element.element_type === 'callout') {
    return (
      <div style={style} className={animWrap}>
        <div
          className="backdrop-blur-md rounded-xl"
          style={{ padding: '0.75cqw 1.25cqw', background: `${color.text}1a`, border: `1px solid ${color.text}55`, boxShadow: glowShadow }}
        >
          <p className={`${fontClass || 'font-body'} font-semibold text-center`} style={{ fontSize: '1.6cqw', color: color.text }}>
            {content}
          </p>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div style={style} className={animWrap}>
      <p className={`${fontClass || 'font-body'}`} style={{ fontSize: '1.5cqw', color: color.text }}>
        {content}
      </p>
    </div>
  );
}