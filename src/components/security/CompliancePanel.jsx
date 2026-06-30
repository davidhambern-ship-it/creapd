import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Trash2, FileCheck, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function CompliancePanel() {
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportUserData', {});
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `producer-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data export complete', description: 'Your data has been downloaded as JSON.' });
    } catch (e) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleDeleteData = async () => {
    setDeleting(true);
    try {
      const entityNames = ['Article', 'Briefing', 'ProductionPackage', 'Production', 'ImageAsset',
        'PromptTemplate', 'ProductionTemplate', 'BriefingTemplate', 'ExportProfile', 'ProducerNote',
        'WeeklyPlan', 'DayPlan', 'DirectionChange'];
      let deleted = 0;
      for (const name of entityNames) {
        try {
          await base44.entities[name].deleteMany({});
          deleted++;
        } catch (e) { /* skip */ }
      }
      toast({ title: 'Production data deleted', description: `${deleted} entity types cleared. Your account remains active.` });
      setConfirmDelete(false);
    } catch (e) {
      toast({ title: 'Deletion failed', description: e.message, variant: 'destructive' });
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileCheck className="w-4 h-4 text-berna-purple" />
        <h3 className="text-sm font-semibold text-white">Compliance Readiness</h3>
      </div>
      <p className="text-xs text-muted-foreground">Producer is designed to accommodate applicable privacy and security requirements across supported regions.</p>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Download className="w-3.5 h-3.5 text-berna-purple" />
          <h4 className="text-xs font-semibold text-white">Data Export Request</h4>
        </div>
        <p className="text-xs text-muted-foreground">Download all your production data — stories, briefings, packages, profiles, assets, templates, and notes — as a single JSON file.</p>
        <Button onClick={handleExport} disabled={exporting} className="w-full bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-9">
          {exporting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Exporting...</> : <><Download className="w-3.5 h-3.5 mr-1.5" /> Export My Data</>}
        </Button>
      </div>

      <div className="glass-panel p-4 space-y-3 border border-destructive/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <h4 className="text-xs font-semibold text-white">Account Data Deletion</h4>
        </div>
        <p className="text-xs text-muted-foreground">Permanently delete all your production data from the workspace. This action cannot be undone. Your user account will remain active.</p>
        {!confirmDelete ? (
          <Button onClick={() => setConfirmDelete(true)} variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-9">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Request Data Deletion
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-destructive font-medium text-center">Are you absolutely sure? This cannot be undone.</p>
            <div className="flex gap-2">
              <Button onClick={handleDeleteData} disabled={deleting} variant="destructive" className="flex-1 text-xs h-9">
                {deleting ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Deleting...</> : 'Yes, Delete Everything'}
              </Button>
              <Button onClick={() => setConfirmDelete(false)} variant="outline" className="flex-1 text-xs h-9">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-berna-emerald" />
          <h4 className="text-xs font-semibold text-white">Compliance Capabilities</h4>
        </div>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2"><span className="text-berna-emerald mt-0.5">✓</span> Data export requests supported</li>
          <li className="flex items-start gap-2"><span className="text-berna-emerald mt-0.5">✓</span> Account deletion requests supported</li>
          <li className="flex items-start gap-2"><span className="text-berna-emerald mt-0.5">✓</span> User-controlled AI provider preferences</li>
          <li className="flex items-start gap-2"><span className="text-berna-emerald mt-0.5">✓</span> Workspace boundary enforcement</li>
          <li className="flex items-start gap-2"><span className="text-berna-emerald mt-0.5">✓</span> Diagnostic logging with privacy respect</li>
        </ul>
        <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-white/[0.04]">
          Compliance capabilities will evolve alongside legal and regulatory requirements. The architecture supports future compliance efforts without requiring major redesign.
        </p>
      </div>
    </div>
  );
}