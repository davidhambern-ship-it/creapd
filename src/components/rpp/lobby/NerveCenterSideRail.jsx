import React, { useMemo } from 'react';
import NerveCenterPanel from './NerveCenterPanel';

function Waveform() {
  const bars = useMemo(() => Array.from({ length: 22 }, () => 20 + Math.random() * 80), []);
  return (
    <div className="nc-waveform">
      {bars.map((h, i) => (
        <div key={i} className="nc-wave-bar" style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }} />
      ))}
    </div>
  );
}

function BarChart({ count = 8 }) {
  const bars = useMemo(() => Array.from({ length: count }, () => 25 + Math.random() * 75), []);
  return (
    <div className="nc-bar-chart">
      {bars.map((h, i) => (
        <div key={i} className="nc-chart-bar" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

function DotGrid() {
  const dots = useMemo(() => Array.from({ length: 36 }, () => Math.random() > 0.7), []);
  return (
    <div className="nc-dot-grid">
      {dots.map((active, i) => (
        <div key={i} className={active ? 'nc-dot nc-dot-active' : 'nc-dot'} />
      ))}
    </div>
  );
}

function ScrollText({ lines }) {
  return (
    <div className="nc-scroll-container">
      <div className="nc-scroll-track">
        {[...lines, ...lines].map((line, i) => (
          <div key={i} className="nc-scroll-line">{line}</div>
        ))}
      </div>
    </div>
  );
}

function LogList({ entries }) {
  return (
    <div className="nc-log-list">
      {entries.map((e, i) => (
        <div key={i} className="nc-log-entry">
          <span className="nc-log-time">{e.time}</span>
          <span className="nc-log-text">{e.text}</span>
        </div>
      ))}
    </div>
  );
}

function StatusRows({ rows }) {
  return (
    <div className="nc-status-rows">
      {rows.map((r, i) => (
        <div key={i} className="nc-status-row">
          <span className={`nc-led nc-led-${r.led}`} />
          <span className="nc-status-label">{r.label}</span>
          <span className="nc-status-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function NerveCenterSideRail({ side }) {
  if (side === 'left') {
    return (
      <div className="nc-rail nc-rail-left">
        <NerveCenterPanel title="TOPIC_MATRIX" accent="cyan">
          <BarChart count={10} />
        </NerveCenterPanel>
        <NerveCenterPanel title="SIGNAL_WAVEFORM" accent="purple">
          <Waveform />
        </NerveCenterPanel>
        <NerveCenterPanel title="NETWORK_MAP" accent="cyan">
          <DotGrid />
        </NerveCenterPanel>
        <NerveCenterPanel title="DATA_STREAM" accent="emerald">
          <ScrollText lines={[
            '> init research_module',
            '> loading topic_index',
            '> 42 sources indexed',
            '> pipeline: ACTIVE',
            '> dossier sync: OK',
            '> packet queue: 3',
            '> monitoring feeds',
            '> integrity: PASS',
          ]} />
        </NerveCenterPanel>
      </div>
    );
  }
  return (
    <div className="nc-rail nc-rail-right">
      <NerveCenterPanel title="UPTIME_LOG" accent="emerald">
        <LogList entries={[
          { time: '07:42', text: 'core boot' },
          { time: '07:43', text: 'auth verified' },
          { time: '07:45', text: 'sync started' },
          { time: '07:51', text: 'index ready' },
          { time: '08:03', text: 'pipeline up' },
        ]} />
      </NerveCenterPanel>
      <NerveCenterPanel title="ALERT_HISTORY" accent="amber">
        <LogList entries={[
          { time: '07:44', text: 'rate limit hit' },
          { time: '07:50', text: 'retry success' },
          { time: '08:02', text: 'timeout x1' },
          { time: '08:12', text: 'recovered' },
        ]} />
      </NerveCenterPanel>
      <NerveCenterPanel title="TREND_GRAPH" accent="purple">
        <BarChart count={14} />
      </NerveCenterPanel>
      <NerveCenterPanel title="LOAD_METRIC" accent="cyan">
        <StatusRows rows={[
          { led: 'green', label: 'CPU', value: '34%' },
          { led: 'amber', label: 'MEM', value: '67%' },
          { led: 'green', label: 'NET', value: 'OK' },
          { led: 'green', label: 'I/O', value: '12mb' },
        ]} />
      </NerveCenterPanel>
    </div>
  );
}