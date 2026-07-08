import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * MobilePageShell — wraps page content with mobile-appropriate layout.
 *
 * On desktop: passes children through with no wrapper to preserve existing layout.
 *
 * On mobile: wraps children in an entrance-animation container (m-animate-enter)
 * that re-triggers on route change. The page's own p-6 padding provides spacing;
 * glass-panel CSS overrides (in motion-system.css) tighten card internals.
 * Also adds a page-transition key so navigation between PP rooms re-animates.
 */
export default function MobilePageShell({ children }) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div key={window.location.pathname} className="m-animate-enter">
      {children}
    </div>
  );
}