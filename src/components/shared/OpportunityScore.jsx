import React from 'react';
import { Star } from 'lucide-react';

export default function OpportunityScore({ score, size = 'sm' }) {
  const s = Math.round(score || 0);
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${starSize} ${i <= s ? 'text-berna-orange fill-berna-orange' : 'text-white/10'}`}
        />
      ))}
    </div>
  );
}