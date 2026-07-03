import React from 'react';

function ProgressRow({ label, percent, value }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-white">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-berna-purple to-berna-emerald transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function WorkspaceProgress({ stories, packages, production }) {
  const total = stories.length || 1;
  const packagesGenerated = packages.filter(p => ['generated', 'edited', 'approved'].includes(p.status)).length;
  const scriptsReviewed = packages.filter(p => ['edited', 'approved'].includes(p.status)).length;
  const graphicsPrepared = packages.filter(p => p.generated_image_url).length;
  const approved = stories.filter(s => s.production_status === 'approved').length;
  const readyForExport = production?.status === 'ready_for_export' || production?.status === 'exported';

  return (
    <div className="glass-panel p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white neon-underline">Story Progress</h3>
      <ProgressRow label="Stories Selected" percent={stories.length > 0 ? 100 : 0} value={`${stories.length}`} />
      <ProgressRow label="Packages Generated" percent={Math.round(packagesGenerated / total * 100)} value={`${packagesGenerated}/${stories.length}`} />
      <ProgressRow label="Scripts Reviewed" percent={Math.round(scriptsReviewed / total * 100)} value={`${scriptsReviewed}/${stories.length}`} />
      <ProgressRow label="Graphics Prepared" percent={Math.round(graphicsPrepared / total * 100)} value={`${graphicsPrepared}/${stories.length}`} />
      <ProgressRow label="Production Approved" percent={Math.round(approved / total * 100)} value={`${approved}/${stories.length}`} />
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-muted-foreground">Ready for Export</span>
        <span className={`text-[10px] font-mono ${readyForExport ? 'text-berna-emerald' : 'text-muted-foreground/50'}`}>
          {readyForExport ? 'Yes' : 'No'}
        </span>
      </div>
    </div>
  );
}