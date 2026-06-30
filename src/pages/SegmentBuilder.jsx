import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Layers, Music, Calendar, Trophy, Radio, Users, MapPin, Clock, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SEGMENT_TYPES = [
  { value: 'artist_spotlight', label: 'Artist Spotlight', icon: Music },
  { value: 'throwback_moment', label: 'Throwback Moment', icon: Clock },
  { value: 'on_this_day', label: 'On This Day', icon: Calendar },
  { value: 'music_trivia', label: 'Music Trivia', icon: Trophy },
  { value: 'birthday_spotlight', label: 'Birthday Spotlight', icon: Music },
  { value: 'concert_calendar', label: 'Concert Calendar', icon: MapPin },
  { value: 'entertainment_headlines', label: 'Entertainment News', icon: Radio },
  { value: 'host_story', label: 'Host Story', icon: Users },
  { value: 'sponsor_break', label: 'Sponsor Break', icon: Radio },
  { value: 'weather', label: 'Weather', icon: MapPin },
  { value: 'traffic', label: 'Traffic', icon: MapPin },
  { value: 'community_events', label: 'Community Events', icon: Users },
];

export default function SegmentBuilder() {
  const { toast } = useToast();
  const [enabledTypes, setEnabledTypes] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      const segmentList = await base44.entities.ShowSegment.filter({ is_active: true }, 'order', 50);
      setSegments(segmentList);
    } catch (error) {
      console.error('Error loading segments:', error);
    }
  };

  const toggleSegmentType = (type) => {
    setEnabledTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleGenerateSegment = async (segmentType) => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a 2-3 minute radio segment script for "${segmentType}". Make it engaging, conversational, and suitable for a music radio show. Include host banter and transitions.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            duration: { type: 'string' }
          }
        }
      });

      const production = JSON.parse(sessionStorage.getItem('activeProduction') || '{}');
      
      await base44.entities.ShowSegment.create({
        segment_type: segmentType,
        segment_title: response.title || `${segmentType.replace(/_/g, ' ').toUpperCase()}`,
        content: response.content || '',
        duration: response.duration || '2 minutes',
        order: segments.length,
        production_id: production.id || null,
        is_active: true
      });

      toast({ title: 'Segment Generated', description: 'Added to your show' });
      loadSegments();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate segment', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSegment = async (segmentId) => {
    try {
      await base44.entities.ShowSegment.update(segmentId, { is_active: false });
      loadSegments();
      toast({ title: 'Segment Removed' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to remove segment', variant: 'destructive' });
    }
  };

  const handleReorder = async (segmentId, direction) => {
    const index = segments.findIndex(s => s.id === segmentId);
    if (index === -1 || (direction === -1 && index === 0) || (direction === 1 && index === segments.length - 1)) {
      return;
    }

    const newOrder = [...segments];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + direction];
    newOrder[index + direction] = temp;

    await Promise.all(
      newOrder.map((segment, idx) =>
        base44.entities.ShowSegment.update(segment.id, { order: idx })
      )
    );

    setSegments(newOrder);
  };

  const totalSegmentRuntime = segments.reduce((acc, s) => {
    if (s.duration) {
      const match = s.duration.match(/(\d+)/);
      return acc + (match ? parseInt(match[1]) : 0);
    }
    return acc;
  }, 0);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-background via-background to-violet-950/20 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-violet-100">Segment Builder</h1>
          <p className="text-muted-foreground">Create non-music segments for your show</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Segment Runtime</p>
          <p className="text-2xl font-bold text-violet-100">{totalSegmentRuntime} min</p>
        </div>
      </div>

      <Card className="glass-panel border-violet-500/20">
        <CardHeader>
          <CardTitle className="text-violet-100 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Enable Segment Types
          </CardTitle>
          <CardDescription>Select which segment types you want to use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SEGMENT_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <div
                  key={type.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    enabledTypes.includes(type.value)
                      ? 'bg-violet-500/10 border-violet-500/50'
                      : 'border-violet-500/20 hover:bg-violet-500/5'
                  }`}
                  onClick={() => toggleSegmentType(type.value)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${enabledTypes.includes(type.value) ? 'text-violet-400' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium ${enabledTypes.includes(type.value) ? 'text-violet-100' : 'text-muted-foreground'}`}>
                      {type.label}
                    </span>
                  </div>
                  <Switch
                    checked={enabledTypes.includes(type.value)}
                    onCheckedChange={() => toggleSegmentType(type.value)}
                    className="scale-75"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {enabledTypes.length > 0 && (
        <Card className="glass-panel border-violet-500/20">
          <CardHeader>
            <CardTitle className="text-violet-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Segments
            </CardTitle>
            <CardDescription>AI-generate segments for enabled types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {enabledTypes.map(type => {
                const segmentType = SEGMENT_TYPES.find(t => t.value === type);
                const Icon = segmentType?.icon;
                return (
                  <Button
                    key={type}
                    onClick={() => handleGenerateSegment(type)}
                    disabled={loading}
                    variant="outline"
                    className="border-violet-500/20 hover:bg-violet-500/10"
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    Generate {segmentType?.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {segments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-violet-100">Show Segments</h2>
          <div className="space-y-2">
            {segments.map((segment, index) => {
              const segmentType = SEGMENT_TYPES.find(t => t.value === segment.segment_type);
              const Icon = segmentType?.icon;
              return (
                <Card key={segment.id} className="glass-panel border-violet-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="w-4 h-4 text-violet-400" />}
                          <h3 className="font-semibold text-violet-100">{segment.segment_title}</h3>
                          <Badge variant="outline" className="text-xs border-violet-500/20 text-violet-300">
                            {segmentType?.label}
                          </Badge>
                        </div>
                        {segment.content && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {segment.content}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-violet-500/10 text-violet-300">
                          {segment.duration}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleReorder(segment.id, -1)} disabled={index === 0} className="h-8 w-8">↑</Button>
                        <Button variant="ghost" size="icon" onClick={() => handleReorder(segment.id, 1)} disabled={index === segments.length - 1} className="h-8 w-8">↓</Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSegment(segment.id)} className="h-8 w-8 text-muted-foreground hover:text-red-400"><X className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}