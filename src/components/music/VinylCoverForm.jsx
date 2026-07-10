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
 * SubFormCard — a self-contained mini form with a header bar and body.
 * Each card is a cohesive unit, not a floating fragment.
 */
function SubFormCard({ children, accent, label, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`relative rounded-xl overflow-hidden flex flex-col ${className}`}
      style={{
        background: 'rgba(10,8,14,0.82)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${accent}3d`,
        boxShadow: `0 0 20px ${accent}10, inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: `${accent}25`, background: `${accent}0a` }}
      >
        <span
          className="text-[10px] font-mono uppercase tracking-[0.2em] font-semibold"
          style={{ color: accent }}
        >
          {label}
        </span>
        <div className="ml-auto h-1 w-1 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
      </div>

      {/* Body */}
      <div className="p-4 flex-1">
        {children}
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
      className="relative flex flex-col items-center w-full max-w-3xl mx-auto"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors mb-4 backdrop-blur-sm self-start"
        style={{ background: 'rgba(0,0,0,0.4)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Deck
      </button>

      {/* Album cover banner — decorative header */}
      <div
        className="relative w-full rounded-xl overflow-hidden mb-4"
        style={{
          height: '120px',
          boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${accent}12`,
          border: `1px solid ${accent}33`,
        }}
      >
        <img
          src={ALBUM_COVER_URL}
          alt="Album Cover"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(1.1) contrast(1.05)' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.25) 100%)' }} />
        <div className="absolute inset-0 flex items-center px-6">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-400 mb-1">Now Configuring</p>
            <h2 className="text-xl font-bold" style={{ color: accent, textShadow: `0 0 12px ${accent}44` }}>{meta.label}</h2>
          </div>
        </div>
      </div>

      {/* ═══ SUB-FORM CARDS GRID ═══ */}

      {/* ── IDENTITY ROOM ── */}
      {room === 'identity' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          {/* Album Title — full width */}
          <SubFormCard label="Album Title" accent={accent} className="md:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <FieldLabel accent={accent}>Show / Album Name *</FieldLabel>
                <Input
                  value={config.production_name}
                  onChange={e => updateConfig('production_name', e.target.value)}
                  placeholder="Enter album title..."
                  className={`${inputClass} text-base font-bold`}
                  style={{ borderColor: `${accent}33` }}
                />
              </div>
              <div>
                <FieldLabel accent={accent}>Release Date *</FieldLabel>
                <Input type="date" value={config.show_date} onChange={e => updateConfig('show_date', e.target.value)} className={inputClass} />
              </div>
              <div>
                <FieldLabel accent={accent}>Drop Time</FieldLabel>
                <Input type="time" value={config.show_start_time} onChange={e => updateConfig('show_start_time', e.target.value)} className={inputClass} />
              </div>
            </div>
          </SubFormCard>

          {/* Artist */}
          <SubFormCard label="Artist" accent={accent}>
            <div className="space-y-2">
              <div>
                <FieldLabel accent={accent}>Host / Artist</FieldLabel>
                <Input value={config.host_name} onChange={e => updateConfig('host_name', e.target.value)} placeholder="DJ name..." className={inputClass} />
              </div>
              <div>
                <FieldLabel accent={accent}>Co-Host / Featured</FieldLabel>
                <Input value={config.co_host_name} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional..." className={inputClass} />
              </div>
              <div>
                <FieldLabel accent={accent}>Label / Station</FieldLabel>
                <Input value={config.station_name} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Station name..." className={inputClass} />
              </div>
            </div>
          </SubFormCard>

          {/* Format */}
          <SubFormCard label="Format" accent={accent}>
            <div className="space-y-3">
              <div>
                <FieldLabel accent={accent}>Live or Recorded</FieldLabel>
                <Select value={config.live_or_recorded} onValueChange={v => updateConfig('live_or_recorded', v)}>
                  <SelectTrigger className={`${inputClass} border-white/10`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="recorded">Recorded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-center pt-1">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                >
                  <Disc3 className="w-10 h-10" style={{ color: accent, filter: `drop-shadow(0 0 8px ${accent}66)` }} />
                </motion.div>
              </div>
            </div>
          </SubFormCard>

          {/* Liner Notes — full width */}
          <SubFormCard label="Liner Notes" accent={accent} className="md:col-span-2">
            <FieldLabel accent={accent}>Show Description</FieldLabel>
            <Textarea
              value={config.show_description}
              onChange={e => updateConfig('show_description', e.target.value)}
              placeholder="Describe your show like liner notes..."
              rows={3}
              className="bg-black/50 border-white/10 text-white text-xs placeholder-gray-600 resize-none"
            />
          </SubFormCard>
        </div>
      )}

      {/* ── RUNTIME ROOM ── */}
      {room === 'runtime' && (
        <div className="grid grid-cols-1 gap-3 w-full">
          <SubFormCard label="Side A / B Mix" accent={accent}>
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
          </SubFormCard>

          <SubFormCard label="Track Times" accent={accent}>
            <div className="grid grid-cols-2 gap-3">
              <RuntimeSlider label="Total Show" value={config.total_show_runtime} onChange={v => updateConfig('total_show_runtime', v)} max={240} color="#FFFFFF" />
              <RuntimeSlider label="Music Runtime" value={config.required_music_runtime} onChange={v => updateConfig('required_music_runtime', v)} max={240} color="#FF00FF" />
              <RuntimeSlider label="Talk Segments" value={config.talk_segment_runtime} onChange={v => updateConfig('talk_segment_runtime', v)} max={60} color="#00FFFF" />
              <RuntimeSlider label="Commercials" value={config.commercial_sponsor_runtime} onChange={v => updateConfig('commercial_sponsor_runtime', v)} max={30} color="#FF6B00" />
              <RuntimeSlider label="Intro" value={config.intro_runtime} onChange={v => updateConfig('intro_runtime', v)} max={10} color="#FFD700" />
              <RuntimeSlider label="Outro" value={config.outro_runtime} onChange={v => updateConfig('outro_runtime', v)} max={10} color="#FFD700" />
            </div>
          </SubFormCard>
        </div>
      )}

      {/* ── SOUND PROFILE ROOM ── */}
      {room === 'sound' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          <SubFormCard label="Genre Tags" accent={accent} className="md:col-span-2">
            <FieldLabel accent={accent}>Genres ({selectedGenres.length})</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {GENRE_OPTIONS.map(opt => (
                <NeonChip key={opt} label={opt} active={selectedGenres.includes(opt)} onClick={() => toggleArrayItem('genres', opt)} color={accent} />
              ))}
              {selectedGenres.filter(g => !GENRE_OPTIONS.includes(g)).map(g => (
                <NeonChip key={g} label={g} active={true} onClick={() => toggleArrayItem('genres', g)} color={accent} />
              ))}
            </div>
          </SubFormCard>

          <SubFormCard label="Mood Board" accent="#FF00FF">
            <FieldLabel accent="#FF00FF">Moods ({selectedMoods.length})</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {MOOD_OPTIONS.map(opt => (
                <NeonChip key={opt} label={opt} active={selectedMoods.includes(opt)} onClick={() => toggleArrayItem('moods', opt)} color="#FF00FF" />
              ))}
            </div>
          </SubFormCard>

          <SubFormCard label="Tone" accent="#00FFFF">
            <FieldLabel accent="#00FFFF">Show Tone</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {TONE_OPTIONS.map(opt => (
                <NeonChip key={opt} label={opt} active={config.show_tone === opt} onClick={() => updateConfig('show_tone', opt)} color="#00FFFF" />
              ))}
            </div>
          </SubFormCard>

          <SubFormCard label="Vibe Check" accent={accent} className="md:col-span-2">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {selectedGenres.length} genres · {selectedMoods.length} moods · {config.show_tone} tone
            </p>
            <p className="text-[9px] text-gray-500 mt-1">Your sonic fingerprint etched into the vinyl.</p>
          </SubFormCard>
        </div>
      )}

      {/* ── CONTENT SCOPE ROOM ── */}
      {room === 'content' && (
        <div className="grid grid-cols-1 gap-3 w-full">
          <SubFormCard label="Track Topics" accent={accent}>
            <FieldLabel accent={accent}>Music Topics ({selectedTopics.length})</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {MUSIC_TOPIC_OPTIONS.map(opt => (
                <NeonChip key={opt} label={opt} active={selectedTopics.includes(opt)} onClick={() => toggleArrayItem('music_topics', opt)} color={accent} />
              ))}
            </div>
          </SubFormCard>

          <SubFormCard label="Research Credits" accent="#00FF88">
            <FieldLabel accent="#00FF88">Research Sources ({selectedSources.length})</FieldLabel>
            <div className="flex flex-wrap gap-1">
              {RESEARCH_SOURCE_OPTIONS.map(opt => (
                <NeonChip key={opt} label={opt} active={selectedSources.includes(opt)} onClick={() => toggleArrayItem('research_sources', opt)} color="#00FF88" />
              ))}
            </div>
          </SubFormCard>
        </div>
      )}

      {/* ── PLAYLIST RULES ROOM ── */}
      {room === 'rules' && (
        <div className="grid grid-cols-1 gap-3 w-full">
          <SubFormCard label="Must-Play / Blocked" accent={accent}>
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
          </SubFormCard>

          <SubFormCard label="Energy Flow" accent="#FF00FF">
            <div className="flex flex-wrap gap-1">
              {ENERGY_FLOW_OPTIONS.map(opt => (
                <NeonChip key={opt} label={opt} active={config.playlist_energy_flow === opt} onClick={() => updateConfig('playlist_energy_flow', opt)} color="#FF00FF" />
              ))}
            </div>
          </SubFormCard>

          <SubFormCard label="Settings" accent={accent}>
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
          </SubFormCard>
        </div>
      )}

      {/* ── AI AUTOMATION ROOM ── */}
      {room === 'ai' && (
        <div className="grid grid-cols-1 gap-3 w-full">
          <SubFormCard label="Auto-Generate" accent={accent}>
            <FieldLabel accent={accent}>CREAPD Tasks ({selectedAutomation.length} enabled)</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {AI_AUTOMATION_OPTIONS.map(opt => (
                <NeonChip key={opt.key} label={opt.label} active={selectedAutomation.includes(opt.key)} onClick={() => toggleArrayItem('ai_automation', opt.key)} color={accent} />
              ))}
            </div>
          </SubFormCard>

          <SubFormCard label="Status" accent={accent}>
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
          </SubFormCard>
        </div>
      )}
    </motion.div>
  );
}