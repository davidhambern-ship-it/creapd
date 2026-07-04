import React from 'react';

const ANIMATION_CLASSES = {
  fade: 'animate-fade-in',
  fade_in: 'animate-fade-in',
  fade_out: 'animate-fade-out',
  slide: 'animate-slide-in',
  slide_in: 'animate-slide-in',
  slide_out: 'animate-slide-out',
  scale: 'animate-zoom-in',
  scale_in: 'animate-zoom-in',
  reveal: 'animate-fade-in',
  wipe: 'animate-fade-in',
  expand: 'animate-zoom-in',
  float: 'animate-gentle-float',
  gentle_float: 'animate-gentle-float',
  collapse: 'animate-fade-in',
};

export default function PresentationElement({ element, slideLocalTime }) {
  const timelineEvent = element.timeline_events?.[0];
  if (!timelineEvent) return null;

  const startMs = timelineEvent.start_time || 0;
  const endMs = timelineEvent.end_time || 999999;
  const isVisible = slideLocalTime >= startMs && slideLocalTime <= endMs;

  if (!isVisible && !element.visibility) return null;

  const entranceAnim = element.entrance_animation?.type || 'fade';
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

  const style = {
    position: 'absolute',
    left: `${clampedX * 100}%`,
    top: `${clampedY * 100}%`,
    transform: `translate(-50%, -50%) scale(${clampedScale})`,
    opacity: isVisible ? (element.opacity || 1) : 0,
    transition: 'opacity 0.3s ease',
  };

  const content = element.content || '';

  if (element.element_type === 'image' && element.asset_reference) {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
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
      <div style={style} className={isVisible ? animClass : ''}>
        <h2 className="font-heading font-bold text-white text-center drop-shadow-lg" style={{ fontSize: '3.5cqw', padding: '0.5cqw 1cqw' }}>
          {content}
        </h2>
      </div>
    );
  }

  if (element.element_type === 'body_text') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <p className="text-white/90 text-center drop-shadow-md" style={{ fontSize: '1.8cqw', maxWidth: '60cqw', padding: '0 1cqw' }}>
          {content}
        </p>
      </div>
    );
  }

  if (element.element_type === 'talking_point_card' || element.element_type === 'discussion_response') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl" style={{ padding: '1cqw 1.5cqw', maxWidth: '45cqw' }}>
          <p className="text-white/95 font-medium" style={{ fontSize: '1.6cqw' }}>{content}</p>
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
        className={isVisible ? animClass : ''}
      >
        <div className="bg-primary/80 backdrop-blur-sm rounded-r-lg border-l-4 border-accent" style={{ padding: '0.5cqw 1.5cqw' }}>
          <p className="text-white font-medium" style={{ fontSize: '1.4cqw' }}>{content}</p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'statistic') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <div className="text-center">
          <p className="font-display font-bold text-accent drop-shadow-lg" style={{ fontSize: '5cqw' }}>{content}</p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'quote') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <blockquote className="italic text-white/95 text-center border-l-4 border-primary" style={{ fontSize: '2.2cqw', maxWidth: '60cqw', paddingLeft: '1cqw' }}>
          "{content}"
        </blockquote>
      </div>
    );
  }

  return (
    <div style={style} className={isVisible ? animClass : ''}>
      <p className="text-white/80" style={{ fontSize: '1.5cqw' }}>{content}</p>
    </div>
  );
}