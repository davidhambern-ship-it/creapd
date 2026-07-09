import React from 'react';
import { Label } from '@/components/ui/label';
import NeonChip from '@/components/music/NeonChip';
import { AI_AUTOMATION_OPTIONS } from '@/lib/musicConstants';

const safeParse = (str, fallback) => { if (!str) return fallback; try { return JSON.parse(str); } catch { return fallback; } };

export default function AutomationScene({ config, toggleArrayItem }) {
  const selectedAutomation = safeParse(config.ai_automation, []);

  return (
    <div className="cp-glass p-5 space-y-4">
      <Label className="text-xs text-gray-300 block">
        What should CREAPD auto-generate? <span className="text-gray-500">({selectedAutomation.length} selected)</span>
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {AI_AUTOMATION_OPTIONS.map(opt => (
          <NeonChip key={opt.key} label={opt.label} active={selectedAutomation.includes(opt.key)} onClick={() => toggleArrayItem('ai_automation', opt.key)} color="green" />
        ))}
      </div>
    </div>
  );
}