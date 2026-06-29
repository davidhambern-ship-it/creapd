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
  producer_notes: 'Producer Notes',
  fact_check_notes: 'Fact Check Notes',
  estimated_runtime: 'Estimated Runtime',
};

export const ASSET_OPTIONS = Object.keys(ASSET_LABELS);

export const MEDIA_ASSET_LABELS = {
  generated_image_url: 'Generated Image',
  generated_thumbnail_url: 'Thumbnail',
  generated_video_url: 'Video URL',
  generated_audio_url: 'Audio URL',
};

export const MEDIA_ASSET_OPTIONS = Object.keys(MEDIA_ASSET_LABELS);

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

function buildBrandSections(brandProfile) {
  if (!brandProfile) return [];
  const sections = [];
  if (brandProfile.brand_name) sections.push({ label: 'Brand', content: brandProfile.brand_name });
  if (brandProfile.organization_name) sections.push({ label: 'Organization', content: brandProfile.organization_name });
  if (brandProfile.network_name) sections.push({ label: 'Network', content: brandProfile.network_name });
  if (brandProfile.intro_text) sections.push({ label: 'Show Intro', content: brandProfile.intro_text });
  if (brandProfile.outro_text) sections.push({ label: 'Show Outro', content: brandProfile.outro_text });
  if (brandProfile.website) sections.push({ label: 'Website', content: brandProfile.website });
  if (brandProfile.social_accounts) sections.push({ label: 'Social', content: brandProfile.social_accounts });
  return sections;
}

function buildMetadataSections(pkg, article, includeMetadata) {
  if (!includeMetadata) return [];
  const sections = [];
  if (article?.source_name) sections.push({ label: 'Source', content: article.source_name });
  if (article?.author) sections.push({ label: 'Author', content: article.author });
  if (article?.url) sections.push({ label: 'URL', content: article.url });
  if (article?.published_at) sections.push({ label: 'Published', content: new Date(article.published_at).toLocaleString() });
  if (pkg.tone) sections.push({ label: 'Tone', content: pkg.tone.replace(/_/g, ' ') });
  if (pkg.reading_style) sections.push({ label: 'Reading Style', content: pkg.reading_style.replace(/_/g, ' ') });
  if (pkg.audience) sections.push({ label: 'Audience', content: pkg.audience });
  if (pkg.estimated_runtime) sections.push({ label: 'Runtime', content: pkg.estimated_runtime });
  return sections;
}

function buildAssetSections(pkg, selectedAssets) {
  const sections = [];
  selectedAssets.forEach(key => {
    const content = formatAsset(pkg[key]);
    if (content) sections.push({ label: ASSET_LABELS[key] || key, content });
  });
  return sections;
}

function buildSections(pkg, article, selectedAssets, includeBranding, brandProfile) {
  const sections = [];
  if (includeBranding) {
    sections.push(...buildBrandSections(brandProfile));
    sections.push(...buildMetadataSections(pkg, article, true));
  }
  sections.push(...buildAssetSections(pkg, selectedAssets));
  return sections;
}

export function generateMarkdown(pkg, article, selectedAssets, includeBranding, brandProfile) {
  const sections = buildSections(pkg, article, selectedAssets, includeBranding, brandProfile);
  let md = `# ${article?.title || 'Production Package'}\n\n`;
  sections.forEach(s => {
    md += `## ${s.label}\n${s.content}\n\n`;
  });
  return md;
}

export function generateText(pkg, article, selectedAssets, includeBranding, brandProfile) {
  const sections = buildSections(pkg, article, selectedAssets, includeBranding, brandProfile);
  let text = `${article?.title || 'Production Package'}\n${'='.repeat(50)}\n\n`;
  sections.forEach(s => {
    text += `${s.label.toUpperCase()}\n${'-'.repeat(s.label.length)}\n${s.content}\n\n`;
  });
  return text;
}

