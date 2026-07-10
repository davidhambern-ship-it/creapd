import React from 'react';
import { FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { FormInsert, FieldLabel } from './shared';

export default function LinerNotesForm({ config, updateConfig, highlighted, style }) {
  const accent = '#FFD700';
  const isComplete = !!config.show_description;

  return (
    <FormInsert
      title="Liner Notes"
      icon={FileText}
      accent={accent}
      isComplete={isComplete}
      highlighted={highlighted}
      delay={0.25}
      style={style}
    >
      <div className="space-y-1.5">
        <div>
          <FieldLabel accent={accent}>Description</FieldLabel>
          <Textarea
            value={config.show_description || ''}
            onChange={e => updateConfig('show_description', e.target.value)}
            placeholder="Describe your show like liner notes..."
            rows={2}
            className="bg-black/50 border-white/10 text-white text-[11px] placeholder-gray-600 resize-none"
          />
        </div>
        <div>
          <FieldLabel accent={accent}>Producer Notes</FieldLabel>
          <Textarea
            value={config.producer_notes || ''}
            onChange={e => updateConfig('producer_notes', e.target.value)}
            placeholder="Internal notes for the production team..."
            rows={2}
            className="bg-black/50 border-white/10 text-white text-[11px] placeholder-gray-600 resize-none"
          />
        </div>
        <div>
          <FieldLabel accent={accent}>Creative Direction</FieldLabel>
          <Textarea
            value={config.creative_direction || ''}
            onChange={e => updateConfig('creative_direction', e.target.value)}
            placeholder="Mood, pacing, references..."
            rows={2}
            className="bg-black/50 border-white/10 text-white text-[11px] placeholder-gray-600 resize-none"
          />
        </div>
      </div>
    </FormInsert>
  );
}