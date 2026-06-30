import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, Edit, Music, ArrowLeft } from 'lucide-react';

export default function DefaultProductionSettings() {
  const [defaultConfig, setDefaultConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.MusicProductionConfiguration.filter({ is_default: true }, '-created_date', 1)
      .then(configs => {
        if (configs && configs.length > 0) {
          setDefaultConfig(configs[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-primary" /> Default Production Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Edit your default production configuration. Changes affect future automatic dashboards.</p>
      </div>

      {defaultConfig ? (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">{defaultConfig.production_name}</h3>
              <p className="text-sm text-muted-foreground">Music Production • {defaultConfig.show_date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Host:</span> {defaultConfig.host_name || 'N/A'}</div>
            <div><span className="text-muted-foreground">Station:</span> {defaultConfig.station_name || 'N/A'}</div>
            <div><span className="text-muted-foreground">Total Runtime:</span> {defaultConfig.total_show_runtime} min</div>
            <div><span className="text-muted-foreground">Music Runtime:</span> {defaultConfig.required_music_runtime} min</div>
            <div><span className="text-muted-foreground">Tone:</span> {defaultConfig.show_tone}</div>
            <div><span className="text-muted-foreground">Energy Flow:</span> {defaultConfig.playlist_energy_flow}</div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button asChild>
              <Link to={`/music/configure?config_id=${defaultConfig.id}`}>
                <Edit className="w-4 h-4 mr-1" />
                Edit Configuration
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/music/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-12 text-center">
          <Settings className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No default production configuration found.</p>
          <Button asChild>
            <Link to="/music/configure">Configure Production</Link>
          </Button>
        </div>
      )}

      <div className="glass-panel p-4">
        <h3 className="font-heading font-semibold mb-2">Production Type</h3>
        <div className="flex items-center gap-3 text-sm">
          <Music className="w-4 h-4 text-primary" />
          <span>Music Production (current default)</span>
        </div>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link to="/production-types">Change Production Type</Link>
        </Button>
      </div>
    </div>
  );
}