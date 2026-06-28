import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import {
  Search as SearchIcon, Calendar, Star, FileText, ChevronRight, Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/shared/StatusBadge';

export default function ArchivePage() {
  const [briefings, setBriefings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    base44.entities.Briefing.filter({}, '-created_date', 50)
      .then(setBriefings)
      .finally(() => setLoading(false));
  }, []);

  const filtered = briefings.filter(b => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.title?.toLowerCase().includes(term) ||
      b.theme?.toLowerCase().includes(term) ||
      b.berna_pick_title?.toLowerCase().includes(term) ||
      b.date?.includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Archive</h1>
          <p className="text-xs text-muted-foreground mt-1">Previous briefings and stories</p>
        </div>
        <span className="text-xs text-muted-foreground">{briefings.length} briefings</span>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by date, theme, keyword..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/[0.03] border-white/[0.08] text-white text-sm"
        />
      </div>

      <div className="space-y-3">
        {filtered.map(briefing => (
          <div key={briefing.id} className="glass-panel p-4 hover:border-white/[0.12] transition-all group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-berna-purple" />
                  <span className="text-xs font-mono text-berna-purple">{briefing.date}</span>
                  <StatusBadge status={briefing.status} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{briefing.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  {briefing.theme && <span>Theme: {briefing.theme}</span>}
                  {briefing.estimated_read_time && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{briefing.estimated_read_time}
                    </span>
                  )}
                </div>
                {briefing.berna_pick_title && (
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3 h-3 text-berna-orange fill-berna-orange" />
                    <span className="text-xs text-berna-orange">Pick: {briefing.berna_pick_title}</span>
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'No briefings match your search' : 'No briefings archived yet'}
          </p>
        </div>
      )}
    </div>
  );
}