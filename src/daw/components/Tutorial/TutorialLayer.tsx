import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/daw/store';
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

  const tutorial = useMemo(() => getTutorial(activeId), [activeId]);
  const total = tutorial?.steps.length ?? 0;
  const step = tutorial ? (tutorial.steps[stepIndex] ?? null) : null;
  const isLast = tutorial ? stepIndex >= total - 1 : false;
  const isValidated = !!(step?.check || step?.synthCheck);

  const [confettiKey, setConfettiKey] = useState(0);
  const [themeVars, setThemeVars] = useState<Record<string, string>>({});

  // The portal mounts on document.body, OUTSIDE .daw-root where the theme
  // tokens (--color-*) are scoped — so copy them onto the portal container,
  // otherwise every var(--color-*) below resolves to nothing (and one invalid
  // var() in a box-shadow drops the whole spotlight). Re-read per tutorial in
  // case the DAW theme changed.
  useEffect(() => {
    const root = document.querySelector('.daw-root');
    if (!root) return;
    const cs = getComputedStyle(root);
    const next: Record<string, string> = {};
    for (const key of [
      '--color-accent',
      '--color-surface',
      '--color-surface-2',
      '--color-surface-3',
      '--color-border',
      '--color-text',
      '--color-text-dim',
    ]) {
      const v = cs.getPropertyValue(key).trim();
      if (v) next[key] = v;
    }
    setThemeVars(next);
  }, [activeId]);

  // Apply the step's preconditions when it becomes active.
  useEffect(() => {
    const r = step?.requires;
    if (!r) return;
    if (r.view !== undefined) setCurrentView(r.view);
    if (r.libraryOpen !== undefined) setLibraryOpen(r.libraryOpen);
    if (r.channelStripTab !== undefined) setChannelStripTab(r.channelStripTab);
    if (r.automationParam !== undefined)
      setAutomationParamId(r.automationParam);
    if (r.clearClipSelection) {
      useStore.getState().setSelectedClip(null, null);
    }
  }, [
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
        ...(themeVars as React.CSSProperties),
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
