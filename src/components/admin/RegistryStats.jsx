import React from 'react';
import { Database, CheckCircle2, FileText, Shield, Lock, AlertTriangle, TrendingUp, Clock, BookCheck } from 'lucide-react';

export default function RegistryStats({ stats }) {
  const items = [
    { label: 'Total Records', value: stats.total, icon: Database, color: 'text-primary' },
    { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'text-berna-emerald' },
    { label: 'Public Domain', value: stats.publicDomain, icon: FileText, color: 'text-berna-emerald' },
    { label: 'Licensed', value: stats.licensed, icon: Shield, color: 'text-primary' },
    { label: 'License Required', value: stats.licenseRequired, icon: Lock, color: 'text-accent' },
    { label: 'Permission Required', value: stats.permissionRequired, icon: Lock, color: 'text-accent' },
    { label: 'Metadata Only', value: stats.metadataOnly, icon: FileText, color: 'text-muted-foreground' },
    { label: 'Failed Imports', value: stats.failedImports, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'High Demand', value: stats.highDemand, icon: TrendingUp, color: 'text-accent' },
    { label: 'Recently Added', value: stats.recentlyAdded, icon: Clock, color: 'text-chart-4' },
    { label: 'Imported', value: stats.recentlyImported, icon: BookCheck, color: 'text-berna-emerald' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="glass-panel p-3">
            <Icon className={`w-4 h-4 ${item.color} mb-1.5`} />
            <p className="text-xl font-heading font-bold">{item.value}</p>
            <p className="text-xs text-muted-foreground leading-tight">{item.label}</p>
          </div>
        );
      })}
    </div>
  );
}