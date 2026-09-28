/**
 * guitarVoice.ts — The guitar you hear in a guitar lesson.
 *
 * The demo, the Practice guide and a MIDI guitar's echo all play one guitar,
 * in the tone chosen in the guitar tone prefs:
 *
 * - 'amp' (the default): six plucked strings (stringVoice) played into the
 *   Studio guitar amp (GuitarAmpRig), so a lesson sounds like the Studio's
 *   Guitar track. Notes are scheduled on the audio clock.
 * - 'acoustic': one GM guitar (program 25, steel string, or 24, nylon) on the
 *   app's shared SoundFont synth, on a channel leased for Learn so no other
 *   feature's program or level leaks in.
 *
 * The GM synth plays a note the moment it is sent — it ignores scheduled start
 * times — so a note meant for a Tone.js time waits in a setTimeout instead.
 * Tone.getTransport().cancel() knows nothing of those timers, nor of notes
 * queued in the string voice, so cancelScheduledGuitarNotes() is the one way
 * to stop them.
 *
 * A tone change applies to the next note. The amp code loads on first use,
 * so piano lessons never fetch it.
 */

import * as Tone from 'tone';
import { audioContextOwner } from '@/audio/core/AudioContextOwner';
import {
  allocateChannel,
  initJamSynth,
  jamControllerChange,
  jamNoteOff,
  jamNoteOn,
  jamProgramChange,
} from '@/components/JamRoom/jamSoundFont';
import type { LessonVoice } from '@/curriculum/hooks/useDemoPlayback';
import type { FretPosition } from '@/lib/guitar/types';
import { getLessonVolume, subscribeLessonVolume } from '../lessonVolumeStore';
import { GUIDE_VELOCITY_SCALE } from '../practiceGuide';
import {
  getGuitarTonePrefs,
  subscribeGuitarTonePrefs,
} from './guitarTonePrefs';
import type { StringVoice } from './stringVoice';
import type { GuitarInputRig } from './types';

/** GM programs 24 (Acoustic Guitar, nylon) and 25 (Acoustic Guitar, steel). */
export type GuitarProgram = 24 | 25;

const STEEL_STRING: GuitarProgram = 25;
const LEASE_ID = 'learn-guitar';
const CC_CHANNEL_VOLUME = 7;

/** Gap between strings in a strum, low string first. */
const STRUM_STAGGER_MS = 12;

let program: GuitarProgram = STEEL_STRING;
/** Leased on first use and kept: a lease is stable per id. */
let channel: number | null = null;

/** Timers for notes still waiting to start or to stop. */
const pending = new Set<ReturnType<typeof setTimeout>>();

/**
 * Each sounding note, keyed to the strike that owns it. Re-striking a note
 * hands it to the new strike, so the earlier one's release can't cut it short.
 */
const sounding = new Map<number, number>();
let strikeCount = 0;

/** Notes a MIDI guitar is holding, keyed to the strike each one started. */
const held = new Map<number, number>();

// ── Channel ──────────────────────────────────────────────────────────────────

function leasedChannel(): number {
  channel ??= allocateChannel(LEASE_ID);
  return channel;
}

/**
 * CC7 for the lesson volume. The synth's CC7 curve is squared (GM's 40·log10
 * law), so the square root keeps the dial tracking the piano sampler, whose
 * gain is linear in the dial.
 */
function volumeCC(): number {
  return Math.round(127 * Math.sqrt(getLessonVolume()));
}

function applyChannelSettings(ch: number): void {
  jamProgramChange(ch, program);
  jamControllerChange(ch, CC_CHANNEL_VOLUME, volumeCC());
}

// Follow the dial for the app's lifetime, like the metronome click. Only CC7
// on our own channel: the jam master volume is shared by every GM feature.
subscribeLessonVolume(() => {
  if (channel !== null) {
    jamControllerChange(channel, CC_CHANNEL_VOLUME, volumeCC());
  }
});

