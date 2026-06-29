import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import TagInput from '@/components/weekly/TagInput';
import AISettingsPanel from '@/components/settings/AISettingsPanel';
import { CATEGORIES, BRIEFING_TYPES, BRIEF_LENGTHS, stringifyJSON, parseJSON } from '@/lib/weeklyConstants';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.ProducerSettings.filter({}, '-created_date', 1),
      base44.entities.ProducerPreferences.filter({}, '-created_date', 1),
    ]).then(([settingsRes, prefsRes]) => {
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
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="markdown">Markdown</SelectItem>
            </SelectContent>
          </Select>
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
    </div>
  );
}