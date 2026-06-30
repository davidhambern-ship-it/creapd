import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mic,
  Radio,
  Music,
  ChefHat,
  Trophy,
  MessageCircle,
  Video,
  Church,
  GraduationCap,
  Briefcase,
  Gamepad2,
  Settings,
  Search,
  Sparkles
} from 'lucide-react';

const PRODUCTION_TYPES = [
  {
    type: 'news',
    label: 'News',
    description: 'News briefings and production packages',
    icon: Search,
    color: 'from-berna-purple to-purple-600'
  },
  {
    type: 'podcast',
    label: 'Podcast',
    description: 'Episode outlines, show notes, and scripts',
    icon: Mic,
    color: 'from-berna-orange to-orange-500'
  },
  {
    type: 'radio_show',
    label: 'Radio Show',
    description: 'Radio broadcasts and live audio',
    icon: Radio,
    color: 'from-berna-emerald to-emerald-500'
  },
  {
    type: 'music_show',
    label: 'Music Show',
    description: 'Playlists, artist facts, and music trivia',
    icon: Music,
    color: 'from-pink-500 to-rose-500'
  },
  {
    type: 'cooking_show',
    label: 'Cooking Show',
    description: 'Recipes, ingredient lists, and cooking scripts',
    icon: ChefHat,
    color: 'from-amber-500 to-orange-400'
  },
  {
    type: 'sports_show',
    label: 'Sports Show',
    description: 'Game recaps, commentary, and analysis',
    icon: Trophy,
    color: 'from-blue-500 to-cyan-500'
  },
  {
    type: 'talk_show',
    label: 'Talk Show',
    description: 'Interviews, discussions, and guest segments',
    icon: MessageCircle,
    color: 'from-violet-500 to-purple-500'
  },
  {
    type: 'livestream',
    label: 'Livestream',
    description: 'Creator streams, chat prompts, and segments',
    icon: Video,
    color: 'from-red-500 to-pink-500'
  },
  {
    type: 'church_service',
    label: 'Church Service',
    description: 'Sermons, scripture, and ministry content',
    icon: Church,
    color: 'from-indigo-500 to-blue-500'
  },
  {
    type: 'educational_content',
    label: 'Educational Content',
    description: 'Lessons, tutorials, and lectures',
    icon: GraduationCap,
    color: 'from-teal-500 to-emerald-500'
  },
  {
    type: 'business_briefing',
    label: 'Business Briefing',
    description: 'Corporate updates and presentations',
    icon: Briefcase,
    color: 'from-slate-500 to-gray-500'
  },
  {
    type: 'gaming_stream',
    label: 'Gaming Stream',
    description: 'Gaming streams, esports, and commentary',
    icon: Gamepad2,
    color: 'from-lime-500 to-green-500'
  },
  {
    type: 'custom',
    label: 'Custom Production',
    description: 'Define your own workflow',
    icon: Settings,
    color: 'from-zinc-500 to-neutral-500'
  }
];

export default function ProductionTypeSelector() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [customName, setCustomName] = useState('');

  const filteredTypes = PRODUCTION_TYPES.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectType = async (typeData) => {
    try {
      // Check if profile already exists
      const existingProfiles = await base44.entities.ProductionProfile.filter({
        profile_type: typeData.type
      });

      let profile;
      if (existingProfiles.length > 0) {
        profile = existingProfiles[0];
      } else {
        // Create new profile
        const newProfile = await base44.entities.ProductionProfile.create({
          profile_name: typeData.label,
          profile_type: typeData.type,
          description: typeData.description,
          icon: typeData.icon.name,
          color: typeData.color,
          is_default: typeData.type === 'news'
        });
        profile = newProfile;
      }

      // Store in session storage for current session
      sessionStorage.setItem('activeProductionProfile', JSON.stringify({
        id: profile.id,
        type: profile.profile_type,
        name: profile.profile_name
      }));

      // Navigate to research center
      navigate('/research');
    } catch (error) {
      console.error('Error selecting production type:', error);
    }
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;

    try {
      const newProfile = await base44.entities.ProductionProfile.create({
        profile_name: customName,
        profile_type: 'custom',
        description: 'Custom production workflow',
        icon: 'Settings',
        color: 'from-zinc-500 to-neutral-500',
        is_active: true
      });

      sessionStorage.setItem('activeProductionProfile', JSON.stringify({
        id: newProfile.id,
        type: 'custom',
        name: customName
      }));

      navigate('/research');
    } catch (error) {
      console.error('Error creating custom profile:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-berna-navy/50">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-berna-purple/10 border border-berna-purple/20 mb-6">
            <Sparkles className="w-4 h-4 text-berna-purple" />
            <span className="text-sm font-medium text-berna-purple">AI-Powered Production Workspace</span>
          </div>
          
          <h1 className="text-5xl font-display font-bold mb-4 bg-gradient-to-r from-berna-purple via-berna-orange to-berna-emerald bg-clip-text text-transparent">
            What are we producing today?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose your production type and let Producer guide you from research to final export
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-12">
          <Input
            placeholder="Search production types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 text-lg"
          />
        </div>

        {/* Production Type Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {filteredTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.type}
                onClick={() => handleSelectType(type)}
                className="group relative glass-panel p-6 text-left hover:glow-purple transition-all duration-300 hover:scale-105 hover:border-berna-purple/50"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2 text-foreground">
                  {type.label}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {type.description}
                </p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-berna-purple/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-berna-purple" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Production */}
        {filteredTypes.find(t => t.type === 'custom') && (
          <div className="max-w-md mx-auto mt-12">
            {!isCreating ? (
              <Button
                onClick={() => setIsCreating(true)}
                variant="outline"
                className="w-full h-14 text-lg border-dashed"
              >
                <Settings className="w-5 h-5 mr-2" />
                Create Custom Production Type
              </Button>
            ) : (
              <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold mb-4">Custom Production</h3>
                <Input
                  placeholder="Enter production name (e.g., 'Fitness Show')"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="mb-4"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCustom()}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateCustom} className="flex-1">
                    Create & Continue
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Continue Button */}
        <div className="text-center mt-12">
          <Button
            onClick={() => navigate('/research')}
            size="lg"
            className="px-8 h-12 text-lg"
          >
            Continue to Research Center
            <Search className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}