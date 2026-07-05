import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function BriefApprovalBar({ totalStories, approvedStories, totalSections, approvedSections, onApproveAll }) {
  const [approving, setApproving] = useState(false);
  const storyPct = totalStories > 0 ? (approvedStories / totalStories) * 100 : 0;
  const sectionPct = totalSections > 0 ? (approvedSections / totalSections) * 100 : 0;
  const allApproved = totalStories > 0 && approvedStories === totalStories && approvedSections === totalSections;

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-2.5">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Stories Approved</span>
              <span className="text-white font-mono">{approvedStories}/{totalStories}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-berna-emerald rounded-full transition-all duration-300" style={{ width: `${storyPct}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Sections Approved</span>
              <span className="text-white font-mono">{approvedSections}/{totalSections}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-berna-purple rounded-full transition-all duration-300" style={{ width: `${sectionPct}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {!allApproved && (
            <Button
              size="sm"
              className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-8"
              onClick={async () => { setApproving(true); await onApproveAll(); setApproving(false); }}
              disabled={approving}
            >
              {approving
                ? <><span className="w-3 h-3 mr-1 border border-white/40 border-t-white rounded-full animate-spin inline-block" />Approving...</>
                : <><Zap className="w-3 h-3 mr-1" />Approve All</>}
            </Button>
          )}
          {allApproved ? (
            <div className="flex flex-col items-end gap-1">
              <span className="inline-flex items-center gap-1 text-xs text-berna-emerald font-medium">
                <CheckCircle className="w-3 h-3" />Ready for Production
              </span>
              <Link to="/production">
                <Button size="sm" className="bg-berna-emerald hover:bg-berna-emerald/90 text-white text-xs h-8">
                  <Layers className="w-3 h-3 mr-1" />Begin Production
                </Button>
              </Link>
            </div>
          ) : (
            <Link to="/production">
              <Button size="sm" variant="outline" className="border-white/10 text-white text-xs h-8 hover:bg-white/[0.04]">
                <Layers className="w-3 h-3 mr-1" />Go to Production
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}