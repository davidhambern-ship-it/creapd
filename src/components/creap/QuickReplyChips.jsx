import React from 'react';
import { motion } from 'framer-motion';
import { useCREAPMode } from '@/context/CREAPModeContext';
import { CREAP_MODES } from '@/lib/creapdPersonality';

const SUGGESTIONS = {
  news: {
    [CREAP_MODES.AUTOPILOT]: ["Sift today's stories", 'Build my rundown', 'Generate packages for top stories'],
    [CREAP_MODES.HYBRID]: ["What's in the queue?", 'Sift new stories', 'Help me pick leads', 'Build a package'],
    [CREAP_MODES.FREE]: ['Search stories', 'Generate briefing'],
  },
  spiritual: {
    [CREAP_MODES.AUTOPILOT]: ["Build today's message", 'Find scripture on faith', 'Generate voiceovers'],
    [CREAP_MODES.HYBRID]: ['Search the library', 'Find a topic', 'Help me outline a message', 'Study a word'],
    [CREAP_MODES.FREE]: ['Search library', 'Find scripture'],
  },
  talk: {
    [CREAP_MODES.AUTOPILOT]: ['Build the rundown', 'Research guests', 'Generate talking points'],
    [CREAP_MODES.HYBRID]: ['Find a topic', 'Research a guest', 'Build a segment'],
    [CREAP_MODES.FREE]: ['Search topics', 'Find a guest'],
  },
  music: {
    [CREAP_MODES.AUTOPILOT]: ['Build the playlist', 'Find trending tracks', 'Generate the rundown'],
    [CREAP_MODES.HYBRID]: ['Find a topic', 'Build a playlist', 'Research music news'],
    [CREAP_MODES.FREE]: ['Search topics'],
  },
  cooking: {
    [CREAP_MODES.AUTOPILOT]: ['Build the rundown', 'Find recipes', 'Generate segments'],
    [CREAP_MODES.HYBRID]: ['Find a recipe', 'Research techniques', 'Build a segment'],
    [CREAP_MODES.FREE]: ['Search recipes'],
  },
  sports: {
    [CREAP_MODES.AUTOPILOT]: ['Build the rundown', 'Research matchups', 'Generate talking points'],
    [CREAP_MODES.HYBRID]: ['Find games', 'Research athletes', 'Build a segment'],
    [CREAP_MODES.FREE]: ['Search games'],
  },
  cosmo: {
    [CREAP_MODES.AUTOPILOT]: ['Build the rundown', 'Find trending topics', 'Generate segments'],
    [CREAP_MODES.HYBRID]: ['Find a topic', 'Research trends', 'Build a segment'],
    [CREAP_MODES.FREE]: ['Search topics'],
  },
};

export default function QuickReplyChips({ onSelect }) {
  const { mode, profile } = useCREAPMode();
  const chips = SUGGESTIONS[profile]?.[mode] || SUGGESTIONS.news[CREAP_MODES.HYBRID];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <motion.button
          key={chip}
          initial={{ opacity: 0, scale: 0.8, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.04, duration: 0.2 }}
          onClick={() => onSelect(chip)}
          className="px-2.5 py-1 rounded-full text-[11px] bg-white/[0.04] border border-white/[0.08] hover:bg-primary/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors"
        >
          {chip}
        </motion.button>
      ))}
    </div>
  );
}