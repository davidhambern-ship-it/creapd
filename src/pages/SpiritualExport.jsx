import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpiritualProduction } from '@/hooks/useSpiritualProduction';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, Package, BookOpen, FileCode, FileSpreadsheet, Church } from 'lucide-react';
import { SECTION_TYPE_LABELS, ASSET_TYPE_LABELS, PACKAGE_ITEM_LABELS, SOURCE_TYPE_LABELS } from '@/lib/spiritualConstants';

export default function SpiritualExport() {
  const { config, research, topics, messageSections, assets, packageItems, loading } = useSpiritualProduction();
  const [exporting, setExporting] = useState(false);

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
          <Download className="w-12 h-12 text-primary mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No production configuration found.</p>
          <Button asChild><Link to="/spiritual/configure">Configure Production</Link></Button>
        </div>
      </div>
    );
  }

  const downloadFile = (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMessage = () => {
    let content = `${config.production_name}\n${config.faith_tradition} · ${config.production_type}\nDate: ${config.production_date}\nSpeaker: ${config.speaker_name || 'N/A'}\n\n`;
    content += `=== MESSAGE ===\n\n`;
    messageSections.forEach(s => {
      content += `[${SECTION_TYPE_LABELS[s.section_type] || s.section_type}]\n${s.title}\n\n${s.content || ''}\n\n`;
      if (s.scripture_references) content += `Scripture: ${s.scripture_references}\n\n`;
      if (s.speaker_notes) content += `Speaker Notes: ${s.speaker_notes}\n\n`;
    });
    downloadFile(content, `${config.production_name.replace(/\s+/g, '_')}_message.txt`);
  };

  const exportStudyGuide = () => {
    let content = `${config.production_name} — Study Guide\n\n`;
    topics.forEach(t => {
      content += `=== ${t.topic_name} ===\n\n${t.generated_summary || ''}\n\n`;
      if (t.key_passages) content += `Key Passages:\n${t.key_passages}\n\n`;
      if (t.talking_points) content += `Talking Points:\n${t.talking_points}\n\n`;
      if (t.discussion_questions) content += `Discussion Questions:\n${t.discussion_questions}\n\n`;
      if (t.historical_context) content += `Historical Context:\n${t.historical_context}\n\n`;
      content += `${'─'.repeat(60)}\n\n`;
    });
    downloadFile(content, `${config.production_name.replace(/\s+/g, '_')}_study_guide.txt`);
  };

  const exportResearch = () => {
    let content = `${config.production_name} — Research Report\n\n`;
    research.forEach(r => {
      content += `[${SOURCE_TYPE_LABELS[r.source_type] || r.source_type}] ${r.title}\nSource: ${r.source} · Date: ${r.date}\nRelevance: ${r.relevance}\n\n${r.summary}\n\n`;
      if (r.citation) content += `Citation: ${r.citation}\n\n`;
      content += `${'─'.repeat(60)}\n\n`;
    });
    downloadFile(content, `${config.production_name.replace(/\s+/g, '_')}_research.txt`);
  };

  const exportAssets = () => {
    let content = `${config.production_name} — AI Assets\n\n`;
    assets.forEach(a => {
      content += `[${ASSET_TYPE_LABELS[a.asset_type] || a.asset_type}] ${a.title}\nStatus: ${a.status}\n\n${a.content || ''}\n\n`;
      if (a.scripture_reference) content += `Scripture: ${a.scripture_reference} (${a.translation || ''})\n`;
      if (a.citation) content += `Citation: ${a.citation}\n`;
      content += `${'─'.repeat(60)}\n\n`;
    });
    downloadFile(content, `${config.production_name.replace(/\s+/g, '_')}_assets.txt`);
  };

  const exportPackage = () => {
    let content = `${config.production_name} — Complete Production Package\n\n`;
    content += `Faith Tradition: ${config.faith_tradition}\nBranch: ${config.branch_denomination}\nProduction Type: ${config.production_type}\nAudience: ${config.audience}\nSpeaker: ${config.speaker_name || 'N/A'}\nDate: ${config.production_date}\nRuntime: ${config.target_runtime}\nTone: ${config.speaker_tone}\n\n`;
    content += `${'═'.repeat(60)}\n\n=== PRODUCTION PACKAGE ===\n\n`;
    packageItems.forEach(p => {
      content += `[${PACKAGE_ITEM_LABELS[p.item_type] || p.item_type}] ${p.title}\nStatus: ${p.status}\n${p.content || ''}\nSource: ${p.source}\n\n`;
    });
    content += `${'═'.repeat(60)}\n\n=== MESSAGE ===\n\n`;
    messageSections.forEach(s => {
      content += `[${SECTION_TYPE_LABELS[s.section_type] || s.section_type}] ${s.title}\n\n${s.content || ''}\n\n`;
    });
    downloadFile(content, `${config.production_name.replace(/\s+/g, '_')}_package.txt`);
  };

  const exportCSV = () => {
    const rows = [['Type', 'Title', 'Status', 'Source', 'Content Preview']];
    messageSections.forEach(s => rows.push(['Message', s.title, s.status, '', (s.content || '').substring(0, 100)]));
    topics.forEach(t => rows.push(['Topic', t.topic_name, t.status, t.sources || '', (t.generated_summary || '').substring(0, 100)]));
    research.forEach(r => rows.push(['Research', r.title, '', r.source, (r.summary || '').substring(0, 100)]));
    assets.forEach(a => rows.push(['Asset', a.title, a.status, '', (a.content || '').substring(0, 100)]));
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadFile(csv, `${config.production_name.replace(/\s+/g, '_')}_export.csv`, 'text/csv');
  };

  const exportOptions = [
    { label: 'Complete Package', desc: 'Full production package with all sections', icon: Package, action: exportPackage },
    { label: 'Message', desc: 'Message outline and full text', icon: FileText, action: exportMessage },
    { label: 'Study Guide', desc: 'Topics, passages, and discussion questions', icon: BookOpen, action: exportStudyGuide },
    { label: 'Research Report', desc: 'All research items with citations', icon: FileText, action: exportResearch },
    { label: 'AI Assets', desc: 'All generated AI assets', icon: FileCode, action: exportAssets },
    { label: 'CSV Export', desc: 'Spreadsheet of all production items', icon: FileSpreadsheet, action: exportCSV }
  ];

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-bold mb-1">Export Center</h1>
          <p className="text-sm text-muted-foreground">{config.production_name} · {config.production_date}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exportOptions.map(opt => {
            const Icon = opt.icon;
            return (
              <div key={opt.label} className="glass-panel p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-semibold mb-1">{opt.label}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{opt.desc}</p>
                  <Button size="sm" variant="outline" onClick={opt.action} disabled={exporting}>
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-panel p-5 mt-6 border-primary/20">
          <h3 className="font-heading font-semibold mb-2">Export Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">Message Sections:</span> {messageSections.length}</div>
            <div><span className="text-muted-foreground">Study Topics:</span> {topics.length}</div>
            <div><span className="text-muted-foreground">Research Items:</span> {research.length}</div>
            <div><span className="text-muted-foreground">AI Assets:</span> {assets.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}