async function loadAcousticVoice(): Promise<void> {
  const ch = leasedChannel();
  // Lands at once when the shared synth is already running, so a note sent
  // straight after this call is already a guitar…
  applyChannelSettings(ch);
  await initJamSynth();
  // …but is dropped while it is still loading, so apply it again once it's up.
  applyChannelSettings(ch);
}

/** The channel to play on, loading the voice if nothing has yet. */
function voiceChannel(): number {
  if (channel === null) {
    loadAcousticVoice().catch((err: unknown) => {
      console.warn('[guitarVoice] load failed:', err);
    });
  }
  return leasedChannel();
}

// ── Amp ──────────────────────────────────────────────────────────────────────

interface AmpVoice {
  rig: GuitarInputRig;
  strings: StringVoice;
  releaseRig: () => void;
}

/**
 * How long a load waits for the amp model before letting the guitar play
 * (dry, until the model lands): a stalled download mustn't hold up Demo or
 * Practice, which await the load.
 */
const AMP_MODEL_WAIT_MS = 5000;

let ampVoice: AmpVoice | null = null;
let ampLoading: Promise<AmpVoice | null> | null = null;
/** Bumped on release, so a load still in flight lets go of what it gets. */
let ampGeneration = 0;
/** No AudioWorklet (e.g. off https) or no rig: play acoustic instead. */
let ampUnavailable = false;
/**
 * 'wanted' once something asks for the guitar, so a tone change reloads it.
 * 'released' after releaseGuitarVoice(): a note still in flight from the
 * lesson that let go (a tone preview, a "Hear it") must not take the rig
 * back with no one left to release it. Only loadGuitarVoice() lifts that.
 */
let voiceUse: 'unused' | 'wanted' | 'released' = 'unused';

/** MIDI guitar notes held on the strings, keyed to their strike. */
const heldOnStrings = new Map<number, number>();

function loadAmpVoice(): Promise<AmpVoice | null> {
  ampLoading ??= (async () => {
    const generation = ampGeneration;
    let releaseRig: (() => void) | null = null;
    try {
      const [rigs, { createStringVoice }] = await Promise.all([
        import('./GuitarAmpRig'),
        import('./stringVoice'),
      ]);
      const rig = await rigs.acquireGuitarAmpRig();
      releaseRig = rigs.releaseGuitarAmpRig;
      const input = rig.getPlaybackInputNode();
      if (!input) throw new Error('the amp rig has no playback input');
      const strings = await createStringVoice(rig.context, input);
      if (generation !== ampGeneration) {
        strings.dispose();
        releaseRig();
        return null;
      }
      ampVoice = { rig, strings, releaseRig };
      return ampVoice;
    } catch (err) {
      releaseRig?.();
      if (generation === ampGeneration) ampUnavailable = true;
      console.warn('[guitarVoice] amp unavailable, playing acoustic:', err);
      return null;
    }
  })();
  return ampLoading;
}

/** Let go of the strings and the rig (another holder may keep the rig). */
function releaseAmpVoice(): void {
  ampGeneration += 1;
  ampLoading = null;
  heldOnStrings.clear();
  if (!ampVoice) return;
  const { strings, releaseRig } = ampVoice;
  ampVoice = null;
  strings.dispose();
  releaseRig();
}

function playsAcoustic(): boolean {
  return getGuitarTonePrefs().tone === 'acoustic' || ampUnavailable;
}

/**
 * The strings, once loaded. Until then a note is dropped, as the GM synth
 * drops notes while it loads; the demo and guide await load() first.
 */
function readyAmp(): AmpVoice | null {
  if (voiceUse === 'released') return null;
  voiceUse = 'wanted';
  if (!ampVoice) void loadAmpVoice();
  return ampVoice;
}

// A new amp is the rig's to load; a new tone swaps the voice itself.
subscribeGuitarTonePrefs(() => {
  if (getGuitarTonePrefs().tone === 'acoustic') releaseAmpVoice();
  if (voiceUse === 'wanted') {
    loadGuitarVoice(program).catch((err: unknown) => {
      console.warn('[guitarVoice] load failed:', err);
    });
  }
});

