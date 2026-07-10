import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Disc3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GENRE_OPTIONS, MOOD_OPTIONS, TONE_OPTIONS, MUSIC_TOPIC_OPTIONS,
  RESEARCH_SOURCE_OPTIONS, ENERGY_FLOW_OPTIONS, AI_AUTOMATION_OPTIONS
} from '@/lib/musicConstants';

const ALBUM_COVER_URL = 'https://media.base44.com/images/public/6a4126962e5804304cc84b12/e419e47b4_generated_image.png';

const ROOM_META = {
  identity:  { label: 'Album Identity',  accent: '#FF00FF' },
  runtime:   { label: 'Runtime Mix',     accent: '#00FFFF' },
  sound:     { label: 'Sound Profile',  accent: '#8B00FF' },
  content:   { label: 'Content Scope',  accent: '#FF6B00' },
  rules:     { label: 'Playlist Rules', accent: '#00FF88' },
  ai:        { label: 'AI Automation',  accent: '#FFD700' },
};

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function NeonChip({ label, active, onClick, color = '#FF00FF' }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -1 }}
      whileTap={{ scale: 0.92 }}
      animate={active ? { scale: 1.05, opacity: 1 } : { scale: 1, opacity: 0.55 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="px-2.5 py-1 rounded-md text-[11px] font-medium border backdrop-blur-sm"
      style={active ? {
        background: `${color}22`,
        borderColor: `${color}80`,
        color: color,
        boxShadow: `0 0 10px ${color}44, inset 0 0 6px ${color}18`,
      } : {
        background: 'rgba(0,0,0,0.4)',
        borderColor: 'rgba(255,255,255,0.08)',
        color: 'rgba(200,200,220,0.7)',
      }}
    >
      {label}
    </motion.button>
  );
}

function RuntimeSlider({ label, value, onChange, max = 180, color = '#FF00FF' }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-300">{label}</span>
        <span className="text-[10px] font-mono font-bold" style={{ color }}>{value}m</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{ background: `linear-gradient(to right, ${color} 0%, ${color} ${(value/max)*100}%, rgba(255,255,255,0.1) ${(value/max)*100}%)` }}
      />
    </div>
  );
}

/**
 * Zone wrapper — positions a form section over a blank space on the album cover.
 * Styled as a semi-transparent etched panel that blends with the artwork.
 */
