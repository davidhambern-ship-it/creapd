import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  Bot,
  Check,
  FileText,
  Gauge,
  Loader2,
  Radio,
  Save,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMusicProduction } from '@/hooks/useMusicProduction';
import MusicDiscoveryNav from '@/components/music/MusicDiscoveryNav';
import CyberpunkMusicBg from '@/components/music/CyberpunkMusicBg';
import { Button } from '@/components/ui/button';

const DEFAULT_RULES = {
  version: 1,
  economy: {
    mode: 'free_first',
    local_validation: true,
    selective_regeneration: true,
    reuse_cached_research: true,
  },
  quality: {
    ground_current_facts: true,
    avoid_repeated_phrasing: true,
    keep_show_premise: true,
    require_station_host_name: true,
    require_station_name: true,
  },
  scripts: {
    intro: {
      instruction: '',
      style: 'natural',
    },
    station_id: {
      instruction: '',
      variation: 'high',
      min_words: 24,
      max_words: 38,
    },
    topic_segment: {
      instruction: '',
      style: 'conversational',
    },
    talk_break: {
      instruction: '',
      style: 'conversational',
    },
    song_copy: {
      instruction: '',
      style: 'tight',
    },
    outro: {
      instruction: '',
      style: 'natural',
    },
  },
};

function asObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {}
  }
  return {};
}

function mergeRules(saved) {
  const source = asObject(saved);
  return {
    ...DEFAULT_RULES,
    ...source,
    economy: { ...DEFAULT_RULES.economy, ...asObject(source.economy) },
    quality: { ...DEFAULT_RULES.quality, ...asObject(source.quality) },
    scripts: {
      ...DEFAULT_RULES.scripts,
      ...asObject(source.scripts),
      intro: { ...DEFAULT_RULES.scripts.intro, ...asObject(source.scripts?.intro) },
      station_id: { ...DEFAULT_RULES.scripts.station_id, ...asObject(source.scripts?.station_id) },
      topic_segment: { ...DEFAULT_RULES.scripts.topic_segment, ...asObject(source.scripts?.topic_segment) },
      talk_break: { ...DEFAULT_RULES.scripts.talk_break, ...asObject(source.scripts?.talk_break) },
      song_copy: { ...DEFAULT_RULES.scripts.song_copy, ...asObject(source.scripts?.song_copy) },
      outro: { ...DEFAULT_RULES.scripts.outro, ...asObject(source.scripts?.outro) },
    },
  };
}

function FreeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-emerald-300">
      <Zap className="w-3 h-3" />
      FREE · NO AI CALL
    </span>
  );
}

