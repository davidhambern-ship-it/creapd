import React from 'react';
import './nerve-center.css';

export default function NerveCenterBackground() {
  return (
    <div className="nc-bg">
      <div
        className="nc-bg-image"
        style={{
          backgroundImage: 'url(https://media.base44.com/images/public/6a4126962e5804304cc84b12/7ff687182_generated_image.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="nc-bg-overlay" />
      <div className="nc-bg-grid" />
      <div className="nc-orb nc-orb-cyan" />
      <div className="nc-orb nc-orb-purple" />
      <div className="nc-scan-line" />
      <div className="nc-vignette" />
    </div>
  );
}