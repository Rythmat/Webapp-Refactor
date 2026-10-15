import type { TrackEffectState } from '@/daw/audio/EffectChain';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { useStore } from '@/daw/store';
import { masteringEffectsForEngine } from '@/daw/store/masteringSlice';
import { applyStaticMasterVolume } from './trackAudio';

// ── Previews of the master bus ─────────────────────────────────────────────
//
// What a control moving on the Master or a return sounds like before the
// store has it (useContinuousControl): the engine follows the drag, and the
// one store write on release brings everything else along. Parameters glide;
// a reverb's impulse response waits for the release. A track's previews go
// through its reconciler (previewTrack in trackReconciler.ts).
//
// Each one is also its own undo: called with the store's value, it puts the
// sound back after a gesture that changed nothing.

const PREVIEW = { glide: true, deferIr: true } as const;

/** The Master fader while it moves. */
export function previewMasterVolume(volume: number): void {
  if (!audioEngine.getIsInitialized()) return;
  applyStaticMasterVolume(volume);
}

/** The Master's effects while one of their controls moves. */
export function previewMasteringEffects(effects: TrackEffectState): void {
  if (!audioEngine.getIsInitialized()) return;
  audioEngine.updateMasteringEffects(
    masteringEffectsForEngine(effects, useStore.getState().masteringBypass),
    PREVIEW,
  );
}

/** A return's fader while it moves. */
export function previewReturnVolume(returnId: string, volume: number): void {
  if (!audioEngine.getIsInitialized()) return;
  audioEngine.setReturnVolume(returnId, volume);
}

/** A return's effects while one of their controls moves. */
export function previewReturnEffects(
  returnId: string,
  effects: TrackEffectState,
): void {
  if (!audioEngine.getIsInitialized()) return;
  audioEngine.updateReturnEffects(returnId, effects, PREVIEW);
}
