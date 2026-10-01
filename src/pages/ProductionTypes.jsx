import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Mic2, FlaskConical, ArrowRight } from 'lucide-react';

const FORMATS = [
  {
    key: 'radio',
    label: 'Radio',
    description: 'Music-centered programming with playlist, DJ, rundown, teleprompter, OBS, and live-production tools.',
    icon: Music,
    path: '/music/configure',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    accent: 'text-purple-400'
  },
  {
    key: 'podcast',
    label: 'Podcast',
    description: 'Spoken-word production for any subject. Prepare the next episode, approve the material, package it, and send it to the studio.',
    icon: Mic2,
    path: '/news/dashboard',
    gradient: 'from-orange-500/20 to-fuchsia-500/10',
    accent: 'text-orange-300'
  },
  {
    key: 'research',
    label: 'Research',
    description: 'Deep investigation, source review, dossier building, and production-ready findings for any subject.',
    icon: FlaskConical,
    path: '/research',
    gradient: 'from-cyan-500/20 to-blue-500/10',
    accent: 'text-cyan-400'
  }
];

export default function ProductionTypes() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold mb-3">Choose Your Format</h1>
          <p className="text-muted-foreground text-lg">
            Format controls the production pipeline. Your subject or category lives inside the format.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FORMATS.map((format) => {
            const Icon = format.icon;
            return (
              <div key={format.key} className="relative glass-panel p-6 flex flex-col cursor-pointer hover:border-primary/30 transition-colors">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${format.gradient} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${format.accent}`} />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{format.label}</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-1">{format.description}</p>
                <Link to={format.path} className={`inline-flex items-center gap-2 text-sm font-medium ${format.accent} hover:underline`}>
                  Enter Format <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
