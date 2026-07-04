import React, { useState } from 'react';
import { useCookingProduction } from '@/hooks/useCookingProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChefHat, Carrot, Plus, Trash2 } from 'lucide-react';

export default function CookingIngredients() {
  const { config, ingredients, loading, refresh } = useCookingProduction();
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ ingredient_name: '', category: '', description: '', sourcing_notes: '', substitution_notes: '', nutritional_notes: '' });

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (!config) {
    return (
      <div className="flex items-center justify-center h-screen p-6">
        <div className="max-w-md text-center">
          <ChefHat className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">No production configured.</p>
        </div>
      </div>
    );
  }

  const handleAdd = async () => {
    if (!newItem.ingredient_name.trim()) return;
    await base44.entities.CookingIngredient.create({ configuration_id: config.id, ...newItem, status: 'pending' });
    setNewItem({ ingredient_name: '', category: '', description: '', sourcing_notes: '', substitution_notes: '', nutritional_notes: '' });
    setAdding(false);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.CookingIngredient.delete(id);
    refresh();
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'confirmed' ? 'pending' : 'confirmed';
    await base44.entities.CookingIngredient.update(item.id, { status: newStatus });
    refresh();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="!flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold !flex items-center gap-2"><Carrot className="w-5 h-5 text-primary" /> Ingredients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage key ingredients, sourcing notes, and substitutions</p>
        </div>
        <Button onClick={() => setAdding(!adding)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> {adding ? 'Cancel' : 'Add Ingredient'}
        </Button>
      </div>

      {adding && (
        <div className="glass-panel p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ingredient Name *</Label>
              <Input value={newItem.ingredient_name} onChange={e => setNewItem({ ...newItem, ingredient_name: e.target.value })} placeholder="Saffron" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="Spice" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="Brief description..." rows={2} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Sourcing Notes</Label>
              <Textarea value={newItem.sourcing_notes} onChange={e => setNewItem({ ...newItem, sourcing_notes: e.target.value })} placeholder="Where to find..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Substitution Notes</Label>
              <Textarea value={newItem.substitution_notes} onChange={e => setNewItem({ ...newItem, substitution_notes: e.target.value })} placeholder="Alternatives..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Nutritional Notes</Label>
              <Textarea value={newItem.nutritional_notes} onChange={e => setNewItem({ ...newItem, nutritional_notes: e.target.value })} placeholder="Nutrition info..." rows={2} />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!newItem.ingredient_name.trim()}>Save Ingredient</Button>
        </div>
      )}

      {ingredients.length === 0 && !adding ? (
        <div className="glass-panel p-8 text-center">
          <Carrot className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No ingredients added yet. Click "Add Ingredient" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ingredients.map(item => (
            <div key={item.id} className="glass-panel p-4 space-y-2">
              <div className="!flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium">{item.ingredient_name}</h3>
                  {item.category && <span className="text-xs text-muted-foreground">{item.category}</span>}
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
              {item.sourcing_notes && <p className="text-xs text-muted-foreground"><span className="font-semibold">Sourcing:</span> {item.sourcing_notes}</p>}
              {item.substitution_notes && <p className="text-xs text-muted-foreground"><span className="font-semibold">Substitutes:</span> {item.substitution_notes}</p>}
              {item.nutritional_notes && <p className="text-xs text-muted-foreground"><span className="font-semibold">Nutrition:</span> {item.nutritional_notes}</p>}
              <button onClick={() => toggleStatus(item)} className={`text-xs px-2 py-0.5 rounded-md transition-colors ${item.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                {item.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}