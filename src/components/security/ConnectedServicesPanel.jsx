import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Loader2, Star, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const CATEGORY_LABELS = {
  text: 'Text / LLM', image: 'Image Generation', video: 'Video Generation',
  audio: 'Audio', speech_synthesis: 'Speech Synthesis', speech_recognition: 'Speech Recognition',
  translation: 'Translation', transcription: 'Transcription', data_analysis: 'Data Analysis', research: 'Research'
};

export default function ConnectedServicesPanel() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchServices = async () => {
    try {
      const items = await base44.entities.AIServiceAccount.list();
      setServices(items);
    } catch (e) {
      toast({ title: 'Failed to load services', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const toggleConnection = async (service) => {
    try {
      await base44.entities.AIServiceAccount.update(service.id, { is_connected: !service.is_connected });
      toast({ title: `${service.provider_name} ${service.is_connected ? 'disconnected' : 'connected'}` });
      fetchServices();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const setDefault = async (service) => {
    try {
      const sameCategory = services.filter(s => s.provider_category === service.provider_category);
      await base44.entities.AIServiceAccount.bulkUpdate(
        sameCategory.map(s => ({ id: s.id, is_default: s.id === service.id }))
      );
      toast({ title: `${service.provider_name} set as default` });
      fetchServices();
    } catch (e) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-berna-purple animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plug className="w-4 h-4 text-berna-purple" />
        <h3 className="text-sm font-semibold text-white">Connected Services</h3>
      </div>
      <p className="text-xs text-muted-foreground">Manage external AI providers and third-party integrations. Disconnect any service at any time.</p>

      {services.length === 0 ? (
        <div className="glass-panel p-6 text-center">
          <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No connected services configured.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(svc => (
            <div key={svc.id} className="glass-panel p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${svc.is_connected ? 'bg-berna-emerald pulse-glow' : 'bg-muted-foreground'}`} />
                <div>
                  <p className="text-xs font-medium text-white">{svc.provider_label || svc.provider_name}</p>
                  <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[svc.provider_category] || svc.provider_category}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {svc.is_default && <span className="text-[9px] px-1.5 py-0.5 rounded bg-berna-purple/20 text-berna-purple">Default</span>}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDefault(svc)}>
                  <Star className={`w-3 h-3 ${svc.is_default ? 'fill-berna-purple text-berna-purple' : 'text-muted-foreground'}`} />
                </Button>
                <Button size="sm" variant={svc.is_connected ? 'outline' : 'default'} className="h-7 text-[10px]" onClick={() => toggleConnection(svc)}>
                  {svc.is_connected ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}