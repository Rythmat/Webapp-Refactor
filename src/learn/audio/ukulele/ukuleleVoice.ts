// ── The ukulele lessons' voice ────────────────────────────────────────────
// What a ukulele lesson's Demo, guide notes and "hear it" sound like.
//
// - Ukulele samples, when public/samples/ukulele/ has them: one Tone.Sampler
//   over the notes UKULELE_SAMPLE_NOTES lists (mp3, scientific pitch, 'Cs4'
//   for C♯4), decoded by hand as the bass samples are, so a missing file
//   says so instead of leaving a silent ukulele.
// - Until then (or if they fail), GM program 24, the nylon-string guitar,
//   on the app's shared SoundFont synth, on a channel leased for the
//   ukulele. It plays a note the moment it is sent, so a note meant for a
//   Tone.js time waits in a timer.
//
// A chord is strummed in the order it is given: a shape's written order,
// G C E A, so the re-entrant G sounds first, as a downstroke plays it. It is
// never re-sorted by pitch.

import * as Tone from 'tone';
import {
  allocateChannel,
  initJamSynth,
  jamControllerChange,
  jamNoteOff,
  jamNoteOn,
  jamProgramChange,
} from '@/components/JamRoom/jamSoundFont';
import type { LessonVoice } from '@/curriculum/hooks/useDemoPlayback';
import { getLessonVolume, subscribeLessonVolume } from '../lessonVolumeStore';

/**
 * The sampled notes, by file name. Empty until samples are added (with a
 * CREDITS.md beside them); one every 2-3 semitones from C4 to C6 is enough.
 */
export const UKULELE_SAMPLE_NOTES: readonly string[] = [];

/** Gap between strings in a strum, G string first. */
export const STRUM_STAGGER_SECONDS = 0.015;

const NYLON_GUITAR = 24;
const LEASE_ID = 'learn-ukulele';
const CC_CHANNEL_VOLUME = 7;
const RELEASE_SECONDS = 0.6;

// ── Samples ───────────────────────────────────────────────────────────────

let sampler: Promise<Tone.Sampler | null> | null = null;
let ready: Tone.Sampler | null = null;

async function loadSampler(): Promise<Tone.Sampler | null> {
  if (UKULELE_SAMPLE_NOTES.length === 0) return null;
  const ctx = Tone.getContext().rawContext as AudioContext;
  const urls: Record<string, Tone.ToneAudioBuffer> = {};
  const failed: string[] = [];
  await Promise.all(
    UKULELE_SAMPLE_NOTES.map(async (file) => {
      try {
        const res = await fetch(`/samples/ukulele/${file}.mp3`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        urls[file.replace('s', '#')] = new Tone.ToneAudioBuffer(
          await ctx.decodeAudioData(await res.arrayBuffer()),
        );
      } catch {
        failed.push(file);
      }
    }),
  );
  if (failed.length) {
    console.warn('[ukulele] could not load samples', failed.join(', '));
  }
  if (Object.keys(urls).length === 0) return null;
  const s = new Tone.Sampler({ urls, release: RELEASE_SECONDS });
  s.toDestination();
  s.volume.value = Tone.gainToDb(Math.max(0.001, getLessonVolume()));
  return s;
}

subscribeLessonVolume(() => {
  if (ready) {
    ready.volume.value = Tone.gainToDb(Math.max(0.001, getLessonVolume()));
  }
  if (channel !== null) {
    jamControllerChange(channel, CC_CHANNEL_VOLUME, volumeCC());
  }
});

// ── The GM fallback ───────────────────────────────────────────────────────

let channel: number | null = null;
const pending = new Set<ReturnType<typeof setTimeout>>();
const sounding = new Set<number>();

/** CC7 for the lesson volume (the synth's CC7 curve is squared). */
function volumeCC(): number {
  return Math.round(127 * Math.sqrt(getLessonVolume()));
}

function leasedChannel(): number {
  channel ??= allocateChannel(LEASE_ID);
  return channel;
}

async function loadNylon(): Promise<void> {
  const ch = leasedChannel();
  jamProgramChange(ch, NYLON_GUITAR);
  jamControllerChange(ch, CC_CHANNEL_VOLUME, volumeCC());
  await initJamSynth();
  // A program sent while the synth loads is dropped: send it again.
  jamProgramChange(ch, NYLON_GUITAR);
  jamControllerChange(ch, CC_CHANNEL_VOLUME, volumeCC());
}

function later(ms: number, run: () => void): void {
  const timer = setTimeout(
    () => {
      pending.delete(timer);
      run();
    },
    Math.max(0, ms),
  );
  pending.add(timer);
}

function playNylon(
  midi: number,
  durationSeconds: number,
  velocity: number,
  time?: number,
): void {
  const ch = leasedChannel();
  const startMs = time === undefined ? 0 : (time - Tone.now()) * 1000;
  const level = Math.round(127 * velocity);
  later(startMs, () => {
    jamNoteOn(ch, midi, level);
    sounding.add(midi);
  });
  later(startMs + durationSeconds * 1000, () => {
    jamNoteOff(ch, midi);
    sounding.delete(midi);
  });
}

// ── The voice ─────────────────────────────────────────────────────────────

/** Whether the voice is playing samples (false: the nylon fallback). */
export function ukuleleUsesSamples(): boolean {
  return ready !== null;
}

export function loadUkuleleVoice(): Promise<void> {
  if (!sampler) {
    sampler = loadSampler().then(
      (s) => (ready = s),
      (err: unknown) => {
        console.warn('[ukulele] samples failed, using nylon guitar:', err);
        return null;
      },
    );
  }
  return sampler.then(async (s) => {
    if (!s) await loadNylon();
  });
}

/** Velocities arrive either 0..1 or as MIDI 0..127. */
const level = (velocity: number) =>
  Math.max(0, Math.min(1, velocity > 1 ? velocity / 127 : velocity));

function play(
  midi: number,
  durationSeconds: number,
  velocity: number,
  time?: number,
): void {
  if (ready) {
    ready.triggerAttackRelease(
      Tone.Frequency(midi, 'midi').toNote(),
      durationSeconds,
      time ?? Tone.now(),
      level(velocity),
    );
    return;
  }
  playNylon(midi, durationSeconds, level(velocity), time);
}

/** Strum a chord in the order given (a shape's G C E A). */
export function strumUkuleleChord(
  midis: readonly number[],
  durationSeconds: number,
  velocity: number,
  time?: number,
): void {
  const start = time ?? Tone.now();
  midis.forEach((midi, i) =>
    play(midi, durationSeconds, velocity, start + i * STRUM_STAGGER_SECONDS),
  );
}

/** Stop everything the ukulele is playing or has scheduled. */
export function stopUkuleleVoice(): void {
  ready?.releaseAll();
  pending.forEach(clearTimeout);
  pending.clear();
  if (channel !== null) {
    for (const midi of sounding) jamNoteOff(channel, midi);
  }
  sounding.clear();
}

/** The ukulele as a lesson's voice: notes plucked, chords strummed G to A. */
export const ukuleleLessonVoice: LessonVoice = {
  load: loadUkuleleVoice,
  attackRelease: (midis, durationSeconds, velocity, time) => {
    if (typeof midis === 'number') {
      play(midis, durationSeconds, velocity, time);
      return;
    }
    strumUkuleleChord(midis, durationSeconds, velocity, time);
  },
  stop: stopUkuleleVoice,
};
