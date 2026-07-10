import React from 'react';
import { Disc3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GENRE_OPTIONS } from '@/lib/musicConstants';
import { FormInsert, FieldLabel, NeonChip, inputClass, safeParse } from './shared';

export default function AlbumIdentityForm({ config, updateConfig, toggleArrayItem, highlighted, style }) {
  const accent = '#FF00FF';
  const selectedGenres = safeParse(config.genres, []);
  const isComplete = !!(config.production_name && config.show_date);

  return (
    <FormInsert
      title="Album Identity"
      icon={Disc3}
      accent={accent}
      isComplete={isComplete}
      highlighted={highlighted}
      delay={0.05}
      style={style}
    >
      <div className="space-y-1.5">
        <div>
          <FieldLabel accent={accent}>Show / Album Name</FieldLabel>
          <Input
            value={config.production_name || ''}
            onChange={e => updateConfig('production_name', e.target.value)}
            placeholder="Enter album title..."
            className={`${inputClass} text-sm font-bold`}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel accent={accent}>Release Date</FieldLabel>
            <Input type="date" value={config.show_date || ''} onChange={e => updateConfig('show_date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <FieldLabel accent={accent}>Drop Time</FieldLabel>
            <Input type="time" value={config.show_start_time || ''} onChange={e => updateConfig('show_start_time', e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <FieldLabel accent={accent}>Genre ({selectedGenres.length})</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {GENRE_OPTIONS.map(opt => (
              <NeonChip key={opt} label={opt} active={selectedGenres.includes(opt)} onClick={() => toggleArrayItem('genres', opt)} color={accent} />
            ))}
          </div>
        </div>
        <div>
          <FieldLabel accent={accent}>Theme</FieldLabel>
          <Input value={config.theme || ''} onChange={e => updateConfig('theme', e.target.value)} placeholder="e.g. Late Night Vibes" className={inputClass} />
        </div>
      </div>
    </FormInsert>
  );
}