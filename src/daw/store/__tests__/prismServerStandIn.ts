// ── A stand-in for music-atlas-api's Prism Create ──────────────────────────
// Prism Create asks the server for its take (lib/studio-prism/api.ts). Store
// tests mock that module with standInGeneratePrismClip:
//
//   vi.mock('@/lib/studio-prism/api', async (importOriginal) => ({
//     ...(await importOriginal<typeof import('@/lib/studio-prism/api')>()),
//     generatePrismClip: (await import('./prismServerStandIn'))
//       .standInGeneratePrismClip,
//   }));
//
// It answers with the webapp's own engine, which is what the server runs note
// for note (music-atlas-api pins it: services/prism/generate-clip.test.ts),
// but only when a test calls finishCreate, so a test can change the project
// while a Create is in flight.

import {
  CHORD_RHYTHMS,
  InstrumentChannel,
  degreeMidi,
  generateChord,
  generateChordMidi,
  getModeOffset,
  normalizeSequence,
  unstepChord,
} from '@prism/engine';
import {
  registerSessionDeps,
  type SessionDeps,
} from '@/daw/session/sessionDeps';
import type { PrismClipResponse, PrismPrompt } from '@/lib/studio-prism/api';

export interface PendingCreate {
  token: string;
  prompt: PrismPrompt;
  response: Promise<PrismClipResponse>;
  answer: () => void;
  fail: (error: unknown) => void;
}

/** Creates asked and not yet answered, oldest first. */
export const pendingCreates: PendingCreate[] = [];

/** The take the server writes for `prompt`. */
export function serverTake(prompt: PrismPrompt): PrismClipResponse {
  const parentRoot = prompt.key.root + 48 - getModeOffset(prompt.key.mode);
  const chordSeq = normalizeSequence(
    prompt.progression.map((name) =>
      generateChord(degreeMidi(parentRoot, name), unstepChord(name)),
    ),
  );
  const rhythm = Object.prototype.hasOwnProperty.call(
    CHORD_RHYTHMS,
    prompt.rhythm,
  )
    ? prompt.rhythm
    : 'Quarters';
  const { events, ticksPerQuarterNote } = generateChordMidi({
    chordSeq,
    stringSeq: prompt.progression,
    rhythmPattern: CHORD_RHYTHMS[rhythm],
    swing: prompt.swing,
    strum: prompt.strum.mode,
    strumAmount: prompt.strum.amount,
    tilt: prompt.tilt.mode,
    tiltAmount: prompt.tilt.amount,
    channel: InstrumentChannel.Chords,
  });
  return { rhythm, ticksPerQuarterNote, clip: { durationTicks: 7680, events } };
}

/** Stands in for generatePrismClip: the answer waits for finishCreate. */
export function standInGeneratePrismClip(
  token: string,
  prompt: PrismPrompt,
): Promise<PrismClipResponse> {
  let answer!: () => void;
  let fail!: (error: unknown) => void;
  const response = new Promise<PrismClipResponse>((resolve, reject) => {
    answer = () => resolve(serverTake(prompt));
    fail = reject;
  });
  pendingCreates.push({ token, prompt, response, answer, fail });
  return response;
}

async function settle(
  settleOne: (create: PendingCreate) => void,
): Promise<PendingCreate[]> {
  const creates = pendingCreates.splice(0);
  creates.forEach(settleOne);
  // The store awaited each response before this does, so by the time this
  // settles every Create has written (or dropped) its take.
  await Promise.allSettled(creates.map((c) => c.response));
  return creates;
}

/** Answer every Create in flight; settles once each has written its take. */
export function finishCreate(): Promise<PendingCreate[]> {
  return settle((create) => create.answer());
}

/** Fail every Create in flight with `error`. */
export function failCreate(error: unknown): Promise<PendingCreate[]> {
  return settle((create) => create.fail(error));
}

/** Give Create a signed-in token, as DawApp does. Returns the unregister. */
export function signInForCreate(token = 'test-token'): () => void {
  return registerSessionDeps({ token: () => token } as unknown as SessionDeps);
}
