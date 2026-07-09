import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Youtube, Music2, ExternalLink, Sparkles, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EMBED_DEMOS = [
  {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    color: 'text-red-500',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    aspect: 'aspect-video',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    icon: Music2,
    color: 'text-orange-500',
    embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
    sourceUrl: 'https://soundcloud.com/forss/flickermood',
    aspect: 'aspect-[1/0.2]',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    icon: Music2,
    color: 'text-green-500',
    embedUrl: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0',
    sourceUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    aspect: 'aspect-[1/0.3]',
  },
];

// Simulated AI-generated playlist suggestions (what buildMusicProduction would return)
const SIMULATED_PLAYLIST = [
  {
    id: 'p1',
    title: 'Midnight Drive',
    artist: 'Synthwave Collective',
    mood: 'Driving / Energetic',
    bpm: 128,
    platform: 'spotify',
    embedUrl: 'https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC?utm_source=generator&theme=0',
    sourceUrl: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    matchScore: 94,
  },
  {
    id: 'p2',
    title: 'Flickermood (Instrumental)',
    artist: 'Forss',
    mood: 'Ambient / Building',
    bpm: 90,
    platform: 'soundcloud',
    embedUrl: 'https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/293&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false',
    sourceUrl: 'https://soundcloud.com/forss/flickermood',
    matchScore: 88,
  },
  {
    id: 'p3',
    title: 'Reference Visual Cue',
    artist: 'Various Artists',
    mood: 'Visual Reference',
    bpm: null,
    platform: 'youtube',
    embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    matchScore: 82,
  },
];

const PLATFORM_META = {
  spotify: { label: 'Spotify', icon: Music2, color: 'text-green-500', aspect: 'aspect-[1/0.3]' },
  soundcloud: { label: 'SoundCloud', icon: Music2, color: 'text-orange-500', aspect: 'aspect-[1/0.2]' },
  youtube: { label: 'YouTube', icon: Youtube, color: 'text-red-500', aspect: 'aspect-video' },
};

