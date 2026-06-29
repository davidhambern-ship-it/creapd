import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, X, Check, ChevronRight, Palette, Tv, Sparkles, FileText, Settings2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { logActivity } from '@/lib/activityUtils';

export default function ShowStartupModal({ open, onClose, onCreated }) {
  const [brands, setBrands] = useState([]);
  const [shows, setShows] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [step, setStep] = useState(1);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedShow, setSelectedShow] = useState(null);
  const [productionTitle, setProductionTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [autoConfig, setAutoConfig] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      base44.entities.BrandProfile.list('-created_date', 100).then(setBrands);
      base44.entities.ShowProfile.list('-created_date', 100).then(setShows);
      base44.entities.ProductionTemplate.filter({ assignment_level: 'organization_default' }, '-created_date', 20).then(setTemplates);
      setStep(1);
      setSelectedBrand(null);
      setSelectedShow(null);
      setProductionTitle('');
      setAutoConfig(null);
    }
  }, [open]);

  const showsForBrand = shows.filter(s => s.brand_profile_id === selectedBrand?.id);

  const computeAutoConfig = (brand, show) => {
    const config = {
      brandAssets: [],
      templates: [],
      scriptSettings: {},
      productionDefaults: {},
      aiPreferences: {},
      exportPreferences: {},
    };

    if (brand) {
      config.brandAssets.push(brand.logo_url ? 'Logo' : null, brand.brand_description ? 'Brand Description' : null);
      config.brandAssets = config.brandAssets.filter(Boolean);
      if (brand.default_template_ids) {
        try { config.templates = JSON.parse(brand.default_template_ids); } catch {}
      }
      if (brand.intro_text) config.scriptSettings.intro = brand.intro_text;
      if (brand.outro_text) config.scriptSettings.outro = brand.outro_text;
      config.exportPreferences.branding = true;
    }

    if (show) {
      config.scriptSettings.tone = show.default_tone;
      config.scriptSettings.reading_style = show.reading_style;
      config.scriptSettings.opening = show.opening_script ? 'Set' : 'None';
      config.scriptSettings.closing = show.closing_script ? 'Set' : 'None';
      config.productionDefaults.audience = show.audience;
      config.productionDefaults.runtime = show.target_runtime;
      config.aiPreferences.image_provider = show.preferred_image_provider || 'default';
      config.aiPreferences.image_style = show.preferred_image_style || 'Default';
      if (show.default_template_ids) {
        try { config.templates = [...config.templates, ...JSON.parse(show.default_template_ids)]; } catch {}
      }
      config.exportPreferences.format = show.default_export_format;
    }

    // Add org-default templates
    templates.forEach(t => {
      if (!config.templates.includes(t.id)) config.templates.push(t.id);
    });

    return config;
  };

  const handleSelectShow = (show) => {
    setSelectedShow(show);
    setAutoConfig(computeAutoConfig(selectedBrand, show));
    setProductionTitle(show.show_name || 'New Production');
    setStep(3);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const production = await base44.entities.Production.create({
        title: productionTitle || selectedShow?.show_name || 'New Production',
        brand_profile_id: selectedBrand?.id || '',
        show_profile_id: selectedShow?.id || '',
        production_date: today,
        status: 'in_progress',
        target_runtime: selectedShow?.target_runtime || '30 Minutes',
        owner_name: '',
      });
      logActivity('create', {
        entity_type: 'Production',
        entity_id: production.id,
        entity_name: production.title,
        details: `Auto-configured from ${selectedBrand?.brand_name || 'brand'} → ${selectedShow?.show_name || 'show'}`,
      });
      toast({ title: 'Production created', description: 'Settings auto-configured from brand & show profiles' });
      onCreated?.(production);
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-panel-navy w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-berna-purple" />
            Start New Production
          </h2>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { n: 1, label: 'Brand', icon: Palette },
            { n: 2, label: 'Show', icon: Tv },
            { n: 3, label: 'Configure', icon: Settings2 },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${step >= s.n ? 'bg-berna-purple/20 text-berna-purple border border-berna-purple/30' : 'bg-white/[0.03] text-muted-foreground border border-white/[0.06]'}`}>
                <s.icon className="w-3 h-3" />
                {s.label}
              </div>
              {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Brand */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Select a Brand Profile to control the visual identity of this production.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {brands.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => { setSelectedBrand(brand); setStep(2); }}
                  className="glass-panel p-3 text-left hover:border-berna-purple/30 transition-all flex items-center gap-3"
                >
                  {brand.logo_url ? (
                    <img src={brand.logo_url} alt={brand.brand_name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-berna-purple/20 to-berna-orange/20 flex items-center justify-center">
                      <Palette className="w-4 h-4 text-berna-purple" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{brand.brand_name}</p>
                    {brand.network_name && <p className="text-[10px] text-muted-foreground truncate">{brand.network_name}</p>}
                  </div>
                </button>
              ))}
            </div>
            {brands.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No brand profiles yet. Create one first.</p>}
          </div>
        )}

        {/* Step 2: Show */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
              {selectedBrand.logo_url && <img src={selectedBrand.logo_url} className="w-6 h-6 rounded object-cover" alt="" />}
              <span className="text-xs text-white">{selectedBrand.brand_name}</span>
              <button onClick={() => setStep(1)} className="ml-auto text-[10px] text-muted-foreground hover:text-white">Change</button>
            </div>
            <p className="text-xs text-muted-foreground">Select a Show Profile to control production behavior — tone, style, runtime, and AI preferences.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {showsForBrand.length > 0 ? showsForBrand.map(show => (
                <button
                  key={show.id}
                  onClick={() => handleSelectShow(show)}
                  className="glass-panel p-3 text-left hover:border-berna-purple/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Tv className="w-3.5 h-3.5 text-berna-purple" />
                    <p className="text-xs font-semibold text-white truncate">{show.show_name}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {show.default_tone && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-berna-purple/10 text-berna-purple capitalize">{show.default_tone.replace(/_/g, ' ')}</span>}
                    {show.target_runtime && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">{show.target_runtime}</span>}
                  </div>
                </button>
              )) : (
                <p className="text-xs text-muted-foreground text-center py-4 col-span-2">No shows for this brand. Create one first.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Auto-configured */}
        {step === 3 && autoConfig && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03]">
              {selectedBrand.logo_url && <img src={selectedBrand.logo_url} className="w-6 h-6 rounded object-cover" alt="" />}
              <span className="text-xs text-white">{selectedBrand.brand_name}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <Tv className="w-3.5 h-3.5 text-berna-purple" />
              <span className="text-xs text-white">{selectedShow.show_name}</span>
              <button onClick={() => setStep(2)} className="ml-auto text-[10px] text-muted-foreground hover:text-white">Change</button>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Production Title</Label>
              <Input value={productionTitle} onChange={e => setProductionTitle(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-white text-xs h-9" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ConfigCard icon={Palette} title="Brand Assets" items={autoConfig.brandAssets} />
              <ConfigCard icon={FileText} title="Templates" items={autoConfig.templates.length > 0 ? [`${autoConfig.templates.length} template(s) assigned`] : ['No templates']} />
              <ConfigCard icon={Settings2} title="Script Settings" items={Object.entries(autoConfig.scriptSettings).map(([k, v]) => `${k}: ${v}`)} />
              <ConfigCard icon={Sparkles} title="AI Preferences" items={Object.entries(autoConfig.aiPreferences).map(([k, v]) => `${k}: ${v}`)} />
              <ConfigCard icon={Tv} title="Production Defaults" items={Object.entries(autoConfig.productionDefaults).map(([k, v]) => `${k}: ${v}`)} />
              <ConfigCard icon={Download} title="Export Preferences" items={Object.entries(autoConfig.exportPreferences).map(([k, v]) => `${k}: ${v}`)} />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
              <Button size="sm" variant="ghost" className="text-muted-foreground text-xs" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={handleCreate} disabled={creating || !productionTitle}>
                {creating ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                Create Production
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigCard({ icon: Icon, title, items }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3 h-3 text-berna-purple" />
        <span className="text-[10px] font-semibold text-white uppercase tracking-wider">{title}</span>
      </div>
      {items.length > 0 ? (
        <div className="space-y-0.5">
          {items.map((item, i) => (
            <p key={i} className="text-[10px] text-muted-foreground capitalize">{item}</p>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-muted-foreground/50">None</p>
      )}
    </div>
  );
}