import React from 'react';
import { Activity, Clock, Database, CheckCircle, Radio, Wifi } from 'lucide-react';

export default function ProducerFooter({ automationData }) {
  const data = automationData || {};
  
  return (
    <footer className="hidden lg:flex h-8 glass-panel-navy border-t border-white/[0.06] items-center px-4 gap-6 text-[10px] font-mono text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-berna-emerald" />
        <span>Automation: <span className="text-berna-emerald">Active</span></span>
      </div>
      <div className="flex items-center gap-1.5">
        <Clock className="w-3 h-3" />
        <span>Last Refresh: {data.lastRefresh || 'Today 6:00 AM'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Radio className="w-3 h-3" />
        <span>Sources: {data.sourcesChecked || 24}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Database className="w-3 h-3" />
        <span>Pulled: {data.storiesPulled || 47}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle className="w-3 h-3 text-berna-emerald" />
        <span>Approved: {data.storiesApproved || 18}</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <Wifi className="w-3 h-3 text-berna-emerald" />
        <span>All Systems Operational</span>
      </div>
    </footer>
  );
}