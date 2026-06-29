import { jsPDF } from 'jspdf';

export const ASSET_LABELS = {
  teleprompter_script: 'Teleprompter Script',
  story_summary: 'Story Summary',
  talking_points: 'Talking Points',
  lower_third_text: 'Lower Third Text',
  headline_suggestions: 'Headline Suggestions',
  image_prompt: 'Image Prompt',
  thumbnail_prompt: 'Thumbnail Prompt',
  visual_suggestions: 'Visual Suggestions',
  broll_suggestions: 'B-Roll Suggestions',
  social_caption: 'Social Caption',
  fact_check_notes: 'Fact Check Notes',
  estimated_runtime: 'Estimated Runtime',
};

export const ASSET_OPTIONS = Object.keys(ASSET_LABELS);

export function formatAsset(content) {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.map((item, i) => {
        if (typeof item === 'string') return `${i + 1}. ${item}`;
        if (typeof item === 'object' && item !== null) return `${i + 1}. ${Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
        return `${i + 1}. ${String(item)}`;
      }).join('\n');
    }
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join('\n');
    }
    return String(parsed);
  } catch {
    return content;
  }
}

function buildSections(pkg, article, selectedAssets, includeBranding) {
  const sections = [];
  if (includeBranding) {
    if (article?.source_name) sections.push({ label: 'Source', content: article.source_name });
    if (article?.url) sections.push({ label: 'URL', content: article.url });
    if (pkg.tone) sections.push({ label: 'Tone', content: pkg.tone.replace(/_/g, ' ') });
    if (pkg.reading_style) sections.push({ label: 'Reading Style', content: pkg.reading_style.replace(/_/g, ' ') });
    if (pkg.audience) sections.push({ label: 'Audience', content: pkg.audience });
    if (pkg.estimated_runtime) sections.push({ label: 'Runtime', content: pkg.estimated_runtime });
  }
  selectedAssets.forEach(key => {
    const content = formatAsset(pkg[key]);
    if (content) sections.push({ label: ASSET_LABELS[key], content });
  });
  return sections;
}

export function generateMarkdown(pkg, article, selectedAssets, includeBranding) {
  const sections = buildSections(pkg, article, selectedAssets, includeBranding);
  let md = `# ${article?.title || 'Production Package'}\n\n`;
  sections.forEach(s => {
    md += `## ${s.label}\n${s.content}\n\n`;
  });
  return md;
}

export function generateText(pkg, article, selectedAssets, includeBranding) {
  const sections = buildSections(pkg, article, selectedAssets, includeBranding);
  let text = `${article?.title || 'Production Package'}\n${'='.repeat(50)}\n\n`;
  sections.forEach(s => {
    text += `${s.label.toUpperCase()}\n${'-'.repeat(s.label.length)}\n${s.content}\n\n`;
  });
  return text;
}

export function generateTeleprompter(pkg, article, selectedAssets, includeBranding) {
  const script = formatAsset(pkg.teleprompter_script);
  if (!script) return 'No teleprompter script available.';
  let text = '';
  if (includeBranding) {
    text += `[PAUSE 2s]\n\n`;
  }
  text += script;
  return text;
}

export function generateHTML(pkg, article, selectedAssets, includeBranding) {
  const sections = buildSections(pkg, article, selectedAssets, includeBranding);
  const body = sections.map(s => {
    const content = s.content.split('\n').map(l => `<p>${l}</p>`).join('');
    return `<h2>${s.label}</h2><div>${content}</div>`;
  }).join('\n');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${article?.title || 'Production Package'}</title><style>body{font-family:Inter,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}h1{color:#7c3aed}h2{color:#f97316;border-bottom:2px solid #f97316;padding-bottom:4px;margin-top:24px}p{line-height:1.6;margin:4px 0}</style></head><body><h1>${article?.title || 'Production Package'}</h1>${body}</body></html>`;
}

export function generatePDF(pkg, article, selectedAssets, includeBranding) {
  const doc = new jsPDF();
  const sections = buildSections(pkg, article, selectedAssets, includeBranding);
  const pageHeight = doc.internal.pageSize.height;
  let y = 20;

  doc.setFontSize(16);
  doc.setTextColor(124, 58, 237);
  const titleLines = doc.splitTextToSize(article?.title || 'Production Package', 170);
  titleLines.forEach(line => {
    if (y > pageHeight - 20) { doc.addPage(); y = 20; }
    doc.text(line, 20, y);
    y += 7;
  });
  y += 4;

  sections.forEach(s => {
    if (y > pageHeight - 30) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setTextColor(249, 115, 22);
    doc.text(s.label, 20, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(51, 51, 51);
    const lines = doc.splitTextToSize(s.content, 170);
    lines.forEach(line => {
      if (y > pageHeight - 20) { doc.addPage(); y = 20; }
      doc.text(line, 20, y);
      y += 5;
    });
    y += 4;
  });

  return doc;
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPDF(doc, filename) {
  doc.save(filename);
}

export function sanitizeFilename(name) {
  return (name || 'production-package').replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
}

export function getFileExtension(format) {
  const map = { pdf: 'pdf', markdown: 'md', text: 'txt', teleprompter: 'txt', html: 'html' };
  return map[format] || 'txt';
}

export function getMimeType(format) {
  const map = { markdown: 'text/markdown', text: 'text/plain', teleprompter: 'text/plain', html: 'text/html' };
  return map[format] || 'text/plain';
}