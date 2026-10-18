/**
 * preview.ts — ▶ on a Library row (milestone 2.14).
 *
 * One preview at a time, on an instrument of its own, so an item is heard
 * before there is a track for it:
 * - a part: its notes in the key it would land in, at the tempo it was
 *   played, on its own sound;
 * - a groove: its designed notes at its tempo, on its kit;
 * - a kit: a bar of kick, snare and hats;
 * - a sound: a short phrase in the song's key (C when it has none): a bass
 *   line for a bass, an arpeggio and its chord for the rest.
 *
 * Notes are booked on the audio clock a little ahead (a 25 ms loop, 100 ms
 * ahead), as dock-instruments-07 asked of the Grooves preview, so a stop is
 * heard at once and nothing drifts. A preview goes straight to the output,
 * around the master fader and the mastering chain, as the click does: the
 * master meter never shows it and an export never has it.
 *
 * It stops on ■, another ▶, Play or Record, an add, Escape in the panel, the
 * panel closing, and a new session. Instruments are kept for the last three
 * sounds and let go when the panel closes.
 */

import { ALL_MODES, type MidiNoteEvent } from '@prism/engine';
import { audioEngine } from '@/daw/audio/AudioEngine';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';
import { createInstrument } from '@/daw/instruments/instrumentFactory';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { createSoundInstrument } from '@/daw/instruments/soundString';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import {
  applySynthStateToEngine,
  synthTrackStateFromPreset,
} from '@/daw/oracle-synth/synthTrackState';
import { useBrowserStore } from './browserStore';
import type { BrowserItem } from './items';
import { moveForSong, preparedEvents, type SongKey } from './partInSong';
import { presetData } from './presetData';

const PPQ = 480;
const TICK_MS = 25;
const AHEAD_S = 0.1;
/** How long a preview waits for audio to start (the first click starts it). */
const AUDIO_WAIT_MS = 3000;
const KEPT_VOICES = 3;
/** The preview's level, a new track's default (0.8). */
const PREVIEW_GAIN = 0.8;

interface Voice {
  adapter: InstrumentAdapter;
  gain: GainNode;
}

interface PreviewNote {
  note: number;
  velocity: number;
  /** Seconds from the preview's start. */
  at: number;
  length: number;
}

const voices = new Map<string, Voice>();
let token = 0;
let loop: ReturnType<typeof setInterval> | null = null;
let ending: ReturnType<typeof setTimeout> | null = null;
let sounding: InstrumentAdapter | null = null;

const setState = (itemId: string, status: 'loading' | 'playing') =>
  useBrowserStore.getState().setPreview({ itemId, status });

/** Stops the preview playing, if any. */
export function stopPreview(): void {
  token++;
  if (loop) clearInterval(loop);
  if (ending) clearTimeout(ending);
  loop = null;
  ending = null;
  sounding?.allNotesOff();
  sounding = null;
  if (useBrowserStore.getState().preview) {
    useBrowserStore.getState().setPreview(null);
  }
}

/** Stops and lets every kept instrument go (the panel closed). */
export function releasePreviewVoices(): void {
  stopPreview();
  for (const voice of voices.values()) disposeVoice(voice);
  voices.clear();
}

function disposeVoice(voice: Voice): void {
  try {
    voice.adapter.dispose();
  } catch {
    /* already gone */
  }
  voice.gain.disconnect();
}

