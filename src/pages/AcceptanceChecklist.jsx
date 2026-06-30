import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardCheck, Search, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import ComplianceProgress from '@/components/compliance/ComplianceProgress';
import RequirementCategory from '@/components/compliance/RequirementCategory';

export default function AcceptanceChecklist() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('functional');

  useEffect(() => {
    loadRequirements();
  }, []);

  const loadRequirements = async () => {
    try {
      setLoading(true);
      const data = await base44.entities.RequirementItem.list('sort_order', 500);
      setItems(data);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load requirements' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (itemId, newStatus) => {
    const item = items.find(i => i.id === itemId);
    const oldStatus = item.status;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));

    try {
      await base44.entities.RequirementItem.update(itemId, { status: newStatus });
    } catch (error) {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: oldStatus } : i));
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status' });
    }
  };

  const handleReseed = async () => {
    try {
      await base44.functions.invoke('seedRequirements', {});
      await loadRequirements();
      toast({ title: 'Requirements refreshed', description: 'All requirement items reloaded from PRD Section 14' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to reseed requirements' });
    }
  };

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i.requirement_text.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const getTabItems = (type) => filteredItems.filter(i => i.requirement_type === type);

  const groupedByCategory = (list) => {
    const groups = {};
    for (const item of list) {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return Object.entries(groups).map(([category, items]) => ({ category, items }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-berna-purple/15 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-berna-purple" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-display">Requirements & Acceptance Checklist</h1>
            <p className="text-xs text-muted-foreground">PRD Section 14 — Track functional, non-functional, and acceptance criteria completion</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReseed} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />
          Reseed from PRD
        </Button>
      </div>

      <ComplianceProgress items={items} />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search requirements or categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="functional" className="text-xs">
            Functional ({getTabItems('functional').length})
          </TabsTrigger>
          <TabsTrigger value="non_functional" className="text-xs">
            Non-Functional ({getTabItems('non_functional').length})
          </TabsTrigger>
          <TabsTrigger value="acceptance" className="text-xs">
            Acceptance ({getTabItems('acceptance').length})
          </TabsTrigger>
        </TabsList>

        {['functional', 'non_functional', 'acceptance'].map(type => (
          <TabsContent key={type} value={type} className="space-y-3 mt-4">
            {groupedByCategory(getTabItems(type)).map(group => (
              <RequirementCategory
                key={group.category}
                category={group.category}
                items={group.items}
                onStatusChange={handleStatusChange}
              />
            ))}
            {getTabItems(type).length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No requirements match your search.
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}