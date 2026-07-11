import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Archive, Calendar, Clock, ChevronRight, Loader2, Disc3 } from 'lucide-react';
import { formatMinutes } from '@/lib/musicConstants';

const STATUS_STYLES = {
  ready: { color: '#00FF88', bg: 'rgba(0,255,136,0.12)', border: 'rgba(0,255,136,0.3)' },
  building: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.3)' },
  failed: { color: '#FF4466', bg: 'rgba(255,68,102,0.12)', border: 'rgba(255,68,102,0.3)' },
  configuring: { color: '#888', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)' },
  planning: { color: '#00FFFF', bg: 'rgba(0,255,255,0.12)', border: 'rgba(0,255,255,0.3)' },
  refreshing: { color: '#FFD700', bg: 'rgba(255,215,0,0.12)', border: 'rgba(255,215,0,0.3)' },
};

export default function MusicShowArchive({ currentConfigId }) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchShows = async () => {
      try {
        const all = await base44.entities.MusicProductionConfiguration.list('-show_date', 50);
        const filtered = all.filter(s => s.id !== currentConfigId);
        setShows(filtered);
      } catch (err) {
        console.error('Failed to load show archive:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchShows();
  }, [currentConfigId]);

  if (loading) {
    return (
      <div className="cp-glass p-5 flex items-center justify-center" style={{ borderColor: 'rgba(0,255,136,0.15)' }}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
      </div>
    );
  }

  if (shows.length === 0) return null;

  const visible = expanded ? shows : shows.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45 }}
      className="relative overflow-hidden cp-glass"
      style={{ borderColor: 'rgba(0,255,136,0.15)' }}
    >
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #00FF88, transparent)' }} />
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)' }}
            >
              <Archive className="w-4 h-4" style={{ color: '#00FF88' }} />
            </div>
            <h3 className="font-semibold text-white text-sm">Show Archive</h3>
            <span className="text-xs text-gray-400">({shows.length})</span>
          </div>
        </div>

        <div className="space-y-1.5">
          {visible.map((show, i) => {
            const style = STATUS_STYLES[show.status] || STATUS_STYLES.configuring;
            return (
              <motion.div
                key={show.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  to={`/music/configure?config_id=${show.id}`}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${style.color}12`, border: `1px solid ${style.border}` }}
                  >
                    <Disc3 className="w-3.5 h-3.5" style={{ color: style.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-emerald-300 transition-colors">
                      {show.production_name}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {show.show_date}</span>
                      {show.show_start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {show.show_start_time}</span>}
                      {show.station_name && <span className="truncate">{show.station_name}</span>}
                    </div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0"
                    style={{ background: style.bg, color: style.color, borderColor: style.border }}
                  >
                    {show.status}
                  </span>
                  {show.total_show_runtime > 0 && (
                    <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{formatMinutes(show.total_show_runtime)}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0" />
                </Link>
              </motion.div>
            );
          })}
        </div>

        {shows.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 text-xs text-gray-400 hover:text-emerald-400 transition-colors py-1.5"
          >
            {expanded ? 'Show Less' : `View All ${shows.length} Shows`}
          </button>
        )}
      </div>
    </motion.div>
  );
}