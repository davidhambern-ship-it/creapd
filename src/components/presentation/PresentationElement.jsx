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

  const style = {
    position: 'absolute',
    left: `${(element.position?.x || 0.5) * 100}%`,
    top: `${(element.position?.y || 0.5) * 100}%`,
    transform: `translate(-50%, -50%) scale(${element.scale || 1})`,
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
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          style={{ maxWidth: '60%', maxHeight: '60%' }}
        />
      </div>
    );
  }

  if (element.element_type === 'headline') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-white text-center drop-shadow-lg px-6 py-3">
          {content}
        </h2>
      </div>
    );
  }

  if (element.element_type === 'body_text') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <p className="text-xl md:text-2xl text-white/90 text-center max-w-2xl drop-shadow-md px-4">
          {content}
        </p>
      </div>
    );
  }

  if (element.element_type === 'talking_point_card' || element.element_type === 'discussion_response') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-6 py-4 max-w-md">
          <p className="text-lg text-white/95 font-medium">{content}</p>
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
        <div className="bg-primary/80 backdrop-blur-sm rounded-r-lg px-5 py-2 border-l-4 border-accent">
          <p className="text-base text-white font-medium">{content}</p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'statistic') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <div className="text-center">
          <p className="text-5xl md:text-6xl font-display font-bold text-accent drop-shadow-lg">{content}</p>
        </div>
      </div>
    );
  }

  if (element.element_type === 'quote') {
    return (
      <div style={style} className={isVisible ? animClass : ''}>
        <blockquote className="text-2xl md:text-3xl italic text-white/95 text-center max-w-2xl border-l-4 border-primary pl-4">
          "{content}"
        </blockquote>
      </div>
    );
  }

  return (
    <div style={style} className={isVisible ? animClass : ''}>
      <p className="text-lg text-white/80">{content}</p>
    </div>
  );
}