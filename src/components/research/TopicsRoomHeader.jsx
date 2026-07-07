import React from 'react';
import { Library, BookOpen } from 'lucide-react';

export default function TopicsRoomHeader({ topicCount = 0 }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
      style={{
        background: 'hsl(210 40% 5% / 0.6)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid hsl(190 30% 18% / 0.3)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: 'hsl(190 50% 15% / 0.3)',
            border: '1px solid hsl(190 40% 28% / 0.4)',
          }}
        >
          <Library className="w-4 h-4" style={{ color: 'hsl(190 80% 55%)' }} />
        </div>
        <div>
          <h1 className="text-sm font-heading font-semibold tracking-wide">The Library</h1>
          <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'hsl(190 60% 45%)' }}>
            Topics Department · Discovery Room
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'hsl(190 60% 45%)' }}>
        <BookOpen className="w-3 h-3" />
        <span>{topicCount} {topicCount === 1 ? 'Volume' : 'Volumes'} Catalogued</span>
      </div>
    </div>
  );
}