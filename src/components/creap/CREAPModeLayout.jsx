import React from 'react';
import { Outlet } from 'react-router-dom';
import { CREAPModeProvider } from '@/context/CREAPModeContext';
import LivingEnvironment from '@/components/environment/LivingEnvironment';

/**
 * Thin layout route that wraps all authenticated pages in the CREAPModeProvider.
 * This makes the CREAP Mode context (mode, step, profile, focus zone) available
 * to every authenticated page and component.
 *
 * Also mounts the global LivingEnvironment overlay, which provides ambient
 * motion (particles, breathing glows, scan lines, worker activity indicators)
 * across the entire authenticated experience. (CREAPD-MOTION-001)
 */
export default function CREAPModeLayout() {
  return (
    <CREAPModeProvider>
      <LivingEnvironment />
      <Outlet />
    </CREAPModeProvider>
  );
}