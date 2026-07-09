import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Youtube, Music2, ExternalLink } from 'lucide-react';
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

export default function EmbedDemo() {
  const [activeId, setActiveId] = useState('youtube');
  const active = EMBED_DEMOS.find((d) => d.id === activeId);

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