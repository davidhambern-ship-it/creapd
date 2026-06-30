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
  GENRE_OPTIONS, MOOD_OPTIONS, TONE_OPTIONS, MUSIC_TOPIC_OPTIONS,
  RESEARCH_SOURCE_OPTIONS, ENERGY_FLOW_OPTIONS, AI_AUTOMATION_OPTIONS,
  DEFAULT_AI_AUTOMATION, RUNTIME_DEFAULTS
} from '@/lib/musicConstants';
import {
  ChevronLeft, ChevronRight, Loader2, Music, Calendar, Clock,
  Tag, Smile, Mic, ListChecks, Search, ListFilter, Bot, CheckCircle2, Building2
} from 'lucide-react';

const STEPS = [
  { label: 'Show Details', icon: Calendar },
  { label: 'Music Runtime', icon: Clock },
  { label: 'Genres', icon: Tag },
  { label: 'Mood / Vibe', icon: Smile },
  { label: 'Show Tone', icon: Mic },
  { label: 'Music Topics', icon: ListChecks },
  { label: 'Research Sources', icon: Search },
  { label: 'Playlist Rules', icon: ListFilter },
  { label: 'AI Automation', icon: Bot },
  { label: 'Review', icon: CheckCircle2 }
];

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

export default function MusicConfigure() {
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
    show_start_time: '06:00',
    live_or_recorded: 'live',
    station_name: '',
    show_description: '',
    ...RUNTIME_DEFAULTS,
    genres: JSON.stringify([]),
    moods: JSON.stringify([]),
    show_tone: 'Professional',
    music_topics: JSON.stringify([]),
    research_sources: JSON.stringify(RESEARCH_SOURCE_OPTIONS),
    must_play_songs: '',
    blocked_songs: '',
    blocked_artists: '',
    recently_played_songs: '',
    max_songs_per_artist: 2,
    min_artist_variety: true,
    include_indie: true,
    include_local: false,
    include_new_releases: true,
    include_throwbacks: true,
    clean_only: false,
    explicit_allowed: false,
    preferred_eras: '',
    playlist_energy_flow: 'Build Energy Gradually',
    ai_automation: JSON.stringify(DEFAULT_AI_AUTOMATION),
    status: 'configuring',
    is_default: false
  });

  useEffect(() => {
    if (editConfigId) {
      base44.entities.MusicProductionConfiguration.get(editConfigId).then(c => {
        if (c) {
          setConfig({
            ...c,
            status: 'configuring'
          });
        }
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

  const handleBuild = async () => {
    setBuilding(true);
    setBuildError('');
    try {
      let savedConfig;
      if (editConfigId) {
        savedConfig = await base44.entities.MusicProductionConfiguration.update(editConfigId, config);
      } else {
        savedConfig = await base44.entities.MusicProductionConfiguration.create(config);
      }

      await base44.auth.updateMe({
        default_production_type: 'music',
        default_production_config_id: savedConfig.id
      });
      await base44.entities.MusicProductionConfiguration.update(savedConfig.id, { is_default: true });

      await base44.functions.invoke('buildMusicProduction', { configuration_id: savedConfig.id });

      navigate('/music/dashboard');
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
          <Button variant="outline" size="sm" onClick={() => handleAddCustom(field)}>
            Add
          </Button>
        </div>
      </div>
    );
  };

  const renderToggle = (field, label) => (
    <div className="flex items-center justify-between py-2">
      <Label className="text-sm">{label}</Label>
      <Switch
        checked={config[field]}
        onCheckedChange={(checked) => updateConfig(field, checked)}
      />
    </div>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Production Name *</Label>
                <Input value={config.production_name} onChange={e => updateConfig('production_name', e.target.value)} placeholder="Morning Beats" />
              </div>
              <div className="space-y-2">
                <Label>Host Name</Label>
                <Input value={config.host_name} onChange={e => updateConfig('host_name', e.target.value)} placeholder="DJ Berna" />
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
                <Input value={config.station_name} onChange={e => updateConfig('station_name', e.target.value)} placeholder="Beat Radio" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Short Show Description</Label>
              <Textarea value={config.show_description} onChange={e => updateConfig('show_description', e.target.value)} placeholder="Describe your show..." rows={3} />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="glass-panel p-4 border-primary/20 mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Required Music Runtime</span> controls the playlist length. The remaining time is used for talk breaks, topics, sponsors, intro, and outro.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Show Runtime (min)</Label>
                <Input type="number" value={config.total_show_runtime} onChange={e => updateConfig('total_show_runtime', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Required Music Runtime (min) *</Label>
                <Input type="number" value={config.required_music_runtime} onChange={e => updateConfig('required_music_runtime', Number(e.target.value))} className="border-primary/50" />
              </div>
              <div className="space-y-2">
                <Label>Talk / Segment Runtime (min)</Label>
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
      case 2:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Select one or more genres for your show.</p>{renderTagSelection('genres', GENRE_OPTIONS)}</div>;
      case 3:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Select one or more moods for your show.</p>{renderTagSelection('moods', MOOD_OPTIONS)}</div>;
      case 4:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Select one primary show tone.</p>{renderTagSelection('show_tone', TONE_OPTIONS, false)}</div>;
      case 5:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose what music topics Producer should prepare. Only selected topics will appear in your dashboard.</p>{renderTagSelection('music_topics', MUSIC_TOPIC_OPTIONS)}</div>;
      case 6:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">All sources are enabled by default. Disable any you don't want.</p>{renderTagSelection('research_sources', RESEARCH_SOURCE_OPTIONS)}</div>;
      case 7:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Must-Play Songs</Label>
                <Textarea value={config.must_play_songs} onChange={e => updateConfig('must_play_songs', e.target.value)} placeholder="One per line: Song - Artist" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Blocked Songs</Label>
                <Textarea value={config.blocked_songs} onChange={e => updateConfig('blocked_songs', e.target.value)} placeholder="One per line" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Blocked Artists</Label>
                <Textarea value={config.blocked_artists} onChange={e => updateConfig('blocked_artists', e.target.value)} placeholder="One per line" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Recently Played (avoid)</Label>
                <Textarea value={config.recently_played_songs} onChange={e => updateConfig('recently_played_songs', e.target.value)} placeholder="One per line" rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Max Songs Per Artist</Label>
                <Input type="number" value={config.max_songs_per_artist} onChange={e => updateConfig('max_songs_per_artist', Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Preferred Eras / Decades</Label>
                <Input value={config.preferred_eras} onChange={e => updateConfig('preferred_eras', e.target.value)} placeholder="e.g. 90s, 2000s, 2010s" />
              </div>
              <div className="space-y-2">
                <Label>Playlist Energy Flow</Label>
                <Select value={config.playlist_energy_flow} onValueChange={v => updateConfig('playlist_energy_flow', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENERGY_FLOW_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="glass-panel p-4 space-y-1">
              {renderToggle('min_artist_variety', 'Minimum Artist Variety')}
              {renderToggle('include_indie', 'Include Independent Artists')}
              {renderToggle('include_local', 'Include Local Artists')}
              {renderToggle('include_new_releases', 'Include New Releases')}
              {renderToggle('include_throwbacks', 'Include Throwbacks')}
              {renderToggle('clean_only', 'Clean Only')}
              {renderToggle('explicit_allowed', 'Explicit Allowed')}
            </div>
          </div>
        );
      case 8:
        return <div className="space-y-3"><p className="text-sm text-muted-foreground mb-4">Choose what Producer should automatically generate.</p>{renderTagSelection('ai_automation', AI_AUTOMATION_OPTIONS.map(o => o.key))}</div>;
      case 9:
        return (
          <div className="space-y-6">
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Show Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {config.production_name}</div>
                <div><span className="text-muted-foreground">Date:</span> {config.show_date}</div>
                <div><span className="text-muted-foreground">Host:</span> {config.host_name || 'N/A'}</div>
                <div><span className="text-muted-foreground">Station:</span> {config.station_name || 'N/A'}</div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Runtime</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-muted-foreground">Total:</span> {config.total_show_runtime} min</div>
                <div><span className="text-muted-foreground">Music:</span> {config.required_music_runtime} min</div>
                <div><span className="text-muted-foreground">Talk:</span> {config.talk_segment_runtime} min</div>
              </div>
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-heading font-semibold mb-3">Music Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="text-muted-foreground">Genres:</span> {safeParse(config.genres, []).join(', ') || 'None'}</div>
                <div><span className="text-muted-foreground">Moods:</span> {safeParse(config.moods, []).join(', ') || 'None'}</div>
                <div><span className="text-muted-foreground">Tone:</span> {config.show_tone}</div>
                <div><span className="text-muted-foreground">Topics:</span> {safeParse(config.music_topics, []).length} selected</div>
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Building2 className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Music Production</h2>
          <p className="text-muted-foreground mb-8">Producer is generating your playlist, research, topics, rundown, and AI assets. This takes about 30-60 seconds.</p>
          <div className="space-y-3 text-left">
            {['Generating playlist plan', 'Researching music topics', 'Building show rundown', 'Generating AI assets'].map((label, i) => (
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
            <Music className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Music Production Configuration</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step].label}</p>
          </div>
        </div>

        {/* Step indicator */}
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

        {/* Step content */}
        <div className="glass-panel p-6 md:p-8 mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >
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