function RuleToggle({ checked, onChange, label, detail, locked = false }) {
  return (
    <button
      type="button"
      onClick={() => !locked && onChange?.(!checked)}
      className="w-full flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/25 p-3 text-left hover:border-cyan-400/15 transition-colors"
    >
      <span
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
          checked
            ? 'border-cyan-400/45 bg-cyan-500/15 text-cyan-300'
            : 'border-white/15 bg-white/[0.03] text-transparent'
        }`}
      >
        <Check className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          {locked && <span className="text-[8px] uppercase tracking-wider text-white/25">locked</span>}
        </span>
        <span className="block text-[11px] leading-relaxed text-white/35 mt-0.5">{detail}</span>
      </span>
    </button>
  );
}

function ScriptRuleCard({ title, description, value, onChange, children }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/30 overflow-hidden">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-white">{title}</h3>
          <FreeBadge />
        </div>
        <p className="text-[11px] text-white/35 mt-1">{description}</p>
      </div>
      <div className="p-4 space-y-3">
        {children}
        <div>
          <label className="text-[9px] uppercase tracking-[0.18em] text-white/35">Additional Producer Instruction</label>
          <textarea
            value={value || ''}
            onChange={event => onChange?.(event.target.value)}
            placeholder="Optional. Example: Keep this punchy and never use the phrase 'stay tuned.'"
            rows={3}
            maxLength={500}
            className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-white/20 focus:border-cyan-400/30"
          />
          <div className="text-right text-[9px] text-white/20 mt-1">{String(value || '').length}/500</div>
        </div>
      </div>
    </div>
  );
}

export default function RadioProductionTools() {
  const { config, loading, refresh } = useMusicProduction();
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const productionPlan = useMemo(() => asObject(config?.production_plan), [config?.production_plan]);

  useEffect(() => {
    setRules(mergeRules(productionPlan.production_tools));
  }, [productionPlan]);

  const updateQuality = (field, value) => {
    setRules(prev => ({ ...prev, quality: { ...prev.quality, [field]: value } }));
    setSaved(false);
  };

  const updateScript = (segment, patch) => {
    setRules(prev => ({
      ...prev,
      scripts: {
        ...prev.scripts,
        [segment]: { ...prev.scripts[segment], ...patch },
      },
    }));
    setSaved(false);
  };

  const saveRules = async () => {
    if (!config?.id || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await base44.entities.MusicProductionConfiguration.update(config.id, {
        production_plan: {
          ...productionPlan,
          production_tools: rules,
        },
      });
      await refresh();
      setSaved(true);
    } catch (error) {
      console.error('Radio Production Tools save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black grid place-items-center text-white">
        <Loader2 className="w-7 h-7 animate-spin text-cyan-300" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <CyberpunkMusicBg variant="eq" />

      <div className="relative z-10 p-5 md:p-8 space-y-6 max-w-[1500px] mx-auto">
        <MusicDiscoveryNav config={config} />

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="cp-glass overflow-hidden"
          style={{ borderColor: 'rgba(0,255,255,0.16)' }}
        >
          <div className="p-5 md:p-7">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-cyan-300" />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-300 font-bold">Production Tools</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">Prompt Studio + Quality Rules</h1>
                <p className="text-sm text-white/45 mt-2 max-w-3xl leading-relaxed">
                  Teach CREAPD how to produce this show without spending tokens just to change settings. These rules are stored locally with the production and are only read when CREAPD already needs to generate or regenerate material.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {saved && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300">
                    <BadgeCheck className="w-4 h-4" /> Saved
                  </span>
                )}
                <Button onClick={saveRules} disabled={!config?.id || saving} className="cp-btn-gradient border-0 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  Save Rules
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3 mt-6">
              <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <WalletCards className="w-4 h-4 text-emerald-300" />
                  <p className="text-xs font-semibold text-white">FREE-FIRST MODE</p>
                </div>
                <p className="text-[11px] text-white/35 mt-2">Opening, editing, toggling and saving this page makes zero AI calls.</p>
              </div>
              <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-300" />
                  <p className="text-xs font-semibold text-white">CODE VALIDATION FIRST</p>
                </div>
                <p className="text-[11px] text-white/35 mt-2">Identity, word-count, approval and repetition checks run in normal code before another generation is considered.</p>
              </div>
              <div className="rounded-xl border border-fuchsia-400/15 bg-fuchsia-500/[0.04] p-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-fuchsia-300" />
                  <p className="text-xs font-semibold text-white">AI ONLY WHEN NEEDED</p>
                </div>
                <p className="text-[11px] text-white/35 mt-2">Rejected regeneration stays selective. One bad segment should not rebuild the entire show.</p>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid xl:grid-cols-[0.8fr_1.2fr] gap-5 items-start">
          <div className="cp-glass p-5 space-y-3" style={{ borderColor: 'rgba(0,255,255,0.14)' }}>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-300" />
                <h2 className="font-semibold text-white">Quality Rules</h2>
                <FreeBadge />
              </div>
              <p className="text-[11px] text-white/35 mt-1">These are deterministic checks. They do not consume tokens.</p>
            </div>

            <RuleToggle
              checked={rules.quality.require_station_host_name}
              onChange={value => updateQuality('require_station_host_name', value)}
              label="Station IDs must say the host name"
              detail={`Configured host: ${config?.host_name || 'Not set'}`}
              locked
            />
            <RuleToggle
              checked={rules.quality.require_station_name}
              onChange={value => updateQuality('require_station_name', value)}
              label="Station IDs must say the station name"
              detail={`Configured station: ${config?.station_name || 'Not set'}`}
            />
            <RuleToggle
              checked={rules.quality.ground_current_facts}
              onChange={value => updateQuality('ground_current_facts', value)}
              label="Ground current facts in approved research"
              detail="If CREAPD cannot support a current factual claim from approved material, keep the copy evergreen."
            />
            <RuleToggle
              checked={rules.quality.avoid_repeated_phrasing}
              onChange={value => updateQuality('avoid_repeated_phrasing', value)}
              label="Avoid repeated phrasing"
              detail="Compare Station IDs and regenerated copy locally before accepting near-duplicates."
            />
            <RuleToggle
              checked={rules.quality.keep_show_premise}
              onChange={value => updateQuality('keep_show_premise', value)}
              label="Keep scripts tied to the show premise"
              detail="The configured show description and editorial focus remain the primary creative instructions."
            />

            <div className="rounded-xl border border-emerald-400/12 bg-emerald-500/[0.025] p-3 mt-4">
              <p className="text-[9px] uppercase tracking-[0.18em] text-emerald-300 font-bold mb-2">Cost Controls</p>
              <div className="space-y-1.5 text-[11px] text-white/45">
                <p>✓ Local validation before regeneration</p>
                <p>✓ Regenerate rejected material only</p>
                <p>✓ Reuse research already attached to the show</p>
                <p>✓ No AI call just to edit a rule</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <ScriptRuleCard
              title="Station ID"
              description="Controls liners/IDs. Identity checks happen locally after generation."
              value={rules.scripts.station_id.instruction}
              onChange={value => updateScript('station_id', { instruction: value })}
            >
              <div className="grid sm:grid-cols-3 gap-3">
                <label className="text-[10px] text-white/40">
                  Variation
                  <select
                    value={rules.scripts.station_id.variation}
                    onChange={event => updateScript('station_id', { variation: event.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-xs text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="text-[10px] text-white/40">
                  Min words
                  <input
                    type="number"
                    min="8"
                    max="80"
                    value={rules.scripts.station_id.min_words}
                    onChange={event => updateScript('station_id', { min_words: Number(event.target.value || 24) })}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-xs text-white"
                  />
                </label>
                <label className="text-[10px] text-white/40">
                  Max words
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={rules.scripts.station_id.max_words}
                    onChange={event => updateScript('station_id', { max_words: Number(event.target.value || 38) })}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/50 px-2.5 py-2 text-xs text-white"
                  />
                </label>
              </div>
            </ScriptRuleCard>

            <ScriptRuleCard
              title="Show Intro"
              description="How CREAPD opens the show and establishes the premise."
              value={rules.scripts.intro.instruction}
              onChange={value => updateScript('intro', { instruction: value })}
            />

            <ScriptRuleCard
              title="Topic Segments"
              description="How researched discussion should sound on-air."
              value={rules.scripts.topic_segment.instruction}
              onChange={value => updateScript('topic_segment', { instruction: value })}
            />

            <ScriptRuleCard
              title="Talk Breaks"
              description="Controls host commentary between music blocks."
              value={rules.scripts.talk_break.instruction}
              onChange={value => updateScript('talk_break', { instruction: value })}
            />

            <ScriptRuleCard
              title="Song Intro / Outro Copy"
              description="Controls the host copy wrapped around individual tracks."
              value={rules.scripts.song_copy.instruction}
              onChange={value => updateScript('song_copy', { instruction: value })}
            />

            <ScriptRuleCard
              title="Show Outro"
              description="How CREAPD closes and recaps the production."
              value={rules.scripts.outro.instruction}
              onChange={value => updateScript('outro', { instruction: value })}
            />
          </div>
        </section>

        <section className="cp-glass p-5" style={{ borderColor: 'rgba(255,0,255,0.13)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-fuchsia-300" />
            <h2 className="font-semibold text-white">How this affects tokens</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-3 text-[11px]">
            <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
              <p className="font-semibold text-emerald-300">Editing these rules</p>
              <p className="text-white/35 mt-1">FREE. Stored in Neon. No model request.</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
              <p className="font-semibold text-cyan-300">Local quality checks</p>
              <p className="text-white/35 mt-1">FREE. Normal JavaScript validates identity, length, approval and repetition.</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-black/25 p-3">
              <p className="font-semibold text-fuchsia-300">Generate / Regenerate</p>
              <p className="text-white/35 mt-1">AI CALL. CREAPD sends only the smallest relevant context for that material.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
