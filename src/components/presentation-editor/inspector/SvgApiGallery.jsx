import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from './shared';
import { Loader2, Search, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const FEATURED_ICONS = [
  { id: '75320', slug: 'rio', title: 'Rio' },
  { id: '21894', slug: 'rose', title: 'Rose' },
  { id: '10456', slug: 'iron', title: 'Iron' },
  { id: '59919', slug: 'bike', title: 'Bike' },
  { id: '161688', slug: 'silo', title: 'Silo' },
  { id: '152279', slug: 'molar', title: 'Molar' },
  { id: '90841', slug: 'flour', title: 'Flour' },
  { id: '141850', slug: 'squid', title: 'Squid' },
  { id: '48214', slug: 'nurse', title: 'Nurse' },
  { id: '8023', slug: 'image', title: 'Image' },
  { id: '37669', slug: 'onion', title: 'Onion' },
  { id: '166903', slug: 'arrow', title: 'Arrow' },
  { id: '57170', slug: 'house', title: 'House' },
  { id: '25522', slug: 'geisha', title: 'Geisha' },
];

const buildUrl = (icon) => `https://cdn.svgapi.com/vector/${icon.id}/${icon.slug}.svg`;

export default function SvgApiGallery({ onInsert }) {
  const [selected, setSelected] = useState(null);
  const [inserting, setInserting] = useState(false);
  const [error, setError] = useState(null);
  const [customUrl, setCustomUrl] = useState('');

  const insert = async (icon) => {
    setInserting(true);
    setError(null);
    try {
      const url = buildUrl(icon);
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch failed');
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const file = new File([blob], `svgapi-${icon.slug}.svg`, { type: 'image/svg+xml' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onInsert(file_url);
      setSelected(null);
    } catch (err) {
      setError(err.message || 'Failed to insert');
    } finally {
      setInserting(false);
    }
  };

  const insertCustom = async () => {
    if (!customUrl.trim()) return;
    setInserting(true);
    setError(null);
    try {
      const res = await fetch(customUrl.trim());
      if (!res.ok) throw new Error('Fetch failed');
      const svgText = await res.text();
      if (!svgText.includes('<svg')) throw new Error('Not a valid SVG');
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const file = new File([blob], `custom-svg-${Date.now()}.svg`, { type: 'image/svg+xml' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onInsert(file_url);
      setCustomUrl('');
    } catch (err) {
      setError(err.message || 'Failed to insert');
    } finally {
      setInserting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1 max-h-40 overflow-y-auto">
        {FEATURED_ICONS.map(icon => (
          <button key={icon.id}
            onClick={() => setSelected(icon)}
            className={`flex flex-col items-center gap-0.5 aspect-square rounded-md border p-1 transition ${
              selected?.id === icon.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/30 hover:bg-muted/50'
            }`}>
            <img src={buildUrl(icon)} alt={icon.title} className="w-8 h-8" />
            <span className="text-[8px] text-muted-foreground truncate w-full text-center">{icon.title}</span>
          </button>
        ))}
      </div>

      <Field label="Or paste SVGAPI CDN URL">
        <div className="flex gap-1">
          <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="https://cdn.svgapi.com/vector/..."
            className="flex-1 text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8" />
          <Button variant="outline" size="sm" className="h-8 text-[10px] px-2" disabled={inserting || !customUrl.trim()} onClick={insertCustom}>
            {inserting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          </Button>
        </div>
      </Field>

      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {selected && (
        <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
          <img src={buildUrl(selected)} alt={selected.title} className="w-8 h-8" />
          <span className="text-[10px] text-muted-foreground flex-1 truncate">{selected.title}</span>
          <Button variant="default" size="sm" className="h-7 text-[10px]" disabled={inserting} onClick={() => insert(selected)}>
            {inserting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {inserting ? '...' : 'Insert'}
          </Button>
        </div>
      )}
    </div>
  );
}