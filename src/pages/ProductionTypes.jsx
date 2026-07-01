import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Newspaper, Trophy, ChefHat, Mic2, Church, Lock, ArrowRight } from 'lucide-react';

const PRODUCTION_TYPES = [
  {
    key: 'music',
    label: 'Music Production',
    description: 'Radio shows, music shows, playlist-based livestreams, countdown shows, DJ programs, artist spotlights, and music commentary.',
    icon: Music,
    available: true,
    path: '/music/configure',
    gradient: 'from-purple-500/20 to-indigo-500/10',
    accent: 'text-purple-400'
  },
  {
    key: 'news',
    label: 'News Production',
    description: 'Daily news briefings, breaking news, story queues, teleprompter scripts, and broadcast production packages.',
    icon: Newspaper,
    available: true,
    path: '/',
    gradient: 'from-blue-500/20 to-cyan-500/10',
    accent: 'text-blue-400'
  },
  {
    key: 'sports',
    label: 'Sports Production',
    description: 'Game previews, recaps, scoreboard updates, athlete interviews, and sports commentary shows.',
    icon: Trophy,
    available: false,
    gradient: 'from-orange-500/20 to-red-500/10',
    accent: 'text-orange-400'
  },
  {
    key: 'cooking',
    label: 'Cooking Production',
    description: 'Recipe shows, cooking tutorials, ingredient spotlights, and culinary entertainment programs.',
    icon: ChefHat,
    available: false,
    gradient: 'from-green-500/20 to-emerald-500/10',
    accent: 'text-green-400'
  },
  {
    key: 'talk',
    label: 'Talk Production',
    description: 'Talk shows, interview programs, panel discussions, and conversation-driven content.',
    icon: Mic2,
    available: false,
    gradient: 'from-pink-500/20 to-rose-500/10',
    accent: 'text-pink-400'
  },
  {
    key: 'spiritual',
    label: 'Spiritual Production',
    description: 'Sermons, Bible studies, devotionals, worship services, prayer meetings, and faith-based content for any tradition.',
    icon: Church,
    available: true,
    path: '/spiritual/configure',
    gradient: 'from-amber-500/20 to-yellow-500/10',
    accent: 'text-amber-400'
  }
];

export default function ProductionTypes() {
  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold mb-3">Choose Your Production Type</h1>
          <p className="text-muted-foreground text-lg">
            Select the type of production you want to create. Each type has its own workflow, assets, and AI assistant.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.key}
                className={`relative glass-panel p-6 flex flex-col ${
                  type.available ? 'cursor-pointer hover:border-primary/30 transition-colors' : 'opacity-60'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.gradient} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${type.accent}`} />
                </div>

                <h3 className="font-heading font-bold text-lg mb-2">{type.label}</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-1">{type.description}</p>

                {type.available ? (
                  <Link
                    to={type.path}
                    className={`inline-flex items-center gap-2 text-sm font-medium ${type.accent} hover:underline`}
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    Coming Soon
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">
            More production types coming soon. Each will have its own dedicated workflow.
          </p>
        </div>
      </div>
    </div>
  );
}