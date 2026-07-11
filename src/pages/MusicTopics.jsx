import React from 'react';
import { motion } from 'framer-motion';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import { Loader2, Mic, Link as LinkIcon, MapPin, Disc3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';

export default function MusicTopics() {
  const { config, topics, loading } = useMusicProduction();

  if (loading) {
    return (
      <div className="relative flex items-center justify-center h-screen bg-black">
        <CyberpunkMusicBg />
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}>
          <Disc3 className="w-10 h-10" style={{ color: '#FF00FF', filter: 'drop-shadow(0 0 8px #FF00FF)' }} />
        </motion.div>
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
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,255,0.12)', border: '1px solid rgba(0,255,255,0.4)', boxShadow: '0 0 16px rgba(0,255,255,0.2)' }}>
            <Mic className="w-6 h-6" style={{ color: '#00FFFF' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white cp-glitch">Music Topics</h1>
            <p className="text-sm text-gray-400">{config?.production_name || 'Music Production'}</p>
          </div>
        </motion.div>

        {topics.length > 0 ? (
          /* Vertical timeline cards — alternating neon borders */
          <div className="relative">
            {/* Timeline spine */}
            <div className="absolute left-5 top-0 bottom-0 w-px"
              style={{ background: 'linear-gradient(180deg, #FF00FF, #00FFFF, #FF00FF)' }} />

            <div className="space-y-4">
              {topics.map((topic, i) => {
                const isPink = i % 2 === 0;
                const color = isPink ? '#FF00FF' : '#00FFFF';
                return (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="relative pl-14"
                  >
                    {/* Timeline node */}
                    <div className="absolute left-2.5 top-5 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#0D0D0D', border: `2px solid ${color}`, boxShadow: `0 0 10px ${color}80` }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    </div>

                    {/* Card */}
                    <div className="cp-glass overflow-hidden" style={{ borderColor: `${color}25` }}>
                      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xs font-mono mt-0.5" style={{ color }}>#{i + 1}</span>
                            <h3 className="font-semibold text-white text-lg leading-tight">{topic.topic_name}</h3>
                          </div>
                          <span className="text-xs px-2.5 py-1 rounded-full border flex-shrink-0"
                            style={topic.status === 'ready'
                              ? { background: `${color}15`, color, borderColor: `${color}40` }
                              : { background: 'rgba(255,255,255,0.05)', color: '#888', borderColor: 'rgba(255,255,255,0.1)' }
                            }>
                            {topic.status}
                          </span>
                        </div>

                        {topic.generated_summary && (
                          <p className="text-sm text-gray-400 mb-4 leading-relaxed">{topic.generated_summary}</p>
                        )}

                        {topic.talking_points && (
                          <div className="mb-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}15` }}>
                            <p className="text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color }}>Talking Points</p>
                            <div className="text-sm text-gray-300 whitespace-pre-wrap">{topic.talking_points}</div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                          {topic.suggested_placement && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" style={{ color }} /> {topic.suggested_placement}
                            </span>
                          )}
                          {topic.sources && (
                            <span className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" style={{ color }} /> {topic.sources}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="cp-glass p-12 text-center" style={{ borderColor: 'rgba(0,255,255,0.15)' }}>
            <Mic className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(0,255,255,0.3)' }} />
            <p className="text-gray-400">No music topics were selected. Edit your configuration to add topics.</p>
            <Button variant="outline" className="mt-4 border-[#00FFFF]/40 hover:border-[#00FFFF]/70 hover:bg-[#00FFFF]/10" asChild>
              <Link to="/music/configure">Edit Configuration</Link>
            </Button>
          </div>
        )}
        <MusicDiscoveryNav />
      </div>
    </div>
  );
}