export function generateTeleprompter(pkg, article, selectedAssets, includeBranding, brandProfile) {
  const script = formatAsset(pkg.teleprompter_script);
  if (!script) return 'No teleprompter script available.';
  let text = '';
  if (includeBranding && brandProfile?.intro_text) {
    text += `[PAUSE 2s]\n${brandProfile.intro_text}\n[PAUSE 2s]\n\n`;
  } else if (includeBranding) {
    text += `[PAUSE 2s]\n\n`;
  }
  text += `[STORY: ${article?.title || 'Untitled'}]\n\n`;
  text += script;
  if (includeBranding && brandProfile?.outro_text) {
    text += `\n\n[PAUSE 2s]\n${brandProfile.outro_text}\n[PAUSE 2s]`;
  }
  return text;
}

export function generateDOCX(pkg, article, selectedAssets, includeBranding, brandProfile) {
  const sections = buildSections(pkg, article, selectedAssets, includeBranding, brandProfile);
  const primaryColor = brandProfile?.primary_color || '#7c3aed';
  const secondaryColor = brandProfile?.secondary_color || '#f97316';
  const brandName = brandProfile?.brand_name || '';

  const body = sections.map(s => {
    const content = s.content.split('\n').map(l => `<p>${l}</p>`).join('');
    return `<h2 style="color:${secondaryColor};">${s.label}</h2>${content}`;
  }).join('\n');

  let mediaHTML = '';
  if (pkg.generated_image_url) {
    mediaHTML += `<p><img src="${pkg.generated_image_url}" width="500" /></p>`;
  }

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>${article?.title || 'Production Package'}</title>
    <style>
      body { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #333; }
      h1 { color: ${primaryColor}; font-size: 18pt; }
      h2 { color: ${secondaryColor}; font-size: 12pt; text-transform: uppercase; border-bottom: 1px solid ${secondaryColor}; }
      p { line-height: 1.6; margin: 4pt 0; }
      .brand { text-align: center; font-size: 20pt; font-weight: bold; color: ${primaryColor}; }
    </style></head>
    <body>
    ${includeBranding && brandName ? `<p class="brand">${brandName}</p>` : ''}
    <h1>${article?.title || 'Production Package'}</h1>
    ${mediaHTML}
    ${body}
    </body></html>`;
  return html;
}

export function generateCombinedDOCX(packages, articles, brandProfile, selectedAssets, includeBranding) {
  const primaryColor = brandProfile?.primary_color || '#7c3aed';
  const secondaryColor = brandProfile?.secondary_color || '#f97316';
  const brandName = brandProfile?.brand_name || '';

  const storiesHTML = packages.map((pkg, i) => {
    const article = articles[pkg.article_id];
    const sections = buildSections(pkg, article, selectedAssets, false, null);
    const body = sections.map(s => {
      const content = s.content.split('\n').map(l => `<p>${l}</p>`).join('');
      return `<h2>${s.label}</h2>${content}`;
    }).join('\n');
    let media = '';
    if (pkg.generated_image_url) {
      media = `<p><img src="${pkg.generated_image_url}" width="400" /></p>`;
    }
    return `<h1 style="color:${primaryColor};">Story ${i + 1}: ${article?.title || 'Untitled'}</h1>${media}${body}`;
  }).join('\n');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Production Rundown</title>
    <style>
      body { font-family: 'Calibri', sans-serif; font-size: 11pt; color: #333; }
      h1 { color: ${primaryColor}; font-size: 16pt; }
      h2 { color: ${secondaryColor}; font-size: 12pt; text-transform: uppercase; }
      p { line-height: 1.6; margin: 4pt 0; }
      .brand { text-align: center; font-size: 22pt; font-weight: bold; color: ${primaryColor}; }
    </style></head>
    <body>
    ${includeBranding && brandName ? `<p class="brand">${brandName}</p><p>Production Rundown</p>` : '<h1>Production Rundown</h1>'}
    ${storiesHTML}
    </body></html>`;
  return html;
}

export function generateHTML(pkg, article, selectedAssets, includeBranding, brandProfile) {
  const sections = buildSections(pkg, article, selectedAssets, includeBranding, brandProfile);
  const primaryColor = brandProfile?.primary_color || '#7c3aed';
  const secondaryColor = brandProfile?.secondary_color || '#f97316';
  const brandName = brandProfile?.brand_name || 'Production Package';
  const body = sections.map(s => {
    const content = s.content.split('\n').map(l => `<p>${l}</p>`).join('');
    return `<h2>${s.label}</h2><div>${content}</div>`;
  }).join('\n');

  let mediaHTML = '';
  if (pkg.generated_image_url) {
    mediaHTML += `<div class="media"><img src="${pkg.generated_image_url}" alt="Generated Image" /></div>`;
  }
  if (pkg.generated_thumbnail_url && pkg.generated_thumbnail_url !== pkg.generated_image_url) {
    mediaHTML += `<div class="media"><img src="${pkg.generated_thumbnail_url}" alt="Thumbnail" /></div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${article?.title || 'Production Package'}</title><style>
    body{font-family:Inter,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
    h1{color:${primaryColor};font-size:24px}
    h2{color:${secondaryColor};border-bottom:2px solid ${secondaryColor};padding-bottom:4px;margin-top:24px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em}
    p{line-height:1.6;margin:4px 0;font-size:13px}
    .brand-header{text-align:center;padding:20px 0;border-bottom:3px solid ${primaryColor};margin-bottom:24px}
    .brand-name{font-size:28px;font-weight:700;color:${primaryColor};letter-spacing:0.02em}
    .media{margin:16px 0;text-align:center}
    .media img{max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
    .media-link{display:inline-block;margin:4px 0;padding:8px 16px;background:${primaryColor};color:#fff;text-decoration:none;border-radius:6px;font-size:12px}
  </style></head><body>
    ${includeBranding && brandProfile ? `<div class="brand-header"><div class="brand-name">${brandName}</div></div>` : ''}
    <h1>${article?.title || 'Production Package'}</h1>
    ${mediaHTML}
    ${body}
  </body></html>`;
}

export async function generatePDF(pkg, article, selectedAssets, includeBranding, brandProfile) {
  const doc = new jsPDF();
  const sections = buildSections(pkg, article, selectedAssets, includeBranding, brandProfile);
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const primaryColor = hexToRgb(brandProfile?.primary_color || '#7c3aed');
  const secondaryColor = hexToRgb(brandProfile?.secondary_color || '#f97316');
  let y = 20;

  // Brand header
  if (includeBranding && brandProfile?.brand_name) {
    doc.setFontSize(20);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(brandProfile.brand_name, pageWidth / 2, y, { align: 'center' });
    y += 8;
    if (brandProfile.intro_text) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      const introLines = doc.splitTextToSize(brandProfile.intro_text, 160);
      introLines.forEach(line => {
        if (y > pageHeight - 30) { doc.addPage(); y = 20; }
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 5;
      });
    }
    y += 4;
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
  }

  // Title
  doc.setFontSize(16);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  const titleLines = doc.splitTextToSize(article?.title || 'Production Package', 170);
  titleLines.forEach(line => {
    if (y > pageHeight - 20) { doc.addPage(); y = 20; }
    doc.text(line, 20, y);
    y += 7;
  });
  y += 4;

  // Media assets
  if (pkg.generated_image_url) {
    try {
      const imgData = await fetchImageAsBase64(pkg.generated_image_url);
      if (imgData) {
        if (y > pageHeight - 80) { doc.addPage(); y = 20; }
        const imgWidth = 150;
        const imgHeight = 80;
        const x = (pageWidth - imgWidth) / 2;
        doc.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
        y += imgHeight + 8;
      }
    } catch { /* skip image on error */ }
  }

  // Sections
  sections.forEach(s => {
    if (y > pageHeight - 30) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
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

  // Outro
  if (includeBranding && brandProfile?.outro_text) {
    if (y > pageHeight - 30) { doc.addPage(); y = 20; }
    y += 6;
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const outroLines = doc.splitTextToSize(brandProfile.outro_text, 160);
    outroLines.forEach(line => {
      if (y > pageHeight - 20) { doc.addPage(); y = 20; }
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });
  }

  return doc;
}

// Combined export — multiple packages in one document
export function generateCombinedMarkdown(packages, articles, brandProfile, selectedAssets, includeBranding) {
  let md = '';
  if (includeBranding && brandProfile?.brand_name) {
    md += `# ${brandProfile.brand_name}\n`;
    if (brandProfile.network_name) md += `### ${brandProfile.network_name}\n`;
    if (brandProfile.intro_text) md += `\n${brandProfile.intro_text}\n`;
    md += `\n---\n\n`;
  }
  md += `# Production Rundown\n\n`;
  packages.forEach((pkg, i) => {
    const article = articles[pkg.article_id];
    md += `## ${i + 1}. ${article?.title || 'Untitled Story'}\n\n`;
    const sections = buildSections(pkg, article, selectedAssets, false, null);
    sections.forEach(s => {
      md += `### ${s.label}\n${s.content}\n\n`;
    });
    md += `---\n\n`;
  });
  if (includeBranding && brandProfile?.outro_text) {
    md += `${brandProfile.outro_text}\n`;
  }
  return md;
}

export function generateCombinedText(packages, articles, brandProfile, selectedAssets, includeBranding) {
  let text = '';
  if (includeBranding && brandProfile?.brand_name) {
    text += `${brandProfile.brand_name}\n${'='.repeat(50)}\n`;
    if (brandProfile.intro_text) text += `\n${brandProfile.intro_text}\n`;
    text += `\n`;
  }
  text += `PRODUCTION RUNDOWN\n${'='.repeat(50)}\n\n`;
  packages.forEach((pkg, i) => {
    const article = articles[pkg.article_id];
    text += `STORY ${i + 1}: ${article?.title || 'Untitled Story'}\n${'-'.repeat(50)}\n\n`;
    const sections = buildSections(pkg, article, selectedAssets, false, null);
    sections.forEach(s => {
      text += `${s.label.toUpperCase()}\n${s.content}\n\n`;
    });
    text += `\n`;
  });
  if (includeBranding && brandProfile?.outro_text) {
    text += `${brandProfile.outro_text}\n`;
  }
  return text;
}

export function generateCombinedTeleprompter(packages, articles, brandProfile, selectedAssets, includeBranding) {
  let text = '';
  if (includeBranding && brandProfile?.intro_text) {
    text += `[PAUSE 2s]\n${brandProfile.intro_text}\n[PAUSE 2s]\n\n`;
  }
  packages.forEach((pkg, i) => {
    const article = articles[pkg.article_id];
    const script = formatAsset(pkg.teleprompter_script);
    text += `[STORY ${i + 1}: ${article?.title || 'Untitled'}]\n\n`;
    if (script) {
      text += script;
    } else {
      text += '[No teleprompter script available for this story.]';
    }
    text += `\n\n[PAUSE 3s]\n\n`;
  });
  if (includeBranding && brandProfile?.outro_text) {
    text += `[PAUSE 2s]\n${brandProfile.outro_text}\n[PAUSE 2s]`;
  }
  return text;
}

export function generateCombinedHTML(packages, articles, brandProfile, selectedAssets, includeBranding) {
  const primaryColor = brandProfile?.primary_color || '#7c3aed';
  const secondaryColor = brandProfile?.secondary_color || '#f97316';
  const brandName = brandProfile?.brand_name || 'Production Rundown';

  const storiesHTML = packages.map((pkg, i) => {
    const article = articles[pkg.article_id];
    const sections = buildSections(pkg, article, selectedAssets, false, null);
    const body = sections.map(s => {
      const content = s.content.split('\n').map(l => `<p>${l}</p>`).join('');
      return `<h3>${s.label}</h3><div>${content}</div>`;
    }).join('\n');
    let media = '';
    if (pkg.generated_image_url) {
      media = `<div class="media"><img src="${pkg.generated_image_url}" alt="Story image" /></div>`;
    }
    return `<div class="story"><h2>Story ${i + 1}: ${article?.title || 'Untitled'}</h2>${media}${body}</div>`;
  }).join('\n');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Production Rundown</title><style>
    body{font-family:Inter,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
    .brand-header{text-align:center;padding:20px 0;border-bottom:3px solid ${primaryColor};margin-bottom:24px}
    .brand-name{font-size:28px;font-weight:700;color:${primaryColor}}
    .story{margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e5e5e5}
    .story:last-child{border-bottom:none}
    h2{color:${primaryColor};font-size:18px}
    h3{color:${secondaryColor};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-top:16px}
    p{line-height:1.6;margin:4px 0;font-size:13px}
    .media{margin:12px 0;text-align:center}
    .media img{max-width:100%;border-radius:8px}
  </style></head><body>
    ${includeBranding && brandProfile ? `<div class="brand-header"><div class="brand-name">${brandName}</div></div>` : ''}
    <h1>Production Rundown</h1>
    ${storiesHTML}
  </body></html>`;
}

export async function generateCombinedPDF(packages, articles, brandProfile, selectedAssets, includeBranding) {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const primaryColor = hexToRgb(brandProfile?.primary_color || '#7c3aed');
  const secondaryColor = hexToRgb(brandProfile?.secondary_color || '#f97316');
  let y = 20;

  // Brand header
  if (includeBranding && brandProfile?.brand_name) {
    doc.setFontSize(22);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(brandProfile.brand_name, pageWidth / 2, y, { align: 'center' });
    y += 10;
    if (brandProfile.intro_text) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      const introLines = doc.splitTextToSize(brandProfile.intro_text, 160);
      introLines.forEach(line => {
        if (y > pageHeight - 30) { doc.addPage(); y = 20; }
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += 5;
      });
    }
    y += 4;
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;
  }

  doc.setFontSize(14);
  doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  doc.text('Production Rundown', pageWidth / 2, y, { align: 'center' });
  y += 10;

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const article = articles[pkg.article_id];

    if (y > pageHeight - 40) { doc.addPage(); y = 20; }

    // Story header
    doc.setFontSize(12);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text(`Story ${i + 1}: ${article?.title || 'Untitled'}`, 20, y);
    y += 7;

    // Media
    if (pkg.generated_image_url) {
      try {
        const imgData = await fetchImageAsBase64(pkg.generated_image_url);
        if (imgData) {
          if (y > pageHeight - 80) { doc.addPage(); y = 20; }
          const imgWidth = 130;
          const imgHeight = 65;
          const x = (pageWidth - imgWidth) / 2;
          doc.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
          y += imgHeight + 6;
        }
      } catch { /* skip */ }
    }

    // Sections
    const sections = buildSections(pkg, article, selectedAssets, false, null);
    sections.forEach(s => {
      if (y > pageHeight - 30) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setTextColor(secondaryColor.r, secondaryColor.g, secondaryColor.b);
      doc.text(s.label, 20, y);
      y += 5;
      doc.setFontSize(9);
      doc.setTextColor(51, 51, 51);
      const lines = doc.splitTextToSize(s.content, 170);
      lines.forEach(line => {
        if (y > pageHeight - 20) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 5;
      });
      y += 3;
    });
    y += 6;
  }

  // Outro
  if (includeBranding && brandProfile?.outro_text) {
    if (y > pageHeight - 30) { doc.addPage(); y = 20; }
    y += 6;
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    const outroLines = doc.splitTextToSize(brandProfile.outro_text, 160);
    outroLines.forEach(line => {
      if (y > pageHeight - 20) { doc.addPage(); y = 20; }
      doc.text(line, pageWidth / 2, y, { align: 'center' });
      y += 5;
    });
  }

  return doc;
}

// Helpers
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 124, g: 58, b: 237 };
}

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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
  const map = { pdf: 'pdf', markdown: 'md', text: 'txt', teleprompter: 'txt', html: 'html', docx: 'docx' };
  return map[format] || 'txt';
}

export function getMimeType(format) {
  const map = { markdown: 'text/markdown', text: 'text/plain', teleprompter: 'text/plain', html: 'text/html', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  return map[format] || 'text/plain';
}