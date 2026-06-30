import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getProfileConfig } from '@/lib/productionProfiles';
import { 
  LayoutDashboard, FileText, Search, Clock, TrendingUp, 
  AlertCircle, CheckCircle, Loader2, Newspaper, Music, ChefHat 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const iconMap = {
  LayoutDashboard, FileText, Search, Clock, TrendingUp, AlertCircle, 
  CheckCircle, Newspaper, Music, ChefHat
};

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [production, setProduction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    inProgress: 0,
    completed: 0,
    todayCount: 0
  });

  useEffect(() => {
    loadDashboard();
  }, [searchParams]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const productionId = searchParams.get('productionId');
      const profileKey = searchParams.get('profile') || 'news';

      // Load profile config
      const profileConfig = getProfileConfig(profileKey);
      setProfile(profileConfig);

      // Load production if ID exists
      if (productionId) {
        const prod = await base44.entities.Production.get(productionId);
        setProduction(prod);
        
        // Load content based on profile type
        if (profileKey === 'news') {
          const articles = await base44.entities.Article.filter({ production_id: productionId });
          setStats({
            totalItems: articles.length,
            inProgress: articles.filter(a => a.production_status === 'in_production').length,
            completed: articles.filter(a => a.production_status === 'approved').length,
            todayCount: articles.filter(a => a.created_date && new Date(a.created_date).toDateString() === new Date().toDateString()).length
          });
        } else {
          const items = await base44.entities.ContentItem.filter({ production_id: productionId });
          setStats({
            totalItems: items.length,
            inProgress: items.filter(i => i.status === 'in_rundown').length,
            completed: items.filter(i => i.status === 'approved').length,
            todayCount: items.filter(i => i.created_date && new Date(i.created_date).toDateString() === new Date().toDateString()).length
          });
        }
      } else {
        // Load most recent in_progress production for this profile
        const allProductions = await base44.entities.Production.filter({ status: 'in_progress' }, '-created_date', 10);
        const filteredProductions = allProductions.filter(p => p.profile_key === profileKey);
        if (filteredProductions.length > 0) {
          const prod = filteredProductions[0];
          setProduction(prod);
          // Update URL params to maintain context
          const newParams = new URLSearchParams(searchParams);
          newParams.set('productionId', prod.id);
          setSearchParams(newParams);
          
          if (profileKey === 'news') {
            const articles = await base44.entities.Article.filter({ production_id: prod.id });
            setStats({
              totalItems: articles.length,
              inProgress: articles.filter(a => a.production_status === 'in_production').length,
              completed: articles.filter(a => a.production_status === 'approved').length,
              todayCount: articles.filter(a => a.created_date && new Date(a.created_date).toDateString() === new Date().toDateString()).length
            });
          } else {
            const items = await base44.entities.ContentItem.filter({ production_id: prod.id });
            setStats({
              totalItems: items.length,
              inProgress: items.filter(i => i.status === 'in_rundown').length,
              completed: items.filter(i => i.status === 'approved').length,
              todayCount: items.filter(i => i.created_date && new Date(i.created_date).toDateString() === new Date().toDateString()).length
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-berna-purple" />
      </div>
    );
  }

  const IconComponent = profile ? iconMap[profile.icon] : LayoutDashboard;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {IconComponent && <IconComponent className={`w-8 h-8 text-${profile?.color || 'berna-purple'}`} />}
          <h1 className="text-3xl font-bold text-white">{profile?.name || 'Dashboard'}</h1>
        </div>
        <p className="text-muted-foreground">
          {production ? production.title : 'Select or create a production to get started'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="glass-panel border-white/[0.08]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total {profile?.itemPlural || 'Items'}</p>
                <p className="text-3xl font-bold text-white">{stats.totalItems}</p>
              </div>
              <FileText className="w-10 h-10 text-berna-purple/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/[0.08]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">In Progress</p>
                <p className="text-3xl font-bold text-white">{stats.inProgress}</p>
              </div>
              <Clock className="w-10 h-10 text-berna-orange/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/[0.08]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Completed</p>
                <p className="text-3xl font-bold text-white">{stats.completed}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-berna-emerald/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/[0.08]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Added Today</p>
                <p className="text-3xl font-bold text-white">{stats.todayCount}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-chart-4/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Info */}
      {profile && (
        <div className="glass-panel p-6">
          <h2 className="text-lg font-semibold text-white mb-4">About {profile.name}</h2>
          <p className="text-sm text-muted-foreground mb-4">{profile.description}</p>
          <div className="flex flex-wrap gap-2">
            {profile.contentItemTypes?.map((type) => (
              <span key={type.key} className="text-xs px-3 py-1 rounded-full bg-white/[0.05] text-white">
                {type.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!production && (
        <div className="glass-panel p-12 text-center mt-8">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Production Selected</h3>
          <p className="text-muted-foreground mb-6">
            Create a new production or select an existing one to get started.
          </p>
        </div>
      )}
    </div>
  );
}