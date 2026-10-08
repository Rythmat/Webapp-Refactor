import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/daw/store';
import { useDawBodyTokens } from '@/daw/hooks/useDawBodyTokens';
import { useMspModuleCompletion } from '@/features/classroom/msp';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';
import { getTutorial } from './tutorials';
import { Spotlight } from './Spotlight';
import { CoachCard } from './CoachCard';
import { Confetti } from './Confetti';
import { useTutorialDetection } from './useTutorialDetection';

// ── TutorialLayer ───────────────────────────────────────────────────────────
// Global overlay that drives a running lesson: applies each step's
// preconditions, spotlights its target region, detects the correct adjustment,
// celebrates, and auto-advances. Mounted once in DawApp. Renders nothing when
// no tutorial is active.

const PULSE_KEYFRAMES = `
@keyframes tutorialPulse {
  0%, 100% { box-shadow: 0 0 0 9999px rgba(6,8,12,0.4), 0 0 0 2px var(--color-accent, #7ecfcf), 0 0 16px 4px var(--color-accent, #7ecfcf); }
  50%      { box-shadow: 0 0 0 9999px rgba(6,8,12,0.4), 0 0 0 3px var(--color-accent, #7ecfcf), 0 0 30px 10px var(--color-accent, #7ecfcf); }
}
@keyframes tutorialDot {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 1; }
}
`;

export function TutorialLayer() {
  const activeId = useStore((s) => s.activeTutorialId);
  const stepIndex = useStore((s) => s.tutorialStepIndex);
  const status = useStore((s) => s.tutorialStepStatus);
  const celebrate = useStore((s) => s.tutorialStepCelebrate);
  const goTo = useStore((s) => s.goToTutorialStep);
  const complete = useStore((s) => s.completeTutorialStep);
  const quit = useStore((s) => s.quitTutorial);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const setLibraryOpen = useStore((s) => s.setLibraryOpen);
  const setChannelStripTab = useStore((s) => s.setChannelStripTab);
  const setAutomationParamId = useStore((s) => s.setAutomationParamId);
  const markComplete = useTutorialProgressStore((s) => s.markComplete);
  // Classroom app-route bridge: inert unless this tutorial was opened from a
  // live slide. Fires once when the tutorial completes.
  const { reportCompletion } = useMspModuleCompletion();
  // The overlay portals to <body>, outside .daw-root. It holds the DAW tokens
  // there itself (daw.css aliases them onto body.daw-active), so the coach
  // card resolves them from its first frame without anything copied onto the
  // portal, and never depends on someone else having set the class.
  useDawBodyTokens();

  const tutorial = useMemo(() => getTutorial(activeId), [activeId]);
  const total = tutorial?.steps.length ?? 0;
  const step = tutorial ? (tutorial.steps[stepIndex] ?? null) : null;
  const isLast = tutorial ? stepIndex >= total - 1 : false;
  const isValidated = !!(step?.check || step?.synthCheck);

  const [confettiKey, setConfettiKey] = useState(0);

  // Apply the step's preconditions when it becomes active.
  useEffect(() => {
    const r = step?.requires;
    if (!r) return;
    // Only the step that is running: StrictMode runs this effect again after
    // a boot has reset the project (resetProjectState), and the old step
    // would put its preconditions on the new project.
    const live = useStore.getState();
    if (
      live.activeTutorialId !== activeId ||
      live.tutorialStepIndex !== stepIndex
    )
      return;
    if (r.view !== undefined) setCurrentView(r.view);
    if (r.libraryOpen !== undefined) setLibraryOpen(r.libraryOpen);
    if (r.channelStripTab !== undefined) setChannelStripTab(r.channelStripTab);
    if (r.automationParam !== undefined)
      setAutomationParamId(r.automationParam);
    if (r.clearClipSelection) {
      useStore.getState().setSelectedClip(null, null);
    }
  }, [
    activeId,
    stepIndex,
    step,
    setCurrentView,
    setLibraryOpen,
    setChannelStripTab,
    setAutomationParamId,
  ]);

  // Detect the correct adjustment for validated steps.
  useTutorialDetection(step, !!tutorial && status === 'waiting', complete);

  // On completion: celebrate (if earned), then auto-advance / finish.
  useEffect(() => {
    if (!tutorial || status !== 'done') return;
    if (celebrate) setConfettiKey((k) => k + 1);
    const delay = celebrate ? 950 : 300;
    const id = window.setTimeout(() => {
      if (isLast) {
        markComplete(tutorial.id);
        reportCompletion();
        quit();
      } else {
        goTo(stepIndex + 1);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [
    status,
    celebrate,
    isLast,
    stepIndex,
    tutorial,
    goTo,
    quit,
    markComplete,
    reportCompletion,
  ]);

  if (!tutorial || !step) return null;

  const finishNow = () => {
    markComplete(tutorial.id);
    reportCompletion();
    quit();
  };
  const onBack = () => {
    if (stepIndex > 0) goTo(stepIndex - 1);
  };
  const onNext = () => {
    // Validated steps advance via detection; Next is only enabled once done.
    if (isValidated && status !== 'done') return;
    if (!isValidated) setConfettiKey((k) => k + 1); // free-form: celebrate on Next
    if (isLast) finishNow();
    else goTo(stepIndex + 1);
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        pointerEvents: 'none',
      }}
    >
      <style>{PULSE_KEYFRAMES}</style>
      <Spotlight target={step.target} />
      {confettiKey > 0 && <Confetti key={confettiKey} />}
      <CoachCard
        title={tutorial.title}
        stage={step.stage}
        instruction={step.instruction}
        hint={step.hint}
        target={step.target}
        stepIndex={stepIndex}
        total={total}
        status={status}
        isValidated={isValidated}
        isLast={isLast}
        onBack={onBack}
        onNext={onNext}
        onQuit={quit}
      />
    </div>,
    document.body,
  );
}