/**
 * Load the guitar in the chosen tone. Idempotent; call it from a gesture
 * before the first note, since a note sent while the voice loads is dropped.
 * The amp tone resolves once the amp model is in (or has failed, or is
 * AMP_MODEL_WAIT_MS late, leaving the amp bypassed until it lands); if the
 * amp can't run at all, the acoustic guitar loads.
 */
export async function loadGuitarVoice(
  guitarProgram: GuitarProgram = STEEL_STRING,
): Promise<void> {
  program = guitarProgram;
  voiceUse = 'wanted';
  if (!playsAcoustic()) {
    audioContextOwner.resume();
    const amp = await loadAmpVoice();
    if (amp) {
      const model = amp.rig
        .setAmpModel(getGuitarTonePrefs().ampModelId)
        .catch((err: unknown) => {
          console.warn('[guitarVoice] amp model failed to load:', err);
        });
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        model,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, AMP_MODEL_WAIT_MS);
        }),
      ]);
      clearTimeout(timer);
      return;
    }
    // Released mid-load: by a switch to acoustic, which loads that itself,
    // or by the lesson letting go.
    if (!ampUnavailable) return;
  }
  await loadAcousticVoice();
}

/**
 * Stop using the guitar: silence it and let go of the amp rig, whose model
 * keeps the CPU busy while it exists. For the lesson's unmount; the amp comes
 * back only with the next loadGuitarVoice(), so a late note is dropped.
 */
export function releaseGuitarVoice(): void {
  cancelScheduledGuitarNotes();
  releaseAmpVoice();
  voiceUse = 'released';
}

// ── Notes ────────────────────────────────────────────────────────────────────

/** Velocities arrive either 0..1 or as MIDI 0..127, as in practiceGuide. */
function normalizeVelocity(velocity: number): number {
  return Math.max(0, Math.min(1, velocity > 1 ? velocity / 127 : velocity));
}

/** Milliseconds until a Tone.js time; 0 for now or a time already past. */
function delayUntil(toneTime: number | undefined): number {
  if (toneTime === undefined) return 0;
  // Measured on the raw audio clock, not Tone.now(): a Tone.Part calls back
  // about a lookAhead before the time it hands over, and now() already runs
  // that lookAhead ahead, so counting from it would sound every note early.
  return Math.max(0, (toneTime - Tone.immediate()) * 1000);
}

/**
 * A Tone.js time on the rig's clock: the same distance ahead. Tone may run on
 * a context of its own (when the Studio started it first), so its times are
 * never passed through as they are.
 */
function ampTime(amp: AmpVoice, toneTime: number | undefined): number {
  return amp.rig.context.currentTime + delayUntil(toneTime) / 1000;
}

function after(ms: number, fn: () => void): void {
  const timer = setTimeout(() => {
    pending.delete(timer);
    fn();
  }, ms);
  pending.add(timer);
}

function strike(midi: number, level: number): number {
  jamNoteOn(voiceChannel(), midi, Math.max(1, Math.round(level * 127)));
  const id = ++strikeCount;
  sounding.set(midi, id);
  return id;
}

/** Release a note, unless a later strike has taken it over. */
function release(midi: number, id: number): void {
  if (sounding.get(midi) !== id) return;
  sounding.delete(midi);
  jamNoteOff(leasedChannel(), midi);
}

function schedule(
  midi: number,
  level: number,
  delayMs: number,
  holdMs: number,
): void {
  const start = () => {
    const id = strike(midi, level);
    after(holdMs, () => release(midi, id));
  };
  if (delayMs > 0) after(delayMs, start);
  else start();
}

function pluck(
  midi: number,
  durationSeconds: number,
  velocity: number,
  toneTime?: number,
  position?: FretPosition,
): void {
  if (durationSeconds <= 0) return;
  const level = normalizeVelocity(velocity);
  if (playsAcoustic()) {
    schedule(midi, level, delayUntil(toneTime), durationSeconds * 1000);
    return;
  }
  const amp = readyAmp();
  if (!amp) return;
  const time = ampTime(amp, toneTime);
  const id = amp.strings.noteOn(midi, level, {
    string: position?.string,
    time,
  });
  amp.strings.noteOff(midi, time + durationSeconds, id);
}

