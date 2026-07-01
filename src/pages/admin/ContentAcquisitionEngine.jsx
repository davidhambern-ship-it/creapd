import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';


import CAEEngineHeader from '@/components/cae/CAEEngineHeader';
import CAEOverview from '@/components/cae/CAEOverview';
import CAEActivityFeed from '@/components/cae/CAEActivityFeed';
import CAEDiscoveryPipeline from '@/components/cae/CAEDiscoveryPipeline';
import CAESourceIntelligence from '@/components/cae/CAESourceIntelligence';
import CAEMissions from '@/components/cae/CAEMissions';
import CAECollectionGoals from '@/components/cae/CAECollectionGoals';
import CAEBudget from '@/components/cae/CAEBudget';
import CAESubsystems from '@/components/cae/CAESubsystems';
import CAEOperationsLog from '@/components/cae/CAEOperationsLog';
import { CAE_NAV_TABS } from '@/lib/caeConstants';

export default function ContentAcquisitionEngine() {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [activityEvents, setActivityEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u && u.role === 'admin') {
        loadData();
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [configs, events] = await Promise.all([
        base44.entities.CAEEngineConfig.list(),
        base44.entities.CAEActivityEvent.list('-created_date', 50)
      ]);
      setConfig(configs[0] || null);
      setActivityEvents(events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Realtime subscription for activity events
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const unsubscribe = base44.entities.CAEActivityEvent.subscribe((event) => {
      if (event.type === 'create') {
        setActivityEvents(prev => [event.data, ...prev].slice(0, 50));
      }
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Lock className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold mb-2">Admin Access Required</h2>
          <p className="text-muted-foreground mb-6">The Content Acquisition Engine is restricted to administrators.</p>
          <Button asChild><Link to="/spiritual/library">Back to Library</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CAEEngineHeader config={config} />

      <div className="max-w-[1600px] mx-auto px-4 md:px-6 pb-12">
        <div className="flex gap-1 overflow-x-auto mb-6 pb-2">
          {CAE_NAV_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <CAEOverview config={config} activityEvents={activityEvents} onRefresh={loadData} />}
        {activeTab === 'activity' && <CAEActivityFeed events={activityEvents} />}
        {activeTab === 'discovery' && <CAEDiscoveryPipeline />}
        {activeTab === 'providers' && <CAESourceIntelligence />}
        {activeTab === 'missions' && <CAEMissions config={config} />}
        {activeTab === 'collection' && <CAECollectionGoals />}
        {activeTab === 'budget' && <CAEBudget config={config} onUpdate={loadData} />}
        {activeTab === 'subsystems' && <CAESubsystems />}
        {activeTab === 'operations' && <CAEOperationsLog />}
      </div>
    </div>
  );
}