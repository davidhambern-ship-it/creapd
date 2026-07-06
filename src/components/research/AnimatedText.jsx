import React from 'react';

export default function AnimatedText({ text, className, variant = 'creap', baseDelay = 0, speed = 75 }) {
  if (!text) return null;
  const words = text.split(' ');

  const animationClass = variant === 'user'
    ? 'animate-word-reveal-user'
    : variant === 'smalltalk'
      ? 'animate-small-talk'
      : 'animate-word-reveal';

  if (variant === 'smalltalk') {
    return (
      <p className={className}>
        <span className={animationClass}>{text}</span>
      </p>
    );
  }

  return (
    <p className={className}>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span
            className={animationClass}
            style={{ animationDelay: `${baseDelay + i * speed}ms` }}
          >
            {word}
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </p>
  );
}