import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { Button } from '@/components/ui/button';
import { Loader2, PenTool, Sparkles, Clock, FileText, Package, ChevronRight, Zap } from 'lucide-react';
import { formatDuration, estimateSpeakingTime } from '@/lib/spiritualConstants';
import ProductionModule from '@/components/message/ProductionModule';
import ProductionStatusBar from '@/components/message/ProductionStatusBar';
import RuntimeOverview from '@/components/message/RuntimeOverview';
import PresentationStrip from '@/components/message/PresentationStrip';

export default function SpiritualMessage() {
  const { config, messageSections, assets, packageItems, loading, refresh } = useSpiritualProduction();
  const [generating, setGenerating] = useState(false);
  const moduleRefs = useRef({});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <PenTool className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await base44.functions.invoke('buildSpiritualProduction', { configuration_id: config.id });
      await refresh();
    } catch (err) {
      console.error(err);
    }
    setGenerating(false);
  };

  const scrollToModule = (sectionId) => {
    const el = moduleRefs.current[sectionId];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Building state
  if (generating || config.status === 'building') {
    return (
      <div className="min-h-screen p-6 md:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-bold mb-1">Message Builder</h1>
              <p className="text-sm text-muted-foreground">{config.production_name || config.production_type}</p>
            </div>
          </div>
          <ProductionStatusBar generating={generating} configStatus={config.status} />
        </div>
      </div>
    );
  }

  // Empty state — no sections yet
  if (messageSections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-2">Generate Your Production</h2>
          <p className="text-sm text-muted-foreground mb-6">
            One click generates your complete production: script, presentation slides, speaker notes,
            visual assets, handouts, discussion guides, and delivery package — all simultaneously.
          </p>
          <Button size="lg" onClick={handleGenerate} disabled={generating}>
            <Sparkles className="w-4 h-4 mr-2" /> Generate Message
          </Button>
        </div>
      </div>
    );
  }

  const totalDuration = messageSections.reduce((sum, s) => sum + estimateSpeakingTime(s.content), 0);
  const totalWords = messageSections.reduce((sum, s) => sum + (s.content || '').split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold mb-1">Message Builder</h1>
            <p className="text-sm text-muted-foreground">
              {config.production_type} · {config.speaker_tone} tone · {config.target_runtime}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDuration(totalDuration)}</span>
              <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {totalWords} words</span>
              <span className="flex items-center gap-1"><Package className="w-4 h-4" /> {assets.length} assets</span>
            </div>
            <Button size="sm" onClick={handleGenerate} disabled={generating}>
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Regenerate
            </Button>
          </div>
        </div>

        {/* Runtime Overview */}
        <div className="mb-4">
          <RuntimeOverview sections={messageSections} targetRuntime={config.target_runtime} />
        </div>

        {/* Presentation Strip */}
        <div className="mb-4">
          <PresentationStrip sections={messageSections} assets={assets} onSlideClick={scrollToModule} />
        </div>

        {/* Production Modules */}
        <div className="space-y-3 mb-6">
          {messageSections.map((section, idx) => {
            const slide = assets.find(a => a.associated_section_id === section.id);
            return (
              <div key={section.id} ref={el => { moduleRefs.current[section.id] = el; }}>
                <ProductionModule
                  section={section}
                  slide={slide}
                  index={idx}
                  onRefresh={refresh}
                />
              </div>
            );
          })}
        </div>

        {/* Delivery Package */}
        <div className="glass-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> Delivery Package
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to="/spiritual/assets">View All Assets <ChevronRight className="w-3 h-3" /></Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/spiritual/package">Package Details <ChevronRight className="w-3 h-3" /></Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/spiritual/export">Export <ChevronRight className="w-3 h-3" /></Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {packageItems.map((item, idx) => (
              <div key={item.id || idx} className="p-3 rounded-lg bg-secondary/30">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${
                  item.status === 'approved' || item.status === 'complete' ? 'bg-berna-emerald/20 text-berna-emerald' : 'bg-accent/20 text-accent'
                }`}>{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}