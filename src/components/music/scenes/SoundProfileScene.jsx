import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import NeonChip from '@/components/music/NeonChip';
import { GENRE_OPTIONS, MOOD_OPTIONS, TONE_OPTIONS } from '@/lib/musicConstants';

const safeParse = (str, fallback) => { if (!str) return fallback; try { return JSON.parse(str); } catch { return fallback; } };

export default function SoundProfileScene({ config, updateConfig, toggleArrayItem }) {
  const [customField, setCustomField] = useState(null);
  const [customInput, setCustomInput] = useState('');

  const selectedGenres = safeParse(config.genres, []);
  const selectedMoods = safeParse(config.moods, []);

  const handleAddCustom = (field) => {
    if (customInput.trim()) {
      toggleArrayItem(field, customInput.trim());
      setCustomInput('');
    }
  };

  return (
    <div className="cp-glass p-5 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-gray-300">Genres <span className="text-gray-500">({selectedGenres.length})</span></Label>
          <button onClick={() => setCustomField(customField === 'genres' ? null : 'genres')} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Custom
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GENRE_OPTIONS.map(opt => (
            <NeonChip key={opt} label={opt} active={selectedGenres.includes(opt)} onClick={() => toggleArrayItem('genres', opt)} color="purple" />
          ))}
        </div>
        {customField === 'genres' && (
          <div className="flex gap-2 mt-2">
            <Input value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom('genres'))} placeholder="Custom genre..." className="bg-black/40 border-white/10 text-white text-xs h-8 max-w-[200px]" />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleAddCustom('genres')}>Add</Button>
          </div>
        )}
        {selectedGenres.filter(g => !GENRE_OPTIONS.includes(g)).map(g => (
          <div key={g} className="inline-flex items-center gap-1 mt-1 ml-1">
            <NeonChip label={g} active={true} onClick={() => toggleArrayItem('genres', g)} color="purple" />
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs text-gray-300">Moods <span className="text-gray-500">({selectedMoods.length})</span></Label>
          <button onClick={() => setCustomField(customField === 'moods' ? null : 'moods')} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Custom
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_OPTIONS.map(opt => (
            <NeonChip key={opt} label={opt} active={selectedMoods.includes(opt)} onClick={() => toggleArrayItem('moods', opt)} color="pink" />
          ))}
        </div>
        {customField === 'moods' && (
          <div className="flex gap-2 mt-2">
            <Input value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustom('moods'))} placeholder="Custom mood..." className="bg-black/40 border-white/10 text-white text-xs h-8 max-w-[200px]" />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleAddCustom('moods')}>Add</Button>
          </div>
        )}
      </div>
      <div>
        <Label className="text-xs text-gray-300 mb-2 block">Show Tone <span className="text-gray-500">(pick one)</span></Label>
        <div className="flex flex-wrap gap-1.5">
          {TONE_OPTIONS.map(opt => (
            <NeonChip key={opt} label={opt} active={config.show_tone === opt} onClick={() => updateConfig('show_tone', opt)} color="cyan" />
          ))}
        </div>
      </div>
    </div>
  );
}