/**
 * POC Stage Tracker — CBS Part 2
 * 
 * Derives the current Process of Creation stage from entity states.
 * The Brain uses this to know where the producer is in the pipeline.
 * 
 * Stage 0: Configuration
 * Stage 1: Content Acquisition
 * Stage 2: Content Intelligence (Sift / Research)
 * Stage 3: Editorial Review
 * Stage 4: Production Package Generation
 * Stage 5: Voice Package Generation
 * Stage 6: Slide / Presentation Generation
 * Stage 7: StoriesPresentation Assembly
 * Stage 8: Export
 */

export const POC_STAGES = [
  { stage: 0, key: 'configuration', name: 'Configuration', description: 'Set up production parameters', department: null, route: '/research/configure' },
  { stage: 1, key: 'acquisition', name: 'Content Acquisition', description: 'Gather topics for research', department: 'research', route: '/research/topics' },
  { stage: 2, key: 'intelligence', name: 'Deep Research', description: 'Research pipeline running', department: 'research', route: '/research/topics' },
  { stage: 3, key: 'review', name: 'Editorial Review', description: 'Review extracted research points', department: 'research', route: '/research/manager' },
  { stage: 4, key: 'packaging', name: 'Package Generation', description: 'Generate production packages', department: 'manager', route: '/research/assets' },
  { stage: 5, key: 'voice', name: 'Voice Package', description: 'Generate voiceover audio', department: 'manager', route: '/research/assets' },
  { stage: 6, key: 'slides', name: 'Slide Generation', description: 'Build presentation slides', department: 'apd', route: '/research/assets' },
  { stage: 7, key: 'assembly', name: 'Presentation Assembly', description: 'Assemble final presentation', department: 'apd', route: '/research/assets' },
  { stage: 8, key: 'export', name: 'Export', description: 'Export final production', department: null, route: '/research/export' },
];

/**
 * Derive the current POC stage for the Research Production Pipeline.
 * 
 * @param {Object} params - { config, topics, points, packages, dossiers }
 * @returns {Object} { stage, stageInfo, isComplete, pendingAction }
 */
export function deriveResearchPOCStage({ config, topics, points, packages, dossiers }) {
  // Stage 0: No configuration yet
  if (!config || !config.production_name) {
    return {
      stage: 0,
      stageInfo: POC_STAGES[0],
      isComplete: false,
      pendingAction: 'Configure your research production to get started.',
      nextRoute: '/research/configure',
    };
  }

  // Stage 1: No topics yet — need content acquisition
  if (!topics || topics.length === 0) {
    return {
      stage: 1,
      stageInfo: POC_STAGES[1],
      isComplete: false,
      pendingAction: 'Add research topics to begin the pipeline.',
      nextRoute: '/research/topics',
    };
  }

  // Check for active research (Stage 2)
  const researchingTopics = topics.filter(t => t.status === 'researching' || t.status === 'pending');
  const researchedTopics = topics.filter(t => t.status === 'researched' || t.status === 'in_review' || t.status === 'selected');
  
  if (researchingTopics.length > 0 && researchedTopics.length === 0) {
    return {
      stage: 2,
      stageInfo: POC_STAGES[2],
      isComplete: false,
      pendingAction: `${researchingTopics.length} topic${researchingTopics.length > 1 ? 's' : ''} currently being researched.`,
      nextRoute: '/research/topics',
    };
  }

  // Stage 3: Research complete, points need review
  if (researchedTopics.length > 0) {
    const approvedPoints = (points || []).filter(p => p.status === 'approved' || p.status === 'used');
    
    if (points.length === 0) {
      // Research done but no points extracted yet
      return {
        stage: 3,
        stageInfo: POC_STAGES[3],
        isComplete: false,
        pendingAction: 'Research complete. Extract and review research points.',
        nextRoute: '/research/manager',
      };
    }

    if (approvedPoints.length === 0) {
      return {
        stage: 3,
        stageInfo: POC_STAGES[3],
        isComplete: false,
        pendingAction: `${points.length} research points extracted. Review and approve them to continue.`,
        nextRoute: '/research/manager',
      };
    }

    // Stage 4: Points approved, need packages
    if (packages.length === 0) {
      return {
        stage: 4,
        stageInfo: POC_STAGES[4],
        isComplete: false,
        pendingAction: `${approvedPoints.length} points approved. Generate production packages.`,
        nextRoute: '/research/assets',
      };
    }

    // Stage 5+: Packages exist — check for voice packages, presentations, etc.
    // For now, if packages exist, we're at stage 4+ 
    const approvedPackages = packages.filter(p => p.status === 'approved' || p.status === 'ready_for_review');
    if (approvedPackages.length === 0) {
      return {
        stage: 4,
        stageInfo: POC_STAGES[4],
        isComplete: false,
        pendingAction: `${packages.length} package${packages.length > 1 ? 's' : ''} drafted. Review and approve.`,
        nextRoute: '/research/assets',
      };
    }

    // Packages approved — production is well underway
    return {
      stage: 5,
      stageInfo: POC_STAGES[5],
      isComplete: false,
      pendingAction: `${approvedPackages.length} package${approvedPackages.length > 1 ? 's' : ''} approved. Ready for voiceover and presentation.`,
      nextRoute: '/research/assets',
    };
  }

  // Fallback — shouldn't reach here normally
  return {
    stage: 1,
    stageInfo: POC_STAGES[1],
    isComplete: false,
    pendingAction: 'Add research topics to begin.',
    nextRoute: '/research/topics',
  };
}

/**
 * Get a human-readable summary of the current POC state.
 */
export function getPOCSummary(pocState) {
  if (!pocState) return 'Unknown stage';
  const { stage, stageInfo, pendingAction } = pocState;
  return `${stageInfo.name}: ${pendingAction}`;
}

/**
 * Check if a stage transition is valid per CBS Section 2.1.2.
 */
export function isValidTransition(fromStage, toStage) {
  // Forward progression is always valid
  if (toStage === fromStage + 1) return true;
  // Same stage is valid (no-op)
  if (toStage === fromStage) return true;
  // Regression requires explicit producer request — valid but flagged
  if (toStage < fromStage) return true;
  // Skipping stages is not valid
  if (toStage > fromStage + 1) return false;
  return false;
}