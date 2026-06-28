import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.ProducerSettings.filter({}, '-created_date', 1)
      .then(res => {
        if (res.length > 0) {
          setSettings(res[0]);
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
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    if (settings.id) {
      await base44.entities.ProducerSettings.update(settings.id, settings);
    } else {
      const created = await base44.entities.ProducerSettings.create(settings);
      setSettings(created);
    }
    toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    setSaving(false);
  };

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  if (loading || !settings) {
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
    </div>
  );
}