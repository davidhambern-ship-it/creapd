import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STAGES, getStageStatus, getStageAction } from './stageConfig';
import MobilePackageHeader from './MobilePackageHeader';
import MobileStageSelector from './MobileStageSelector';
import MobileProductionActionBar from './MobileProductionActionBar';
import OverviewStage from './stages/OverviewStage';
import ScriptStage from './stages/ScriptStage';
import VoicePackageStage from './stages/VoicePackageStage';
import MediaStage from './stages/MediaStage';
import PresentationStage from './stages/PresentationStage';
import FactCheckStage from './stages/FactCheckStage';
import SocialStage from './stages/SocialStage';
import ApproveStage from './stages/ApproveStage';

const SCRIPT_KEYS = ['teleprompter_script', 'show_script', 'story_summary', 'talking_points', 'lower_third_text', 'headline_suggestions'];

export default function MobilePackageWorkspace({ onBack, ...props }) {
  const { article, pkg, edits, hasEdits, assetDefs } = props;
  const [activeStage, setActiveStage] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const goToStage = (idx) => {
    if (idx < 0 || idx >= STAGES.length) return;
    setDirection(idx > activeStage ? 1 : -1);
    setActiveStage(idx);
  };

  const handleNext = () => goToStage(activeStage + 1);
  const handlePrev = () => goToStage(activeStage - 1);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaY) > Math.abs(deltaX)) return;
    if (deltaX < 0) handleNext();
    else handlePrev();
  };

  const renderStage = () => {
    switch (STAGES[activeStage].key) {
      case 'overview': return <OverviewStage {...props} />;
      case 'script': return <ScriptStage {...props} />;
      case 'voice': return <VoicePackageStage {...props} />;
      case 'media': return <MediaStage {...props} />;
      case 'presentation': return <PresentationStage {...props} />;
      case 'factcheck': return <FactCheckStage {...props} />;
      case 'social': return <SocialStage {...props} />;
      case 'approve': return <ApproveStage {...props} />;
      default: return null;
    }
  };

  const stageStatus = getStageStatus(STAGES[activeStage]?.key, pkg, edits);
  const action = getStageAction(STAGES[activeStage]?.key);
  const actionLoading = props.generatingAll || props.generating !== null || props.generatingVoice || props.generatingMedia || props.generatingPresentation || props.saving;

  const handleAction = () => {
    switch (action?.key) {
      case 'generate_all':
        props.handleGenerateAll();
        break;
      case 'regenerate_script':
        props.handleRegenerateAssets(assetDefs.filter(a => SCRIPT_KEYS.includes(a.key)).map(a => a.key));
        break;
      case 'generate_voice':
        props.handleGenerateVoice();
        break;
      case 'generate_media':
        props.handleGenerateMedia();
        break;
      case 'generate_presentation':
        props.handleGeneratePresentation();
        break;
      case 'copy_caption': {
        const caption = props.edits.social_caption ?? props.pkg?.social_caption ?? '';
        navigator.clipboard.writeText(caption);
        break;
      }
      case 'approve':
        props.handleApprove();
        break;
      default:
        break;
    }
  };

  const actionDisabled = !pkg && STAGES[activeStage]?.key !== 'overview';

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-3 pt-2 pb-1">
        <MobilePackageHeader article={article} pkg={pkg} onBack={onBack} status={stageStatus} />
      </div>
      <div className="flex-shrink-0 px-3 py-1">
        <MobileStageSelector activeStage={activeStage} onSelect={goToStage} pkg={pkg} edits={edits} />
      </div>
      <div
        className="flex-1 overflow-y-auto px-3 pb-24 pt-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeStage}
            custom={direction}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -50 : 50 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {renderStage()}
          </motion.div>
        </AnimatePresence>
      </div>
      <MobileProductionActionBar
        activeStage={activeStage}
        total={STAGES.length}
        onPrev={handlePrev}
        onNext={handleNext}
        onAction={handleAction}
        actionLabel={action?.label}
        actionDisabled={actionDisabled}
        actionLoading={actionLoading}
        hasEdits={hasEdits}
      />
    </div>
  );
}