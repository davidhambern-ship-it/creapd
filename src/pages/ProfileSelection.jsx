import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getAllProfiles } from '@/lib/productionProfiles';
import { 
  Newspaper, Music, ChefHat, Mic, Trophy, MessageCircle, Radio, 
  Video, Church, GraduationCap, Briefcase, Gamepad2, Settings,
  ArrowRight, Check, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const iconMap = {
  Newspaper, Music, ChefHat, Mic, Trophy, MessageCircle, 
  Radio, Video, Church, GraduationCap, Briefcase, Gamepad2, Settings
};

export default function ProfileSelection() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const allProfiles = getAllProfiles();
    setProfiles(allProfiles);
    setLoading(false);
  };

  const handleSelectProfile = async (profile) => {
    if (!profile.isImplemented) {
      return;
    }

    setCreating(profile.id);
    try {
      const production = await base44.entities.Production.create({
        title: `New ${profile.name}`,
        profile_id: profile.id,
        profile_key: profile.id,
        status: 'draft'
      });
      navigate(`/setup?profile=${profile.id}&productionId=${production.id}`);
    } catch (error) {
      console.error('Error creating production:', error);
      setCreating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-berna-navy to-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Producer Core...</p>
        </div>
      </div>
    );
  }

  const implemented = profiles.filter(p => p.isImplemented);
  const comingSoon = profiles.filter(p => !p.isImplemented);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-berna-navy to-background p-6 lg:p-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Choose Your Production Type
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Producer Core adapts to your production needs. Select a profile to get started.
          </p>
        </div>

        {/* Available Profiles */}
        <div className="mb-16">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Check className="w-5 h-5 text-berna-emerald" />
            Available Now
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {implemented.map((profile) => {
              const Icon = iconMap[profile.icon] || Newspaper;
              const isCreating = creating === profile.id;
              
              return (
                <Card
                  key={profile.id}
                  className="glass-panel hover:bg-white/[0.08] transition-all cursor-pointer group border-white/[0.08] hover:border-berna-purple/30"
                  onClick={() => handleSelectProfile(profile)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg bg-${profile.color || 'berna-purple'}/10`}>
                        <Icon className={`w-8 h-8 text-${profile.color || 'berna-purple'}`} />
                      </div>
                      {isCreating ? (
                        <Loader2 className="w-5 h-5 text-berna-purple animate-spin" />
                      ) : (
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-berna-purple transition-colors" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{profile.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{profile.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-1 rounded bg-white/[0.05]">{profile.itemPlural}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Coming Soon */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-muted-foreground" />
            Coming Soon
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comingSoon.map((profile) => {
              const Icon = iconMap[profile.icon] || Settings;
              return (
                <Card key={profile.id} className="glass-panel opacity-60 border-white/[0.04]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg bg-muted/20">
                        <Icon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground">{profile.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}