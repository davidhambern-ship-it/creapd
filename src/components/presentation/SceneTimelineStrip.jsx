import React, { useMemo } from 'react';

const SCENE_COLORS = [
  'hsl(270 80% 60%)',
  'hsl(25 95% 55%)',
  'hsl(152 60% 45%)',
  'hsl(190 80% 55%)',
  'hsl(45 95% 55%)',
  'hsl(300 80% 60%)',
];

const ELEMENT_TYPE_ICONS = {
  headline: 'H',
  body_text: '¶',
  callout: '◆',
  statistic: '#',
  quote: '"',
  lower_third: '▤',
  icon: '✦',
  image: '▣',
};

function formatSec(ms) {
  const s = ms / 1000;
  return `${s.toFixed(1)}s`;
}

export default function SceneTimelineStrip({ sceneGraph, sentenceTimeline, slideLocalTime, totalDurationMs, audioStarted }) {
  const scenes = useMemo(() => {
    if (!sceneGraph?.scenes) return [];
    return sceneGraph.scenes;
  }, [sceneGraph]);

  const sentences = useMemo(() => {
    if (!sentenceTimeline) return [];
    return sentenceTimeline;
  }, [sentenceTimeline]);

  const totalMs = totalDurationMs || (scenes.length > 0 ? scenes[scenes.length - 1].scene_end_time : 0);

  if (scenes.length === 0) return null;

  // Find current scene
  const currentScene = scenes.find(s => {
    const start = s.scene_start_time || 0;
    const end = s.scene_end_time || 999999;
    return slideLocalTime >= start && slideLocalTime <= end;
  });

  return (
    <div className="bg-card rounded-lg border border-border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Scene Timeline</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className={`w-2 h-2 rounded-full ${audioStarted ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
          {audioStarted ? 'Audio Playing' : 'Audio Idle'}
          <span className="text-muted-foreground/50">|</span>
          <span className="font-mono">{formatSec(slideLocalTime)} / {formatSec(totalMs)}</span>
        </div>
      </div>

      {/* Time ruler */}
      <div className="relative h-5">
        <div className="absolute inset-0 flex items-end">
          {Array.from({ length: Math.ceil(totalMs / 1000) + 1 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center" style={{ minWidth: '20px' }}>
              <div className={`w-px ${i % 5 === 0 ? 'h-3 bg-muted-foreground/50' : 'h-1.5 bg-muted-foreground/20'}`} />
              {i % 5 === 0 && <span className="text-[8px] font-mono text-muted-foreground/60 mt-0.5">{i}s</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Scene bars */}
      <div className="relative flex gap-0.5 h-10">
        {scenes.map((scene, idx) => {
          const sceneStart = scene.scene_start_time || 0;
          const sceneEnd = scene.scene_end_time || totalMs;
          const sceneDur = sceneEnd - sceneStart;
          const widthPct = totalMs > 0 ? (sceneDur / totalMs) * 100 : 0;
          const isActive = currentScene?.scene_id === scene.scene_id;
          const color = SCENE_COLORS[idx % SCENE_COLORS.length];

          return (
            <div
              key={scene.scene_id}
              className={`relative rounded-md overflow-hidden transition-all ${isActive ? 'ring-2 ring-white/40' : 'opacity-70'}`}
              style={{ width: `${widthPct}%`, minWidth: '60px', background: `${color}22`, border: `1px solid ${color}55` }}
            >
              <div className="absolute inset-0 flex flex-col p-1">
                <div className="text-[8px] font-mono font-bold truncate" style={{ color }}>
                  S{scene.scene_order} · {scene.scene_type}
                </div>
                <div className="text-[7px] font-mono text-muted-foreground truncate">
                  {formatSec(sceneStart)}–{formatSec(sceneEnd)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Element timeline within scenes */}
      <div className="space-y-1">
        {scenes.map((scene, sceneIdx) => {
          const sceneStart = scene.scene_start_time || 0;
          const sceneEnd = scene.scene_end_time || totalMs;
          const sceneDur = sceneEnd - sceneStart;
          const color = SCENE_COLORS[sceneIdx % SCENE_COLORS.length];
          const allElements = (scene.layers || []).flatMap(l => l.elements || []);

          return (
            <div key={scene.scene_id} className="flex items-center gap-2">
              <div className="w-20 flex-shrink-0 text-right">
                <span className="text-[9px] font-mono text-muted-foreground">Scene {scene.scene_order}</span>
              </div>
              <div className="relative flex-1 h-6 bg-muted/30 rounded">
                {/* Scene boundary markers */}
                <div className="absolute inset-y-0 left-0 w-px bg-border" />
                <div className="absolute inset-y-0 right-0 w-px bg-border" />

                {/* Current time indicator */}
                {slideLocalTime >= sceneStart && slideLocalTime <= sceneEnd && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-primary z-20"
                    style={{ left: `${((slideLocalTime - sceneStart) / sceneDur) * 100}%` }}
                  >
                    <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                  </div>
                )}

                {/* Elements within scene */}
                {allElements.map((elem) => {
                  const evt = elem.timeline_events?.[0];
                  if (!evt) return null;
                  const elemStart = Math.max(evt.start_time || 0, sceneStart);
                  const elemEnd = Math.min(evt.end_time || sceneEnd, sceneEnd);
                  const elemDur = elemEnd - elemStart;
                  const leftPct = ((elemStart - sceneStart) / sceneDur) * 100;
                  const widthPct = (elemDur / sceneDur) * 100;
                  const isIcon = elem.element_type === 'icon' || elem.element_type === 'chart' || elem.element_type === 'logo';
                  if (isIcon) return null; // Hidden by PresentationElement

                  const isCurrentlyVisible = slideLocalTime >= elemStart && slideLocalTime <= elemEnd;

                  return (
                    <div
                      key={elem.element_id}
                      className={`absolute top-0.5 bottom-0.5 rounded-sm flex items-center px-1 overflow-hidden transition-opacity ${isCurrentlyVisible ? 'opacity-100' : 'opacity-40'}`}
                      style={{
                        left: `${leftPct}%`,
                        width: `${Math.max(widthPct, 2)}%`,
                        background: `${color}33`,
                        border: `1px solid ${color}88`,
                      }}
                      title={`${elem.element_type}: ${(elem.content || '').substring(0, 40)}`}
                    >
                      <span className="text-[8px] font-mono whitespace-nowrap" style={{ color: `${color}` }}>
                        {ELEMENT_TYPE_ICONS[elem.element_type] || '•'} {elem.entrance_animation?.type || 'fade'}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="w-10 flex-shrink-0 text-[8px] font-mono text-muted-foreground text-right">
                {formatSec(sceneDur)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Audio sentence markers */}
      {sentences.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-20 flex-shrink-0 text-right">
              <span className="text-[9px] font-mono text-muted-foreground/60">Audio</span>
            </div>
            <div className="relative flex-1 h-4 bg-muted/20 rounded">
              {sentences.map((sent, idx) => {
                const leftPct = totalMs > 0 ? (sent.start_time * 1000 / totalMs) * 100 : 0;
                const widthPct = totalMs > 0 ? ((sent.end_time - sent.start_time) * 1000 / totalMs) * 100 : 0;
                const isCurrent = slideLocalTime >= sent.start_time * 1000 && slideLocalTime <= sent.end_time * 1000;
                return (
                  <div
                    key={sent.sentence_id}
                    className={`absolute top-0 bottom-0 rounded-sm flex items-center px-1 overflow-hidden ${isCurrent ? 'bg-green-500/30 border border-green-400' : 'bg-muted/40'}`}
                    style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1)}%` }}
                    title={sent.sentence_text}
                  >
                    <span className="text-[7px] font-mono truncate text-muted-foreground">
                      {sent.sentence_text.substring(0, 30)}...
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-10 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[8px] text-muted-foreground">
        <span className="font-mono">H=headline</span>
        <span className="font-mono">¶=body</span>
        <span className="font-mono">◆=callout</span>
        <span className="font-mono">#=stat</span>
        <span className="font-mono">"=quote</span>
        <span className="font-mono">▤=lower3rd</span>
        <span className="text-orange-400">⚠ Icons/charts are hidden in renderer</span>
      </div>

      {/* Timing issues detected */}
      <TimingIssues scenes={scenes} sentences={sentences} totalMs={totalMs} />
    </div>
  );
}

function TimingIssues({ scenes, sentences, totalMs }) {
  const issues = [];

  // Check: does last sentence extend beyond scene timeline?
  if (sentences.length > 0) {
    const lastSentEnd = sentences[sentences.length - 1].end_time * 1000;
    if (lastSentEnd > totalMs) {
      issues.push({
        severity: 'error',
        message: `Audio sentence timeline ends at ${(lastSentEnd / 1000).toFixed(1)}s but slide duration is ${(totalMs / 1000).toFixed(1)}s — last sentence will be cut off!`,
      });
    }
  }

  // Check: any scene shorter than 3 seconds?
  scenes.forEach((scene) => {
    const dur = (scene.scene_end_time || 0) - (scene.scene_start_time || 0);
    if (dur < 3000) {
      issues.push({
        severity: 'warning',
        message: `Scene ${scene.scene_order} (${scene.scene_type}) is only ${(dur / 1000).toFixed(1)}s — may be too short for elements to animate in.`,
      });
    }
  });

  // Check: elements with very short visible windows
  scenes.forEach((scene) => {
    const allElements = (scene.layers || []).flatMap(l => l.elements || []);
    allElements.forEach((elem) => {
      const evt = elem.timeline_events?.[0];
      if (!evt) return;
      const dur = (evt.end_time || 0) - (evt.start_time || 0);
      if (dur > 0 && dur < 1500) {
        issues.push({
          severity: 'warning',
          message: `Element "${(elem.content || '').substring(0, 30)}..." is visible for only ${(dur / 1000).toFixed(1)}s (${elem.element_type} in Scene ${(scene.scene_order)}).`,
        });
      }
    });
  });

  // Check: elements with start_time after scene end
  scenes.forEach((scene) => {
    const allElements = (scene.layers || []).flatMap(l => l.elements || []);
    allElements.forEach((elem) => {
      const evt = elem.timeline_events?.[0];
      if (!evt) return;
      if ((evt.start_time || 0) > (scene.scene_end_time || 999999)) {
        issues.push({
          severity: 'error',
          message: `Element "${(elem.content || '').substring(0, 30)}..." starts at ${(evt.start_time / 1000).toFixed(1)}s but its scene ends at ${((scene.scene_end_time || 0) / 1000).toFixed(1)}s — will never appear!`,
        });
      }
    });
  });

  if (issues.length === 0) return null;

  return (
    <div className="pt-2 border-t border-border space-y-1">
      <div className="text-[9px] font-semibold text-muted-foreground">⚠ Timing Issues Detected</div>
      {issues.map((issue, idx) => (
        <div
          key={idx}
          className={`text-[9px] font-mono flex items-start gap-1.5 ${issue.severity === 'error' ? 'text-red-400' : 'text-orange-400'}`}
        >
          <span>{issue.severity === 'error' ? '✖' : '⚠'}</span>
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}