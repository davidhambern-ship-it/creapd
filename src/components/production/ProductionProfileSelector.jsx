import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PROFILE_COLORS = {
  'berna-purple': 'from-berna-purple to-purple-600 hover:to-purple-500',
  'berna-orange': 'from-berna-orange to-orange-500 hover:to-orange-400',
  'berna-emerald': 'from-berna-emerald to-emerald-500 hover:to-emerald-400',
  'berna-navy': 'from-berna-navy to-blue-600 hover:to-blue-500',
};

const ICON_MAP = {
  'newspaper': '📰',
  'mic': '🎙️',
  'radio': '📻',
  'music': '🎵',
  'chef-hat': '👨‍🍳',
  'trophy': '🏆',
  'message-circle': '💬',
  'video': '📹',
  'church': '⛪',
  'graduation-cap': '🎓',
  'briefcase': '💼',
  'gamepad-2': '🎮',
  'settings': '⚙️',
};

export default function ProductionProfileSelector({ profiles, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass-panel max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card/95 backdrop-blur z-10 border-b border-white/10 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white font-display">What are we producing today?</h2>
            <p className="text-sm text-muted-foreground mt-1">Choose a production type to get started</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map(profile => (
            <button
              key={profile.id}
              onClick={() => onSelect(profile)}
              className={`relative group p-5 rounded-xl bg-gradient-to-br ${PROFILE_COLORS[profile.color] || PROFILE_COLORS['berna-purple']} 
                transition-all duration-200 hover:scale-[1.02] hover:shadow-lg text-left`}
            >
              <div className="absolute top-3 right-3 text-2xl opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                {ICON_MAP[profile.icon] || '📺'}
              </div>
              <div className="pr-10">
                <h3 className="text-lg font-bold text-white mb-1">{profile.profile_name}</h3>
                <p className="text-xs text-white/80 leading-relaxed">{profile.description}</p>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-white/70 bg-white/10 px-2 py-1 rounded">
                  {profile.item_type_label_plural}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-white/10 p-4 text-center text-xs text-muted-foreground">
          You can customize production profiles anytime in Settings → Production Profiles
        </div>
      </div>
    </div>
  );
}