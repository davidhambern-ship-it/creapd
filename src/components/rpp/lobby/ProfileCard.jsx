import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './ProfileConsole.css';

const CARD_THEMES = {
  home:      { h: 270, s: '80%', l: '60%', variant: 'orb' },
  news:      { h: 210, s: '80%', l: '55%', variant: 'ticker' },
  spiritual: { h: 38,  s: '80%', l: '55%', variant: 'reveal' },
  talk:      { h: 330, s: '75%', l: '60%', variant: 'bubbles' },
  music:     { h: 250, s: '70%', l: '60%', variant: 'equalizer' },
  sports:    { h: 25,  s: '90%', l: '55%', variant: 'flip' },
  cooking:   { h: 152, s: '60%', l: '50%', variant: 'fill' },
  research:  { h: 190, s: '80%', l: '55%', variant: 'scan' },
  cosmo:     { h: 300, s: '75%', l: '60%', variant: 'shimmer' },
};

function renderVisual(variant) {
  switch (variant) {
    case 'orb':
      return (
        <div className="pc-orb">
          <div className="pc-orb-ring" />
          <div className="pc-orb-ring" style={{ animationDelay: '0.5s' }} />
          <div className="pc-orb-ring" style={{ animationDelay: '1s' }} />
          <div className="pc-orb-core" />
        </div>
      );
    case 'ticker':
      return (
        <div className="pc-ticker">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pc-ticker-bar" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      );
    case 'reveal':
      return (
        <div className="pc-reveal">
          <div className="pc-reveal-ring" />
          <div className="pc-reveal-ring" style={{ animationDelay: '0.5s' }} />
          <div className="pc-reveal-ring" style={{ animationDelay: '1s' }} />
          <div className="pc-reveal-ring" style={{ animationDelay: '1.5s' }} />
        </div>
      );
    case 'bubbles':
      return (
        <div className="pc-bubbles">
          <div className="pc-bubble" style={{ animationDelay: '0s' }} />
          <div className="pc-bubble" style={{ animationDelay: '0.2s' }} />
          <div className="pc-bubble" style={{ animationDelay: '0.4s' }} />
        </div>
      );
    case 'equalizer':
      return (
        <div className="pc-equalizer">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pc-eq-bar" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      );
    case 'flip':
      return (
        <div className="pc-flip">
          <div className="pc-flip-card" />
        </div>
      );
    case 'fill':
      return (
        <div className="pc-fill">
          <div className="pc-fill-bar" />
        </div>
      );
    case 'scan':
      return (
        <div className="pc-scan">
          <div className="pc-scan-line" />
        </div>
      );
    case 'shimmer':
      return (
        <div className="pc-shimmer">
          <div className="pc-shimmer-sweep" />
        </div>
      );
    default:
      return null;
  }
}

export default function ProfileCard({ profile, index }) {
  const navigate = useNavigate();
  const theme = CARD_THEMES[profile.key] || CARD_THEMES.news;
  const Icon = profile.icon;
  const steps = profile.workflow || [];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (steps.length === 0) return;
    const interval = setInterval(() => {
      setStepIndex(prev => (prev + 1) % steps.length);
    }, 2800 + index * 150);
    return () => clearInterval(interval);
  }, [steps.length, index]);

  return (
    <button
      onClick={() => navigate(profile.path)}
      className="profile-card"
      style={{
        '--pc-h': theme.h,
        '--pc-s': theme.s,
        '--pc-l': theme.l,
        animationDelay: `${index * 0.12}s`,
      }}
    >
      <div className="pc-header">
        <Icon className="pc-icon" style={{ color: `hsl(${theme.h} ${theme.s} ${theme.l})` }} />
        <span className="pc-name">{profile.shortLabel}</span>
      </div>

      <div className="pc-visual">
        {renderVisual(theme.variant)}
      </div>

      <div className="pc-step">
        <p key={stepIndex} className="pc-step-text pc-step-anim">
          {steps[stepIndex]}
        </p>
      </div>

      <div className="pc-footer">
        <span className="pc-step-count">{stepIndex + 1}/{steps.length}</span>
        <span className="pc-enter">
          Enter <ArrowRight className="w-2.5 h-2.5" />
        </span>
      </div>
    </button>
  );
}