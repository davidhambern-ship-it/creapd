import React from 'react';
import { Outlet } from 'react-router-dom';
import { CREAPModeProvider } from '@/context/CREAPModeContext';

/**
 * Thin layout route that wraps all authenticated pages in the CREAPModeProvider.
 * This makes the CREAP Mode context (mode, step, profile, focus zone) available
 * to every authenticated page and component.
 */
export default function CREAPModeLayout() {
  return (
    <CREAPModeProvider>
      <Outlet />
    </CREAPModeProvider>
  );
}