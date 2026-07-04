import React, { useState } from 'react';
import { useCookingProduction } from '@/hooks/useCookingProduction';
import { base44 } from '@/api/base44Client';
import { Loader2, ChefHat, ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';

export default function CookingRecipes() {
  const { config, recipes, loading, refresh } = useCookingProduction();
  const [expanded, setExpanded] = useState(null);

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

  const toggleApproved = async (recipe) => {
    const newStatus = recipe.status === 'approved' ? 'ready' : 'approved';
    await base44.entities.CookingRecipe.update(recipe.id, { status: newStatus });
    refresh();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold !flex items-center gap-2"><ChefHat className="w-5 h-5 text-primary" /> Recipes</h1>
        <p className="text-sm text-muted-foreground mt-1">Recipes with summaries, instructions, and ingredient lists</p>
      </div>

      {recipes.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <ChefHat className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No recipes generated yet. Refresh your production to generate recipes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(recipe => {
            const isExpanded = expanded === recipe.id;
            const summary = recipe.generated_summary || '';
            const isLong = summary.length > 150;
            return (
              <div key={recipe.id} className="glass-panel p-4">
                <div className="!flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-medium">{recipe.recipe_name}</h3>
                    <div className="!flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="capitalize">{recipe.difficulty}</span>
                      <span className="!flex items-center gap-0.5"><Clock className="w-3 h-3" /> {recipe.prep_time_minutes}min prep</span>
                      <span className="!flex items-center gap-0.5"><Clock className="w-3 h-3" /> {recipe.cook_time_minutes}min cook</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${recipe.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary'}`}>{recipe.status}</span>
                </div>
                {summary && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {isExpanded || !isLong ? summary : summary.substring(0, 150) + '...'}
                  </p>
                )}
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    {recipe.ingredients_list && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ingredients</p>
                        <p className="text-sm whitespace-pre-line">{recipe.ingredients_list}</p>
                      </div>
                    )}
                    {recipe.cooking_instructions && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Instructions</p>
                        <p className="text-sm whitespace-pre-line">{recipe.cooking_instructions}</p>
                      </div>
                    )}
                    {recipe.cooking_techniques && (
                      <div className="p-3 rounded-lg bg-secondary/30">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Techniques</p>
                        <p className="text-sm whitespace-pre-line">{recipe.cooking_techniques}</p>
                      </div>
                    )}
                    {recipe.sources && <p className="text-xs text-muted-foreground"><span className="font-semibold">Sources:</span> {recipe.sources}</p>}
                  </div>
                )}
                <div className="!flex items-center justify-between mt-3">
                  {recipe.suggested_placement && <span className="text-xs text-muted-foreground">{recipe.suggested_placement}</span>}
                  <div className="!flex items-center gap-1 ml-auto">
                    {(isLong || recipe.ingredients_list || recipe.cooking_instructions) && (
                      <button onClick={() => setExpanded(isExpanded ? null : recipe.id)} className="text-xs text-primary hover:underline !flex items-center gap-0.5">
                        {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                      </button>
                    )}
                    <button onClick={() => toggleApproved(recipe)} className="text-xs px-2 py-0.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors !flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {recipe.status === 'approved' ? 'Unapprove' : 'Approve'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}