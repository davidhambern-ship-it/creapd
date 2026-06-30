import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Check, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const PRODUCTION_TYPES = [
  { type: 'news', label: 'News', description: 'News briefings and production packages', color: 'from-blue-500 to-cyan-500' },
  { type: 'podcast', label: 'Podcast', description: 'Podcast episodes', color: 'from-purple-500 to-pink-500' },
  { type: 'radio', label: 'Radio Show', description: 'Radio shows and audio broadcasts', color: 'from-orange-500 to-red-500' },
  { type: 'music', label: 'Music Show', description: 'Music-focused productions', color: 'from-green-500 to-emerald-500' },
  { type: 'cooking', label: 'Cooking Show', description: 'Cooking shows and food content', color: 'from-yellow-500 to-orange-500' },
  { type: 'sports', label: 'Sports Show', description: 'Sports broadcasts and commentary', color: 'from-red-500 to-rose-500' },
  { type: 'talk', label: 'Talk Show', description: 'Interview and discussion shows', color: 'from-indigo-500 to-purple-500' },
  { type: 'livestream', label: 'Livestream', description: 'Creator livestreams', color: 'from-pink-500 to-rose-500' },
  { type: 'church', label: 'Church Service', description: 'Sermon and ministry content', color: 'from-amber-500 to-yellow-500' },
  { type: 'educational', label: 'Educational', description: 'Lessons and tutorials', color: 'from-teal-500 to-cyan-500' },
  { type: 'business', label: 'Business Briefing', description: 'Corporate updates and presentations', color: 'from-slate-500 to-gray-500' },
  { type: 'gaming', label: 'Gaming Stream', description: 'Gaming content and streams', color: 'from-violet-500 to-purple-500' },
  { type: 'custom', label: 'Custom', description: 'Define your own workflow', color: 'from-zinc-500 to-neutral-500' }
];

export default function ProductionProfileSelector({ onSelect, currentProfile }) {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await base44.entities.ProductionProfile.list();
      setProfiles(data);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProfile = async (typeData) => {
    try {
      const newProfile = await base44.entities.ProductionProfile.create({
        profile_name: typeData.label,
        profile_type: typeData.type,
        description: typeData.description,
        color: typeData.color,
        is_active: true
      });

      toast({
        title: 'Profile Created',
        description: `${typeData.label} profile is ready to use`
      });

      if (onSelect) {
        onSelect(newProfile);
      }

      loadProfiles();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create profile',
        variant: 'destructive'
      });
    }
  };

  const handleSelectProfile = (profile) => {
    sessionStorage.setItem('activeProductionProfile', JSON.stringify({
      id: profile.id,
      type: profile.profile_type,
      name: profile.profile_name
    }));

    if (onSelect) {
      onSelect(profile);
    }

    toast({
      title: 'Profile Selected',
      description: `Using ${profile.profile_name} workflow`
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-berna-purple" />
        <h2 className="text-2xl font-display font-bold">Production Profile</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PRODUCTION_TYPES.map((type) => {
          const existingProfile = profiles.find(p => p.profile_type === type.type);
          const isSelected = currentProfile?.profile_type === type.type;

          return (
            <Card
              key={type.type}
              className={`glass-panel cursor-pointer transition-all hover:scale-105 ${
                isSelected ? 'border-berna-purple ring-2 ring-berna-purple/50' : ''
              }`}
              onClick={() => existingProfile ? handleSelectProfile(existingProfile) : handleCreateProfile(type)}
            >
              <CardHeader className="pb-3">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${type.color} flex items-center justify-center mb-3`}>
                  {existingProfile ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <Plus className="w-6 h-6 text-white" />
                  )}
                </div>
                <CardTitle className="text-lg">{type.label}</CardTitle>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
              {existingProfile && (
                <CardContent>
                  <div className="text-xs text-muted-foreground">
                    {isSelected ? 'Currently Active' : 'Click to select'}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}