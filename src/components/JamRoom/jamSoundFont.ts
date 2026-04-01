// ── Jam SoundFont Engine ──────────────────────────────────────────────────
// Self-contained SpessaSynth instance for the Jam Room.
// Independent from the DAW's SoundFontAdapter — connects directly to
// AudioContext.destination with simple channel-based note routing.
//
// Channel allocation:
//   0     = local player (melodic)
//   1-8   = remote players (allocated on demand)
//   9     = GM drums (shared)

import type { WorkletSynthesizer } from 'spessasynth_lib';

// ── Singleton state ──────────────────────────────────────────────────────

let synth: WorkletSynthesizer | null = null;
let synthReady = false;
let initPromise: Promise<void> | null = null;
let audioCtx: AudioContext | null = null;

// Channel management
const channelMap = new Map<string, number>(); // userId → channel
let nextRemoteChannel = 1;

const LOCAL_CHANNEL = 0;
const DRUM_CHANNEL = 9;
const MAX_REMOTE_CHANNEL = 8;

// ── Public API ───────────────────────────────────────────────────────────

/** Initialize the shared SpessaSynth worklet and load the GM soundfont. */
export async function initJamSynth(): Promise<void> {
  if (!initPromise) {
    initPromise = doInit();
  }
  return initPromise;
}

/** Play a note on a channel. */
export function jamNoteOn(
  channel: number,
  note: number,
  velocity: number,
): void {
  if (!synth || !synthReady) return;
  synth.noteOn(channel, note, velocity);
}

/** Release a note on a channel. */
export function jamNoteOff(channel: number, note: number): void {
  if (!synth || !synthReady) return;
  synth.noteOff(channel, note);
}

/** Change the GM program (instrument) on a channel. */
export function jamProgramChange(channel: number, program: number): void {
  if (!synth || !synthReady) return;
  synth.programChange(channel, program);
}

/** Get the local player's channel (always 0). */
export function getLocalChannel(): number {
  return LOCAL_CHANNEL;
}

/** Get the GM drums channel (always 9). */
export function getDrumChannel(): number {
  return DRUM_CHANNEL;
}

/**
 * Allocate (or retrieve) a channel for a remote player.
 * Returns the assigned channel number.
 */
export function allocateChannel(userId: string): number {
  const existing = channelMap.get(userId);
  if (existing !== undefined) return existing;

  // Wrap around if we run out of channels (skip 9 = drums)
  let ch = nextRemoteChannel;
  if (ch === DRUM_CHANNEL) ch = nextRemoteChannel = DRUM_CHANNEL + 1;
  if (ch > MAX_REMOTE_CHANNEL && ch < DRUM_CHANNEL) {
    // All 1-8 used, wrap around (oldest remote gets overwritten)
    ch = 1;
    nextRemoteChannel = 2;
  } else {
    nextRemoteChannel = ch + 1;
  }

  channelMap.set(userId, ch);
  return ch;
}

/** Release a remote player's channel. */
export function releaseChannel(userId: string): void {
  const ch = channelMap.get(userId);
  if (ch !== undefined && synth && synthReady) {
    synth.controllerChange(ch, 123, 0); // all notes off
  }
  channelMap.delete(userId);
}

/** Whether the synth is initialized and ready. */
export function isJamSynthReady(): boolean {
  return synthReady;
}

/** Tear down the synth (on unmount). */
export function disposeJamSynth(): void {
  if (synth) {
    for (let ch = 0; ch < 16; ch++) {
      synth.controllerChange(ch, 123, 0);
    }
    synth.disconnect();
  }
  synth = null;
  synthReady = false;
  initPromise = null;
  audioCtx = null;
  channelMap.clear();
  nextRemoteChannel = 1;
}

// ── Init logic ───────────────────────────────────────────────────────────

async function doInit(): Promise<void> {
  // Create or reuse a native AudioContext
  audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  // Load AudioWorklet processor
  await audioCtx.audioWorklet.addModule(
    '/daw-assets/spessasynth_processor.min.js',
  );

  // Create synth
  const { WorkletSynthesizer } = await import('spessasynth_lib');
  synth = new WorkletSynthesizer(audioCtx);

  // Wait for synth to be ready
  await (synth as any).isReady;

  // Fetch and load the GM soundfont
  const sfResponse = await fetch('/daw-assets/GeneralUser_GS.sf2');
  if (!sfResponse.ok) {
    throw new Error(`[JamSoundFont] SF2 fetch failed: ${sfResponse.status}`);
  }
  const sfData = await sfResponse.arrayBuffer();
  await (synth as any).soundBankManager.addSoundBank(sfData, 'gm');

  // Connect synth output to speakers
  synth.connect(audioCtx.destination);

  // Default: Acoustic Grand Piano on local channel
  synth.programChange(LOCAL_CHANNEL, 0);

  synthReady = true;
}
