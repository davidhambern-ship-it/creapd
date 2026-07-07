import React from 'react';

const ACCENTS = {
  cyan: 'hsl(190 80% 55%)',
  purple: 'hsl(270 70% 60%)',
  amber: 'hsl(35 90% 55%)',
  emerald: 'hsl(152 60% 50%)',
};

export default function NerveCenterPanel({ title, children, accent = 'cyan' }) {
  const color = ACCENTS[accent] || ACCENTS.cyan;
  return (
    <div className="nc-panel" style={{ '--nc-accent': color }}>
      <div className="nc-panel-header">
        <span className="nc-panel-dot" />
        <span className="nc-panel-title">{title}</span>
      </div>
      <div className="nc-panel-body">{children}</div>
    </div>
  );
}