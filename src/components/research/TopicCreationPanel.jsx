import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Sparkles, FlaskConical } from 'lucide-react';

const DEPTH_OPTIONS = ['quick', 'standard', 'deep', 'comprehensive'];
const CATEGORY_OPTIONS = [
  'general', 'science', 'technology', 'politics', 'business',
  'health', 'environment', 'culture', 'history', 'biography',
  'investigation', 'explainer', 'opinion', 'feature',
];

export default function TopicCreationPanel({ config, onCreated }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [category, setCategory] = useState('general');
  const [researchDepth, setResearchDepth] = useState(
    config?.research_depth || 'standard'
  );
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !researchQuery.trim() || submitting) return;
    setSubmitting(true);

    try {
      const topic = await base44.entities.ResearchTopic.create({
        configuration_id: config.id,
        title: title.trim(),
        description: description.trim() || researchQuery.trim(),
        research_query: researchQuery.trim(),
        category,
        priority: 'standard',
        research_depth: researchDepth,
        status: 'researching',
      });

      base44.functions
        .invoke('deepResearchV2', {
          topic_id: topic.id,
          research_depth: researchDepth,
        })
        .catch(err => console.error('Research launch failed:', err));

      onCreated?.();
      navigate(`/research/manager?topic_id=${topic.id}`);
    } catch (err) {
      console.error('Failed to create topic:', err);
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 cc-animate-fade-up">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: 'hsl(190 50% 15% / 0.3)',
              border: '1px solid hsl(190 40% 28% / 0.4)',
            }}
          >
            <FlaskConical className="w-5 h-5" style={{ color: 'hsl(190 80% 55%)' }} />
          </div>
          <div>
            <h1 className="text-lg font-heading font-semibold">New Research Topic</h1>
            <p className="text-xs text-muted-foreground">
              Define your research question and launch deep research
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 cc-glass-card p-6 cc-animate-fade-up cc-stagger-1"
        >
          <div className="space-y-2">
            <Label htmlFor="topic-title" className="text-sm font-medium">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input
              id="topic-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. The Future of Fusion Energy"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-query" className="text-sm font-medium">
              Primary Research Question <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="topic-query"
              value={researchQuery}
              onChange={e => setResearchQuery(e.target.value)}
              placeholder="e.g. What are the key technical and economic barriers preventing commercial fusion energy from becoming viable?"
              required
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Research Depth</Label>
              <Select value={researchDepth} onValueChange={setResearchDepth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPTH_OPTIONS.map(depth => (
                    <SelectItem key={depth} value={depth}>
                      {depth.charAt(0).toUpperCase() + depth.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic-description" className="text-sm font-medium">
              Additional Context
            </Label>
            <Textarea
              id="topic-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Supporting questions, deliverables, constraints, or any context that should guide the research..."
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={submitting || !title.trim() || !researchQuery.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Launching Research...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  Launch Research
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setTitle('');
                setResearchQuery('');
                setDescription('');
                setCategory('general');
              }}
              disabled={submitting}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}