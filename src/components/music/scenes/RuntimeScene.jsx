import React from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';

function RuntimeSlider({ label, value, onChange, max = 180, color = '#FF00FF' }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-gray-300">{label}</Label>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value} min</span>
      </div>
      <input
        type="range" min={0} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${(value/max)*100}%, rgba(255,255,255,0.1) ${(value/max)*100}%)` }}
      />
    </div>
  );
}

export default function RuntimeScene({ config, updateConfig }) {
  const total = config.total_show_runtime || 1;
  return (
    <div className="cp-glass p-5 space-y-4">
      <div className="flex h-3 rounded-full overflow-hidden mb-1">
        <motion.div animate={{ width: `${(config.intro_runtime/total)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
        <motion.div animate={{ width: `${(config.required_music_runtime/total)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF00FF' }} />
        <motion.div animate={{ width: `${(config.talk_segment_runtime/total)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#00FFFF' }} />
        <motion.div animate={{ width: `${(config.commercial_sponsor_runtime/total)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF6B00' }} />
        <motion.div animate={{ width: `${(config.outro_runtime/total)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400">
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#FFD700' }} />Intro</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#FF00FF' }} />Music</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#00FFFF' }} />Talk</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#FF6B00' }} />Sponsors</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RuntimeSlider label="Total Show" value={config.total_show_runtime} onChange={v => updateConfig('total_show_runtime', v)} max={240} color="#FFFFFF" />
        <RuntimeSlider label="Music Runtime" value={config.required_music_runtime} onChange={v => updateConfig('required_music_runtime', v)} max={240} color="#FF00FF" />
        <RuntimeSlider label="Talk Segments" value={config.talk_segment_runtime} onChange={v => updateConfig('talk_segment_runtime', v)} max={60} color="#00FFFF" />
        <RuntimeSlider label="Commercials" value={config.commercial_sponsor_runtime} onChange={v => updateConfig('commercial_sponsor_runtime', v)} max={30} color="#FF6B00" />
        <RuntimeSlider label="Intro" value={config.intro_runtime} onChange={v => updateConfig('intro_runtime', v)} max={10} color="#FFD700" />
        <RuntimeSlider label="Outro" value={config.outro_runtime} onChange={v => updateConfig('outro_runtime', v)} max={10} color="#FFD700" />
      </div>
    </div>
  );
}