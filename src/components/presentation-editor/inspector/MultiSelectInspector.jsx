import React from 'react';
import { Button } from '@/components/ui/button';
import { InspectorShell, Group } from './shared';
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Columns2, Rows2,
  Copy, Trash2,
} from 'lucide-react';

export default function MultiSelectInspector({ count, onAlign, onDistribute, onDuplicate, onDelete }) {
  return (
    <InspectorShell title="Multiple" badge={`${count} selected`} defaultValues={['align']}>
      <Group value="align" title="Align" defaultOpen>
        <div className="grid grid-cols-3 gap-1">
          <Button variant="outline" size="sm" className="h-8" onClick={() => onAlign('left')} title="Align Left"><AlignStartVertical className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onAlign('center_h')} title="Align Center"><AlignCenterVertical className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onAlign('right')} title="Align Right"><AlignEndVertical className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onAlign('top')} title="Align Top"><AlignStartHorizontal className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onAlign('center_v')} title="Align Middle"><AlignCenterHorizontal className="w-3.5 h-3.5" /></Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => onAlign('bottom')} title="Align Bottom"><AlignEndHorizontal className="w-3.5 h-3.5" /></Button>
        </div>
      </Group>

      <Group value="distribute" title="Distribute">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]" onClick={() => onDistribute('h')}>
            <Columns2 className="w-3.5 h-3.5" /> Horizontal
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]" onClick={() => onDistribute('v')}>
            <Rows2 className="w-3.5 h-3.5" /> Vertical
          </Button>
        </div>
      </Group>

      <Group value="actions" title="Actions">
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px]" onClick={onDuplicate}><Copy className="w-3.5 h-3.5" /> Duplicate</Button>
          <Button variant="outline" size="sm" className="flex-1 h-8 text-[10px] text-destructive" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
        </div>
      </Group>
    </InspectorShell>
  );
}