import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Church, BookOpen, Search, PenTool, Sparkles, Package, Download, RefreshCw, GraduationCap, ListChecks, Clock, FileText, CheckCircle2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import CreateMessageButton from '@/components/message/CreateMessageButton';
import MessageArchive from '@/components/message/MessageArchive';
import { SECTION_TYPE_LABELS, ASSET_TYPE_LABELS, formatDuration } from '@/lib/spiritualConstants';

export default function SpiritualDashboard() {
  const { config, setConfig, research, topics, messageSections, assets, packageItems, loading, refresh } = useSpiritualProduction();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTopic, setExpandedTopic] = useState(null);
  const [creatingMessage, setCreatingMessage] = useState(null);
  const navigate = useNavigate();

  const handleCreateMessageFromTopic = async (topicName) => {
    setCreatingMessage(topicName);
    try {
      const { createMessageFromContext } = await import('@/lib/createMessage');
      await createMessageFromContext({
        title: `Message: ${topicName}`,
        topic: topicName,
        faith_tradition: config?.faith_tradition,
        branch_denomination: config?.branch_denomination,
        sacred_texts: config?.sacred_texts,
        study_topics: JSON.stringify([topicName]),
      });
      navigate('/spiritual/message');
    } catch (err) {
      console.error(err);
      setCreatingMessage(null);
    }
  };

  const handleTopicClick = (topic) => {
    const query = encodeURIComponent(topic.topic_name);
    navigate(`/spiritual/study?query=${query}&autoRun=true&source=dashboard-topic&productionId=${config?.id || ''}`);
  };

  const handleRefresh = async () => {
    if (!config) return;
    try {
      await base44.entities.SpiritualProductionConfiguration.update(config.id, { status: 'building' });
      setConfig({ ...config, status: 'building' });
      base44.functions.invoke('buildSpiritualProduction', { configuration_id: config.id }).catch(() => {});
    } catch (err) {
      console.error(err);
    }
  };

  if (config?.status === 'building') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 mb-6">
            <Church className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-heading font-bold mb-3">Building Your Spiritual Production</h2>
          <p className="text-muted-foreground mb-8">Producer is gathering research, preparing study topics, building your message, and generating AI assets. This takes about 60 seconds.</p>
          <div className="space-y-3 text-left">
            {['Gathering research', 'Preparing study topics', 'Building message outline', 'Generating AI assets'].map((label, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-muted-foreground">{label}...</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Church className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold mb-2">No Production Found</h2>
          <p className="text-muted-foreground mb-6">Create your first Spiritual Production configuration to get started.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }



  const totalDuration = messageSections.reduce((sum, s) => sum + (s.estimated_duration_seconds || 0), 0);
  const approvedAssets = assets.filter(a => a.status === 'approved' || a.status === 'ready').length;
  const approvedTopics = topics.filter(t => t.status === 'approved' || t.status === 'ready').length;
  const readiness = packageItems.length > 0 ? Math.round((packageItems.filter(p => p.status === 'approved' || p.status === 'complete').length / packageItems.length) * 100) : 0;

  const QUICK_ACTIONS = [
    { label: 'Study Workspace', icon: GraduationCap, path: '/spiritual/study' },
    { label: 'World Scripture Library', icon: BookOpen, path: '/spiritual/library' },
    { label: 'Continue Message', icon: PenTool, path: '/spiritual/message' },
    { label: 'Generate Assets', icon: Sparkles, path: '/spiritual/assets' },
    { label: 'Refresh Research', icon: Search, path: '/spiritual/research' },
    { label: 'Production Package', icon: Package, path: '/spiritual/package' },
    { label: 'Export', icon: Download, path: '/spiritual/export' },
    { label: 'Edit Configuration', icon: Church, path: `/spiritual/configure?config_id=${config.id}` }
  ];

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold">{config.production_name}</h1>
            <p className="text-sm text-muted-foreground">{config.faith_tradition} · {config.production_type} · {config.production_date}</p>
            {config.source_research_session_id && (
              <Link
                to={`/spiritual/study/${config.source_research_session_id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
              >
                <GraduationCap className="w-3 h-3" /> Created from research study
              </Link>
            )}
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="glass-panel p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold">Today's Production</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Speaker:</span> {config.speaker_name || 'N/A'}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Audience:</span> {config.audience}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tone:</span> {config.speaker_tone}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Runtime:</span> {config.target_runtime}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Branch:</span> {config.branch_denomination}</div>
            </div>
          </div>

          <div className="glass-panel p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-heading font-semibold">Message Status</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Sections:</span> {messageSections.length}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Est. Duration:</span> {formatDuration(totalDuration)}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Study Topics:</span> {approvedTopics}/{topics.length}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">AI Assets:</span> {approvedAssets}/{assets.length}</div>
            </div>
          </div>

          <div className="glass-panel p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-berna-emerald" />
              </div>
              <h3 className="font-heading font-semibold">Production Readiness</h3>
            </div>
            <div className="text-center my-4">
              <div className="text-4xl font-heading font-bold text-berna-emerald">{readiness}%</div>
              <p className="text-xs text-muted-foreground mt-1">{packageItems.filter(p => p.status === 'approved' || p.status === 'complete').length} of {packageItems.length} items ready</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <Link key={action.label} to={action.path} className="glass-panel p-4 hover:border-primary/30 transition-colors group">
                <Icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium">{action.label}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> Study Topics</h3>
              <Link to="/spiritual/study" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">No topics generated yet.</p>
            ) : (
              <div className="space-y-2">
                {topics.slice(0, 5).map(topic => {
                  const isExpanded = expandedTopic === topic.id;
                  const summary = topic.generated_summary || '';
                  const isLong = summary.length > 120;
                  return (
                    <div
                      key={topic.id}
                      className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 border border-transparent transition-all cursor-pointer"
                      onClick={() => handleTopicClick(topic)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-medium">{topic.topic_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${topic.status === 'approved' ? 'bg-berna-emerald/20 text-berna-emerald' : 'bg-primary/20 text-primary'}`}>
                          {topic.status}
                        </span>
                      </div>
                      {summary && (
                        <p className="text-xs text-muted-foreground">
                          {isExpanded || !isLong ? summary : summary.substring(0, 120) + '...'}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        {topic.suggested_placement && (
                          <span className="text-xs text-muted-foreground">{topic.suggested_placement}</span>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          {isLong && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpandedTopic(isExpanded ? null : topic.id); }}
                              className="text-xs text-primary hover:underline flex items-center gap-0.5"
                            >
                              {isExpanded ? <><ChevronUp className="w-3 h-3" /> Less</> : <><ChevronDown className="w-3 h-3" /> More</>}
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTopicClick(topic); }}
                            className="text-xs px-2 py-0.5 rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors flex items-center gap-1"
                          >
                            <GraduationCap className="w-3 h-3" /> Study
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCreateMessageFromTopic(topic.topic_name); }}
                            disabled={creatingMessage === topic.topic_name}
                            className="text-xs px-2 py-0.5 rounded-md bg-accent/20 text-accent hover:bg-accent/30 transition-colors flex items-center gap-1"
                          >
                            {creatingMessage === topic.topic_name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} Message
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="glass-panel p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Recent Research</h3>
              <Link to="/spiritual/research" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {research.length === 0 ? (
              <p className="text-sm text-muted-foreground">No research items yet.</p>
            ) : (
              <div className="space-y-2">
                {research.slice(0, 5).map(item => (
                  <Link
                    key={item.id}
                    to={`/spiritual/research/${item.id}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 hover:border-primary/30 border border-transparent transition-all"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.source}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.relevance === 'high' ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}`}>
                      {item.relevance}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <MessageArchive currentConfigId={config.id} />
      </div>
    </div>
  );
}