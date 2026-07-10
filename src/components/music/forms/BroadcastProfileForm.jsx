import React from 'react';
import { Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormInsert, FieldLabel, inputClass } from './shared';

export default function BroadcastProfileForm({ config, updateConfig, highlighted, style }) {
  const accent = '#FF6B00';
  const isComplete = !!(config.live_or_recorded && config.total_show_runtime);

  return (
    <FormInsert
      title="Broadcast Profile"
      icon={Radio}
      accent={accent}
      isComplete={isComplete}
      highlighted={highlighted}
      delay={0.15}
      style={style}
    >
      <div className="space-y-1.5">
        <div>
          <FieldLabel accent={accent}>Live or Recorded</FieldLabel>
          <Select value={config.live_or_recorded || 'live'} onValueChange={v => updateConfig('live_or_recorded', v)}>
            <SelectTrigger className={`${inputClass} border-white/10`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="recorded">Recorded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel accent={accent}>Runtime (min)</FieldLabel>
          <Input type="number" value={config.total_show_runtime || ''} onChange={e => updateConfig('total_show_runtime', Number(e.target.value))} placeholder="120" className={inputClass} />
        </div>
        <div>
          <FieldLabel accent={accent}>Schedule</FieldLabel>
          <Input type="time" value={config.show_start_time || ''} onChange={e => updateConfig('show_start_time', e.target.value)} className={inputClass} />
        </div>
        <div className="space-y-1 pt-1">
          <FieldLabel accent={accent}>Broadcast Options</FieldLabel>
          <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
            <span className="text-[9px] text-gray-300">Throwbacks</span>
            <Switch checked={config.include_throwbacks} onCheckedChange={v => updateConfig('include_throwbacks', v)} />
          </div>
          <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
            <span className="text-[9px] text-gray-300">New Releases</span>
            <Switch checked={config.include_new_releases} onCheckedChange={v => updateConfig('include_new_releases', v)} />
          </div>
          <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
            <span className="text-[9px] text-gray-300">Indie</span>
            <Switch checked={config.include_indie} onCheckedChange={v => updateConfig('include_indie', v)} />
          </div>
        </div>
      </div>
    </FormInsert>
  );
}