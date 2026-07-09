import React from 'react';
import { Label } from '@/components/ui/label';
import NeonChip from '@/components/music/NeonChip';
import { MUSIC_TOPIC_OPTIONS, RESEARCH_SOURCE_OPTIONS } from '@/lib/musicConstants';

const safeParse = (str, fallback) => { if (!str) return fallback; try { return JSON.parse(str); } catch { return fallback; } };

export default function ContentScene({ config, toggleArrayItem }) {
  const selectedTopics = safeParse(config.music_topics, []);
  const selectedSources = safeParse(config.research_sources, []);

  return (
    <div className="cp-glass p-5 space-y-5">
      <div>
        <Label className="text-xs text-gray-300 mb-2 block">Music Topics <span className="text-gray-500">({selectedTopics.length})</span></Label>
        <div className="flex flex-wrap gap-1.5">
          {MUSIC_TOPIC_OPTIONS.map(opt => (
            <NeonChip key={opt} label={opt} active={selectedTopics.includes(opt)} onClick={() => toggleArrayItem('music_topics', opt)} color="orange" />
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs text-gray-300 mb-2 block">Research Sources <span className="text-gray-500">({selectedSources.length})</span></Label>
        <div className="flex flex-wrap gap-1.5">
          {RESEARCH_SOURCE_OPTIONS.map(opt => (
            <NeonChip key={opt} label={opt} active={selectedSources.includes(opt)} onClick={() => toggleArrayItem('research_sources', opt)} color="green" />
          ))}
        </div>
      </div>
    </div>
  );
}