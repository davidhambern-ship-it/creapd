import React from 'react';
import { useResearchProduction } from '@/hooks/useResearchProduction';
import ResearchPresentationStudioHandoff from '@/components/research/ResearchPresentationStudioHandoff';

/**
 * Research Studio's final room is a dispatch checkpoint, not a presentation
 * builder. Approved Production Packages are copied to the shared Presentation
 * Studio, where CREAPD's one Presentation Editor owns direction, assembly,
 * editing, rehearsal, presentation, and export.
 */
export default function ResearchExport() {
  const researchData = useResearchProduction();
  return <ResearchPresentationStudioHandoff researchData={researchData} />;
}
