import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, PenTool, ChevronRight, Clock } from 'lucide-react';

export default function MessageArchive({ currentConfigId }) {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(null);

  useEffect(() => {
    base44.entities.SpiritualProductionConfiguration.list('-created_date', 50)
      .then(data => setConfigs(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = async (config) => {
    setOpening(config.id);
    try {
      // Unset is_default on all configs, then set the selected one as default.
      // This bumps its updated_date, making the Message Builder load it.
      await base44.entities.SpiritualProductionConfiguration.update(config.id, {
        is_default: true,
        status: config.status === 'building' ? 'building' : 'ready'
      });
      await base44.auth.updateMe({
        default_production_type: 'spiritual',
        default_production_config_id: config.id
      });
      navigate('/spiritual/message');
    } catch (err) {
      console.error(err);
      setOpening(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <PenTool className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold">Message Archive</h3>
        </div>
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Exclude the currently active config from the archive list
  const pastMessages = configs.filter(c => c.id !== currentConfigId);

  if (pastMessages.length === 0) return null;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <PenTool className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold">Message Archive</h3>
        <span className="text-xs text-muted-foreground ml-auto">{pastMessages.length} past message{pastMessages.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-2">
        {pastMessages.map(c => (
          <button
            key={c.id}
            onClick={() => handleOpen(c)}
            disabled={opening === c.id}
            className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 border border-transparent transition-all text-left disabled:opacity-50"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{c.production_name || 'Untitled Message'}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>{c.production_type}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {c.production_date}</span>
                {c.speaker_name && <><span>·</span><span>{c.speaker_name}</span></>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                c.status === 'ready' ? 'bg-berna-emerald/20 text-berna-emerald' :
                c.status === 'building' ? 'bg-primary/20 text-primary' :
                c.status === 'failed' ? 'bg-destructive/20 text-destructive' :
                'bg-muted text-muted-foreground'
              }`}>{c.status}</span>
              {opening === c.id
                ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}