/**
 * One Practice guide note, pulled back behind the student's playing exactly
 * as the piano guide is.
 */
export function playGuitarGuideNote(
  midi: number,
  durationSeconds: number,
  velocity: number,
  /** Tone.js time, e.g. from a Tone.Part callback; omit to play now. */
  toneTime?: number,
  /** Where the book plays it; the amp tone plucks that string. */
  position?: FretPosition,
): void {
  pluck(
    midi,
    durationSeconds,
    normalizeVelocity(velocity) * GUIDE_VELOCITY_SCALE,
    toneTime,
    position,
  );
}

/**
 * Strum a chord: strings sound low to high, STRUM_STAGGER_MS apart, and all
 * stop together at the end, as a strumming hand damps them.
 */
export function strumGuitarChord(
  midis: readonly number[],
  durationSeconds: number,
  velocity: number,
  /** Tone.js time of the first string; omit to strum now. */
  toneTime?: number,
  /** The shape's strings, one per note; the amp tone plays those strings. */
  positions?: readonly FretPosition[],
): void {
  if (durationSeconds <= 0) return;
  const level = normalizeVelocity(velocity);
  if (!playsAcoustic()) {
    const amp = readyAmp();
    if (amp) {
      amp.strings.strum(
        positions?.length === midis.length ? positions : midis,
        durationSeconds,
        level,
        ampTime(amp, toneTime),
        STRUM_STAGGER_MS,
      );
    }
    return;
  }
  const startMs = delayUntil(toneTime);
  const endMs = startMs + durationSeconds * 1000;
  [...midis]
    .sort((a, b) => a - b)
    .forEach((midi, i) => {
      const onMs = startMs + i * STRUM_STAGGER_MS;
      schedule(midi, level, onMs, Math.max(0, endMs - onMs));
    });
}

/**
 * Echo a MIDI guitar's note-on; it sounds until guitarNoteOff. `velocity` is
 * the raw MIDI 1..127: the 0..1-or-MIDI guess would echo a velocity-1 ghost
 * note, common from hex pickups, at full level.
 */
export function guitarNoteOn(midi: number, velocity: number): void {
  const level = Math.min(1, velocity / 127);
  if (playsAcoustic()) {
    held.set(midi, strike(midi, level));
    return;
  }
  const amp = readyAmp();
  if (amp) heldOnStrings.set(midi, amp.strings.noteOn(midi, level));
}

export function guitarNoteOff(midi: number): void {
  const id = held.get(midi);
  if (id !== undefined) {
    held.delete(midi);
    release(midi, id);
  }
  const stringStrike = heldOnStrings.get(midi);
  if (stringStrike !== undefined) {
    heldOnStrings.delete(midi);
    ampVoice?.strings.noteOff(midi, undefined, stringStrike);
  }
}

/**
 * Stop everything the guitar is playing: drop every note still waiting to
 * start and damp every one already sounding.
 */
export function cancelScheduledGuitarNotes(): void {
  pending.forEach(clearTimeout);
  pending.clear();
  sounding.forEach((_, midi) => jamNoteOff(leasedChannel(), midi));
  sounding.clear();
  held.clear();
  ampVoice?.strings.allOff();
  heldOnStrings.clear();
}

/** The guitar as the demo's voice: single notes plucked, chords strummed. */
export const guitarLessonVoice: LessonVoice = {
  load: () => loadGuitarVoice(program),
  attackRelease: (midis, durationSeconds, velocity, time) => {
    if (typeof midis === 'number') {
      pluck(midis, durationSeconds, velocity, time);
    } else {
      strumGuitarChord(midis, durationSeconds, velocity, time);
    }
  },
  stop: cancelScheduledGuitarNotes,
};
