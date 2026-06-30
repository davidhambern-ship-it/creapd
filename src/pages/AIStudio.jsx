import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Sparkles, Mic, Music, FileText, Image, Video, MessageSquare, Radio, Trophy, Calendar } from 'lucide-react';

const AI_ACTIONS = [
  { id: 'playlist', label: 'Generate Playlist', icon: Music, prompt: 'Generate a 60-minute playlist for a music radio show' },
  { id: 'host_script', label: 'Host Script', icon: Mic, prompt: 'Write a professional radio host script with intros and outros' },
  { id: 'banter', label: 'Host Banter', icon: MessageSquare, prompt: 'Generate engaging host banter between songs' },
  { id: 'transitions', label: 'Transitions', icon: Music, prompt: 'Create smooth transitions between songs for a radio show' },
  { id: 'artist_facts', label: 'Artist Facts', icon: Trophy, prompt: 'Generate interesting facts about popular music artists' },
  { id: 'trivia', label: 'Music Trivia', icon: Trophy, prompt: 'Create fun music trivia questions for on-air segments' },
  { id: 'social', label: 'Social Package', icon: MessageSquare, prompt: 'Generate social media captions for a radio show' },
  { id: 'thumbnail', label: 'Thumbnail Prompt', icon: Image, prompt: 'Create a detailed prompt for generating a radio show thumbnail' },
  { id: 'sponsor_reads', label: 'Sponsor Reads', icon: Radio, prompt: 'Write engaging 30-second sponsor read scripts' },
  { id: 'station_ids', label: 'Station IDs', icon: Radio, prompt: 'Create catchy station ID scripts' },
  { id: 'contest_questions', label: 'Contest Questions', icon: Trophy, prompt: 'Generate fun contest questions for radio listeners' },
  { id: 'video_prompts', label: 'Video Prompts', icon: Video, prompt: 'Create prompts for generating music show video content' },
];

export default function AIStudio() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(null);
  const [results, setResults] = useState([]);

  const handleGenerate = async (action) => {
    setGenerating(action.id);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${action.prompt}. Make it professional, engaging, and suitable for a music radio broadcast.`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            duration: { type: 'string' }
          }
        }
      });

      const result = {
        id: Date.now(),
        action: action.label,
        title: response.title || action.label,
        content: response.content || '',
        duration: response.duration || '',
        timestamp: new Date().toLocaleString()
      };

      setResults([result, ...results]);
      toast({ title: 'Generated!', description: `${action.label} created successfully` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate content', variant: 'destructive' });
    } finally {
      setGenerating(null);
    }
  };

  const handleCopyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied!', description: 'Content copied to clipboard' });
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-background via-background to-indigo-950/20 min-h-screen">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-indigo-500" />
        <div>
          <h1 className="text-3xl font-display font-bold text-indigo-100">AI Studio</h1>
          <p className="text-muted-foreground">Generate content for your music show</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {AI_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <Card
              key={action.id}
              className="glass-panel border-indigo-500/20 hover:border-indigo-500/50 transition-all cursor-pointer"
            >
              <CardContent className="p-4">
                <button
                  onClick={() => handleGenerate(action)}
                  disabled={generating === action.id}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <span className="font-semibold text-indigo-100 text-sm">{action.label}</span>
                  </div>
                  {generating === action.id && (
                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  )}
                </button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-indigo-100">Recent Generations</h2>
          <div className="space-y-3">
            {results.map(result => (
              <Card key={result.id} className="glass-panel border-indigo-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-indigo-100">{result.title}</CardTitle>
                      <CardDescription>{result.action} • {result.timestamp}</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(result.content)}
                      className="border-indigo-500/20"
                    >
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}