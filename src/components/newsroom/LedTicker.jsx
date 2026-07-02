import React from 'react';
import { Radio } from 'lucide-react';

const STATIC_SEGMENTS = [
  '72°F Partly Cloudy Atlanta GA',
  'DOW +0.8% NASDAQ +1.2% S&P 500 +0.5%',
  'Braves def Marlins 4-2 · Hawks preseason 7:30PM',
  'TRIVIA: The first news ticker debuted on NBC in 1928',
];

export default function LedTicker({ articles = [], breakingNews }) {
  const headlines = articles.slice(0, 12).map(a => a.title).filter(Boolean);
  const tickerItems = [...headlines, ...STATIC_SEGMENTS];

  return (
    <div className="relative bg-zinc-950 border-y border-amber-500/15 overflow-hidden h-9 flex items-center">
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center gap-1.5 px-3 bg-zinc-950">
        {breakingNews && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        <Radio className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-mono text-amber-400 font-bold tracking-widest uppercase">LIVE</span>
      </div>
      <div className="absolute left-[88px] top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-950 to-transparent z-10" />
      <div className="flex items-center pl-28">
        <div className="flex gap-6 animate-ticker whitespace-nowrap">
          {tickerItems.concat(tickerItems).map((item, i) => (
            <span key={i} className="text-[11px] font-mono text-amber-300/80 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-amber-500" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}