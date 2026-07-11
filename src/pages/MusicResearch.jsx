import React from 'react';
import { motion } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Loader2, Search, RefreshCw, ExternalLink, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';

const RELEVANCE_STYLES = {
  high: { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.4)', glow: 'rgba(0,255,136,0.15)', text: '#00FF88' },
  medium: { bg: 'rgba(255,107,0,0.1)', border: 'rgba(255,107,0,0.4)', glow: 'rgba(255,107,0,0.15)', text: '#FF6B00' },
  low: { bg: 'rgba(100,100,120,0.1)', border: 'rgba(100,100,120,0.3)', glow: 'transparent', text: '#888' },
};

export default function MusicResearch() {
  const { config, research, loading, refresh } = useMusicProduction();

  if (loading) {
    return (
      <div className="relative flex items-center justify-center h-screen bg-black">
        <CyberpunkMusicBg />
        <Loader2 className="w-8 h-8 animate-spin relative z-10" style={{ color: '#00FFFF' }} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="left" />

      <div className="relative z-10 p-5 md:p-8 space-y-6">
        <MusicDiscoveryNav />
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.4)', boxShadow: '0 0 16px rgba(0,255,255,0.2)' }}
            >
              <Search className="w-5 h-5" style={{ color: '#00FFFF' }} />
            </div>
            <div>
              <h1 className="text-xl font-heading font-bold text-white">Knowledge Room</h1>
              <p className="text-xs text-gray-400">{config?.production_name || 'Music Production'}</p>
            </div>
          </div>
          {research.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { base44.functions.invoke('buildMusicProduction', { configuration_id: config?.id }).then(refresh); }}
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Refresh
            </Button>
          )}
        </motion.div>

        {research.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {research.map((item, idx) => {
              const style = RELEVANCE_STYLES[item.relevance] || RELEVANCE_STYLES.low;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="cp-glass p-4 hover:border-white/20 transition-all"
                  style={{ boxShadow: `0 0 16px ${style.glow}` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-sm leading-tight text-white">{item.title}</h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide"
                      style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.text }}
                    >
                      {item.relevance}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">{item.summary}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-medium text-gray-400">{item.source}</span>
                    <span>·</span>
                    <span>{item.category}</span>
                    <span>·</span>
                    <span>{item.date}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="cp-glass p-12 text-center"
          >
            <Search className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(0,255,255,0.3)' }} />
            <p className="text-gray-400 mb-4 text-sm">No research has been generated yet.</p>
            <Button
              onClick={() => { base44.functions.invoke('buildMusicProduction', { configuration_id: config?.id }).then(refresh); }}
              style={{ background: 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(0,255,255,0.05))', border: '1px solid rgba(0,255,255,0.4)', color: '#00FFFF' }}
            >
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Generate Research
            </Button>
          </motion.div>
        )}
        <MusicDiscoveryNav />
      </div>
    </div>
  );
}