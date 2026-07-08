import React from 'react';
import { InspectorShell, Group, Field, ColorField, SelectField, SliderField, pj } from './shared';


const ASPECT_RATIOS = ['16:9', '4:3', '9:16', '1:1'];
const THEMES = [
  { name: 'Dark Studio', bg: '#0a0a0a', primary: '#7c3aed', text: '#ffffff' },
  { name: 'Broadcast', bg: '#0c1a2e', primary: '#3b82f6', text: '#ffffff' },
  { name: 'Newsroom', bg: '#1a1a2e', primary: '#e94560', text: '#ffffff' },
  { name: 'Clean Light', bg: '#f8f9fa', primary: '#3b82f6', text: '#1a1a1a' },
];

export default function PresentationInspector({ presentation, onUpdate, zoom, onZoom }) {
  const theme = pj(presentation?.theme, {});
  const playback = pj(presentation?.playback_settings, {});

  const setTheme = (patch) => onUpdate({ theme: JSON.stringify({ ...theme, ...patch }) });
  const setPlayback = (patch) => onUpdate({ playback_settings: JSON.stringify({ ...playback, ...patch }) });

  return (
    <InspectorShell title="Presentation" badge={presentation?.production_profile} defaultValues={['theme']}>
      <Group value="theme" title="Theme & Palette">
        <div className="grid grid-cols-2 gap-1.5">
          {THEMES.map(t => (
            <button key={t.name} onClick={() => setTheme(t)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border hover:border-primary/50 transition-colors text-left">
              <div className="w-full h-8 rounded" style={{ background: t.bg, boxShadow: `inset 0 -3px 0 ${t.primary}` }} />
              <span className="text-[9px] text-muted-foreground truncate w-full">{t.name}</span>
            </button>
          ))}
        </div>
        <Field label="Primary Color"><ColorField value={theme.primary} onChange={(v) => setTheme({ primary: v })} /></Field>
        <Field label="Background"><ColorField value={theme.bg} onChange={(v) => setTheme({ bg: v })} /></Field>
      </Group>

      <Group value="typography" title="Typography">
        <Field label="Heading Font">
          <SelectField value={theme.fontHeading || 'Poppins'} options={['Poppins', 'Inter', 'Oswald', 'Bebas Neue']}
            onChange={(v) => setTheme({ fontHeading: v })} />
        </Field>
        <Field label="Body Font">
          <SelectField value={theme.fontBody || 'Inter'} options={['Inter', 'Poppins', 'Oswald']}
            onChange={(v) => setTheme({ fontBody: v })} />
        </Field>
      </Group>

      <Group value="canvas" title="Canvas & Size">
        <Field label="Aspect Ratio">
          <SelectField value={presentation?.aspect_ratio || '16:9'} options={ASPECT_RATIOS}
            onChange={(v) => onUpdate({ aspect_ratio: v })} />
        </Field>
        <Field label="Resolution">
          <SelectField value={playback.resolution || '1920x1080'} options={['1920x1080', '1280x720', '3840x2160']}
            onChange={(v) => setPlayback({ resolution: v })} />
        </Field>
      </Group>

      <Group value="grid" title="Grid & Guides">
        <SliderField label="Grid Size" value={theme.gridSize || 20} min={5} max={100}
          onChange={(v) => setTheme({ gridSize: v })} />
      </Group>

      <Group value="view" title="View">
        <SliderField label="Zoom" value={Math.round((zoom || 0.5) * 100)} min={20} max={200}
          onChange={(v) => onZoom(v / 100)} />
      </Group>
    </InspectorShell>
  );
}