import React, { useMemo } from 'react';
import NerveCenterPanel from './NerveCenterPanel';

function Gauge({ value = 72 }) {
  return (
    <div className="nc-gauge-wrap">
      <div className="nc-gauge" style={{ '--gauge-val': `${value * 3.6}deg` }}>
        <div className="nc-gauge-inner">
          <span className="nc-gauge-value">{value}%</span>
        </div>
      </div>
      <span className="nc-gauge-label">EFFICIENCY</span>
    </div>
  );
}

export default function NerveCenterBottomConsole() {
  const bars = useMemo(() => Array.from({ length: 12 }, () => 25 + Math.random() * 75), []);
  const tickerItems = [
    'SYSTEM: COMMUNICATIONS',
    'NETWORK: ENCRYPTED',
    'PIPELINE: ACTIVE',
    'TRANS METRICS: NOMINAL',
    'AUTH LOGS: VERIFIED',
    'PROTOCOL UPDATES: SYNCED',
    'INTEGRITY: 100%',
  ];
  return (
    <div className="nc-bottom">
      <div className="nc-bottom-modules">
        <NerveCenterPanel title="THROUGHPUT" accent="cyan">
          <div className="nc-bar-chart" style={{ height: '36px' }}>
            {bars.map((h, i) => (
              <div key={i} className="nc-chart-bar" style={{ height: `${h}%` }} />
            ))}
          </div>
        </NerveCenterPanel>
        <NerveCenterPanel title="METRICS" accent="purple">
          <div className="nc-metrics-grid">
            <span className="nc-metric-val">847</span>
            <span className="nc-metric-label">total ops</span>
            <span className="nc-metric-val">12.4k</span>
            <span className="nc-metric-label">data pts</span>
            <span className="nc-metric-val">99.9%</span>
            <span className="nc-metric-label">uptime</span>
          </div>
        </NerveCenterPanel>
        <NerveCenterPanel title="INTEGRITY" accent="emerald">
          <div className="nc-status-rows">
            <div className="nc-status-row"><span className="nc-led nc-led-green" /><span className="nc-status-label">core</span><span className="nc-status-value">OK</span></div>
            <div className="nc-status-row"><span className="nc-led nc-led-green" /><span className="nc-status-label">db</span><span className="nc-status-value">OK</span></div>
            <div className="nc-status-row"><span className="nc-led nc-led-green" /><span className="nc-status-label">auth</span><span className="nc-status-value">OK</span></div>
            <div className="nc-status-row"><span className="nc-led nc-led-amber" /><span className="nc-status-label">cache</span><span className="nc-status-value">WARN</span></div>
          </div>
        </NerveCenterPanel>
        <NerveCenterPanel title="GAUGE" accent="amber">
          <Gauge value={72} />
        </NerveCenterPanel>
      </div>
      <div className="nc-ticker">
        <div className="nc-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="nc-ticker-item">{item}</span>
          ))}
        </div>
      </div>
    </div>
  );
}