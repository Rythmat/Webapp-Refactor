/**
 * metronomeClick.ts — The one metronome click in the Learn sections.
 *
 * The synth is owned by this module, not by a component. That is the whole
 * point of the file.
 *
 * WHY NOT A COMPONENT-OWNED SYNTH
 * PlayAlong used to build its own MembraneSynth in `useMemo` and dispose it in
 * an effect cleanup. Under StrictMode React renders twice and runs effects
 * setup -> cleanup -> setup, so the lifecycle was:
 *
 *     create -> create -> dispose
 *
 * The committed synth was the disposed one, `useMemo` never re-ran to replace
 * it, and every later `triggerAttackRelease` threw into a `catch {}`. The
 * result was a permanently silent metronome in dev, with no error surfaced.
 * A module-level singleton has no component lifecycle to be torn down by, so
 * the failure mode cannot recur.
 *
 * Callers just call `playClick`. The synth is built on first use — after the
 * audio context is live — and the level follows the shared lesson volume dial.
 */

import * as Tone from 'tone';
import { ensureToneUsesSharedContext } from '@/audio/core/toneBridge';
import { getLessonVolumeDb, subscribeLessonVolume } from './lessonVolumeStore';

let synth: Tone.MembraneSynth | null = null;
let lastClickAt = -1;

/**
 * Two clicks closer together than this are treated as the same beat. Rerenders
 * and activity transitions can otherwise fire a beat twice; at the fastest
 * supported tempo (160 BPM) real beats are 0.375s apart, so this is well clear.
 */
const MIN_CLICK_SPACING_SECONDS = 0.01;

function getSynth(): Tone.MembraneSynth {
  if (!synth) {
    // Bind to the shared context before building, so the click lands on the
    // same destination as the piano sampler.
    ensureToneUsesSharedContext();
    synth = new Tone.MembraneSynth({
      pitchDecay: 0.008,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.05 },
    }).toDestination();
    synth.volume.value = getLessonVolumeDb();
  }
  return synth;
}

// Track the dial for the lifetime of the app — the synth outlives every lesson.
subscribeLessonVolume(() => {
  if (synth) synth.volume.value = getLessonVolumeDb();
});

/**
 * Click once. Beat 1 is pitched lower and louder than the other beats.
 *
 * Silently does nothing when the audio context is not running yet: the first
 * beats of a count-in can land before the context resumes, and a dropped click
 * is better than a thrown error mid-animation-frame.
 */
export function playClick(isDownbeat: boolean): void {
  if (Tone.getContext().state !== 'running') return;

  const now = Tone.now();
  if (lastClickAt >= 0 && now - lastClickAt < MIN_CLICK_SPACING_SECONDS) return;
  lastClickAt = now;

  getSynth().triggerAttackRelease(
    isDownbeat ? 'C5' : 'C6',
    '32n',
    now,
    isDownbeat ? 0.9 : 0.5,
  );
}

/** Call when a run restarts, so the spacing guard can't swallow its first beat. */
export function resetClickSpacing(): void {
  lastClickAt = -1;
}
