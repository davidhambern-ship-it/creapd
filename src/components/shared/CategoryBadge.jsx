import React from 'react';

const categoryColors = {
  ai_business: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  manufacturing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  reshoring: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  supply_chain: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  state_economy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  small_business: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  entrepreneurship: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  skilled_trades: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  hiring: 'bg-lime-500/10 text-lime-400 border-lime-500/20',
  food_agriculture: 'bg-green-500/10 text-green-400 border-green-500/20',
  creator_economy: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  infrastructure: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  science: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  technology: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  general: 'bg-white/5 text-gray-400 border-white/10',
};

const categoryLabels = {
  ai_business: 'AI & Business',
  manufacturing: 'Manufacturing',
  reshoring: 'Reshoring',
  supply_chain: 'Supply Chain',
  state_economy: 'State Economy',
  small_business: 'Small Business',
  entrepreneurship: 'Entrepreneurship',
  skilled_trades: 'Skilled Trades',
  hiring: 'Hiring',
  food_agriculture: 'Food & Agriculture',
  creator_economy: 'Creator Economy',
  infrastructure: 'Infrastructure',
  science: 'Science',
  technology: 'Technology',
  general: 'General',
};

export default function CategoryBadge({ category }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${categoryColors[category] || categoryColors.general}`}>
      {categoryLabels[category] || category}
    </span>
  );
}