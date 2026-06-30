import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Music, Newspaper, Trophy, ChefHat, Mic, ArrowRight, Sparkles } from 'lucide-react';

export default function Onboarding() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-heading font-bold mb-3">Welcome to Producer</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Your automation-first production assistant. Configure your production once,
            and Producer builds your dashboard, content, and assets automatically — every day.
          </p>
        </div>

        <div className="glass-panel p-6 mb-8">
          <h2 className="font-heading font-semibold mb-4">How it works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">1</div>
              <div>
                <p className="font-medium">Choose your production type</p>
                <p className="text-sm text-muted-foreground">Music, News, Sports, Cooking, Talk, and more.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">2</div>
              <div>
                <p className="font-medium">Configure your production</p>
                <p className="text-sm text-muted-foreground">Set your runtime, genres, topics, sources, and AI automation preferences.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">3</div>
              <div>
                <p className="font-medium">Producer builds everything</p>
                <p className="text-sm text-muted-foreground">Your dashboard, playlist, topics, rundown, and AI assets are generated automatically.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 mb-8 border-primary/20">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> Your first configuration becomes your default production setup.
            You can change it anytime in Settings.
          </p>
        </div>

        <div className="flex justify-center">
          <Button size="lg" asChild className="h-12 px-8 text-base">
            <Link to="/production-types">
              Start First Production
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-center gap-6 mt-12 opacity-40">
          <Music className="w-5 h-5" />
          <Newspaper className="w-5 h-5" />
          <Trophy className="w-5 h-5" />
          <ChefHat className="w-5 h-5" />
          <Mic className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}