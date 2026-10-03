import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { shouldUseNeonAuth } from '@/api/neonAuthClient';
import { Button } from '@/components/ui/button';
import CreapdLogo from '@/components/brand/CreapdLogo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SHOW_FORMAT_OPTIONS, TALK_TOPIC_OPTIONS, TONE_OPTIONS, RESEARCH_SOURCE_OPTIONS,
  AI_AUTOMATION_OPTIONS, DEFAULT_AI_AUTOMATION, RUNTIME_DEFAULTS
} from '@/lib/talkConstants';
import {
  ChevronLeft, ChevronRight, Loader2, Mic2, Calendar, Clock,
  Tag, Smile, ListChecks, Search, Users, Bot, CheckCircle2, Building2
} from 'lucide-react';

const STEPS = [
  { label: 'Show Details', icon: Calendar },
  { label: 'Show Format', icon: Mic2 },
  { label: 'Runtime', icon: Clock },
  { label: 'Topics', icon: ListChecks },
  { label: 'Research Sources', icon: Search },
  { label: 'Guests', icon: Users },
  { label: 'Show Tone', icon: Smile },
  { label: 'AI Automation', icon: Bot },
  { label: 'Review', icon: CheckCircle2 }
];

const CARD_PROMPTS = [
  'Tell me about the show we’re making.',
  'What kind of conversation are we producing?',
  'How much time do we have?',
  'What do you want to talk about?',
  'Where should I research?',
  'Who’s joining the conversation?',
  'How should this show feel?',
  'What should I prepare for you?',
  'Ready for me to build the show?'
];

