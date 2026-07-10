import React from 'react';
import { ListMusic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { GENRE_OPTIONS, MOOD_OPTIONS, ENERGY_FLOW_OPTIONS } from '@/lib/musicConstants';
import { FormInsert, FieldLabel, NeonChip, inputClass, safeParse } from './shared';

export default function PlaylistRulesForm({ config, updateConfig, toggleArrayItem, highlighted, style }) {
  const accent = '#8B5CF6';
  const selectedGenres = safeParse(config.genres, []);
  const selectedMoods = safeParse(config.moods, []);
  const isComplete = selectedGenres.length > 0;

  return (
    <FormInsert
      title="Playlist Rules"
      icon={ListMusic}
      accent={accent}
      isComplete={isComplete}
      highlighted={highlighted}
      delay={0.2}
      style={style}
    >
      <div className="space-y-1.5">
        <div>
          <FieldLabel accent={accent}>Genre ({selectedGenres.length})</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {GENRE_OPTIONS.map(opt => (
              <NeonChip key={opt} label={opt} active={selectedGenres.includes(opt)} onClick={() => toggleArrayItem('genres', opt)} color={accent} />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel accent={accent}>Mood ({selectedMoods.length})</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {MOOD_OPTIONS.map(opt => (
              <NeonChip key={opt} label={opt} active={selectedMoods.includes(opt)} onClick={() => toggleArrayItem('moods', opt)} color={accent} />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel accent={accent}>Energy Flow</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {ENERGY_FLOW_OPTIONS.map(opt => (
              <NeonChip key={opt} label={opt} active={config.playlist_energy_flow === opt} onClick={() => updateConfig('playlist_energy_flow', opt)} color={accent} />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel accent={accent}>BPM Range</FieldLabel>
          <Input value={config.bpm || ''} onChange={e => updateConfig('bpm', e.target.value)} placeholder="e.g. 90-128" className={inputClass} />
        </div>
        <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
          <span className="text-[9px] text-gray-300">Clean Only</span>
          <Switch checked={config.clean_only} onCheckedChange={v => updateConfig('clean_only', v)} />
        </div>
        <div>
          <FieldLabel accent={accent}>Transition Style</FieldLabel>
          <Input value={config.transition_style || ''} onChange={e => updateConfig('transition_style', e.target.value)} placeholder="e.g. Crossfade, Cut" className={inputClass} />
        </div>
      </div>
    </FormInsert>
  );
}