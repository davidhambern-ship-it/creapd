import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SHOW_FORMAT_OPTIONS, SPORT_OPTIONS, TONE_OPTIONS, RESEARCH_SOURCE_OPTIONS,
  AI_AUTOMATION_OPTIONS, DEFAULT_AI_AUTOMATION, RUNTIME_DEFAULTS
} from '@/lib/sportsConstants';
import {
  ChevronLeft, ChevronRight, Loader2, Trophy, Calendar, Clock,
  Smile, ListChecks, Search, Users, Bot, CheckCircle2, Building2
} from 'lucide-react';

const STEPS = [
  { label: 'Show Details', icon: Calendar },
  { label: 'Show Format', icon: Trophy },
  { label: 'Runtime', icon: Clock },
  { label: 'Sports', icon: ListChecks },
  { label: 'Research Sources', icon: Search },
  { label: 'Guests', icon: Users },
  { label: 'Show Tone', icon: Smile },
  { label: 'AI Automation', icon: Bot },
  { label: 'Review', icon: CheckCircle2 }
];

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function SportsConfigure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editConfigId = searchParams.get('config_id');

  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [config, setConfig] = useState({
    production_name: '',
    host_name: '',
    co_host_name: '',
    show_date: new Date().toISOString().split('T')[0],
    show_start_time: '18:00',
    live_or_recorded: 'live',
    station_name: '',
    show_description: '',
    show_format: 'Game Preview',
    ...RUNTIME_DEFAULTS,
    sports: JSON.stringify([]),
    research_sources: JSON.stringify(RESEARCH_SOURCE_OPTIONS),
    show_tone: 'Energetic & Analytical',
    guest_details: '',
    ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
    status: 'configuring',
    is_default: false
  });

  useEffect(() => {
    if (editConfigId) {
      base44.entities.SportsProductionConfiguration.get(editConfigId).then(c => {
        if (c) setConfig({ ...c, status: 'configuring' });
      }).catch(() => {});
    }
  }, [editConfigId]);

  const updateConfig = (field, value) => setConfig(prev => ({ ...prev, [field]: value }));

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

  const handleBuild = async () => {
    setBuilding(true);
    setBuildError('');
    try {
      let savedConfig;
      if (editConfigId) {
        savedConfig = await base44.entities.SportsProductionConfiguration.update(editConfigId, config);
      } else {
        savedConfig = await base44.entities.SportsProductionConfiguration.create(config);
      }

      await base44.auth.updateMe({
        default_production_type: 'sports',
        default_production_config_id: savedConfig.id
      });
      await base44.entities.SportsProductionConfiguration.update(savedConfig.id, { is_default: true });

      await base44.functions.invoke('buildSportsProduction', { configuration_id: savedConfig.id });

      navigate('/sports/dashboard');
    } catch (err) {
      setBuildError(err.message || 'Failed to build production. Please try again.');
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
          <Button variant="outline" size="sm" onClick={() => handleAddCustom(field)}>Add</Button>
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
                <Input value={config.production_name} onChange={e => updateConfig('production_name', e.target.value)} placeholder="The Sports Desk" />
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
              <Textarea value={config.show_description} onChange={e => updateConfig('show_description', e.target.value)} placeholder="Describe your sports show..." rows={3} />
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
                <Label>Sports / Discussion Runtime (min)</Label>
                <Input type="number" value={config.sports_segment_runtime} onChange={e => updateConfig('sports_segment_runtime', Number(e.target.value))} />
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
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose which sports Producer should research and prepare games for.</p>{renderTagSelection('sports', SPORT_OPTIONS)}</div>;
      case 4:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">All sources are enabled by default. Disable any you don't want.</p>{renderTagSelection('research_sources', RESEARCH_SOURCE_OPTIONS)}</div>;
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter guest athlete/coach information (one guest per section, separated by blank lines). Include name, role, and any relevant background.</p>
            <Textarea
              value={config.guest_details}
              onChange={e => updateConfig('guest_details', e.target.value)}
              placeholder={"Coach Mike Johnson — Head Coach, City Tigers\n15 years coaching experience, two championship rings\n\nAlex Rivera — Quarterback, City Tigers\nRookie of the Year, 3,500 passing yards this season"}
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
                <div><span className="text-muted-foreground">Sports:</span> {config.sports_segment_runtime} min</div>
                <div><span className="text-muted-foreground">Sponsor:</span> {config.commercial_sponsor_runtime} min</div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Content Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Tone:</span> {config.show_tone}</div>
                <div><span className="text-muted-foreground">Sports:</span> {safeParse(config.sports, []).length} selected</div>
                <div><span className="text-muted-foreground">Sources:</span> {safeParse(config.research_sources, []).length} enabled</div>
                <div><span className="text-muted-foreground">Automation:</span> {safeParse(config.ai_automation, []).length} selected</div>
              </div>
            </div>
            {buildError && <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{buildError}</div>}
          </div>
        );
      default: return null;
    }
  };

  if (building) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Building2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Sports Production</h2>
          <p className="text-muted-foreground mb-8">Producer is generating research, games, matchups, rundown, and AI assets. This takes about 30-60 seconds.</p>
          <div className="space-y-3 text-left">
            {['Researching sports', 'Generating games & matchups', 'Building show rundown', 'Generating AI assets'].map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">{label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 md:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Sports Production Configuration</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step].label}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={i}>
                <button
                  onClick={() => i < step && setStep(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    i === step ? 'bg-primary text-primary-foreground font-medium' : i < step ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <div className="w-2 h-px bg-border" />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="glass-panel p-6 md:p-8 mb-6">{renderStep()}</div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={!canProceed()}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleBuild} size="lg" disabled={!canProceed()}>
              <Building2 className="w-4 h-4 mr-2" /> Build Production
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}