function safeParse(str, fallback) {
  if (!str) return fallback;
  if (Array.isArray(str)) return str;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function TalkConfigure({ embedded = false, onBuilt }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editConfigId = searchParams.get('config_id');
  const ownedPreview = shouldUseNeonAuth();

  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [cardExiting, setCardExiting] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [config, setConfig] = useState({
    production_name: '',
    host_name: '',
    co_host_name: '',
    show_date: new Date().toISOString().split('T')[0],
    show_start_time: '12:00',
    live_or_recorded: 'live',
    station_name: '',
    show_description: '',
    show_format: 'Interview Show',
    ...RUNTIME_DEFAULTS,
    topics: JSON.stringify([]),
    research_sources: JSON.stringify(RESEARCH_SOURCE_OPTIONS),
    show_tone: 'Conversational',
    guest_details: '',
    ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
    status: 'configuring',
    is_default: false
  });

  useEffect(() => {
    if (!editConfigId) return;

    if (ownedPreview) {
      creapdApi.get(`/talk/production?configuration_id=${encodeURIComponent(editConfigId)}`)
        .then(data => {
          if (data?.configuration) {
            setConfig({ ...data.configuration, status: 'configuring' });
          }
        })
        .catch(() => {});
      return;
    }

    base44.entities.TalkProductionConfiguration.get(editConfigId).then(c => {
      if (c) {
        setConfig({ ...c, status: 'configuring' });
      }
    }).catch(() => {});
  }, [editConfigId, ownedPreview]);

  const updateConfig = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field, item) => {
    const arr = safeParse(config[field], []);
    const newArr = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
    updateConfig(field, JSON.stringify(newArr));
  };

  const handleAddCustom = (field) => {
    if (customInput.trim()) {
      toggleArrayItem(field, customInput.trim());
      setCustomInput('');
    }
  };

  const canProceed = () => {
    if (step === 0) return config.production_name && config.show_date;
    return true;
  };

  const changeCard = (nextStep) => {
    if (nextStep === step || nextStep < 0 || nextStep >= STEPS.length) return;
    setCardExiting(true);
    window.setTimeout(() => {
      setStep(nextStep);
      setCardExiting(false);
    }, 240);
  };

  const handleBuild = async () => {
    setBuilding(true);
    setBuildError('');
    try {
      let savedConfig;

      if (ownedPreview) {
        const saveResult = await creapdApi.post('/talk/configuration', {
          ...config,
          ...(editConfigId ? { id: editConfigId } : {}),
        });
        savedConfig = saveResult?.configuration;
        if (!savedConfig?.id) throw new Error('Podcast setup did not return an id.');

        await creapdApi.post('/talk/production', {
          action: 'build',
          configuration_id: savedConfig.id,
        });
      } else {
        if (editConfigId) {
          savedConfig = await base44.entities.TalkProductionConfiguration.update(editConfigId, config);
        } else {
          savedConfig = await base44.entities.TalkProductionConfiguration.create(config);
        }

        await base44.auth.updateMe({
          default_production_type: 'talk',
          default_production_config_id: savedConfig.id
        });
        await base44.entities.TalkProductionConfiguration.update(savedConfig.id, { is_default: true });
        await base44.functions.invoke('buildTalkProduction', { configuration_id: savedConfig.id });
      }

      if (embedded && onBuilt) {
        await onBuilt();
      } else {
        navigate('/podcast');
      }
    } catch (err) {
      setBuildError(
        err?.data?.diagnostic?.message ||
        err?.data?.error ||
        err?.message ||
        'Failed to prepare this podcast. Please try again.'
      );
      setBuilding(false);
    }
  };

  const renderTagSelection = (field, options, isMulti = true) => {
    const selected = isMulti ? safeParse(config[field], []) : [config[field]].filter(Boolean);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => isMulti ? toggleArrayItem(field, opt) : updateConfig(field, opt)}
                className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom(field))}
            placeholder="Add custom..."
            className="max-w-xs"
          />
          <Button variant="outline" size="sm" onClick={() => handleAddCustom(field)}>
            Add
          </Button>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Production Name *</Label>
                <Input value={config.production_name} onChange={e => updateConfig('production_name', e.target.value)} placeholder="The Roundtable" />
              </div>
              <div className="space-y-2">
                <Label>Host Name</Label>
                <Input value={config.host_name} onChange={e => updateConfig('host_name', e.target.value)} placeholder="Host name" />
              </div>
              <div className="space-y-2">
                <Label>Co-Host Name</Label>
                <Input value={config.co_host_name} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Show Date *</Label>
                <Input type="date" value={config.show_date} onChange={e => updateConfig('show_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Show Start Time</Label>
                <Input type="time" value={config.show_start_time} onChange={e => updateConfig('show_start_time', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Live or Recorded</Label>
                <Select value={config.live_or_recorded} onValueChange={v => updateConfig('live_or_recorded', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="recorded">Recorded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Station / Channel Name</Label>
                <Input value={config.station_name} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short Show Description</Label>
              <Textarea value={config.show_description} onChange={e => updateConfig('show_description', e.target.value)} placeholder="Describe your podcast..." rows={3} />
            </div>
          </div>
        );
      case 1:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Select your show format.</p>{renderTagSelection('show_format', SHOW_FORMAT_OPTIONS, false)}</div>;
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Show Runtime (min)</Label>
                <Input type="number" value={config.total_show_runtime} onChange={e => updateConfig('total_show_runtime', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Main Discussion Runtime (min)</Label>
                <Input type="number" value={config.talk_segment_runtime} onChange={e => updateConfig('talk_segment_runtime', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Commercial / Sponsor Runtime (min)</Label>
                <Input type="number" value={config.commercial_sponsor_runtime} onChange={e => updateConfig('commercial_sponsor_runtime', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Intro Runtime (min)</Label>
                <Input type="number" value={config.intro_runtime} onChange={e => updateConfig('intro_runtime', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Outro Runtime (min)</Label>
                <Input type="number" value={config.outro_runtime} onChange={e => updateConfig('outro_runtime', Number(e.target.value))} />
              </div>
            </div>
          </div>
        );
      case 3:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose what topics Producer should research and prepare for discussion.</p>{renderTagSelection('topics', TALK_TOPIC_OPTIONS)}</div>;
      case 4:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">All sources are enabled by default. Disable any you don't want.</p>{renderTagSelection('research_sources', RESEARCH_SOURCE_OPTIONS)}</div>;
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter guest information (one guest per section, separated by blank lines). Include name, title, and any relevant background.</p>
            <Textarea
              value={config.guest_details}
              onChange={e => updateConfig('guest_details', e.target.value)}
              placeholder={"Dr. Jane Smith — Technology Analyst\nExpert in AI ethics and consumer privacy\n\nJohn Doe — Author, 'The Future of Work'"}
              rows={8}
            />
          </div>
        );
      case 6:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Select one primary show tone.</p>{renderTagSelection('show_tone', TONE_OPTIONS, false)}</div>;
      case 7:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose what Producer should automatically generate.</p>{renderTagSelection('ai_automation', AI_AUTOMATION_OPTIONS.map(o => o.key))}</div>;
      case 8:
        return (
          <div className="space-y-6">
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Show Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {config.production_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {config.show_date}</div>
                <div><span className="text-muted-foreground">Host:</span> {config.host_name || 'N/A'}</div>
                <div><span className="text-muted-foreground">Format:</span> {config.show_format}</div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Runtime</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-muted-foreground">Total:</span> {config.total_show_runtime} min</div>
                <div><span className="text-muted-foreground">Talk:</span> {config.talk_segment_runtime} min</div>
                <div><span className="text-muted-foreground">Sponsor:</span> {config.commercial_sponsor_runtime} min</div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Content Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Tone:</span> {config.show_tone}</div>
                <div><span className="text-muted-foreground">Topics:</span> {safeParse(config.topics, []).length} selected</div>
                <div><span className="text-muted-foreground">Sources:</span> {safeParse(config.research_sources, []).length} enabled</div>
                <div><span className="text-muted-foreground">Automation:</span> {safeParse(config.ai_automation, []).length} selected</div>
              </div>
            </div>
            {buildError && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{buildError}</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (building) {
    return (
      <div className="talk-config-interview min-h-full flex items-center justify-center p-6">
        <div className="talk-build-card max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Building2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">CREAPD is building your Podcast episode.</h2>
          <p className="text-white/60 mb-8">I’ve got your answers. Now I’m preparing the episode research, rundown, scripts, and studio package.</p>
          <div className="space-y-3 text-left">
            {['Researching live sources', 'Verifying claims & counter-perspectives', 'Building show rundown', 'Generating host-ready assets'].map((label, i) => (
              <div key={i} className="!flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-white/60">{label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`talk-config-interview ${embedded ? 'talk-config-interview-embedded' : ''}`}>
      <div className="talk-config-dim" aria-hidden="true" />

      <div className="talk-interview-stage">
        <div className="talk-interview-heading">
          <div className="flex items-center justify-center gap-3">
            <CreapdLogo height="h-8" />
            <span className="h-6 w-px bg-white/20" />
            <span className="text-xs font-semibold tracking-[0.28em] text-white/70">PODCAST SETUP</span>
          </div>
          <p className="mt-2 text-center text-xs text-white/45">
            Question {step + 1} of {STEPS.length} · {STEPS[step].label}
          </p>
        </div>

        <div className="talk-cue-stack">
          <div className="talk-cue-card-back talk-cue-card-back-2">
            <CreapdLogo height="h-10" />
          </div>
          <div className="talk-cue-card-back talk-cue-card-back-1">
            <CreapdLogo height="h-10" />
          </div>

          <section
            key={step}
            className={`talk-cue-card ${cardExiting ? 'talk-cue-card-exit' : 'talk-cue-card-enter'}`}
          >
            <div className="talk-cue-card-topline">
              <div className="flex items-center gap-3">
                <CreapdLogo height="h-7" />
                <span className="h-5 w-px bg-white/15" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-300/80">
                  CREAPD asks
                </span>
              </div>
              <span className="text-[10px] text-white/35">{String(step + 1).padStart(2, '0')}</span>
            </div>

            <h1 className="talk-cue-question">{CARD_PROMPTS[step]}</h1>
            <div className="talk-cue-divider" />

            <div className="talk-cue-form">
              {renderStep()}
            </div>

            <div className="talk-cue-actions">
              <Button
                variant="outline"
                onClick={() => changeCard(step - 1)}
                disabled={step === 0 || cardExiting}
                className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous Card
              </Button>

              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => changeCard(step + 1)}
                  disabled={!canProceed() || cardExiting}
                  className="talk-cue-next"
                >
                  Next Card
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleBuild} size="lg" disabled={!canProceed() || cardExiting} className="talk-cue-next">
                  <Building2 className="w-4 h-4 mr-2" />
                  Build My Podcast
                </Button>
              )}
            </div>
          </section>
        </div>

        <div className="talk-interview-progress" aria-label="Configuration progress">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              aria-label={s.label}
              title={s.label}
              onClick={() => i < step && changeCard(i)}
              disabled={i > step || cardExiting}
              className={`talk-interview-dot ${i === step ? 'is-current' : ''} ${i < step ? 'is-complete' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );}
