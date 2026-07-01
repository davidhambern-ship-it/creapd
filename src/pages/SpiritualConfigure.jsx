import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FAITH_TRADITIONS, DENOMINATIONS_BY_TRADITION, PRODUCTION_TYPE_OPTIONS,
  AUDIENCE_OPTIONS, SACRED_TEXTS_BY_TRADITION, STUDY_RESOURCE_OPTIONS,
  STUDY_TOPIC_OPTIONS, RESEARCH_SOURCE_OPTIONS, SPEAKER_TONE_OPTIONS,
  AI_AUTOMATION_OPTIONS, DEFAULT_AI_AUTOMATION, RUNTIME_OPTIONS
} from '@/lib/spiritualConstants';
import {
  ChevronLeft, ChevronRight, Loader2, Church, Calendar, Clock,
  Users, BookOpen, GraduationCap, ListChecks, Search, Bot,
  CheckCircle2, Building2, MapPin
} from 'lucide-react';

const STEPS = [
  { label: 'Production Info', icon: Calendar },
  { label: 'Faith Tradition', icon: Church },
  { label: 'Branch / Denomination', icon: Users },
  { label: 'Production Type', icon: ListChecks },
  { label: 'Audience', icon: Users },
  { label: 'Sacred Texts', icon: BookOpen },
  { label: 'Study Resources', icon: GraduationCap },
  { label: 'Study Topics', icon: ListChecks },
  { label: 'Research Sources', icon: Search },
  { label: 'AI Automation', icon: Bot },
  { label: 'Review', icon: CheckCircle2 }
];

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function SpiritualConfigure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editConfigId = searchParams.get('config_id');

  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [config, setConfig] = useState({
    production_name: '',
    speaker_name: '',
    co_host_name: '',
    production_date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    live_or_recorded: 'live',
    location: '',
    organization_name: '',
    production_description: '',
    series_name: '',
    episode_number: '',
    faith_tradition: 'Christianity',
    branch_denomination: 'No Preference',
    production_type: 'Sermon',
    audience: 'General Audience',
    sacred_texts: JSON.stringify([]),
    default_translation: '',
    study_resources: JSON.stringify([]),
    study_topics: JSON.stringify([]),
    research_sources: JSON.stringify(RESEARCH_SOURCE_OPTIONS),
    current_events_enabled: true,
    comparative_study_mode: false,
    multiple_perspectives: true,
    speaker_tone: 'Inspirational',
    target_runtime: '30 Minutes',
    ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
    status: 'configuring',
    is_default: false
  });

  useEffect(() => {
    if (editConfigId) {
      base44.entities.SpiritualProductionConfiguration.get(editConfigId).then(c => {
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
    if (step === 0) return config.production_name && config.production_date;
    if (step === 1) return config.faith_tradition;
    return true;
  };

  const handleBuild = async () => {
    setBuilding(true);
    setBuildError('');
    try {
      let savedConfig;
      if (editConfigId) {
        savedConfig = await base44.entities.SpiritualProductionConfiguration.update(editConfigId, config);
      } else {
        savedConfig = await base44.entities.SpiritualProductionConfiguration.create(config);
      }

      await base44.auth.updateMe({
        default_production_type: 'spiritual',
        default_production_config_id: savedConfig.id
      });
      await base44.entities.SpiritualProductionConfiguration.update(savedConfig.id, { is_default: true });

      await base44.functions.invoke('buildSpiritualProduction', { configuration_id: savedConfig.id });

      navigate('/spiritual/dashboard');
    } catch (err) {
      setBuildError(err.message || 'Failed to build production. Please try again.');
      setBuilding(false);
    }
  };

  const renderTagSelection = (field, options) => {
    const selected = safeParse(config[field], []);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {options.map(opt => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleArrayItem(field, opt)}
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

  const renderToggle = (field, label) => (
    <div className="flex items-center justify-between py-2">
      <Label className="text-sm">{label}</Label>
      <Switch checked={config[field]} onCheckedChange={(checked) => updateConfig(field, checked)} />
    </div>
  );

  const traditionTexts = SACRED_TEXTS_BY_TRADITION[config.faith_tradition] || ['Custom Sacred Texts'];

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Production Name *</Label>
                <Input value={config.production_name} onChange={e => updateConfig('production_name', e.target.value)} placeholder="Sunday Morning Sermon" />
              </div>
              <div className="space-y-2">
                <Label>Speaker / Host</Label>
                <Input value={config.speaker_name} onChange={e => updateConfig('speaker_name', e.target.value)} placeholder="Pastor John" />
              </div>
              <div className="space-y-2">
                <Label>Co-Host / Co-Speaker</Label>
                <Input value={config.co_host_name} onChange={e => updateConfig('co_host_name', e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={config.production_date} onChange={e => updateConfig('production_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={config.start_time} onChange={e => updateConfig('start_time', e.target.value)} />
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
                <Label>Location</Label>
                <Input value={config.location} onChange={e => updateConfig('location', e.target.value)} placeholder="Main Sanctuary" />
              </div>
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input value={config.organization_name} onChange={e => updateConfig('organization_name', e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Series Name</Label>
                <Input value={config.series_name} onChange={e => updateConfig('series_name', e.target.value)} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Episode Number</Label>
                <Input value={config.episode_number} onChange={e => updateConfig('episode_number', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Production Description</Label>
              <Textarea value={config.production_description} onChange={e => updateConfig('production_description', e.target.value)} placeholder="Describe your production..." rows={3} />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="glass-panel p-4 border-primary/20 mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Faith Tradition</span> controls the entire production experience — sacred texts, study resources, terminology, research sources, and AI behavior all adapt to this selection.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {FAITH_TRADITIONS.map(tradition => (
                <button
                  key={tradition}
                  type="button"
                  onClick={() => {
                    updateConfig('faith_tradition', tradition);
                    updateConfig('branch_denomination', 'No Preference');
                    updateConfig('sacred_texts', JSON.stringify([]));
                    updateConfig('default_translation', '');
                  }}
                  className={`p-4 rounded-lg text-sm font-medium border transition-all text-left ${
                    config.faith_tradition === tradition
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {tradition}
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Select your preferred branch, denomination, school, or lineage for {config.faith_tradition}.</p>
            <div className="flex flex-wrap gap-2">
              {(DENOMINATIONS_BY_TRADITION[config.faith_tradition] || ['No Preference', 'Custom']).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateConfig('branch_denomination', opt)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    config.branch_denomination === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">What type of production are you creating today?</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PRODUCTION_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateConfig('production_type', opt)}
                  className={`p-3 rounded-lg text-sm font-medium border transition-all text-left ${
                    config.production_type === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Select your target audience to tailor the generated material.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AUDIENCE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateConfig('audience', opt)}
                  className={`p-3 rounded-lg text-sm font-medium border transition-all text-left ${
                    config.audience === opt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Speaker Tone</Label>
                <Select value={config.speaker_tone} onValueChange={v => updateConfig('speaker_tone', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPEAKER_TONE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Target Runtime</Label>
                <Select value={config.target_runtime} onValueChange={v => updateConfig('target_runtime', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RUNTIME_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4">
            <div className="glass-panel p-4 border-primary/20 mb-4">
              <p className="text-sm text-muted-foreground">
                Select which sacred texts and translations Producer may reference for <span className="font-medium text-foreground">{config.faith_tradition}</span>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {traditionTexts.map(opt => {
                const isSelected = safeParse(config.sacred_texts, []).includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleArrayItem('sacred_texts', opt)}
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
            <div className="space-y-2 mt-4">
              <Label>Default Translation / Edition</Label>
              <Input value={config.default_translation} onChange={e => updateConfig('default_translation', e.target.value)} placeholder="e.g. English Standard Version (ESV)" />
              <p className="text-xs text-muted-foreground">This will be the primary reference throughout the production unless another version is specifically requested.</p>
            </div>
          </div>
        );
      case 6:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Select which supporting study resources Producer may use.</p>{renderTagSelection('study_resources', STUDY_RESOURCE_OPTIONS)}</div>;
      case 7:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose which topics Producer should automatically research and prepare.</p>{renderTagSelection('study_topics', STUDY_TOPIC_OPTIONS)}</div>;
      case 8:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Determine where Producer gathers information. All sources are enabled by default.</p>
            {renderTagSelection('research_sources', RESEARCH_SOURCE_OPTIONS)}
            <div className="glass-panel p-4 space-y-1 mt-4">
              {renderToggle('current_events_enabled', 'Enable Current Events Research')}
              {renderToggle('comparative_study_mode', 'Comparative Study Mode')}
              {renderToggle('multiple_perspectives', 'Display Multiple Perspectives')}
            </div>
          </div>
        );
      case 9:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose what Producer should automatically generate.</p>{renderTagSelection('ai_automation', AI_AUTOMATION_OPTIONS.map(o => o.key))}</div>;
      case 10:
        return (
          <div className="space-y-6">
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Production Information</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {config.production_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {config.production_date}</div>
                <div><span className="text-muted-foreground">Speaker:</span> {config.speaker_name || 'N/A'}</div>
                <div><span className="text-muted-foreground">Location:</span> {config.location || 'N/A'}</div>
                <div><span className="text-muted-foreground">Type:</span> {config.production_type}</div>
                <div><span className="text-muted-foreground">Audience:</span> {config.audience}</div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Faith Configuration</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Faith Tradition:</span> {config.faith_tradition}</div>
                <div><span className="text-muted-foreground">Branch/Denomination:</span> {config.branch_denomination}</div>
                <div><span className="text-muted-foreground">Sacred Texts:</span> {safeParse(config.sacred_texts, []).length} selected</div>
                <div><span className="text-muted-foreground">Default Translation:</span> {config.default_translation || 'Default'}</div>
                <div><span className="text-muted-foreground">Speaker Tone:</span> {config.speaker_tone}</div>
                <div><span className="text-muted-foreground">Runtime:</span> {config.target_runtime}</div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Study & Research</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Study Resources:</span> {safeParse(config.study_resources, []).length} selected</div>
                <div><span className="text-muted-foreground">Study Topics:</span> {safeParse(config.study_topics, []).length} selected</div>
                <div><span className="text-muted-foreground">Research Sources:</span> {safeParse(config.research_sources, []).length} enabled</div>
                <div><span className="text-muted-foreground">Current Events:</span> {config.current_events_enabled ? 'Enabled' : 'Disabled'}</div>
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Building2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Spiritual Production</h2>
          <p className="text-muted-foreground mb-8">Producer is generating your research, study topics, message, presentation slides, and AI assets. This takes about 30-60 seconds.</p>
          <div className="space-y-3 text-left">
            {['Gathering research from approved sources', 'Preparing study topics and passages', 'Building message outline and sections', 'Generating AI assets and package'].map((label, i) => (
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
            <Church className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Spiritual Production Configuration</h1>
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
                    i === step
                      ? 'bg-primary text-primary-foreground font-medium'
                      : i < step
                        ? 'text-primary hover:bg-primary/10'
                        : 'text-muted-foreground'
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

        <div className="glass-panel p-6 md:p-8 mb-6">
          {renderStep()}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={!canProceed()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleBuild} size="lg" disabled={!canProceed()}>
              <Building2 className="w-4 h-4 mr-2" />
              Build Production
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}