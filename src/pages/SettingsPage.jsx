import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Check, RotateCcw, AlertTriangle, UserCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import TagInput from '@/components/weekly/TagInput';
import AISettingsPanel from '@/components/settings/AISettingsPanel';
import { CATEGORIES, BRIEFING_TYPES, BRIEF_LENGTHS, stringifyJSON, parseJSON } from '@/lib/weeklyConstants';

const DAYS_OF_WEEK = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.ProducerSettings.filter({}, '-created_date', 1),
      base44.entities.ProducerPreferences.filter({}, '-created_date', 1),
      base44.auth.me().catch(() => null),
    ]).then(([settingsRes, prefsRes, user]) => {
      setCurrentUser(user);
      if (settingsRes.length > 0) {
        setSettings(settingsRes[0]);
      } else {
        setSettings({
          profile_name: 'Berna',
          timezone: 'America/New_York',
          brief_time: '06:00',
          active_days: 'sun,mon,tue,wed,thu,fri',
          skip_saturday: true,
          min_opportunity_score: 2,
          block_recycled: true,
          require_approval: false,
          credibility_threshold: 3,
          export_format: 'pdf',
          echo_tone: 'professional',
          briefing_length: 'standard',
          notification_enabled: true,
        });
      }
      if (prefsRes.length > 0) {
        setPrefs(prefsRes[0]);
      } else {
        setPrefs({
          default_schedule: '06:00',
          default_categories: stringifyJSON(['top_story', 'ai_win', 'made_in_america', 'state_spotlight', 'small_business', 'trade_hiring']),
          favorite_topics: stringifyJSON([]),
          blocked_topics: stringifyJSON([]),
          preferred_sources: stringifyJSON([]),
          blocked_sources: stringifyJSON([]),
          minimum_score: 2,
          default_template: 'tnn_morning',
          approval_required: false,
          notification_settings: stringifyJSON({ enabled: true, email: true }),
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.ProducerSettings.update(settings.id, settings);
      } else {
        const created = await base44.entities.ProducerSettings.create(settings);
        setSettings(created);
      }
      if (prefs.id) {
        await base44.entities.ProducerPreferences.update(prefs.id, prefs);
      } else {
        const created = await base44.entities.ProducerPreferences.create(prefs);
        setPrefs(created);
      }
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    } finally {
      setSaving(false);
    }
  };

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
  const updatePref = (key, value) => setPrefs(prev => ({ ...prev, [key]: value }));

  const toggleActiveDay = (dayKey) => {
    const current = (settings.active_days || '').split(',').filter(Boolean);
    const next = current.includes(dayKey)
      ? current.filter(d => d !== dayKey)
      : [...current, dayKey];
    update('active_days', next.join(','));
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const defaults = {
        profile_name: 'Berna',
        timezone: 'America/New_York',
        brief_time: '06:00',
        active_days: 'sun,mon,tue,wed,thu,fri',
        skip_saturday: true,
        min_opportunity_score: 2,
        block_recycled: true,
        require_approval: false,
        credibility_threshold: 3,
        export_format: 'pdf',
        echo_tone: 'professional',
        briefing_length: 'standard',
        notification_enabled: true,
        preferred_text_model: 'automatic',
        preferred_audio_voice: 'river',
        preferred_translation_language: 'en',
      };
      if (settings.id) {
        await base44.entities.ProducerSettings.update(settings.id, defaults);
        setSettings({ ...settings, ...defaults });
      } else {
        const created = await base44.entities.ProducerSettings.create(defaults);
        setSettings(created);
      }
      const defaultPrefs = {
        default_schedule: '06:00',
        default_categories: stringifyJSON(['top_story', 'ai_win', 'made_in_america', 'state_spotlight', 'small_business', 'trade_hiring']),
        favorite_topics: stringifyJSON([]),
        blocked_topics: stringifyJSON([]),
        preferred_sources: stringifyJSON([]),
        blocked_sources: stringifyJSON([]),
        minimum_score: 2,
        default_template: 'tnn_morning',
        approval_required: false,
        notification_settings: stringifyJSON({ enabled: true, email: true }),
      };
      if (prefs.id) {
        await base44.entities.ProducerPreferences.update(prefs.id, defaultPrefs);
        setPrefs({ ...prefs, ...defaultPrefs });
      } else {
        const created = await base44.entities.ProducerPreferences.create(defaultPrefs);
        setPrefs(created);
      }
      toast({ title: 'Settings reset', description: 'All settings restored to defaults.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings || !prefs) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Configure Producer preferences</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
          {saving ? <Check className="w-3 h-3 mr-1" /> : <Save className="w-3 h-3 mr-1" />}
          {saving ? 'Saved' : 'Save Changes'}
        </Button>
      </div>

      {/* Workspace Summary */}
      {currentUser && (
        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-berna-purple/20 border border-berna-purple/30 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-berna-purple" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentUser.full_name || currentUser.email}</p>
            <p className="text-[10px] text-muted-foreground">{currentUser.email}</p>
          </div>
          {currentUser.role && (
            <span className="text-[10px] text-berna-orange bg-berna-orange/10 px-2 py-1 rounded-md capitalize">{currentUser.role}</span>
          )}
          <a href="/organizations" className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-white transition-colors">
            <Building2 className="w-3.5 h-3.5" />
            Organization
          </a>
        </div>
      )}

      {/* Profile */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white neon-underline">Profile</h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Profile Name</label>
          <Input value={settings.profile_name} onChange={e => update('profile_name', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm max-w-xs" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Timezone</label>
          <Select value={settings.timezone} onValueChange={v => update('timezone', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
              <SelectItem value="America/Chicago">Central (CT)</SelectItem>
              <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Schedule */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white neon-underline">Schedule</h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Brief Generation Time</label>
          <Input type="time" value={settings.brief_time} onChange={e => update('brief_time', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm max-w-xs" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Active Days</label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS_OF_WEEK.map(day => {
              const activeDays = (settings.active_days || '').split(',').filter(Boolean);
              const isActive = activeDays.includes(day.key);
              return (
                <button
                  key={day.key}
                  onClick={() => toggleActiveDay(day.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-berna-purple text-white shadow-sm'
                      : 'bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:text-white'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Days when automated story collection and brief generation run.</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Skip Saturday</p>
            <p className="text-[10px] text-muted-foreground">No automation on Saturdays</p>
          </div>
          <Switch checked={settings.skip_saturday} onCheckedChange={v => update('skip_saturday', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Notifications</p>
            <p className="text-[10px] text-muted-foreground">Notify when brief is ready</p>
          </div>
          <Switch checked={settings.notification_enabled} onCheckedChange={v => update('notification_enabled', v)} />
        </div>
      </div>

      {/* Editorial */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white neon-underline">Editorial</h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Minimum Opportunity Score</label>
          <Input type="number" min={1} max={5} value={settings.min_opportunity_score} onChange={e => update('min_opportunity_score', parseInt(e.target.value) || 1)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm w-24" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Source Credibility Threshold</label>
          <Input type="number" min={1} max={5} value={settings.credibility_threshold} onChange={e => update('credibility_threshold', parseInt(e.target.value) || 1)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm w-24" />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Block Recycled Stories</p>
            <p className="text-[10px] text-muted-foreground">Prevent duplicate briefings</p>
          </div>
          <Switch checked={settings.block_recycled} onCheckedChange={v => update('block_recycled', v)} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Require Manual Approval</p>
            <p className="text-[10px] text-muted-foreground">Review before finalizing briefs</p>
          </div>
          <Switch checked={settings.require_approval} onCheckedChange={v => update('require_approval', v)} />
        </div>
      </div>

      {/* Brief Format */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white neon-underline">Brief Format</h2>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Briefing Length</label>
          <Select value={settings.briefing_length} onValueChange={v => update('briefing_length', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="short">Short</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Echo Tone</label>
          <Select value={settings.echo_tone} onValueChange={v => update('echo_tone', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Export Format</label>
          <Select value={settings.export_format} onValueChange={v => update('export_format', v)}>
            <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Automation Control */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white neon-underline">Automation Control</h2>
        <p className="text-[10px] text-muted-foreground">Toggle automated pipeline stages on or off. When off, each stage can still be triggered manually from the Story Queue.</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Auto Fetch Stories</p>
            <p className="text-[10px] text-muted-foreground">Automatically pull stories from RSS feeds on schedule</p>
          </div>
          <Switch checked={settings.auto_fetch_stories ?? true} onCheckedChange={v => update('auto_fetch_stories', v)} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Auto Sift Content</p>
            <p className="text-[10px] text-muted-foreground">Automatically classify articles as video or text after ingestion</p>
          </div>
          <Switch checked={settings.auto_sift_content ?? true} onCheckedChange={v => update('auto_sift_content', v)} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Auto Transcribe Videos</p>
            <p className="text-[10px] text-muted-foreground">Automatically transcribe and summarize video articles</p>
          </div>
          <Switch checked={settings.auto_transcribe_videos ?? true} onCheckedChange={v => update('auto_transcribe_videos', v)} />
        </div>
      </div>

      {/* AI Services */}
      <AISettingsPanel settings={settings} onUpdate={update} />

      {/* Producer Preferences */}
      <div className="glass-panel p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white neon-underline">Producer Preferences</h2>
        <p className="text-[10px] text-muted-foreground">Customize defaults for your briefings — these apply when no day-specific plan exists.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default Briefing Time</label>
            <Input type="time" value={prefs.default_schedule} onChange={e => updatePref('default_schedule', e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default Template</label>
            <Select value={prefs.default_template} onValueChange={v => updatePref('default_template', v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {BRIEFING_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Default Categories</label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 mt-1">
            {CATEGORIES.map(cat => {
              const cats = parseJSON(prefs.default_categories, []);
              const checked = cats.includes(cat.key);
              return (
                <label key={cat.key} className="flex items-center gap-2 p-1.5 rounded-md bg-white/[0.02] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => updatePref('default_categories', stringifyJSON(checked ? cats.filter(c => c !== cat.key) : [...cats, cat.key]))}
                    className="w-3 h-3 rounded accent-berna-purple"
                  />
                  <span className="text-[10px] text-white/70">{cat.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Favorite Topics</label>
            <TagInput tags={prefs.favorite_topics} onChange={v => updatePref('favorite_topics', stringifyJSON(v))} placeholder="Add favorite topic..." suggestions={['AI helping small businesses', 'American manufacturing', 'reshoring', 'apprenticeships']} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Blocked Topics</label>
            <TagInput tags={prefs.blocked_topics} onChange={v => updatePref('blocked_topics', stringifyJSON(v))} placeholder="Add blocked topic..." suggestions={['celebrity gossip', 'outrage politics', 'presidential drama']} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Preferred Sources</label>
            <TagInput tags={prefs.preferred_sources} onChange={v => updatePref('preferred_sources', stringifyJSON(v))} placeholder="Add source name..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Blocked Sources</label>
            <TagInput tags={prefs.blocked_sources} onChange={v => updatePref('blocked_sources', stringifyJSON(v))} placeholder="Add source name..." />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Minimum Opportunity Score</label>
            <Input type="number" min={1} max={5} value={prefs.minimum_score} onChange={e => updatePref('minimum_score', parseInt(e.target.value) || 1)} className="bg-white/[0.03] border-white/[0.08] text-white text-sm w-24" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Preferred Briefing Length</label>
            <Select value={settings.briefing_length} onValueChange={v => update('briefing_length', v)}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {BRIEF_LENGTHS.map(l => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Manual Approval Required</p>
            <p className="text-[10px] text-muted-foreground">Require review before finalizing briefs by default</p>
          </div>
          <Switch checked={prefs.approval_required} onCheckedChange={v => updatePref('approval_required', v)} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Notification Preference</p>
            <p className="text-[10px] text-muted-foreground">Notify when brief is ready</p>
          </div>
          <Switch checked={settings.notification_enabled} onCheckedChange={v => update('notification_enabled', v)} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h2 className="text-sm font-semibold text-white">Danger Zone</h2>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-white">Reset All Settings</p>
            <p className="text-[10px] text-muted-foreground">Restore profile, schedule, editorial, AI, and preference settings to their defaults. Stories and productions are not affected.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={saving}
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs whitespace-nowrap"
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}