function CoverZone({ children, style, accent, label, glow = true, gridMode = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={gridMode ? "relative" : "absolute"}
      style={style}
    >
      {label && (
        <div className="absolute -top-2 left-3 px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-[0.2em] z-10"
          style={{ background: 'rgba(8,6,12,0.95)', color: accent, border: `1px solid ${accent}44` }}
        >
          {label}
        </div>
      )}
      <div
        className="relative h-full rounded-lg overflow-hidden"
        style={{
          background: 'transparent',
          backdropFilter: 'none',
          border: `1px solid ${accent}33`,
          boxShadow: glow ? `0 0 24px ${accent}11, inset 0 1px 0 rgba(255,255,255,0.04)` : 'none',
        }}
      >
        {/* Neon corner accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l rounded-tl" style={{ borderColor: `${accent}66` }} />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r rounded-tr" style={{ borderColor: `${accent}66` }} />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l rounded-bl" style={{ borderColor: `${accent}66` }} />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r rounded-br" style={{ borderColor: `${accent}66` }} />

        <div className="p-3 h-full overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function FieldLabel({ children, accent }) {
  return <Label className="text-[10px] text-gray-400 mb-1 block" style={{ textShadow: `0 0 6px ${accent}22` }}>{children}</Label>;
}

const inputClass = "bg-black/50 border-white/10 text-white text-xs placeholder-gray-600 h-8";

export default function VinylCoverForm({
  room,
  config,
  updateConfig,
  toggleArrayItem,
  onBack,
}) {
  const meta = ROOM_META[room] || ROOM_META.identity;
  const accent = meta.accent;

  const selectedGenres = safeParse(config.genres, []);
  const selectedMoods = safeParse(config.moods, []);
  const selectedTopics = safeParse(config.music_topics, []);
  const selectedSources = safeParse(config.research_sources, []);
  const selectedAutomation = safeParse(config.ai_automation, []);

  return (
    <motion.div
      key="vinyl-cover"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col items-center"
    >
      {/* Back button — styled as "flip record" */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors mb-4 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Deck
      </button>

      {/* ═══ Album Cover (square) ═══ */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: 'min(560px, 92vw)',
          aspectRatio: '1 / 1',
          boxShadow: `0 24px 80px rgba(0,0,0,0.7), 0 0 60px ${accent}15`,
          border: `1px solid ${accent}33`,
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
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.15)' }} />

        {/* Scan line sweep */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-0 right-0 h-[2px]"
            style={{
              background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
              boxShadow: `0 0 12px ${accent}33`,
              animation: 'vinyl-cover-scan 6s ease-in-out infinite',
            }}
          />
        </div>

        {/* ═══ FORM ZONES — positioned over blank spaces on the cover ═══ */}

        {/* ── IDENTITY ROOM — Album Cover Grid Layout ── */}
        {room === 'identity' && (
          <div
            className="absolute inset-0 grid gap-3 p-4"
            style={{
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: 'auto auto auto',
              alignContent: 'start',
            }}
          >
            {/* Album ID — top left */}
            <CoverZone
              gridMode
              label="Album ID"
              accent={accent}
              style={{ gridRow: '1', gridColumn: '1' }}
            >
              <FieldLabel accent={accent}>Show / Album Name *</FieldLabel>
              <Input
                value={config.production_name}
                onChange={e => updateConfig('production_name', e.target.value)}
                placeholder="Enter album title..."
                className={`${inputClass} text-sm font-bold`}
                style={{ borderColor: `${accent}33` }}
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <FieldLabel accent={accent}>Release Date</FieldLabel>
                  <Input type="date" value={config.show_date} onChange={e => updateConfig('show_date', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel accent={accent}>Drop Time</FieldLabel>
                  <Input type="time" value={config.show_start_time} onChange={e => updateConfig('show_start_time', e.target.value)} className={inputClass} />
                </div>
              </div>
            </CoverZone>

            {/* Broadcast — top right */}
            <CoverZone
              gridMode
              label="Broadcast"
              accent={accent}
              glow={false}
              style={{ gridRow: '1', gridColumn: '2' }}
            >
              <FieldLabel accent={accent}>Live or Recorded</FieldLabel>
              <Select value={config.live_or_recorded} onValueChange={v => updateConfig('live_or_recorded', v)}>
                <SelectTrigger className={`${inputClass} border-white/10`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="recorded">Recorded</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2">
                <FieldLabel accent={accent}>Label / Station</FieldLabel>
                <Input value={config.station_name} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Station name..." className={inputClass} />
              </div>
            </CoverZone>

            {/* Host — middle left */}
            <CoverZone
              gridMode
              label="Host"
              accent={accent}
              style={{ gridRow: '2', gridColumn: '1' }}
            >
              <FieldLabel accent={accent}>Host / Artist</FieldLabel>
              <Input value={config.host_name} onChange={e => updateConfig('host_name', e.target.value)} placeholder="DJ name..." className={inputClass} />
              <FieldLabel accent={accent}>Co-Host / Featured</FieldLabel>
              <Input value={config.co_host_name} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional..." className={inputClass} />
            </CoverZone>

            {/* Format — positioned over the circle in the album cover background */}
            <div
              className="absolute flex items-center justify-center"
              style={{ top: '50%', left: '67%', transform: 'translate(-50%, -50%)', zIndex: 10 }}
            >
              <div
                className="relative rounded-full flex flex-col items-center justify-center gap-1 text-center"
                style={{
                  width: '110px',
                  height: '110px',
                  background: 'transparent',
                  border: `1px solid ${accent}33`,
                  boxShadow: `0 0 24px ${accent}11, inset 0 1px 0 rgba(255,255,255,0.04)`,
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <Disc3 className="w-8 h-8" style={{ color: accent, filter: `drop-shadow(0 0 8px ${accent}66)` }} />
                </motion.div>
                <p className="text-[10px] font-bold capitalize" style={{ color: accent }}>{config.live_or_recorded || '—'}</p>
                <p className="text-[8px] text-gray-400">Format sticker</p>
              </div>
            </div>

            {/* Liner Notes — bottom full width */}
            <CoverZone
              gridMode
              label="Liner Notes"
              accent={accent}
              style={{ gridRow: '3', gridColumn: '1 / -1' }}
            >
              <FieldLabel accent={accent}>Show Description</FieldLabel>
              <Textarea
                value={config.show_description}
                onChange={e => updateConfig('show_description', e.target.value)}
                placeholder="Describe your show like liner notes..."
                rows={3}
                className="bg-black/50 border-white/10 text-white text-xs placeholder-gray-600 resize-none"
              />
            </CoverZone>
          </div>
        )}

        {/* ── RUNTIME ROOM ── */}
        {room === 'runtime' && (
          <>
            <CoverZone
              label="Side A / B Mix"
              accent={accent}
              style={{ top: '6%', left: '6%', right: '6%', height: '20%' }}
            >
              <div className="flex h-3 rounded-full overflow-hidden mb-2">
                <motion.div animate={{ width: `${(config.intro_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
                <motion.div animate={{ width: `${(config.required_music_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF00FF' }} />
                <motion.div animate={{ width: `${(config.talk_segment_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#00FFFF' }} />
                <motion.div animate={{ width: `${(config.commercial_sponsor_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FF6B00' }} />
                <motion.div animate={{ width: `${(config.outro_runtime/config.total_show_runtime)*100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} style={{ background: '#FFD700' }} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-gray-400">
                <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#FFD700'}} />Intro</span>
                <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#FF00FF'}} />Music</span>
                <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#00FFFF'}} />Talk</span>
                <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{background:'#FF6B00'}} />Sponsors</span>
              </div>
            </CoverZone>

            <CoverZone
              label="Track Times"
              accent={accent}
              style={{ top: '30%', left: '4%', right: '4%', height: '64%' }}
            >
              <div className="grid grid-cols-2 gap-3">
                <RuntimeSlider label="Total Show" value={config.total_show_runtime} onChange={v => updateConfig('total_show_runtime', v)} max={240} color="#FFFFFF" />
                <RuntimeSlider label="Music Runtime" value={config.required_music_runtime} onChange={v => updateConfig('required_music_runtime', v)} max={240} color="#FF00FF" />
                <RuntimeSlider label="Talk Segments" value={config.talk_segment_runtime} onChange={v => updateConfig('talk_segment_runtime', v)} max={60} color="#00FFFF" />
                <RuntimeSlider label="Commercials" value={config.commercial_sponsor_runtime} onChange={v => updateConfig('commercial_sponsor_runtime', v)} max={30} color="#FF6B00" />
                <RuntimeSlider label="Intro" value={config.intro_runtime} onChange={v => updateConfig('intro_runtime', v)} max={10} color="#FFD700" />
                <RuntimeSlider label="Outro" value={config.outro_runtime} onChange={v => updateConfig('outro_runtime', v)} max={10} color="#FFD700" />
              </div>
            </CoverZone>
          </>
        )}

        {/* ── SOUND PROFILE ROOM ── */}
        {room === 'sound' && (
          <>
            <CoverZone
              label="Genre Tags"
              accent={accent}
              style={{ top: '4%', left: '4%', right: '4%', height: '38%' }}
            >
              <FieldLabel accent={accent}>Genres ({selectedGenres.length})</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {GENRE_OPTIONS.map(opt => (
                  <NeonChip key={opt} label={opt} active={selectedGenres.includes(opt)} onClick={() => toggleArrayItem('genres', opt)} color={accent} />
                ))}
                {selectedGenres.filter(g => !GENRE_OPTIONS.includes(g)).map(g => (
                  <NeonChip key={g} label={g} active={true} onClick={() => toggleArrayItem('genres', g)} color={accent} />
                ))}
              </div>
            </CoverZone>

            <CoverZone
              label="Mood Board"
              accent="#FF00FF"
              style={{ top: '44%', left: '4%', width: '52%', height: '28%' }}
            >
              <FieldLabel accent="#FF00FF">Moods ({selectedMoods.length})</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {MOOD_OPTIONS.map(opt => (
                  <NeonChip key={opt} label={opt} active={selectedMoods.includes(opt)} onClick={() => toggleArrayItem('moods', opt)} color="#FF00FF" />
                ))}
              </div>
            </CoverZone>

            <CoverZone
              label="Tone"
              accent="#00FFFF"
              glow={false}
              style={{ top: '44%', right: '4%', width: '40%', height: '28%' }}
            >
              <FieldLabel accent="#00FFFF">Show Tone</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {TONE_OPTIONS.map(opt => (
                  <NeonChip key={opt} label={opt} active={config.show_tone === opt} onClick={() => updateConfig('show_tone', opt)} color="#00FFFF" />
                ))}
              </div>
            </CoverZone>

            <CoverZone
              label="Vibe Check"
              accent={accent}
              style={{ bottom: '4%', left: '4%', right: '4%', height: '20%' }}
            >
              <p className="text-[10px] text-gray-400 leading-relaxed">
                {selectedGenres.length} genres · {selectedMoods.length} moods · {config.show_tone} tone
              </p>
              <p className="text-[9px] text-gray-500 mt-1">Your sonic fingerprint etched into the vinyl.</p>
            </CoverZone>
          </>
        )}

        {/* ── CONTENT SCOPE ROOM ── */}
        {room === 'content' && (
          <>
            <CoverZone
              label="Track Topics"
              accent={accent}
              style={{ top: '4%', left: '4%', right: '4%', height: '44%' }}
            >
              <FieldLabel accent={accent}>Music Topics ({selectedTopics.length})</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {MUSIC_TOPIC_OPTIONS.map(opt => (
                  <NeonChip key={opt} label={opt} active={selectedTopics.includes(opt)} onClick={() => toggleArrayItem('music_topics', opt)} color={accent} />
                ))}
              </div>
            </CoverZone>

            <CoverZone
              label="Research Credits"
              accent="#00FF88"
              style={{ bottom: '4%', left: '4%', right: '4%', height: '48%' }}
            >
              <FieldLabel accent="#00FF88">Research Sources ({selectedSources.length})</FieldLabel>
              <div className="flex flex-wrap gap-1">
                {RESEARCH_SOURCE_OPTIONS.map(opt => (
                  <NeonChip key={opt} label={opt} active={selectedSources.includes(opt)} onClick={() => toggleArrayItem('research_sources', opt)} color="#00FF88" />
                ))}
              </div>
            </CoverZone>
          </>
        )}

        {/* ── PLAYLIST RULES ROOM ── */}
        {room === 'rules' && (
          <>
            <CoverZone
              label="Must-Play / Blocked"
              accent={accent}
              style={{ top: '4%', left: '4%', right: '4%', height: '40%' }}
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <FieldLabel accent={accent}>Must-Play</FieldLabel>
                  <Textarea value={config.must_play_songs} onChange={e => updateConfig('must_play_songs', e.target.value)} placeholder="Song - Artist" rows={3} className="bg-black/50 border-white/10 text-white text-[10px] placeholder-gray-600 resize-none" />
                </div>
                <div>
                  <FieldLabel accent={accent}>Blocked Songs</FieldLabel>
                  <Textarea value={config.blocked_songs} onChange={e => updateConfig('blocked_songs', e.target.value)} placeholder="One per line" rows={3} className="bg-black/50 border-white/10 text-white text-[10px] placeholder-gray-600 resize-none" />
                </div>
                <div>
                  <FieldLabel accent={accent}>Blocked Artists</FieldLabel>
                  <Textarea value={config.blocked_artists} onChange={e => updateConfig('blocked_artists', e.target.value)} placeholder="One per line" rows={2} className="bg-black/50 border-white/10 text-white text-[10px] placeholder-gray-600 resize-none" />
                </div>
                <div>
                  <FieldLabel accent={accent}>Recently Played</FieldLabel>
                  <Textarea value={config.recently_played_songs} onChange={e => updateConfig('recently_played_songs', e.target.value)} placeholder="One per line" rows={2} className="bg-black/50 border-white/10 text-white text-[10px] placeholder-gray-600 resize-none" />
                </div>
              </div>
            </CoverZone>

            <CoverZone
              label="Energy Flow"
              accent="#FF00FF"
              style={{ top: '46%', left: '4%', right: '4%', height: '22%' }}
            >
              <div className="flex flex-wrap gap-1">
                {ENERGY_FLOW_OPTIONS.map(opt => (
                  <NeonChip key={opt} label={opt} active={config.playlist_energy_flow === opt} onClick={() => updateConfig('playlist_energy_flow', opt)} color="#FF00FF" />
                ))}
              </div>
            </CoverZone>

            <CoverZone
              label="Settings"
              accent={accent}
              style={{ bottom: '4%', left: '4%', right: '4%', height: '24%' }}
            >
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <FieldLabel accent={accent}>Max / Artist</FieldLabel>
                  <Input type="number" value={config.max_songs_per_artist} onChange={e => updateConfig('max_songs_per_artist', Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <FieldLabel accent={accent}>Eras</FieldLabel>
                  <Input value={config.preferred_eras} onChange={e => updateConfig('preferred_eras', e.target.value)} placeholder="90s, 2000s" className={inputClass} />
                </div>
                <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
                  <span className="text-[9px] text-gray-300">Indie</span>
                  <Switch checked={config.include_indie} onCheckedChange={v => updateConfig('include_indie', v)} />
                </div>
                <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
                  <span className="text-[9px] text-gray-300">Local</span>
                  <Switch checked={config.include_local} onCheckedChange={v => updateConfig('include_local', v)} />
                </div>
                <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
                  <span className="text-[9px] text-gray-300">New</span>
                  <Switch checked={config.include_new_releases} onCheckedChange={v => updateConfig('include_new_releases', v)} />
                </div>
                <div className="flex items-center justify-between bg-black/40 rounded px-2 py-1 border border-white/5">
                  <span className="text-[9px] text-gray-300">Clean</span>
                  <Switch checked={config.clean_only} onCheckedChange={v => updateConfig('clean_only', v)} />
                </div>
              </div>
            </CoverZone>
          </>
        )}

        {/* ── AI AUTOMATION ROOM ── */}
        {room === 'ai' && (
          <>
            <CoverZone
              label="Auto-Generate"
              accent={accent}
              style={{ top: '6%', left: '6%', right: '6%', height: '50%' }}
            >
              <FieldLabel accent={accent}>CREAPD Tasks ({selectedAutomation.length} enabled)</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {AI_AUTOMATION_OPTIONS.map(opt => (
                  <NeonChip key={opt.key} label={opt.label} active={selectedAutomation.includes(opt.key)} onClick={() => toggleArrayItem('ai_automation', opt.key)} color={accent} />
                ))}
              </div>
            </CoverZone>

            <CoverZone
              label="Status"
              accent={accent}
              glow={false}
              style={{ bottom: '6%', left: '6%', right: '6%', height: '30%' }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                >
                  <Disc3 className="w-12 h-12" style={{ color: accent, filter: `drop-shadow(0 0 10px ${accent}66)` }} />
                </motion.div>
                <div>
                  <p className="text-sm font-bold" style={{ color: accent }}>{selectedAutomation.length} tasks</p>
                  <p className="text-[10px] text-gray-400">CREAPD will auto-generate these assets when you build.</p>
                </div>
              </div>
            </CoverZone>
          </>
        )}
      </div>

      <style>{`
        @keyframes vinyl-cover-scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </motion.div>
  );
}