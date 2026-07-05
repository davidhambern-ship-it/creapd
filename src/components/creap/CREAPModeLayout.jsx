import React from 'react';
import { Outlet } from 'react-router-dom';
import { CREAPModeProvider } from '@/context/CREAPModeContext';
import SystemNarrationOverlay from '@/components/system/SystemNarrationOverlay';
import SceneTransition from '@/components/creap/cinematic/SceneTransition';
import AutopilotOverlay from '@/components/creap/AutopilotOverlay';

/**
 * Thin layout route that wraps all authenticated pages in the CREAPModeProvider.
 * This makes the CREAP Mode context (mode, step, profile, focus zone) available
 * to every authenticated page and component.
 *
 * Also renders:
 *  - SceneTransition: In AUTOPILOT mode, brief cinematic transitions between
 *    pages replace hard route cuts. CREAP says "Come on..." and the new
 *    page slides into view — conversational navigation.
 *  - SystemNarrationOverlay: When AUTOPILOT mode is active, each page with a
 *    narration script gets an animated, voice-narrated guided tour before
 *    revealing the actual interface.
 */
export default function CREAPModeLayout() {
  return (
    <CREAPModeProvider>
      <Outlet />
      <SceneTransition />
      <SystemNarrationOverlay />
      <AutopilotOverlay />
    </CREAPModeProvider>
  );
}