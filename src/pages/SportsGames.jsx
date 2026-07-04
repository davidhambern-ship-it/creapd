import React, { useState } from 'react';
import { useSportsProduction } from '@/hooks/useSportsProduction';
import { base44 } from '@/api/base44Client';
import { Loader2, Trophy, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export default function SportsGames() {
  const { config, games, loading, refresh } = useSportsProduction();
  const [expanded, setExpanded] = useState(null);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const toggleApproved = async (game) => {
    const newStatus = game.status === 'approved' ? 'ready' : 'approved';
    await base44.entities.SportsGame.update(game.id, { status: newStatus });
    refresh();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-primary" /> Games</h1>
        <p className="text-sm text-muted-foreground mt-1">Games and matchups with summaries, key matchups, and talking points</p>
      </div>

      {games.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No games generated yet. Refresh your production to generate games.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map(game => {
            const isExpanded = expanded === game.id;
            const summary = game.generated_summary || '';
            const isLong = summary.length > 150;
            return (
              <div key={game.id} className="glass-panel p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-medium">{game.game_name}</h3>
                    {game.game_status && <span className="text-xs text-muted-foreground capitalize">{game.game_status}</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${game.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary'}`}>{game.status}</span>
                </div>
                {summary && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {isExpanded || !isLong ? summary : summary.substring(0, 150) + '...'}
                  </p>
                )}
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {game.key_matchups && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Matchups</p>
                        <p className="text-sm whitespace-pre-line">{game.key_matchups}</p>
                      </div>
                    )}
                    {game.talking_points && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Talking Points</p>
                        <p className="text-sm whitespace-pre-line">{game.talking_points}</p>
                      </div>
                    )}
                    {game.stats_and_figures && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stats & Figures</p>
                        <p className="text-sm whitespace-pre-line">{game.stats_and_figures}</p>
                      </div>
                    )}
                    {game.sources && <p className="text-xs text-muted-foreground"><span className="font-semibold">Sources:</span> {game.sources}</p>}
                  </div>
                )}
                <div className="flex items-center justify-between mt-3">
                  {game.suggested_placement && <span className="text-xs text-muted-foreground">{game.suggested_placement}</span>}
                  <div className="flex items-center gap-1 ml-auto">
                    {(isLong || game.key_matchups || game.talking_points) && (
                      <button onClick={() => setExpanded(isExpanded ? null : game.id)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                      </button>
                    )}
                    <button onClick={() => toggleApproved(game)} className="text-xs px-2 py-0.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {game.status === 'approved' ? 'Unapprove' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}