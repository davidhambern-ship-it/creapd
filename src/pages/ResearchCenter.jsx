import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, Filter, Check, X, Sparkles, Radio, Globe,
  FileText, TrendingUp, Calendar, Tag, ExternalLink
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ProductionProfileBadge from '@/components/production/ProductionProfileBadge';

export default function ResearchCenter() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeProfile, setActiveProfile] = useState(null);
  const [researchModules, setResearchModules] = useState([]);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importUrl, setImportUrl] = useState('');

  useEffect(() => {
    loadResearchData();
  }, []);

  const loadResearchData = async () => {
    try {
      // Get active profile
      const stored = sessionStorage.getItem('activeProductionProfile');
      if (!stored) {
        navigate('/select-production-type');
        return;
      }
      
      const profile = JSON.parse(stored);
      setActiveProfile(profile);

      // Get research modules for this profile type
      const modules = await base44.entities.ResearchModule.filter({
        profile_type: profile.type,
        is_active: true
      });
      setResearchModules(modules);

      // Get production items
      const productionItems = await base44.entities.ProductionItem.filter({
        production_profile_type: profile.type
      }, '-created_date', 50);
      setItems(productionItems);
    } catch (error) {
      console.error('Error loading research:', error);
      toast({
        title: 'Error',
        description: 'Failed to load research data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    
    setIsImporting(true);
    try {
      const response = await base44.functions.invoke('importStory', { url: importUrl });
      
      if (response.data.success) {
        await base44.entities.ProductionItem.create({
          title: response.data.title || 'Imported Item',
          item_type: 'article',
          production_profile_id: activeProfile.id,
          production_profile_type: activeProfile.type,
          source: 'manual_import',
          source_url: importUrl,
          summary: response.data.summary || '',
          content: response.data.content || '',
          status: 'new'
        });

        toast({
          title: 'Imported',
          description: 'Item added to research'
        });

        setImportUrl('');
        loadResearchData();
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSelectItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleAddToRundown = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: 'No Items Selected',
        description: 'Select items to add to rundown',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Create or get current production
      const productions = await base44.entities.Production.filter({}, '-created_date', 1);
      let production;
      
      if (productions.length > 0) {
        production = productions[0];
      } else {
        production = await base44.entities.Production.create({
          title: `${activeProfile.name} - ${new Date().toLocaleDateString()}`,
          brand_profile_id: null,
          show_profile_id: null,
          production_date: new Date().toISOString().split('T')[0],
          status: 'draft',
          story_order: JSON.stringify([]),
          owner_name: 'Current User'
        });
      }

      // Update selected items
      const selectedIds = Array.from(selectedItems);
      await Promise.all(
        selectedIds.map(id => 
          base44.entities.ProductionItem.update(id, {
            is_selected: true,
            selected_for_production_id: production.id,
            status: 'selected'
          })
        )
      );

      toast({
        title: 'Added to Rundown',
        description: `${selectedItems.size} items added to production`
      });

      setSelectedItems(new Set());
      navigate('/workspace');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add items to rundown',
        variant: 'destructive'
      });
    }
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold">Research Center</h1>
            {activeProfile && <ProductionProfileBadge profileType={activeProfile.type} />}
          </div>
          <p className="text-muted-foreground">
            Gather and organize content for your production
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAddToRundown}
            disabled={selectedItems.size === 0}
            className="bg-gradient-to-r from-berna-purple to-berna-purple/80"
          >
            <Check className="w-4 h-4 mr-2" />
            Add to Rundown ({selectedItems.size})
          </Button>
        </div>
      </div>

      {/* Import URL */}
      <Card className="glass-panel">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Import from URL
          </CardTitle>
          <CardDescription>Add articles, recipes, or content from any website</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Paste URL here..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImportUrl()}
            />
            <Button onClick={handleImportUrl} disabled={isImporting}>
              {isImporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />Import
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Research Modules */}
      {researchModules.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Radio className="w-4 h-4 text-berna-purple" />
            Research Sources
          </h2>
          <div className="flex flex-wrap gap-2">
            {researchModules.map(module => (
              <Badge
                key={module.id}
                variant="outline"
                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-berna-purple/10 hover:border-berna-purple/50"
              >
                {module.module_name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search research items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Research Items</h3>
          <p className="text-muted-foreground mb-4">
            Import URLs or fetch from research modules to get started
          </p>
          <Button onClick={() => navigate('/sources')}>
            <Globe className="w-4 h-4 mr-2" />
            Manage Research Sources
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => (
            <Card
              key={item.id}
              className={`glass-panel cursor-pointer transition-all hover:scale-105 ${
                selectedItems.has(item.id) ? 'border-berna-purple ring-2 ring-berna-purple/50' : ''
              }`}
              onClick={() => handleSelectItem(item.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                    {item.category && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {item.category}
                      </Badge>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                    selectedItems.has(item.id)
                      ? 'bg-berna-purple border-berna-purple'
                      : 'border-white/20'
                  }`}>
                    {selectedItems.has(item.id) && <Check className="w-3 h-3" />}
                  </div>
                </div>
              </CardHeader>
              {item.summary && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {item.summary}
                  </p>
                  {item.source_url && (
                    <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate">{item.source_url}</span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}