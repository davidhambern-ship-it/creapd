import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, GraduationCap, Church } from 'lucide-react';

export default function RegistryConnections({ tradition }) {
  const [sessions, setSessions] = useState([]);
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tradition) return;
    Promise.all([
      base44.entities.ResearchSession.filter({ faith_tradition: tradition }, '-created_date', 10).catch(() => []),
      base44.entities.SpiritualProductionConfiguration.filter({ faith_tradition: tradition }, '-created_date', 10).catch(() => [])
    ]).then(([s, p]) => { setSessions(s || []); setProductions(p || []); }).finally(() => setLoading(false));
  }, [tradition]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" /> Connected Study Sessions ({sessions.length})
        </h3>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No study sessions linked to this tradition.</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map(s => (
              <Link key={s.id} to={`/spiritual/study/${s.id}`} className="block p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <p className="text-sm font-medium truncate">{s.title}</p>
                <p className="text-xs text-muted-foreground truncate">{s.research_question}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="glass-panel p-5">
        <h3 className="font-heading font-semibold mb-3 flex items-center gap-2">
          <Church className="w-4 h-4 text-primary" /> Connected Productions ({productions.length})
        </h3>
        {productions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No productions linked to this tradition.</p>
        ) : (
          <div className="space-y-1.5">
            {productions.map(p => (
              <Link key={p.id} to={`/spiritual/configure?config_id=${p.id}`} className="block p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <p className="text-sm font-medium truncate">{p.production_name}</p>
                <p className="text-xs text-muted-foreground">{p.production_type} · {p.production_date}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}