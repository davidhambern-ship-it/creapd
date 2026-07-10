import React from 'react';
import { Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { FormInsert, FieldLabel, inputClass } from './shared';

export default function HostInfoForm({ config, updateConfig, highlighted, style }) {
  const accent = '#00FFFF';
  const isComplete = !!config.host_name;

  return (
    <FormInsert
      title="Host Information"
      icon={Mic}
      accent={accent}
      isComplete={isComplete}
      highlighted={highlighted}
      delay={0.1}
      style={style}
    >
      <div className="space-y-1.5">
        <div>
          <FieldLabel accent={accent}>Host / Artist</FieldLabel>
          <Input value={config.host_name || ''} onChange={e => updateConfig('host_name', e.target.value)} placeholder="DJ name..." className={inputClass} />
        </div>
        <div>
          <FieldLabel accent={accent}>Co-Host / Featured</FieldLabel>
          <Input value={config.co_host_name || ''} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional..." className={inputClass} />
        </div>
        <div>
          <FieldLabel accent={accent}>Station / Label</FieldLabel>
          <Input value={config.station_name || ''} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Station name..." className={inputClass} />
        </div>
        <div>
          <FieldLabel accent={accent}>Voice Profile</FieldLabel>
          <Input value={config.voice || ''} onChange={e => updateConfig('voice', e.target.value)} placeholder="e.g. Warm Baritone" className={inputClass} />
        </div>
      </div>
    </FormInsert>
  );
}