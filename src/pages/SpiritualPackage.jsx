import React from 'react';
import { Link } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Package, CheckCircle2, Clock, AlertCircle, Download } from 'lucide-react';
import { PACKAGE_ITEM_LABELS } from '@/lib/spiritualConstants';

export default function SpiritualPackage() {
  const { config, packageItems, messageSections, assets, research, topics, loading, refresh } = useSpiritualProduction();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Package className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  if (packageItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <Package className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No package items yet. Refresh your production to build the package.</p>
          <Button asChild><Link to="/spiritual/dashboard">Back to Dashboard</Link></Button>
        </div>
      </div>
    );
  }

  const approvedCount = packageItems.filter(p => p.status === 'approved' || p.status === 'complete').length;
  const readiness = Math.round((approvedCount / packageItems.length) * 100);

  const statusIcons = {
    approved: <CheckCircle2 className="w-4 h-4 text-berna-emerald" />,
    complete: <CheckCircle2 className="w-4 h-4 text-berna-emerald" />,
    needs_review: <Clock className="w-4 h-4 text-accent" />,
    generating: <Loader2 className="w-4 h-4 text-primary animate-spin" />,
    missing: <AlertCircle className="w-4 h-4 text-destructive" />
  };

  const summary = {
    message: messageSections.length,
    study: topics.length,
    research: research.length,
    presentation: assets.filter(a => a.asset_type.includes('slide')).length,
    assets: assets.length,
    approved: assets.filter(a => a.status === 'approved').length
  };

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold mb-1">Production Package</h1>
            <p className="text-sm text-muted-foreground">{config.production_name} · {config.production_date}</p>
          </div>
          <Button asChild>
            <Link to="/spiritual/export">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Link>
          </Button>
        </div>

        <div className="glass-panel p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Package Readiness</h3>
            <div className="text-3xl font-heading font-bold text-berna-emerald">{readiness}%</div>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary/30 overflow-hidden">
            <div className="h-full bg-berna-emerald rounded-full transition-all" style={{ width: `${readiness}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{approvedCount} of {packageItems.length} items ready</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Message Sections', count: summary.message },
            { label: 'Study Topics', count: summary.study },
            { label: 'Research Items', count: summary.research },
            { label: 'Slides', count: summary.presentation },
            { label: 'Total Assets', count: summary.assets },
            { label: 'Approved', count: summary.approved }
          ].map(stat => (
            <div key={stat.label} className="glass-panel p-3 text-center">
              <div className="text-2xl font-heading font-bold text-primary">{stat.count}</div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {packageItems.map(item => (
            <div key={item.id} className="glass-panel p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-muted-foreground">#{item.order + 1}</span>
                {statusIcons[item.status] || <Clock className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{PACKAGE_ITEM_LABELS[item.item_type] || item.item_type} · {item.source}</p>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                item.status === 'approved' || item.status === 'complete'
                  ? 'bg-berna-emerald/20 text-berna-emerald'
                  : item.status === 'needs_review'
                    ? 'bg-accent/20 text-accent'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}