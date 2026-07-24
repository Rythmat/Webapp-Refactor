import { useEffect } from 'react';
import { useStore, type AllSlices } from '@/daw/store';
import { useSynthStore, type SynthStore } from '@/daw/oracle-synth/store';
import type { TutorialStep } from './tutorials';

// ── useTutorialDetection ────────────────────────────────────────────────────
// Watches for the active step's `check` (main composed store) or `synthCheck`
// (the Oracle Synth's separate store — per-track patch state like presetName).
// When one passes, calls onComplete(celebrate). Uses each store's
// subscribeWithSelector middleware (same mechanism as undoMiddleware) so
// detection is control-agnostic — it fires whether the change came from a
// slider, a dropdown, or a genre pill.
//
// `armed`/`armedSynth` are snapshots taken when the step arms, letting a check
// require a *change* (e.g. chordRegions grew) rather than an absolute value. If
// a check is already satisfied the instant it arms, it completes with
// celebrate=false so the layer advances quietly instead of celebrating
// something the user didn't do.

export function useTutorialDetection(
  step: TutorialStep | null,
  active: boolean,
  onComplete: (celebrate: boolean) => void,
) {
  useEffect(() => {
    if (!active || (!step?.check && !step?.synthCheck)) return;
    const check = step.check;
    const synthCheck = step.synthCheck;
    const armed = useStore.getState();
    const armedSynth = useSynthStore.getState();
    let fired = false;

    const complete = (celebrate: boolean) => {
      if (fired) return;
      fired = true;
      onComplete(celebrate);
    };
    const evalMain = (s: AllSlices, celebrate: boolean) => {
      if (check?.(s, armed)) complete(celebrate);
    };
    const evalSynth = (sy: SynthStore, celebrate: boolean) => {
      if (synthCheck?.(sy, armedSynth)) complete(celebrate);
    };

    // Already satisfied on arrival → advance quietly.
    evalMain(useStore.getState(), false);
    if (!fired) evalSynth(useSynthStore.getState(), false);
    if (fired) return;

    const unsubs: (() => void)[] = [];
    if (check) unsubs.push(useStore.subscribe((s) => evalMain(s, true)));
    if (synthCheck)
      unsubs.push(useSynthStore.subscribe((sy) => evalSynth(sy, true)));
    return () => unsubs.forEach((u) => u());
  }, [step, active, onComplete]);
}
