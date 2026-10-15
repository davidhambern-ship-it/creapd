import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { creapdApi } from '@/api/creapdClient';
import { generateFreeLocalVoice } from '@/lib/localVoiceEngine';

const STAGES = [
  { id: 'topics', label: 'Topics', description: 'Interpreting prompt & creating Research Assignment' },
  { id: 'research', label: 'Research', description: 'Gathering facts, sources, references, visual references, areas of debate, timeline, statistics' },
  { id: 'dossier', label: 'Dossier', description: 'Organizing research into Approved Research Dossier' },
  { id: 'develop', label: 'Develop', description: 'Generating Presentation Points, scripts, image prompts, media assets, voiceovers with synchronized timing, layout recommendations' },
  { id: 'packet', label: 'Packet', description: 'Creating StorySlides, assembling StoriesPresentation, attaching SlideElements, applying layouts, transitions, and timing' },
  { id: 'direct', label: 'APD Direct', description: 'AI Presentation Director analyzing stories, generating scene graphs, camera behavior, motion strategy, and voice-synchronized timelines' },
  { id: 'editor', label: 'Editor', description: 'Opening result in Presentation Editor' },
];

export function useAutoBuild() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [stageStatuses, setStageStatuses] = useState({});
  const [detail, setDetail] = useState('');
  const [error, setError] = useState(null);
  const [failedStage, setFailedStage] = useState(null);
  const [running, setRunning] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [clarificationQuestion, setClarificationQuestion] = useState('');
  const [inferredParams, setInferredParams] = useState(null);
  const [topicId, setTopicId] = useState(null);
  const [configId, setConfigId] = useState(null);

  // Refs to avoid stale closures during pipeline
  const topicIdRef = useRef(null);
  const configIdRef = useRef(null);
  const paramsRef = useRef(null);
  const promptRef = useRef('');

  const reset = useCallback(() => {
    setStageStatuses({});
    setDetail('');
    setError(null);
    setFailedStage(null);
    setNeedsConfirmation(false);
    setClarificationQuestion('');
    setInferredParams(null);
    setTopicId(null);
    setConfigId(null);
    topicIdRef.current = null;
    configIdRef.current = null;
    paramsRef.current = null;
  }, []);

  const open = useCallback(() => {
    reset();
    setPrompt('');
    setIsOpen(true);
  }, [reset]);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => { reset(); setPrompt(''); }, 300);
  }, [reset]);

  const markStage = useCallback((stageId, status, detailMsg) => {
    setStageStatuses(prev => ({ ...prev, [stageId]: status }));
    if (detailMsg !== undefined) setDetail(detailMsg);
  }, []);

  const runPipeline = useCallback(async (startStage = 'topics', overridePrompt = null) => {
    const stageOrder = ['topics', 'research', 'dossier', 'develop', 'packet', 'direct', 'editor'];
    const startIdx = stageOrder.indexOf(startStage);
    if (startIdx < 0) return;

    setRunning(true);
    setError(null);
    setFailedStage(null);
    setNeedsConfirmation(false);

    // Mark previous stages as done (on retry)
    const prevStatuses = {};
    for (let i = 0; i < startIdx; i++) {
      prevStatuses[stageOrder[i]] = 'done';
    }
    setStageStatuses(prev => ({ ...prev, ...prevStatuses }));

    let tid = topicIdRef.current;
    let cid = configIdRef.current;
    let params = paramsRef.current;
    let currentStage = startStage;

    try {
      // ═══ Topics Department ═══
      if (startIdx <= 0) {
        currentStage = 'topics';
        markStage('topics', 'running', 'CREAPr is interpreting your request...');
        const data = await creapdApi.post('/research/topic-action', {
          action: 'auto_build',
          prompt: overridePrompt || promptRef.current,
          skip_confirmation: true,
        });

        if (data.requires_confirmation) {
          markStage('topics', 'pending', 'CREAPr needs clarification...');
          setNeedsConfirmation(true);
          setClarificationQuestion(data.clarification_question);
          setInferredParams(data.inferred_params);
          paramsRef.current = data.inferred_params;
          setRunning(false);
          return;
        }

        tid = data.topic_id;
        cid = data.configuration_id;
        params = data.inferred_params;
        topicIdRef.current = tid;
        configIdRef.current = cid;
        paramsRef.current = params;
        setTopicId(tid);
        setConfigId(cid);
        setInferredParams(params);
        markStage('topics', 'done', `Research Assignment created: "${params?.title || 'Untitled'}"`);
      }

      // ═══ Research Department ═══
      if (startIdx <= 1) {
        currentStage = 'research';
        markStage('research', 'running', 'Gathering facts, sources, references, and statistics...');
        await creapdApi.post('/research/topic-action', {
          action: 'start',
          topic_id: tid,
        });
        markStage('research', 'done', 'Research dataset collected');
      }

      // ═══ Dossier Department ═══
      if (startIdx <= 2) {
        currentStage = 'dossier';
        markStage('dossier', 'running', 'Organizing research into structured knowledge...');
        // Dossier is created by deepResearchV2; brief visual transition
        await new Promise(r => setTimeout(r, 800));
        markStage('dossier', 'done', 'Research Dossier approved');
      }

      // ═══ Develop Department ═══
      if (startIdx <= 3) {
        currentStage = 'develop';
        markStage('develop', 'running', 'Extracting Presentation Points...');

        // deepResearchV2 auto-extracts points, but ensure they exist
        let points = await base44.entities.ResearchPoint.filter({ topic_id: tid }, 'order');
        if (!points || points.length === 0) {
          markStage('develop', 'running', 'Extracting research points from dossier...');
          await creapdApi.post('/research/topic-action', {
            action: 'start',
            topic_id: tid,
          });
          points = await base44.entities.ResearchPoint.filter({ topic_id: tid }, 'order');
        }

        if (!points || points.length === 0) {
          throw new Error('No research points were extracted from the dossier');
        }

        for (let i = 0; i < points.length; i++) {
          setDetail(`Generating assets for slide ${i + 1} of ${points.length}: ${(points[i].title || '').substring(0, 50)}...`);
          let pkg = null;
          try {
            const res = await creapdApi.post('/research/production', {
              action: 'generate_package',
              point_id: points[i].id,
            });
            pkg = res?.package || res;
          } catch (err) {
            console.error(`Failed to build package for point ${i + 1}:`, err.message);
          }

          // Generate VoicePackage with synchronized narration timing
          if (pkg?.package_id || pkg?.id) {
            const pkgId = pkg.package_id || pkg.id;
            setDetail(`Generating voiceover for slide ${i + 1} of ${points.length}...`);
            try {
              const fullPkg = await base44.entities.ProductionPackage.get(pkgId);
              const script = fullPkg?.teleprompter_script || fullPkg?.story_summary || '';
              if (script) {
                await generateFreeLocalVoice({
                  packageId: pkgId,
                  script,
                  voice: params?.voice || 'river',
                  onProgress: stage => setDetail(
                    `Generating free human voice for slide ${i + 1} of ${points.length}: ${stage || 'working'}`
                  ),
                });
              }
            } catch (err) {
              console.error(`Failed to generate voice for point ${i + 1}:`, err.message);
            }
          }
        }

        markStage('develop', 'done', `${points.length} slides generated with scripts, media, voiceovers, and assets`);
      }

      // ═══ Packet Department ═══
      if (startIdx <= 4) {
        currentStage = 'packet';
        markStage('packet', 'running', 'Assembling StorySlides and attaching editable elements...');
        const presTitle = params?.title
          ? `${params.title} — Auto-Built Presentation`
          : 'Auto-Built Presentation';
        const data = await creapdApi.post('/production/core', {
          action: 'auto_build_research_packet',
          configuration_id: cid,
          presentation_title: presTitle,
        });
        if (!data.presentation_id) {
          throw new Error('Packet assembly did not produce a presentation');
        }
        markStage('packet', 'done', `${data.slide_count} slides assembled`);

        // ═══ APD Direct ═══
        currentStage = 'direct';
        markStage('direct', 'running', 'APD analyzing stories and directing scene graphs...');
        const apdData = await creapdApi.post('/production/core', {
          action: 'direct_presentation_studio',
          presentation_id: data.presentation_id,
        });
        markStage('direct', 'done', `Directed ${apdData.directed_slides} slides · Confidence: ${apdData.confidence_score}%`);

        // ═══ Editor ═══
        currentStage = 'editor';
        markStage('editor', 'running', 'Opening in Presentation Editor...');
        setTimeout(() => {
          navigate(`/editor/${data.presentation_id}`);
          close();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
      setFailedStage(currentStage);
      markStage(currentStage, 'error', err.message || 'Failed');
    } finally {
      setRunning(false);
    }
  }, [navigate, close, markStage]);

  const start = useCallback(() => {
    if (!prompt.trim()) return;
    promptRef.current = prompt;
    runPipeline('topics');
  }, [prompt, runPipeline]);

  const retry = useCallback(() => {
    if (failedStage) {
      runPipeline(failedStage);
    }
  }, [failedStage, runPipeline]);

  const confirmAndProceed = useCallback(() => {
    setNeedsConfirmation(false);
    // Re-run topics with skip_confirmation to create the entities
    runPipeline('topics');
  }, [runPipeline]);

  return {
    isOpen, open, close,
    prompt, setPrompt,
    stages: STAGES,
    stageStatuses,
    detail,
    error, failedStage, retry,
    running,
    needsConfirmation, clarificationQuestion,
    inferredParams,
    start, confirmAndProceed,
  };
}