import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, Package, Loader2, Check, Search, Eye, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ExportSettings from '@/components/export/ExportSettings';
import ExportHistory from '@/components/export/ExportHistory';
import ExportPreviewModal from '@/components/export/ExportPreviewModal';
import SortDropdown from '@/components/shared/SortDropdown';
import {
  generateMarkdown, generateText, generateTeleprompter, generateHTML, generateDOCX,
  generatePDF, downloadFile, downloadPDF, sanitizeFilename, getFileExtension, getMimeType,
  generateCombinedMarkdown, generateCombinedText, generateCombinedTeleprompter, generateCombinedHTML, generateCombinedPDF, generateCombinedDOCX
} from '@/lib/exportUtils';
import { logActivity } from '@/lib/activityUtils';

export default function ExportCenter() {
  const [packages, setPackages] = useState([]);
  const [articles, setArticles] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [brandProfiles, setBrandProfiles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [format, setFormat] = useState('pdf');
  const [selectedAssets, setSelectedAssets] = useState(new Set(['teleprompter_script', 'story_summary', 'talking_points', 'lower_third_text']));
  const [includeBranding, setIncludeBranding] = useState(true);
  const [combinedExport, setCombinedExport] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('exportSort') || 'newest');
  const [search, setSearch] = useState('');
  const [previewPkg, setPreviewPkg] = useState(null);

  const articleMap = useMemo(() => {
    const map = {};
    articles.forEach(a => { map[a.id] = a; });
    return map;
  }, [articles]);

  const brandMap = useMemo(() => {
    const map = {};
    brandProfiles.forEach(b => { map[b.id] = b; });
    return map;
  }, [brandProfiles]);

  const sortedPackages = useMemo(() => {
    let result = packages.filter(p => {
      if (!search) return true;
      const article = articleMap[p.article_id];
      return article?.title?.toLowerCase().includes(search.toLowerCase());
    });
    switch (sortBy) {
      case 'oldest': return result.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      case 'alphabetical': return result.sort((a, b) => (articleMap[a.article_id]?.title || '').localeCompare(articleMap[b.article_id]?.title || ''));
      case 'status': return result.sort((a, b) => (a.status || '').localeCompare(b.status || ''));
      default: return result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }
  }, [packages, sortBy, search, articleMap]);

  useEffect(() => {
    Promise.all([
      base44.entities.ProductionPackage.list('-created_date', 100),
      base44.entities.Article.list('-created_date', 100),
      base44.entities.ExportProfile.list('-created_date', 50),
      base44.entities.BrandProfile.list('-created_date', 50),
      base44.entities.ExportLog.list('-created_date', 20),
    ]).then(([pkgs, arts, profs, brands, lg]) => {
      setPackages(pkgs.filter(p => ['generated', 'edited', 'approved'].includes(p.status)));
      setArticles(arts);
      setProfiles(profs);
      setBrandProfiles(brands);
      setLogs(lg);
    }).finally(() => setLoading(false));
  }, []);

  const togglePackage = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAsset = (key) => {
    const next = new Set(selectedAssets);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelectedAssets(next);
  };

  const selectAll = () => {
    if (selectedIds.size === packages.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(packages.map(p => p.id)));
  };

  const getBrandProfileForPackage = (pkg) => {
    const article = articleMap[pkg.article_id];
    if (!article) return null;
    // Try to find brand profile via production or show profile chain
    // Fallback: return the first/default brand profile if available
    if (brandProfiles.length > 0) {
      return brandProfiles.find(b => b.is_favorite) || brandProfiles[0];
    }
    return null;
  };

  const handleExport = async (pkgOverride) => {
    const selected = pkgOverride
      ? [pkgOverride]
      : packages.filter(p => selectedIds.has(p.id));
    if (selected.length === 0) return;
    setExporting(true);
    const assets = Array.from(selectedAssets);

    if (combinedExport && selected.length > 1) {
      const brandProfile = includeBranding ? (getBrandProfileForPackage(selected[0])) : null;
      const filename = `production_rundown.${getFileExtension(format)}`;
      try {
        if (format === 'pdf') {
          const doc = await generateCombinedPDF(selected, articleMap, brandProfile, assets, includeBranding);
          downloadPDF(doc, filename);
        } else {
          let content;
          if (format === 'markdown') content = generateCombinedMarkdown(selected, articleMap, brandProfile, assets, includeBranding);
          else if (format === 'text') content = generateCombinedText(selected, articleMap, brandProfile, assets, includeBranding);
          else if (format === 'teleprompter') content = generateCombinedTeleprompter(selected, articleMap, brandProfile, assets, includeBranding);
          else if (format === 'html') content = generateCombinedHTML(selected, articleMap, brandProfile, assets, includeBranding);
          else if (format === 'docx') content = generateCombinedDOCX(selected, articleMap, brandProfile, assets, includeBranding);
          downloadFile(content, filename, getMimeType(format));
        }
        await base44.entities.ExportLog.create({ package_ids: selected.map(p => p.id).join(','), format, file_name: filename, asset_count: assets.length * selected.length, status: 'success' });
      } catch (err) {
        await base44.entities.ExportLog.create({ package_ids: selected.map(p => p.id).join(','), format, file_name: filename, asset_count: assets.length * selected.length, status: 'failed', error_message: err.message });
      }
    } else {
      for (const pkg of selected) {
        const article = articleMap[pkg.article_id];
        const brandProfile = includeBranding ? getBrandProfileForPackage(pkg) : null;
        const ext = getFileExtension(format);
        const filename = `${sanitizeFilename(article?.title || 'package')}.${ext}`;
        try {
          if (format === 'pdf') {
            const doc = await generatePDF(pkg, article, assets, includeBranding, brandProfile);
            downloadPDF(doc, filename);
          } else {
            let content;
            if (format === 'markdown') content = generateMarkdown(pkg, article, assets, includeBranding, brandProfile);
            else if (format === 'text') content = generateText(pkg, article, assets, includeBranding, brandProfile);
            else if (format === 'teleprompter') content = generateTeleprompter(pkg, article, assets, includeBranding, brandProfile);
            else if (format === 'html') content = generateHTML(pkg, article, assets, includeBranding, brandProfile);
            else if (format === 'docx') content = generateDOCX(pkg, article, assets, includeBranding, brandProfile);
            downloadFile(content, filename, getMimeType(format));
          }
          await base44.entities.ExportLog.create({ package_ids: pkg.id, format, file_name: filename, asset_count: assets.length, status: 'success' });
        } catch (err) {
          await base44.entities.ExportLog.create({ package_ids: pkg.id, format, file_name: filename, asset_count: assets.length, status: 'failed', error_message: err.message });
        }
      }
    }

    const newLogs = await base44.entities.ExportLog.list('-created_date', 20);
    setLogs(newLogs);
    setExporting(false);
    setPreviewPkg(null);
    logActivity('export', {
      entity_type: 'ExportLog',
      entity_name: `${format.toUpperCase()} export — ${selected.length} package(s)${combinedExport ? ' (combined)' : ''}`,
      details: `Exported ${selected.length} package(s) as ${format.toUpperCase()}${combinedExport ? ' (combined)' : ''} with ${assets.length} asset(s) each`,
    });
  };

  const saveProfile = async () => {
    if (!profileName.trim()) return;
    await base44.entities.ExportProfile.create({
      name: profileName,
      format,
      included_assets: Array.from(selectedAssets).join(','),
      include_branding: includeBranding,
    });
    setProfileName('');
    setProfiles(await base44.entities.ExportProfile.list('-created_date', 50));
  };

  const loadProfile = (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    setFormat(profile.format);
    if (profile.included_assets) setSelectedAssets(new Set(profile.included_assets.split(',').filter(Boolean)));
    setIncludeBranding(profile.include_branding !== false);
  };

  const deleteProfile = async (profileId) => {
    await base44.entities.ExportProfile.delete(profileId);
    setProfiles(await base44.entities.ExportProfile.list('-created_date', 50));
  };

  const toggleProfileFavorite = async (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    await base44.entities.ExportProfile.update(profileId, { is_favorite: !profile.is_favorite });
    setProfiles(await base44.entities.ExportProfile.list('-created_date', 50));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-berna-purple/30 border-t-berna-purple rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Export Center</h1>
        <p className="text-xs text-muted-foreground mt-1">Export production packages as PDF, Markdown, Text, Teleprompter, or HTML</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <ExportSettings
            format={format}
            setFormat={setFormat}
            selectedAssets={selectedAssets}
            toggleAsset={toggleAsset}
            includeBranding={includeBranding}
            setIncludeBranding={setIncludeBranding}
            combinedExport={combinedExport}
            setCombinedExport={setCombinedExport}
            profiles={profiles}
            profileName={profileName}
            setProfileName={setProfileName}
            onSaveProfile={saveProfile}
            onLoadProfile={loadProfile}
            onDeleteProfile={deleteProfile}
            onToggleFavorite={toggleProfileFavorite}
          />
          <ExportHistory logs={logs} />
        </div>

        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {packages.length} packages available · {selectedIds.size} selected
              {combinedExport && selectedIds.size > 1 && <span className="text-berna-purple ml-1">· combined</span>}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-xs h-7 text-muted-foreground hover:text-white" onClick={selectAll}>
                {selectedIds.size === packages.length && packages.length > 0 ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedIds.size === 1 && !combinedExport && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-white/10 text-white text-xs h-7"
                  onClick={() => setPreviewPkg(packages.find(p => selectedIds.has(p.id)))}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Preview
                </Button>
              )}
              <Button
                size="sm"
                className="bg-berna-purple hover:bg-berna-purple/90 text-white text-xs h-7"
                onClick={() => handleExport()}
                disabled={exporting || selectedIds.size === 0}
              >
                {exporting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : (combinedExport ? <Layers className="w-3 h-3 mr-1" /> : <Download className="w-3 h-3 mr-1" />)}
                Export {selectedIds.size > 0 && `(${selectedIds.size})`}
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search packages..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/[0.03] border-white/[0.08] text-white text-xs h-8" />
            </div>
            <SortDropdown value={sortBy} onChange={setSortBy} storageKey="exportSort" options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'alphabetical', label: 'Alphabetical' },
              { value: 'status', label: 'By Status' },
            ]} />
          </div>

          {packages.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-white mb-1">No Packages to Export</h2>
              <p className="text-xs text-muted-foreground">Generate production packages first from the Production page.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {sortedPackages.map(pkg => {
                const article = articleMap[pkg.article_id];
                const isSelected = selectedIds.has(pkg.id);
                return (
                  <div
                    key={pkg.id}
                    onClick={() => togglePackage(pkg.id)}
                    className={`glass-panel p-3 cursor-pointer transition-all ${isSelected ? 'border-berna-purple/40 bg-berna-purple/[0.04]' : 'hover:border-white/[0.12]'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${isSelected ? 'bg-berna-purple border-berna-purple' : 'border-white/20'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">{article?.title || 'Untitled Package'}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {pkg.tone && <span className="text-[9px] px-1.5 py-0.5 rounded bg-berna-purple/10 text-berna-purple capitalize">{pkg.tone.replace(/_/g, ' ')}</span>}
                          {pkg.reading_style && <span className="text-[9px] px-1.5 py-0.5 rounded bg-berna-emerald/10 text-berna-emerald capitalize">{pkg.reading_style.replace(/_/g, ' ')}</span>}
                          {pkg.status === 'approved' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-berna-orange/10 text-berna-orange">Approved</span>}
                          {pkg.generated_image_url && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">Has Image</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setPreviewPkg(pkg)}
                          className="p-1 text-muted-foreground hover:text-white"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExport(pkg)}
                          className="p-1 text-muted-foreground hover:text-berna-purple"
                          title="Quick export"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {previewPkg && (
        <ExportPreviewModal
          open={!!previewPkg}
          onClose={() => setPreviewPkg(null)}
          pkg={previewPkg}
          article={articleMap[previewPkg.article_id]}
          brandProfile={getBrandProfileForPackage(previewPkg)}
          format={format}
          selectedAssets={selectedAssets}
          includeBranding={includeBranding}
          onExport={() => handleExport(previewPkg)}
        />
      )}
    </div>
  );
}