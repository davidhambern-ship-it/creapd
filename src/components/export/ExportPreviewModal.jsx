import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Eye, Loader2 } from 'lucide-react';
import { formatAsset, ASSET_LABELS, generateDOCX } from '@/lib/exportUtils';

export default function ExportPreviewModal({ open, onClose, pkg, article, brandProfile, format, selectedAssets, includeBranding, onExport }) {
  const [previewContent, setPreviewContent] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open || !pkg) return;
    setGenerating(true);
    import('@/lib/exportUtils').then(async (utils) => {
      let content = '';
      try {
        if (format === 'markdown') content = utils.generateMarkdown(pkg, article, selectedAssets, includeBranding, brandProfile);
        else if (format === 'text') content = utils.generateText(pkg, article, selectedAssets, includeBranding, brandProfile);
        else if (format === 'teleprompter') content = utils.generateTeleprompter(pkg, article, selectedAssets, includeBranding, brandProfile);
        else if (format === 'html') content = utils.generateHTML(pkg, article, selectedAssets, includeBranding, brandProfile);
        else if (format === 'docx') {
          content = generateDOCX(pkg, article, selectedAssets, includeBranding, brandProfile);
          content = content.replace(/<[^>]+>/g, '\n').replace(/\n{3,}/g, '\n\n');
        }
        else if (format === 'pdf') {
          const sections = [];
          if (includeBranding && brandProfile?.brand_name) sections.push({ label: 'Brand', content: brandProfile.brand_name });
          if (article?.title) sections.push({ label: 'Title', content: article.title });
          selectedAssets.forEach(key => {
            const c = formatAsset(pkg[key]);
            if (c) sections.push({ label: ASSET_LABELS[key] || key, content: c });
          });
          content = sections.map(s => `${s.label.toUpperCase()}\n${s.content}`).join('\n\n');
        }
      } catch (e) {
        content = 'Preview unavailable: ' + e.message;
      }
      setPreviewContent(content);
      setGenerating(false);
    });
  }, [open, pkg, article, brandProfile, format, selectedAssets, includeBranding]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-berna-purple" />
            Export Preview — {format.toUpperCase()}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[55vh] bg-white/[0.02] rounded-lg border border-white/[0.06] p-4">
          {generating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-berna-purple animate-spin" />
            </div>
          ) : (
            <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap break-words">{previewContent}</pre>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white text-xs">Cancel</Button>
          <Button onClick={onExport} className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs">
            <Download className="w-3 h-3 mr-1" />
            Download {format.toUpperCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}