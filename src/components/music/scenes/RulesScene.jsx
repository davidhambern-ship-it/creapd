import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import NeonChip from '@/components/music/NeonChip';
import { ENERGY_FLOW_OPTIONS } from '@/lib/musicConstants';

export default function RulesScene({ config, updateConfig }) {
  return (
    <div className="cp-glass p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Must-Play Songs</Label>
          <Textarea value={config.must_play_songs} onChange={e => updateConfig('must_play_songs', e.target.value)} placeholder="Song - Artist (one per line)" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Blocked Songs</Label>
          <Textarea value={config.blocked_songs} onChange={e => updateConfig('blocked_songs', e.target.value)} placeholder="One per line" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Blocked Artists</Label>
          <Textarea value={config.blocked_artists} onChange={e => updateConfig('blocked_artists', e.target.value)} placeholder="One per line" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Recently Played (avoid)</Label>
          <Textarea value={config.recently_played_songs} onChange={e => updateConfig('recently_played_songs', e.target.value)} placeholder="One per line" rows={2} className="bg-black/40 border-white/10 text-white text-xs placeholder-gray-600 resize-none" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Max Songs Per Artist</Label>
          <Input type="number" value={config.max_songs_per_artist} onChange={e => updateConfig('max_songs_per_artist', Number(e.target.value))} className="bg-black/40 border-white/10 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Preferred Eras</Label>
          <Input value={config.preferred_eras} onChange={e => updateConfig('preferred_eras', e.target.value)} placeholder="90s, 2000s, 2010s" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-300">Energy Flow</Label>
        <div className="flex flex-wrap gap-1.5">
          {ENERGY_FLOW_OPTIONS.map(opt => (
            <NeonChip key={opt} label={opt} active={config.playlist_energy_flow === opt} onClick={() => updateConfig('playlist_energy_flow', opt)} color="pink" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        {[
          ['min_artist_variety', 'Min Artist Variety'],
          ['include_indie', 'Include Indie'],
          ['include_local', 'Include Local'],
          ['include_new_releases', 'New Releases'],
          ['include_throwbacks', 'Throwbacks'],
          ['clean_only', 'Clean Only'],
        ].map(([field, label]) => (
          <div key={field} className="flex items-center justify-between bg-black/30 rounded-lg px-3 py-2 border border-white/5">
            <span className="text-[11px] text-gray-300">{label}</span>
            <Switch checked={config[field]} onCheckedChange={v => updateConfig(field, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}