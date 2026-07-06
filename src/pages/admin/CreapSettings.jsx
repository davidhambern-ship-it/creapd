import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2, Save, RotateCcw, ChevronRight, Bot, Sparkles, Mic,
  MessageSquare, Settings2, Eye
} from 'lucide-react';
import {
  CREAP_VOICES, CREAP_TONES, CREAP_GREETING_STYLES, CREAP_MODELS,
  DEFAULT_CREAP_SETTINGS, buildCreapSystemPrompt
} from '@/lib/creapSettings';

const SECTIONS = [
  { id: 'personality', label: 'Personality', icon: Bot },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'conversation', label: 'Conversation', icon: MessageSquare },
  { id: 'advanced', label: 'Advanced', icon: Settings2 },
];

export default function CreapSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personality');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.CreapSettings.filter({ is_active: true }, '-updated_date', 1)
      .then(res => {
        if (res.length > 0) setSettings(res[0]);
        else setSettings({ ...DEFAULT_CREAP_SETTINGS });
      })
      .catch(() => setSettings({ ...DEFAULT_CREAP_SETTINGS }))
      .finally(() => setLoading(false));
  }, []);

  const update = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.CreapSettings.update(settings.id, settings);
      } else {
        const created = await base44.entities.CreapSettings.create(settings);
        setSettings(created);
      }
      toast({ title: 'CREAP settings saved', description: 'Personality and voice updated successfully.' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_CREAP_SETTINGS, id: settings?.id });
    toast({ title: 'Reset to defaults', description: 'Don\'t forget to save.' });
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const promptPreview = buildCreapSystemPrompt(settings);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span>Admin</span>
          <ChevronRight className="w-3 h-3" />
          <span>CREAP Settings</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">CREAP Settings</h1>
              <p className="text-sm text-muted-foreground">Configure CREAP's personality, voice, and conversation style</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive ? 'bg-primary/20 text-primary glow-purple' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Personality Section */}
        {activeSection === 'personality' && (
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Personality</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Persona Name</Label>
                <Input value={settings.persona_name || ''} onChange={e => update('persona_name', e.target.value)} placeholder="CREAP" />
                <p className="text-xs text-muted-foreground">The name CREAP goes by in conversation.</p>
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={settings.tone} onValueChange={v => update('tone', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREAP_TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Overall conversational mood.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Personality Description</Label>
              <Textarea
                value={settings.personality_description || ''}
                onChange={e => update('personality_description', e.target.value)}
                placeholder="bold, energetic AI co-producer"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">Free-text description of CREAP's character traits.</p>
            </div>

            <div className="space-y-2">
              <Label>Speaking Style</Label>
              <Input
                value={settings.speaking_style || ''}
                onChange={e => update('speaking_style', e.target.value)}
                placeholder="punchy, opinionated"
              />
              <p className="text-xs text-muted-foreground">How CREAP delivers lines (punchy, verbose, laid-back, etc.).</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Humor Level</Label>
                <span className="text-sm font-medium text-primary">{settings.humor_level ?? 7}/10</span>
              </div>
              <Slider
                value={[settings.humor_level ?? 7]}
                onValueChange={([v]) => update('humor_level', v)}
                min={0}
                max={10}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Serious</span>
                <span>Playful</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Response Length</Label>
              <Select value={settings.response_length} onValueChange={v => update('response_length', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="very_short">Very Short (1 sentence)</SelectItem>
                  <SelectItem value="short">Short (1-3 sentences)</SelectItem>
                  <SelectItem value="medium">Medium (3-5 sentences)</SelectItem>
                  <SelectItem value="long">Long (5+ sentences)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How long CREAP's spoken responses should be.</p>
            </div>
          </div>
        )}

        {/* Voice Section */}
        {activeSection === 'voice' && (
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Mic className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Voice</h2>
            </div>

            <div className="space-y-2">
              <Label>Voice</Label>
              <Select value={settings.voice_id} onValueChange={v => update('voice_id', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREAP_VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">The ElevenLabs voice CREAP speaks with.</p>
            </div>

            <div className="space-y-2">
              <Label>Greeting Style</Label>
              <Select value={settings.greeting_style} onValueChange={v => update('greeting_style', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CREAP_GREETING_STYLES.map(g => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How CREAP greets the producer when the conversation starts.</p>
            </div>
          </div>
        )}

        {/* Conversation Section */}
        {activeSection === 'conversation' && (
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Conversation</h2>
            </div>

            <div className="space-y-2">
              <Label>Catchphrase</Label>
              <Input
                value={settings.catchphrase || ''}
                onChange={e => update('catchphrase', e.target.value)}
                placeholder="Want it CREAPd?!"
              />
              <p className="text-xs text-muted-foreground">CREAP's signature phrase when offering to research a topic.</p>
            </div>

            <div className="space-y-2">
              <Label>Completion Phrase</Label>
              <Input
                value={settings.completion_phrase || ''}
                onChange={e => update('completion_phrase', e.target.value)}
                placeholder="I'm done CREAPing!"
              />
              <p className="text-xs text-muted-foreground">What CREAP says when research is complete.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Decline Attempts</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={settings.max_decline_attempts ?? 5}
                  onChange={e => update('max_decline_attempts', parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground">Declines before fallback to the Topic Wizard.</p>
              </div>
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={settings.ai_model} onValueChange={v => update('ai_model', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREAP_MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Model used for conversation responses.</p>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Section */}
        {activeSection === 'advanced' && (
          <div className="glass-panel p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <h2 className="font-heading font-semibold text-lg">Advanced</h2>
            </div>

            <div className="space-y-2">
              <Label>System Prompt Override</Label>
              <Textarea
                value={settings.system_prompt_override || ''}
                onChange={e => update('system_prompt_override', e.target.value)}
                placeholder="Leave empty to use auto-generated prompt from personality settings above..."
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                When set, this completely overrides all personality settings. Use with caution — the JSON return format must still be followed.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
              <div>
                <Label className="cursor-pointer">Active</Label>
                <p className="text-xs text-muted-foreground">Whether these settings are used for CREAP conversations.</p>
              </div>
              <Switch checked={settings.is_active ?? true} onCheckedChange={v => update('is_active', v)} />
            </div>

            {/* Prompt Preview */}
            <div className="space-y-2 pt-4 border-t border-border">
              <button
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Eye className="w-4 h-4" />
                {showPromptPreview ? 'Hide' : 'Preview'} Generated System Prompt
              </button>
              {showPromptPreview && (
                <pre className="p-4 rounded-lg bg-background/50 border border-border text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                  {promptPreview}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}