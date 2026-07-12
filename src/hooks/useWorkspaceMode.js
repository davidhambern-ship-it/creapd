import { useState, useCallback } from 'react';

const STORAGE_KEY = 'cpe-workspace-mode';

export const WORKSPACE_MODES = {
  design: {
    label: 'Design',
    icon: 'Palette',
    focus: 'Visual composition',
    canvasFlex: 7,
    timelineFlex: 2,
    sidePanelWidth: 280,
    timelineMode: 'compact',
    showSlideRail: true,
    sidePanel: 'inspector',
  },
  animate: {
    label: 'Animate',
    icon: 'Zap',
    focus: 'Motion design',
    canvasFlex: 4.5,
    timelineFlex: 4.5,
    sidePanelWidth: 300,
    timelineMode: 'expanded',
    showSlideRail: true,
    sidePanel: 'inspector',
  },
  media: {
    label: 'Media',
    icon: 'FolderOpen',
    focus: 'Asset organization',
    canvasFlex: 4,
    timelineFlex: 2,
    sidePanelWidth: 480,
    timelineMode: 'compact',
    showSlideRail: true,
    sidePanel: 'media',
  },
  script: {
    label: 'Script',
    icon: 'FileText',
    focus: 'Writing',
    canvasFlex: 4,
    timelineFlex: 3,
    sidePanelWidth: 450,
    timelineMode: 'compact',
    showSlideRail: true,
    sidePanel: 'script',
  },
  review: {
    label: 'Review',
    icon: 'ShieldCheck',
    focus: 'Verification',
    canvasFlex: 4,
    timelineFlex: 3,
    sidePanelWidth: 420,
    timelineMode: 'compact',
    showSlideRail: true,
    sidePanel: 'review',
  },
  present: {
    label: 'Present',
    icon: 'Play',
    focus: 'Rehearsal',
    canvasFlex: 10,
    timelineFlex: 0,
    sidePanelWidth: 0,
    timelineMode: 'hidden',
    showSlideRail: false,
    sidePanel: 'none',
  },
  ai: {
    label: 'AI',
    icon: 'Cpu',
    focus: 'Production management',
    canvasFlex: 5,
    timelineFlex: 2,
    sidePanelWidth: 400,
    timelineMode: 'compact',
    showSlideRail: true,
    sidePanel: 'ai',
  },
};

export const WORKSPACE_ORDER = ['design', 'animate', 'media', 'script', 'review', 'present', 'ai'];

export function useWorkspaceMode() {
  const [workspaceMode, setWorkspaceMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'design'; } catch { return 'design'; }
  });

  const [modePrefs, setModePrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${STORAGE_KEY}-prefs`) || '{}'); } catch { return {}; }
  });

  const changeMode = useCallback((mode) => {
    setWorkspaceMode(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, []);

  const updateModePref = useCallback((key, value) => {
    setModePrefs(prev => {
      const next = { ...prev, [workspaceMode]: { ...(prev[workspaceMode] || {}), [key]: value } };
      try { localStorage.setItem(`${STORAGE_KEY}-prefs`, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [workspaceMode]);

  const config = WORKSPACE_MODES[workspaceMode] || WORKSPACE_MODES.design;
  const prefs = modePrefs[workspaceMode] || {};

  return { workspaceMode, changeMode, config, prefs, updateModePref };
}