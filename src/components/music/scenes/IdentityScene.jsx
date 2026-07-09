import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function IdentityScene({ config, updateConfig }) {
  return (
    <div className="cp-glass p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Production Name *</Label>
          <Input value={config.production_name} onChange={e => updateConfig('production_name', e.target.value)} placeholder="Morning Beats" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Host Name</Label>
          <Input value={config.host_name} onChange={e => updateConfig('host_name', e.target.value)} placeholder="DJ Berna" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Co-Host</Label>
          <Input value={config.co_host_name} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Station / Channel</Label>
          <Input value={config.station_name} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Beat Radio" className="bg-black/40 border-white/10 text-white placeholder-gray-600" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Show Date *</Label>
          <Input type="date" value={config.show_date} onChange={e => updateConfig('show_date', e.target.value)} className="bg-black/40 border-white/10 text-white" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-300">Start Time</Label>
          <Input type="time" value={config.show_start_time} onChange={e => updateConfig('show_start_time', e.target.value)} className="bg-black/40 border-white/10 text-white" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs text-gray-300">Live or Recorded</Label>
          <Select value={config.live_or_recorded} onValueChange={v => updateConfig('live_or_recorded', v)}>
            <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="recorded">Recorded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-300">Show Description</Label>
        <Textarea value={config.show_description} onChange={e => updateConfig('show_description', e.target.value)} placeholder="Describe your show..." rows={2} className="bg-black/40 border-white/10 text-white placeholder-gray-600 resize-none" />
      </div>
    </div>
  );
}