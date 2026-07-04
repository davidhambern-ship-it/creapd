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

  const loadAll = useCallback(async () => {
    setLoading(true);
    let activeId = configId;
    let activeConfig = null;

    if (!activeId) {
      const configs = await base44.entities.CookingProductionConfiguration.list('-created_date', 1);
      if (configs && configs.length > 0) {
        activeId = configs[0].id;
        activeConfig = configs[0];
      } else {
        setConfig(null);
        setRecipes([]);
        setResearch([]);
        setIngredients([]);
        setSegments([]);
        setAssets([]);
        setLoading(false);
        return;
      }
    }

    if (!activeConfig) {
      activeConfig = await base44.entities.CookingProductionConfiguration.get(activeId);
    }
    setConfig(activeConfig);

    const [r, res, ing, s, a] = await Promise.all([
      base44.entities.CookingRecipe.filter({ configuration_id: activeId }),
      base44.entities.CookingResearchItem.filter({ configuration_id: activeId }),
      base44.entities.CookingIngredient.filter({ configuration_id: activeId }),
      base44.entities.CookingSegment.filter({ configuration_id: activeId }, 'order'),
      base44.entities.CookingAsset.filter({ configuration_id: activeId })
    ]);

    setRecipes(r || []);
    setResearch(res || []);
    setIngredients(ing || []);
    setSegments(s || []);
    setAssets(a || []);
    setLoading(false);
  }, [configId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return { config, recipes, research, ingredients, segments, assets, loading, refresh: loadAll };
}