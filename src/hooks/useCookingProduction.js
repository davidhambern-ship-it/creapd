import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useCookingProduction(configId) {
  const [config, setConfig] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [research, setResearch] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [segments, setSegments] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearProduction = useCallback(() => {
    setConfig(null);
    setRecipes([]);
    setResearch([]);
    setIngredients([]);
    setSegments([]);
    setAssets([]);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let activeId = configId;
      let activeConfig = null;

      if (!activeId) {
        const configs = await base44.entities.CookingProductionConfiguration.list('-created_date', 1);
        if (configs && configs.length > 0) {
          activeId = configs[0].id;
          activeConfig = configs[0];
        } else {
          clearProduction();
          return;
        }
      }

      if (!activeConfig) {
        activeConfig = await base44.entities.CookingProductionConfiguration.get(activeId);
      }
      setConfig(activeConfig);

      const results = await Promise.allSettled([
        base44.entities.CookingRecipe.filter({ configuration_id: activeId }),
        base44.entities.CookingResearchItem.filter({ configuration_id: activeId }),
        base44.entities.CookingIngredient.filter({ configuration_id: activeId }),
        base44.entities.CookingSegment.filter({ configuration_id: activeId }, 'order'),
        base44.entities.CookingAsset.filter({ configuration_id: activeId })
      ]);

      const setters = [setRecipes, setResearch, setIngredients, setSegments, setAssets];
      const labels = ['recipes', 'research', 'ingredients', 'segments', 'assets'];
      let partialFailure = false;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          setters[index](result.value || []);
        } else {
          partialFailure = true;
          console.error(`Cooking ${labels[index]} load failed:`, result.reason);
        }
      });

      if (partialFailure) {
        setError(new Error('Some Cooking production data could not be loaded. Refresh to retry.'));
      }
    } catch (err) {
      console.error('useCookingProduction load error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [configId, clearProduction]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, recipes, research, ingredients, segments, assets, loading, error, refresh: loadAll };
}
