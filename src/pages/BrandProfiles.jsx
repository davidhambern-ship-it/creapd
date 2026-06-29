import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Star, Pencil, Trash2, Globe, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandProfileEditor from '@/components/profiles/BrandProfileEditor';

export default function BrandProfiles() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    base44.entities.BrandProfile.list('-created_date', 100)
      .then(setBrands)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (editing) {
      await base44.entities.BrandProfile.update(editing.id, form);
    } else {
      await base44.entities.BrandProfile.create(form);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand profile?')) return;
    await base44.entities.BrandProfile.delete(id);
    load();
  };

  const toggleFavorite = async (brand) => {
    await base44.entities.BrandProfile.update(brand.id, { is_favorite: !brand.is_favorite });
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Brand Profiles</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage visual identity, logos, colors, and branding for your productions</p>
        </div>
        <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8" onClick={() => { setEditing(null); setEditorOpen(true); }}>
          <Plus className="w-3 h-3 mr-1" />Create Brand
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {brands.map(brand => (
          <div key={brand.id} className="glass-panel p-4 hover:border-white/[0.12] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt={brand.brand_name} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-berna-purple/20 to-berna-orange/20 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-berna-purple" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-white">{brand.brand_name}</h3>
                  {brand.network_name && <p className="text-[10px] text-muted-foreground">{brand.network_name}</p>}
                </div>
              </div>
              <button onClick={() => toggleFavorite(brand)} className="flex-shrink-0">
                <Star className={`w-4 h-4 ${brand.is_favorite ? 'text-berna-orange fill-berna-orange' : 'text-muted-foreground hover:text-berna-orange'}`} />
              </button>
            </div>

            {brand.brand_description && <p className="text-xs text-white/60 leading-relaxed line-clamp-2 mb-3">{brand.brand_description}</p>}

            <div className="flex items-center gap-2 mb-3">
              {brand.primary_color && <div className="w-5 h-5 rounded border border-white/10" style={{ background: brand.primary_color }} title="Primary" />}
              {brand.secondary_color && <div className="w-5 h-5 rounded border border-white/10" style={{ background: brand.secondary_color }} title="Secondary" />}
              {brand.typography && <span className="text-[10px] text-muted-foreground font-mono">{brand.typography}</span>}
              {brand.website && (
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="ml-auto">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground hover:text-white" />
                </a>
              )}
            </div>

            {brand.social_accounts && <p className="text-[10px] text-muted-foreground mb-3 truncate">{brand.social_accounts}</p>}

            <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
              <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-white" onClick={() => { setEditing(brand); setEditorOpen(true); }}>
                <Pencil className="w-3 h-3 mr-1" />Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7 text-red-400 hover:bg-red-500/10 ml-auto" onClick={() => handleDelete(brand.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {brands.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-white mb-1">No Brand Profiles Yet</h2>
          <p className="text-xs text-muted-foreground mb-4">Create a brand profile to manage logos, colors, and branding across your productions.</p>
          <Button size="sm" className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs" onClick={() => { setEditing(null); setEditorOpen(true); }}>
            <Plus className="w-3 h-3 mr-1" />Create Your First Brand
          </Button>
        </div>
      )}

      <BrandProfileEditor open={editorOpen} profile={editing} onClose={() => setEditorOpen(false)} onSave={handleSave} />
    </div>
  );
}