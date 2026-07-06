import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, Lightbulb, ArrowRight, ArrowLeft, Check, Sparkles,
  Search, Layers, Gauge, Rocket, Wand2
} from 'lucide-react';

const STEPS = [
  { id: 'idea', label: 'Your Idea', icon: Lightbulb },
  { id: 'angle', label: 'Research Angle', icon: Search },
  { id: 'depth', label: 'Depth & Priority', icon: Gauge },
  { id: 'preview', label: 'Preview & Launch', icon: Rocket },
];

const DEPTHS = [
  { value: 'quick_scan', label: 'Quick Scan', desc: 'Fast overview, 3-5 sources' },
  { value: 'standard', label: 'Standard', desc: 'Balanced depth, 8-12 sources' },
  { value: 'deep_dive', label: 'Deep Dive', desc: 'Thorough analysis, 15+ sources' },
  { value: 'exhaustive', label: 'Exhaustive', desc: 'Maximum coverage, 25+ sources' },
];

const PRIORITIES = [
  { value: 'breaking', label: 'Breaking', color: 'text-red-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'standard', label: 'Standard', color: 'text-blue-400' },
  { value: 'feature', label: 'Feature', color: 'text-purple-400' },
  { value: 'optional', label: 'Optional', color: 'text-muted-foreground' },
];

export default function TopicWizard({ config, onComplete, onCancel }) {
  const [step, setStep] = useState(0);
  const [idea, setIdea] = useState('');
  const [angles, setAngles] = useState([]);
  const [selectedAngle, setSelectedAngle] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [depth, setDepth] = useState(config?.research_depth || 'standard');
  const [priority, setPriority] = useState('standard');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const generateAngles = async () => {
    if (!idea.trim()) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `A producer wants to research this topic: "${idea}".\n\nGenerate 3 distinct research angles they could take. Each angle should have:\n- title: a concise, compelling angle name (max 60 chars)\n- description: what this angle covers and why it's interesting (1-2 sentences)\n- category: a broad category like "Technology", "Policy", "Science", "Health", "Business", "Society", "Environment", etc.\n- refined_query: a well-crafted research query string that a search engine can use to find authoritative sources on this specific angle\n\nMake the angles genuinely different from each other — not just rephrasings. Think about: historical context, future impact, human stories, data/economics, controversy/debate.\n\nReturn as JSON with an "angles" array.`,
        model: 'gemini_3_flash',
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            angles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string' },
                  refined_query: { type: 'string' }
                }
              }
            }
          }
        }
      });
      setAngles(result?.angles || []);
    } catch (err) {
      console.error('Angle generation failed:', err);
      setAngles([{
        title: idea.substring(0, 60),
        description: 'Research this topic directly as stated.',
        category: 'General',
        refined_query: idea
      }]);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const angle = angles[selectedAngle];
      await base44.entities.ResearchTopic.create({
        configuration_id: config.id,
        title: angle.title,
        description: angle.description,
        research_query: angle.refined_query,
        category: angle.category || category || 'general',
        priority,
        research_depth: depth,
        status: 'pending'
      });
      onComplete();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return idea.trim().length > 3;
    if (step === 1) return selectedAngle !== null;
    if (step === 2) return true;
    if (step === 3) return true;
    return false;
  };

  const handleNext = () => {
    if (step === 0 && angles.length === 0) {
      generateAngles();
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const currentAngle = selectedAngle !== null ? angles[selectedAngle] : null;
  const StepIcon = STEPS[step].icon;

  return (
    <div className="glass-panel p-6 space-y-6">
      {/* Step indicator */}
      <div className="!flex items-center justify-between">
        {STEPS.map((s, i) => {
          const SIcon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <React.Fragment key={s.id}>
              <div className="!flex flex-col items-center gap-1.5">
                <div className={`w-10 h-10 rounded-full !flex items-center justify-center transition-all ${
                  isActive ? 'bg-primary text-primary-foreground glow-purple scale-110' :
                  isDone ? 'bg-emerald-500 text-white' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : <SIcon className="w-4 h-4" />}
                </div>
                <span className={`text-xs ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded transition-all ${i < step ? 'bg-emerald-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step content */}
      <div className="min-h-[200px]">
        {step === 0 && (
          <div className="space-y-4">
            <div className="!flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-lg">What do you want to research?</h3>
            </div>
            <p className="text-sm text-muted-foreground">Start with a rough idea — a word, a question, or a headline. The wizard will help you refine it into a research-ready topic.</p>
            <div className="space-y-2">
              <Label>Topic Idea</Label>
              <Textarea
                value={idea}
                onChange={e => setIdea(e.target.value)}
                placeholder="e.g. The future of remote work, AI regulation in the EU, renewable energy adoption..."
                rows={3}
                autoFocus
              />
            </div>
            <div className="!flex flex-wrap gap-2">
              {['AI in healthcare', 'Climate policy impacts', 'Crypto regulation', 'Space economy', 'Mental health trends'].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => setIdea(suggestion)}
                  className="text-xs px-2.5 py-1 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="!flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-lg">Choose your research angle</h3>
            </div>
            <p className="text-sm text-muted-foreground">AI generated {angles.length} distinct angles for "{idea.substring(0, 50)}{idea.length > 50 ? '...' : ''}". Pick the one that fits your production.</p>

            {generating ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/30 animate-pulse">
                    <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                    <div className="h-3 w-full bg-muted/50 rounded" />
                  </div>
                ))}
                <div className="!flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <Sparkles className="w-4 h-4" />
                  Generating research angles...
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {angles.map((angle, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedAngle(i)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedAngle === i ? 'border-primary bg-primary/10 glow-purple' : 'border-border bg-secondary/20 hover:border-primary/40'
                    }`}
                  >
                    <div className="!flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm">{angle.title}</h4>
                      {selectedAngle === i && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{angle.description}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{angle.category}</span>
                  </button>
                ))}
              </div>
            )}

            {!generating && angles.length > 0 && (
              <button onClick={generateAngles} className="text-xs text-primary hover:underline !flex items-center gap-1">
                <Wand2 className="w-3 h-3" /> Regenerate angles
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="!flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-lg">Set depth & priority</h3>
            </div>

            <div className="space-y-2">
              <Label>Research Depth</Label>
              <div className="grid grid-cols-2 gap-2">
                {DEPTHS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDepth(d.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      depth === d.value ? 'border-primary bg-primary/10' : 'border-border bg-secondary/20 hover:border-primary/40'
                    }`}
                  >
                    <p className="text-sm font-medium">{d.label}</p>
                    <p className="text-xs text-muted-foreground">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="!flex flex-wrap gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-all ${
                      priority === p.value ? 'border-primary bg-primary/10' : 'border-border bg-secondary/20 hover:border-primary/40'
                    }`}
                  >
                    <span className={p.color}>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && currentAngle && (
          <div className="space-y-4">
            <div className="!flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-lg">Ready to launch</h3>
            </div>
            <p className="text-sm text-muted-foreground">Review your topic configuration, then launch to add it to your research queue.</p>

            <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Topic Title</p>
                <p className="text-sm font-medium">{currentAngle.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-muted-foreground">{currentAngle.description}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Research Query</p>
                <div className="p-2.5 rounded-md bg-background/50 border border-border">
                  <p className="text-sm font-mono text-primary/90">{currentAngle.refined_query}</p>
                </div>
              </div>
              <div className="!flex items-center gap-4 pt-1">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Category</p>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{currentAngle.category}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Depth</p>
                  <span className="text-xs text-foreground">{DEPTHS.find(d => d.value === depth)?.label}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Priority</p>
                  <span className={`text-xs ${PRIORITIES.find(p => p.value === priority)?.color}`}>{PRIORITIES.find(p => p.value === priority)?.label}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="!flex items-center justify-between pt-2 border-t border-border">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <div className="!flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} disabled={!canProceed() || generating}>
              {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-1" />}
              {generating ? 'Generating...' : 'Continue'}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Rocket className="w-4 h-4 mr-1" />}
              {saving ? 'Saving...' : 'Launch Topic'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}