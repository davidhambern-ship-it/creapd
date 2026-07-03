import React from 'react';
import { CheckCircle, RefreshCw, Download, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStageStatus, STATUS_STYLES } from '../stageConfig';

const REVIEW_STAGES = [
  { key: 'overview', label: 'Overview' },
  { key: 'script', label: 'Script' },
  { key: 'voice', label: 'Voice Package' },
  { key: 'media', label: 'AI Media' },
  { key: 'presentation', label: 'Presentation' },
  { key: 'factcheck', label: 'Fact Check' },
  { key: 'social', label: 'Social' },
];

export default function ApproveStage({ pkg, edits, handleApprove, handleGenerateAll, handleQuickExport, generatingAll, saving, handleSaveAll, hasEdits }) {
  return (
    <div className="space-y-3">
      <div className="glass-panel p-4">
        <h3 className="text-xs font-bold text-white mb-3">Production Status Summary</h3>
        <div className="space-y-2">
          {REVIEW_STAGES.map(({ key, label }) => {
            const status = getStageStatus(key, pkg, edits);
            const st = STATUS_STYLES[status];
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={`flex items-center gap-1 ${st.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {hasEdits && (
        <Button className="w-full h-9" variant="outline" onClick={handleSaveAll} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : `Save Changes (${Object.keys(edits).length})`}
        </Button>
      )}

      <Button className="w-full bg-berna-purple hover:bg-berna-purple/90 text-white h-9" onClick={handleGenerateAll} disabled={generatingAll}>
        {generatingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
        {generatingAll ? 'Regenerating...' : 'Regenerate Full Package'}
      </Button>

      <Button className="w-full h-9" variant="outline" onClick={handleQuickExport} disabled={!pkg?.teleprompter_script}>
        <Download className="w-4 h-4 mr-2" />Quick Export PDF
      </Button>

      {pkg?.status !== 'approved' ? (
        <Button className="w-full h-10 border-berna-emerald/30 bg-berna-emerald/10 hover:bg-berna-emerald/20 text-berna-emerald" variant="outline" onClick={handleApprove}>
          <CheckCircle className="w-4 h-4 mr-2" />Approve Package
        </Button>
      ) : (
        <div className="glass-panel p-3 flex items-center justify-center gap-1.5 text-berna-emerald text-xs">
          <CheckCircle className="w-4 h-4" />Package Approved
        </div>
      )}
    </div>
  );
}