async function audioReady(): Promise<boolean> {
  const until = Date.now() + AUDIO_WAIT_MS;
  while (!audioEngine.getIsInitialized()) {
    if (Date.now() > until) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  await audioEngine.resumeIfNeeded();
  return true;
}

/** The sound an item plays on, as a key for the kept instruments. */
function voiceKey(item: BrowserItem): string {
  switch (item.type) {
    case 'part':
      return `sound:${item.sound}`;
    case 'groove':
      return `kit:${item.kit}`;
    case 'kit':
      return `kit:${item.kitId}`;
    case 'preset':
      return item.instrumentType === 'oracle-synth'
        ? `synth:${item.source}:${item.presetName}`
        : `${item.instrumentType}:${item.gmProgram ?? ''}`;
    case 'template':
      return 'none';
  }
}

function makeAdapter(item: BrowserItem): InstrumentAdapter | null {
  switch (item.type) {
    case 'part':
      return createSoundInstrument(item.sound);
    case 'groove':
      return createInstrument('drum-machine', undefined, item.kit);
    case 'kit':
      return createInstrument('drum-machine', undefined, item.kitId);
    case 'preset':
      return createInstrument(item.instrumentType, item.gmProgram);
    case 'template':
      return null;
  }
}

async function voiceFor(item: BrowserItem, bpm: number): Promise<Voice | null> {
  const key = voiceKey(item);
  const kept = voices.get(key);
  if (kept) {
    // Most recent last.
    voices.delete(key);
    voices.set(key, kept);
    return kept;
  }
  const adapter = makeAdapter(item);
  if (!adapter) return null;
  const ctx = audioEngine.getContext();
  const gain = ctx.createGain();
  gain.gain.value = PREVIEW_GAIN;
  gain.connect(audioEngine.getOutput());
  try {
    await adapter.init(ctx, gain);
  } catch (err) {
    console.warn('[library] preview sound did not load', err);
    disposeVoice({ adapter, gain });
    return null;
  }
  if (item.type === 'preset' && adapter instanceof OracleSynthAdapter) {
    const data = await presetData(item);
    const engine = adapter.getEngine();
    if (data && engine) {
      applySynthStateToEngine(engine, synthTrackStateFromPreset(data, bpm));
    }
  }
  const voice = { adapter, gain };
  voices.set(key, voice);
  while (voices.size > KEPT_VOICES) {
    const [oldest, old] = voices.entries().next().value as [string, Voice];
    voices.delete(oldest);
    disposeVoice(old);
  }
  return voice;
}

const fromEvents = (
  events: readonly MidiNoteEvent[],
  bpm: number,
): PreviewNote[] => {
  const spt = 60 / bpm / PPQ;
  return events.map((e) => ({
    note: e.note,
    velocity: e.velocity,
    at: e.startTick * spt,
    length: Math.max(0.03, e.durationTicks * spt),
  }));
};

/** A bar of kick, snare and eighth-note hats at 100 BPM. */
function kitBeat(): PreviewNote[] {
  const beat = 0.6;
  const notes: PreviewNote[] = [];
  for (let i = 0; i < 8; i++) {
    notes.push({
      note: 42,
      velocity: i % 2 ? 70 : 96,
      at: (i * beat) / 2,
      length: 0.1,
    });
  }
  notes.push({ note: 36, velocity: 110, at: 0, length: 0.2 });
  notes.push({ note: 38, velocity: 104, at: beat, length: 0.2 });
  notes.push({ note: 36, velocity: 100, at: 2 * beat, length: 0.2 });
  notes.push({ note: 38, velocity: 104, at: 3 * beat, length: 0.2 });
  notes.push({ note: 36, velocity: 110, at: 4 * beat, length: 0.3 });
  notes.push({ note: 49, velocity: 90, at: 4 * beat, length: 0.6 });
  return notes;
}

/** A sound's phrase in `key`: a bass line, or an arpeggio and its chord. */
function phrase(
  item: Extract<BrowserItem, { type: 'preset' }>,
  key: SongKey,
): PreviewNote[] {
  const scale = ALL_MODES[key.mode] ?? ALL_MODES.ionian;
  const third = scale[2] ?? 4;
  const fifth = scale[4] ?? 7;
  const beat = 0.5;
  if (item.instrument === 'bass') {
    const root = 36 + key.rootPc;
    return [0, 0, fifth, 12].map((step, i) => ({
      note: root + step,
      velocity: 100,
      at: i * beat,
      length: beat * 0.9,
    }));
  }
  const root = 60 + key.rootPc - (key.rootPc > 6 ? 12 : 0);
  const steps = [0, third, fifth, 12];
  const arp = steps.map((step, i) => ({
    note: root + step,
    velocity: 96,
    at: (i * beat) / 2,
    length: beat / 2,
  }));
  const chord = [0, third, fifth].map((step) => ({
    note: root + step,
    velocity: 90,
    at: 2 * beat,
    length: 2 * beat,
  }));
  return [...arp, ...chord];
}

async function notesFor(
  item: BrowserItem,
  song: SongKey | null,
): Promise<PreviewNote[]> {
  switch (item.type) {
    case 'part': {
      const move = moveForSong(item.part, song);
      return fromEvents(preparedEvents(item.part, move.shift), item.part.tempo);
    }
    case 'groove': {
      const events = await loadGrooveEvents(item.grooveId);
      return events ? fromEvents(events, item.bpm ?? 100) : [];
    }
    case 'kit':
      return kitBeat();
    case 'preset':
      return phrase(item, song ?? { rootPc: 0, mode: 'ionian' });
    case 'template':
      return [];
  }
}

/**
 * Plays `item` (stopping any other preview). `song` is the key a part
 * would land in and a sound's phrase is in; `bpm` tunes a synth's tempo.
 */
export async function startPreview(
  item: BrowserItem,
  song: SongKey | null,
  bpm: number,
): Promise<void> {
  stopPreview();
  if (item.type === 'template') return;
  const mine = token;
  setState(item.id, 'loading');
  const stale = () => mine !== token;
  if (!(await audioReady()) || stale()) {
    if (!stale()) stopPreview();
    return;
  }
  const [voice, notes] = await Promise.all([
    voiceFor(item, bpm),
    notesFor(item, song),
  ]);
  if (stale()) return;
  if (!voice || notes.length === 0) {
    stopPreview();
    return;
  }
  setState(item.id, 'playing');
  sounding = voice.adapter;
  const ctx = audioEngine.getContext();
  const t0 = ctx.currentTime + 0.05;
  const queue = [...notes].sort((a, b) => a.at - b.at);
  let next = 0;
  const book = () => {
    const horizon = ctx.currentTime + AHEAD_S;
    while (next < queue.length && t0 + queue[next].at <= horizon) {
      const n = queue[next++];
      voice.adapter.noteOn(n.note, n.velocity, t0 + n.at);
      voice.adapter.noteOff(n.note, t0 + n.at + n.length);
    }
  };
  book();
  loop = setInterval(book, TICK_MS);
  const end = Math.max(...queue.map((n) => n.at + n.length));
  ending = setTimeout(
    () => {
      if (!stale()) stopPreview();
    },
    (t0 - ctx.currentTime + end) * 1000 + 200,
  );
}
