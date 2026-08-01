// ── Tone bridge ──────────────────────────────────────────────────────────────
// Tone.js owns a global AudioContext of its own. Left alone, the application
// runs two: ours (games, clips, UI, soundfont) and Tone's (piano sampler,
// lesson playback, metronome). Two contexts means two output streams, two
// sample rates, and — worst of all — two unrelated clocks, so anything
// scheduled by Tone can never be sample-accurate against anything we schedule.
//
// This module points Tone at *our* context, which collapses both problems at
// once. It is the single place in the app allowed to call `Tone.setContext`.
//
// Timing of the swap matters: Tone nodes are bound to whichever context was
// current when they were constructed, so adopting after Tone is already in use
// would strand them on a dead context. Every non-DAW entry point that starts
// Tone or builds a Tone node therefore calls in here first.
//
// ── Interaction with the DAW ────────────────────────────────────────────────
// The DAW is deliberately not migrated yet, but it takes its context from
// `Tone.getContext().rawContext` — so if the bridge has already run, the Studio
// transparently lands on the shared context too. That is the intended end
// state, but it is a runtime change to the DAW despite its code being
// untouched, so the Studio needs an ear before this ships.
//
// If Tone is *already* running when we get here — the Studio was opened first
// and initialised it — we leave it alone rather than yank the context out from
// under a live session. That session keeps Tone's context; nothing is created
// or lost, and the next page load bridges normally.

import * as Tone from 'tone';
import { audioContextOwner } from './AudioContextOwner';

let attempted = false;

/**
 * Make Tone.js use the shared AudioContext. Idempotent and safe to call from
 * anywhere; only the first call does anything.
 */
export function ensureToneUsesSharedContext(): void {
  if (attempted) return;
  attempted = true;

  const shared = audioContextOwner.get();
  const current = Tone.getContext();

  // Already ours (or Tone was constructed around it) — nothing to do.
  if (current.rawContext === shared) return;

  // Tone is live. Swapping now would silence whatever is playing, so don't.
  if (current.state === 'running') {
    console.warn(
      '[toneBridge] Tone.js was already running; leaving it on its own ' +
        'context for this session.',
    );
    return;
  }

  Tone.setContext(new Tone.Context({ context: shared }));
}

/**
 * The non-DAW replacement for `Tone.start()`: bridge the context, lift any
 * autoplay suspension, and start Tone only if it isn't already running.
 */
export async function startTone(): Promise<void> {
  ensureToneUsesSharedContext();
  audioContextOwner.resume();
  if (Tone.getContext().state !== 'running') {
    await Tone.start();
  }
}