export default function EmbedDemo() {
  const [activeId, setActiveId] = useState('youtube');
  const active = EMBED_DEMOS.find((d) => d.id === activeId);

  // Playlist generation simulation state
  const [playlist, setPlaylist] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [briefText, setBriefText] = useState('Uplifting synthwave for a tech product launch segment, 120-130 BPM');

  const handleGenerate = () => {
    setGenerating(true);
    setPlaylist([]);
    // Simulate the backend function call delay
    setTimeout(() => {
      setPlaylist(SIMULATED_PLAYLIST);
      setGenerating(false);
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
        <Link to="/music/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-sm font-heading font-semibold">Embed Demo</h1>
          <p className="text-xs text-muted-foreground">How external media players look inside CREAPD</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Explanation card */}
        <div className="glass-panel p-4 space-y-1">
          <h2 className="text-sm font-heading font-semibold text-foreground">What you're looking at</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Each player below is a sandboxed <code className="text-xs text-primary">iframe</code> — an embedded
            window into YouTube, SoundCloud, or Spotify. The audio/video streams from their servers, not yours. You
            control which URL gets loaded; the platform handles playback, licensing, and branding.
          </p>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2">
          {EMBED_DEMOS.map((demo) => {
            const Icon = demo.icon;
            const isActive = demo.id === activeId;
            return (
              <button
                key={demo.id}
                onClick={() => setActiveId(demo.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                  isActive
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-card/50 border-border text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : demo.color}`} />
                {demo.label}
              </button>
            );
          })}
        </div>

        {/* Active embed */}
        <div className="glass-panel overflow-hidden p-0">
          {/* Simulated "rundown row" header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <active.icon className={`h-4 w-4 ${active.color}`} />
              <div>
                <p className="text-sm font-medium">{active.label} Reference Track</p>
                <p className="text-[10px] text-muted-foreground">Auto-suggested by CREAPD Music Brief</p>
              </div>
            </div>
            <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* The iframe itself */}
          <div className={`w-full ${active.aspect} bg-black/40`}>
            <iframe
              key={active.embedUrl}
              src={active.embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin allow-popups"
              title={`${active.label} embed demo`}
            />
          </div>

          {/* Simulated metadata footer */}
          <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {active.label} · Embedded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">License: Handled by {active.label}</span>
            </div>
          </div>
        </div>

        {/* ── Generated Playlist Demo ── */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="space-y-1">
            <h2 className="text-sm font-heading font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-Generated Playlist
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This simulates what happens when <code className="text-xs text-primary">buildMusicProduction</code> runs:
              the AI reads your brief, suggests tracks with metadata, and each suggestion renders as an embeddable
              player. No audio is hosted by CREAPD — every player loads from its native platform.
            </p>
          </div>

          {/* Brief input */}
          <div className="glass-panel p-3 space-y-3">
            <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              Music Brief
            </label>
            <textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              className="w-full bg-card/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground resize-none focus:outline-none focus:border-primary/50"
              rows={2}
              placeholder="Describe the mood, genre, tempo..."
            />
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="sm"
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating suggestions...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Playlist
                </>
              )}
            </Button>
          </div>

          {/* Loading skeleton */}
          {generating && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-panel p-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-muted/40" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-1/3 rounded bg-muted/40" />
                      <div className="h-2 w-1/4 rounded bg-muted/30" />
                    </div>
                    <div className="h-2 w-10 rounded bg-muted/30" />
                  </div>
                  <div className="h-16 w-full rounded bg-muted/20" />
                </div>
              ))}
            </div>
          )}

          {/* Generated playlist */}
          {!generating && playlist.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                  {playlist.length} suggestions · Sorted by match
                </span>
                <button
                  onClick={handleGenerate}
                  className="text-[10px] text-primary hover:underline"
                >
                  Regenerate
                </button>
              </div>

              {playlist.map((track, idx) => {
                const meta = PLATFORM_META[track.platform];
                const Icon = meta.icon;
                return (
                  <div key={track.id} className="glass-panel overflow-hidden p-0">
                    {/* Track header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
                      <span className="text-xs font-mono text-muted-foreground w-5">{String(idx + 1).padStart(2, '0')}</span>
                      <Icon className={`h-4 w-4 ${meta.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{track.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {track.artist} · {track.mood}{track.bpm ? ` · ${track.bpm} BPM` : ''}
                        </p>
                      </div>
                      {/* Match score badge */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-mono text-muted-foreground">MATCH</span>
                          <span className={`text-xs font-bold ${track.matchScore >= 90 ? 'text-emerald-500' : 'text-accent'}`}>
                            {track.matchScore}%
                          </span>
                        </div>
                      </div>
                      <a href={track.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {/* Embed player */}
                    <div className={`w-full ${meta.aspect} bg-black/40`}>
                      <iframe
                        key={track.embedUrl}
                        src={track.embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        sandbox="allow-scripts allow-same-origin allow-popups"
                        title={`${track.title} — ${meta.label}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {!generating && playlist.length === 0 && (
            <div className="glass-panel p-8 text-center">
              <Play className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                Click "Generate Playlist" to see how AI suggestions render as embeddable players.
              </p>
            </div>
          )}
        </div>

        {/* Key takeaways */}
        <div className="space-y-2">
          <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground">
            Key takeaways
          </h3>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              The player UI belongs to the source platform — your users see familiar controls.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              Switching tabs swaps the <code className="text-xs text-primary">src</code> — no page reload needed.
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              In production, these URLs would come from your database (AI-suggested or user-pasted).
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              The "Generate Playlist" section above simulates the full flow: brief → AI → embeddable results, with no audio hosted by CREAPD.
            </li>
          </ul>
        </div>

        <Link to="/music/dashboard">
          <Button variant="outline" size="sm" className="w-full">
            <ArrowLeft className="h-4 w-4" />
            Back to Music Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}