import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileCode, FileType, Monitor, FileDown, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  generateCombinedMarkdown, generateCombinedText, generateCombinedTeleprompter,
  generateCombinedHTML, generateCombinedDOCX, generateCombinedPDF,
  downloadFile, downloadPDF, sanitizeFilename, getFileExtension, getMimeType
} from '@/lib/exportUtils';

const FORMATS = [
  { key: 'pdf', label: 'PDF', icon: FileDown },
  { key: 'docx', label: 'DOCX', icon: FileType },
  { key: 'markdown', label: 'Markdown', icon: FileText },
  { key: 'html', label: 'HTML', icon: FileCode },
  { key: 'text', label: 'Text', icon: FileText },
  { key: 'teleprompter', label: 'Teleprompter', icon: Monitor },
];

const DEFAULT_ASSETS = [
  'teleprompter_script', 'story_summary', 'talking_points', 'lower_third_text', 'headline_suggestions'
];

export default function RundownExportButton({ packages, articles, brandProfile, productionTitle, onExported }) {
  const [exporting, setExporting] = useState(false);

  const articleMap = {};
  (articles || []).forEach(a => { articleMap[a.id] = a; });

  const handleExport = async (format) => {
    if (!packages || packages.length === 0) return;
    setExporting(true);
    try {
      const baseName = sanitizeFilename(productionTitle || 'production-rundown');
      const ext = getFileExtension(format);
      const filename = `${baseName}_rundown.${ext}`;
      const includeBranding = true;

      if (format === 'pdf') {
        const doc = await generateCombinedPDF(packages, articleMap, brandProfile, DEFAULT_ASSETS, includeBranding);
        downloadPDF(doc, filename);
      } else if (format === 'docx') {
        const content = generateCombinedDOCX(packages, articleMap, brandProfile, DEFAULT_ASSETS, includeBranding);
        downloadFile(content, filename, getMimeType(format));
      } else if (format === 'markdown') {
        const content = generateCombinedMarkdown(packages, articleMap, brandProfile, DEFAULT_ASSETS, includeBranding);
        downloadFile(content, filename, getMimeType(format));
      } else if (format === 'text') {
        const content = generateCombinedText(packages, articleMap, brandProfile, DEFAULT_ASSETS, includeBranding);
        downloadFile(content, filename, getMimeType(format));
      } else if (format === 'teleprompter') {
        const content = generateCombinedTeleprompter(packages, articleMap, brandProfile, DEFAULT_ASSETS, includeBranding);
        downloadFile(content, filename, getMimeType(format));
      } else if (format === 'html') {
        const content = generateCombinedHTML(packages, articleMap, brandProfile, DEFAULT_ASSETS, includeBranding);
        downloadFile(content, filename, getMimeType(format));
      }

      try {
        await base44.entities.ExportLog.create({
          package_ids: JSON.stringify(packages.map(p => p.id)),
          format,
          file_name: filename,
          asset_count: packages.length,
          status: 'success',
        });
      } catch { /* logging is best-effort */ }

      if (onExported) onExported(format, filename);
    } catch (e) {
      console.error('Rundown export failed:', e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-white/10 text-white text-xs h-8"
          disabled={exporting || !packages?.length}
        >
          {exporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
          {exporting ? 'Exporting...' : 'Export Rundown'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-white/10">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Export {packages?.length || 0} stories as combined document
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        {FORMATS.map(f => {
          const Icon = f.icon;
          return (
            <DropdownMenuItem
              key={f.key}
              onClick={() => handleExport(f.key)}
              className="text-xs text-white cursor-pointer hover:bg-white/[0.06]"
            >
              <Icon className="w-3 h-3 mr-2 text-berna-purple" />
              {f.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}