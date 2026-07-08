import React from 'react';
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
          <button className="cpe-mini-btn h-8 justify-center" onClick={() => onAlign('left')} title="Align Left"><AlignStartVertical className="w-3.5 h-3.5" /></button>
          <button className="cpe-mini-btn h-8 justify-center" onClick={() => onAlign('center_h')} title="Align Center"><AlignCenterVertical className="w-3.5 h-3.5" /></button>
          <button className="cpe-mini-btn h-8 justify-center" onClick={() => onAlign('right')} title="Align Right"><AlignEndVertical className="w-3.5 h-3.5" /></button>
          <button className="cpe-mini-btn h-8 justify-center" onClick={() => onAlign('top')} title="Align Top"><AlignStartHorizontal className="w-3.5 h-3.5" /></button>
          <button className="cpe-mini-btn h-8 justify-center" onClick={() => onAlign('center_v')} title="Align Middle"><AlignCenterHorizontal className="w-3.5 h-3.5" /></button>
          <button className="cpe-mini-btn h-8 justify-center" onClick={() => onAlign('bottom')} title="Align Bottom"><AlignEndHorizontal className="w-3.5 h-3.5" /></button>
        </div>
      </Group>

      <Group value="distribute" title="Distribute">
        <div className="flex gap-1">
          <button className="cpe-mini-btn flex-1" onClick={() => onDistribute('h')}>
            <Columns2 className="w-3.5 h-3.5" /> Horizontal
          </button>
          <button className="cpe-mini-btn flex-1" onClick={() => onDistribute('v')}>
            <Rows2 className="w-3.5 h-3.5" /> Vertical
          </button>
        </div>
      </Group>

      <Group value="actions" title="Actions">
        <div className="flex gap-1">
          <button className="cpe-mini-btn flex-1" onClick={onDuplicate}><Copy className="w-3.5 h-3.5" /> Duplicate</button>
          <button className="cpe-mini-btn flex-1" style={{ color: 'hsl(0 60% 52%)' }} onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
        </div>
      </Group>
    </InspectorShell>
  );
}