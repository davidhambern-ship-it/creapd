import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  RESEARCH_DEPTH_OPTIONS, SOURCE_DOMAIN_OPTIONS, RESEARCH_METHODOLOGY_OPTIONS,
  TONE_OPTIONS, READING_STYLE_OPTIONS, PREFERRED_MODEL_OPTIONS, RUNTIME_DEFAULTS
} from '@/lib/researchConstants';
import {
  ChevronLeft, ChevronRight, Loader2, FlaskConical, Calendar, Clock,
  Search, Smile, Bot, CheckCircle2, Building2, Target, ShieldCheck
} from 'lucide-react';

const STEPS = [
  { label: 'Production Details', icon: Calendar },
  { label: 'Host & Station', icon: FlaskConical },
  { label: 'Runtime', icon: Clock },
  { label: 'Research Depth', icon: Search },
  { label: 'Source Domains', icon: Target },
  { label: 'Methodology', icon: ShieldCheck },
  { label: 'Tone & Style', icon: Smile },
  { label: 'AI Models', icon: Bot },
  { label: 'Review', icon: CheckCircle2 }
];

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function ResearchConfigure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editConfigId = searchParams.get('config_id');

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [config, setConfig] = useState({
    production_name: '',
    host_name: '',
    co_host_name: '',
    show_date: new Date().toISOString().split('T')[0],
    show_start_time: '12:00',
    live_or_recorded: 'recorded',
    station_name: '',
    show_description: '',
    ...RUNTIME_DEFAULTS,
    research_depth: 'standard',
    source_domains: JSON.stringify(SOURCE_DOMAIN_OPTIONS),
    research_methodology: JSON.stringify(['Literature Review', 'Data Analysis', 'Fact-Checking']),
    target_audience: 'General Public',
    tone: 'educational',
    reading_style: 'documentary',
    preferred_models: JSON.stringify(['gemini_3_flash', 'gpt_5_mini', 'claude_sonnet_4_6']),
    blocked_topics: JSON.stringify([]),
    must_include: JSON.stringify([]),
    fact_check_required: true,
    citation_required: true,
    max_points_per_topic: 10,
    status: 'configuring',
    is_default: false
  });

  useEffect(() => {
    if (editConfigId) {
      base44.entities.ResearchProductionConfiguration.get(editConfigId).then(c => {
        if (c) setConfig({ ...c, status: 'configuring' });
      }).catch(() => {});
    }
  }, [editConfigId]);

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

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      let savedConfig;
      if (editConfigId) {
        savedConfig = await base44.entities.ResearchProductionConfiguration.update(editConfigId, config);
      } else {
        savedConfig = await base44.entities.ResearchProductionConfiguration.create(config);
      }

      await base44.auth.updateMe({
        default_production_type: 'research',
        default_production_config_id: savedConfig.id
      });
      await base44.entities.ResearchProductionConfiguration.update(savedConfig.id, { is_default: true, status: 'ready' });

      navigate('/research');
    } catch (err) {
      setSaveError(err.message || 'Failed to save configuration.');
      setSaving(false);
    }
  };

  const renderTagSelection = (field, options, isMulti = true) => {
    const selected = isMulti ? safeParse(config[field], []) : [config[field]].filter(Boolean);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            const isSelected = selected.includes(val);
            return (
              <button
                key={val}
                type="button"
                onClick={() => isMulti ? toggleArrayItem(field, val) : updateConfig(field, val)}
                className="px-3 py-2 rounded-lg text-sm border transition-all"
                style={isSelected
                  ? { background: 'hsl(190 50% 15% / 0.4)', borderColor: 'hsl(190 50% 28% / 0.5)', color: 'hsl(190 80% 55%)' }
                  : { background: 'transparent', borderColor: 'hsl(190 15% 18% / 0.5)', color: 'hsl(220 10% 55%)' }
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        {isMulti && (
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
        )}
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
                <Input value={config.production_name} onChange={e => updateConfig('production_name', e.target.value)} placeholder="Deep Research: AI in Healthcare" />
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
            </div>
            <div className="space-y-2">
              <Label>Production Description</Label>
              <Textarea value={config.show_description} onChange={e => updateConfig('show_description', e.target.value)} placeholder="Describe the focus of this research production..." rows={3} />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Host / Narrator Name</Label>
              <Input value={config.host_name} onChange={e => updateConfig('host_name', e.target.value)} placeholder="Host name" />
            </div>
            <div className="space-y-2">
              <Label>Co-Host / Researcher Name</Label>
              <Input value={config.co_host_name} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Station / Channel Name</Label>
              <Input value={config.station_name} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Input value={config.target_audience} onChange={e => updateConfig('target_audience', e.target.value)} placeholder="General Public" />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Show Runtime (min)</Label>
              <Input type="number" value={config.total_show_runtime} onChange={e => updateConfig('total_show_runtime', Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Max Points Per Topic</Label>
              <Input type="number" value={config.max_points_per_topic} onChange={e => updateConfig('max_points_per_topic', Number(e.target.value))} />
              <p className="text-xs text-muted-foreground">Maximum Point Cards generated per research topic</p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">How deep should the research go?</p>
            <div className="space-y-2">
              {RESEARCH_DEPTH_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateConfig('research_depth', opt.value)}
                  className="w-full text-left p-4 rounded-lg border transition-all"
                  style={config.research_depth === opt.value
                    ? { background: 'hsl(190 50% 15% / 0.3)', borderColor: 'hsl(190 50% 28% / 0.5)' }
                    : { background: 'transparent', borderColor: 'hsl(190 15% 18% / 0.3)' }
                  }
                >
                  <p className="font-medium text-sm" style={config.research_depth === opt.value ? { color: 'hsl(190 80% 55%)' } : {}}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Select which source domains to search during research.</p>{renderTagSelection('source_domains', SOURCE_DOMAIN_OPTIONS)}</div>;
      case 5:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose research methodologies to apply.</p>{renderTagSelection('research_methodology', RESEARCH_METHODOLOGY_OPTIONS)}</div>;
      case 6:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Tone</Label>
              {renderTagSelection('tone', TONE_OPTIONS, false)}
            </div>
            <div>
              <Label className="mb-3 block">Reading Style</Label>
              {renderTagSelection('reading_style', READING_STYLE_OPTIONS, false)}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-3 block">Preferred AI Models for Synthesis</Label>
              {renderTagSelection('preferred_models', PREFERRED_MODEL_OPTIONS)}
              <p className="text-xs text-muted-foreground mt-2">These models run in parallel, then a Chief Editor synthesizes the best output.</p>
            </div>
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Fact-Check Required</Label>
                  <p className="text-xs text-muted-foreground">Require source verification for all claims</p>
                </div>
                <Switch checked={config.fact_check_required} onCheckedChange={v => updateConfig('fact_check_required', v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Citation Required</Label>
                  <p className="text-xs text-muted-foreground">Include source citations in all outputs</p>
                </div>
                <Switch checked={config.citation_required} onCheckedChange={v => updateConfig('citation_required', v)} />
              </div>
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6">
            <div className="cc-glass-card p-5">
              <h3 className="font-heading font-semibold mb-3" style={{ color: 'hsl(190 80% 55%)' }}>Production Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {config.production_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {config.show_date}</div>
                <div><span className="text-muted-foreground">Host:</span> {config.host_name || 'N/A'}</div>
                <div><span className="text-muted-foreground">Depth:</span> {config.research_depth}</div>
              </div>
            </div>
            <div className="cc-glass-card p-5">
              <h3 className="font-heading font-semibold mb-3" style={{ color: 'hsl(190 80% 55%)' }}>Research Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Tone:</span> {config.tone}</div>
                <div><span className="text-muted-foreground">Reading Style:</span> {config.reading_style}</div>
                <div><span className="text-muted-foreground">Source Domains:</span> {safeParse(config.source_domains, []).length} selected</div>
                <div><span className="text-muted-foreground">Methodologies:</span> {safeParse(config.research_methodology, []).length} selected</div>
                <div><span className="text-muted-foreground">AI Models:</span> {safeParse(config.preferred_models, []).length} selected</div>
                <div><span className="text-muted-foreground">Max Points/Topic:</span> {config.max_points_per_topic}</div>
                <div><span className="text-muted-foreground">Fact-Check:</span> {config.fact_check_required ? 'Yes' : 'No'}</div>
              </div>
            </div>
            {saveError && (
              <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">{saveError}</div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (saving) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="max-w-md w-full text-center cc-animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 cc-animate-scale-in" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
            <Building2 className="w-8 h-8 animate-pulse" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Saving Configuration</h2>
          <p className="text-muted-foreground mb-8">Setting up your research production workspace...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'hsl(190 80% 55%)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 cc-animate-fade-up">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'hsl(190 50% 15% / 0.3)', border: '1px solid hsl(190 40% 28% / 0.4)' }}>
          <FlaskConical className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-heading font-bold">Research Production Configuration</h1>
          <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step].label}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Vertical step rail */}
        <div className="lg:w-64 shrink-0">
          <div className="cc-glass-card p-3 space-y-1 lg:sticky lg:top-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={i}
                  onClick={() => i < step && setStep(i)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all"
                  style={isActive
                    ? { background: 'linear-gradient(135deg, hsl(190 50% 12% / 0.4), hsl(190 30% 6% / 0.2))', border: '1px solid hsl(190 50% 28% / 0.5)', color: 'hsl(35 90% 60%)' }
                    : isDone
                      ? { color: 'hsl(190 80% 55%)', border: '1px solid transparent' }
                      : { color: 'hsl(220 10% 55%)', border: '1px solid transparent' }
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">{s.label}</span>
                  {isDone && <CheckCircle2 className="w-3 h-3 ml-auto" style={{ color: 'hsl(152 60% 50%)' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Content panel */}
        <div className="flex-1 min-w-0">
          <div className="cc-glass-card p-5 md:p-7 mb-4 cc-animate-fade-up" key={step}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'hsl(190 40% 12% / 0.3)' }}>
                {React.createElement(STEPS[step].icon, { className: "w-3.5 h-3.5", style: { color: 'hsl(190 60% 50% / 0.7)' } })}
              </div>
              <h2 className="font-heading font-semibold text-sm uppercase tracking-wider" style={{ color: 'hsl(190 60% 50% / 0.8)' }}>{STEPS[step].label}</h2>
            </div>
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'hsl(190 20% 12% / 0.3)', border: '1px solid hsl(190 20% 18% / 0.3)', color: 'hsl(220 10% 65%)' }}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, hsl(190 50% 18% / 0.5), hsl(190 40% 10% / 0.3))', border: '1px solid hsl(190 50% 28% / 0.5)', color: 'hsl(35 90% 60%)' }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!canProceed()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, hsl(152 50% 18% / 0.4), hsl(152 40% 10% / 0.2))', border: '1px solid hsl(152 50% 28% / 0.5)', color: 'hsl(152 60% 55%)' }}
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Start
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}