import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AlbumIdentityForm from '@/components/music/forms/AlbumIdentityForm';
import HostInfoForm from '@/components/music/forms/HostInfoForm';
import BroadcastProfileForm from '@/components/music/forms/BroadcastProfileForm';
import PlaylistRulesForm from '@/components/music/forms/PlaylistRulesForm';
import LinerNotesForm from '@/components/music/forms/LinerNotesForm';

const ALBUM_COVER_URL = 'https://media.base44.com/images/public/6a4126962e5804304cc84b12/e419e47b4_generated_image.png';

const ROOM_TO_FORM = {
  identity: 'album_identity',
  runtime: 'broadcast',
  sound: 'playlist',
  rules: 'playlist',
  content: 'playlist',
  ai: null,
};

export default function VinylCoverForm({ room, config, updateConfig, toggleArrayItem, onBack }) {
  const highlightedForm = ROOM_TO_FORM[room] || null;

  return (
    <motion.div
      key="vinyl-cover"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors mb-4 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Deck
      </button>

      {/* ═══ Album Cover Workspace ═══ */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: 'min(640px, 94vw)',
          aspectRatio: '1 / 1',
          boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 60px rgba(255,0,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Album cover background image */}
        <img
          src={ALBUM_COVER_URL}
          alt="Album Cover"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(1.1) contrast(1.05)' }}
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} />

        {/* ═══ Independent Configuration Forms ═══ */}
        <div
          className="absolute inset-0 grid gap-2.5 p-3"
          style={{
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto 1fr 1fr',
          }}
        >
          <AlbumIdentityForm
            config={config}
            updateConfig={updateConfig}
            toggleArrayItem={toggleArrayItem}
            highlighted={highlightedForm === 'album_identity'}
            style={{ gridColumn: '1 / -1', gridRow: '1' }}
          />
          <HostInfoForm
            config={config}
            updateConfig={updateConfig}
            highlighted={highlightedForm === 'host'}
            style={{ gridColumn: '1', gridRow: '2' }}
          />
          <BroadcastProfileForm
            config={config}
            updateConfig={updateConfig}
            highlighted={highlightedForm === 'broadcast'}
            style={{ gridColumn: '2', gridRow: '2' }}
          />
          <PlaylistRulesForm
            config={config}
            updateConfig={updateConfig}
            toggleArrayItem={toggleArrayItem}
            highlighted={highlightedForm === 'playlist'}
            style={{ gridColumn: '1', gridRow: '3' }}
          />
          <LinerNotesForm
            config={config}
            updateConfig={updateConfig}
            highlighted={highlightedForm === 'liner'}
            style={{ gridColumn: '2', gridRow: '3' }}
          />
        </div>
      </div>
    </motion.div>
  );
}