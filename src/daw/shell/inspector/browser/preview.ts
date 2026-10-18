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
 * It stops on ■, another ▶, Play or Record, an add, the panel closing, and
 * a new session. (Escape keeps its editor meaning, Stop.) Instruments are kept for the last three
 * sounds and let go when the panel closes.
 */

import { ALL_MODES, type MidiNoteEvent } from '@prism/engine';
import { audioEngine } from '@/daw/audio/AudioEngine';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';
import { createInstrument } from '@/daw/instruments/instrumentFactory';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { createSoundInstrument } from '@/daw/instruments/soundString';
import { loadLiveGroove } from '@/curriculum/engine/drumGrooves/registry';
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
/** Loads in flight, by voice key: two rows of one sound share one load. */
const loading = new Map<string, Promise<Voice | null>>();
let token = 0;
/** Bumped when the kept voices are let go: a load finishing after it is too. */
let release = 0;
let loop: ReturnType<typeof setInterval> | null = null;
let ending: ReturnType<typeof setTimeout> | null = null;
let sounding: { voice: Voice; held: Map<number, number> } | null = null;

/** A short fade on a stop, so drums and long tails go quiet at once. */
const STOP_FADE_S = 0.02;

const setState = (itemId: string, status: 'loading' | 'playing') =>
  useBrowserStore.getState().setPreview({ itemId, status });

/** Stops the preview playing, if any. */
export function stopPreview(): void {
  token++;
  if (loop) clearInterval(loop);
  if (ending) clearTimeout(ending);
  loop = null;
  ending = null;
  if (sounding) {
    const { voice, held } = sounding;
    const ctx = audioEngine.getContext();
    // Every note started or booked lets go now (a sampler forgets a note
    // once its release is booked, so allNotesOff alone misses some), and
    // the voice's own level fades out under what still rings (a drum's
    // one-shots ignore allNotesOff).
    for (const note of held.keys())
      voice.adapter.noteOff(note, ctx.currentTime);
    voice.adapter.allNotesOff();
    voice.gain.gain.cancelScheduledValues(ctx.currentTime);
    voice.gain.gain.setTargetAtTime(0, ctx.currentTime, STOP_FADE_S);
  }
  sounding = null;
  if (useBrowserStore.getState().preview) {
    useBrowserStore.getState().setPreview(null);
  }
}

/** Stops and lets every kept instrument go (the panel closed). */
export function releasePreviewVoices(): void {
  stopPreview();
  release++;
  for (const voice of voices.values()) disposeVoice(voice);
  voices.clear();
  loading.clear();
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

function voiceFor(item: BrowserItem, bpm: number): Promise<Voice | null> {
  const key = voiceKey(item);
  const kept = voices.get(key);
  if (kept) {
    // Most recent last.
    voices.delete(key);
    voices.set(key, kept);
    return Promise.resolve(kept);
  }
  const inFlight = loading.get(key);
  if (inFlight) return inFlight;
  const load = loadVoice(item, bpm, key).finally(() => {
    if (loading.get(key) === load) loading.delete(key);
  });
  loading.set(key, load);
  return load;
}

async function loadVoice(
  item: BrowserItem,
  bpm: number,
  key: string,
): Promise<Voice | null> {
  const releaseAtStart = release;
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
    if (!data || !engine) {
      // Not the patch the row names: kept, it would play the default.
      disposeVoice({ adapter, gain });
      return null;
    }
    const state = synthTrackStateFromPreset(data, bpm);
    applySynthStateToEngine(engine, state);
    // A SERUM patch's wavetables load on first use: wait for them, or the
    // first notes play the stand-in waveform.
    await engine
      .ensureWavetables(state.oscillators.map((o) => o.wavetable))
      .catch(() => {});
  }
  const voice = { adapter, gain };
  if (release !== releaseAtStart) {
    // The panel closed (or a session opened) while this loaded.
    disposeVoice(voice);
    return null;
  }
  voices.set(key, voice);
  for (const [oldKey, old] of voices) {
    if (voices.size <= KEPT_VOICES) break;
    // Never the voice sounding now.
    if (old === sounding?.voice || oldKey === key) continue;
    voices.delete(oldKey);
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
      // At the designed groove's tempo, which is what plays (the row may
      // have been listed before it loaded).
      const [events, designed] = await Promise.all([
        loadGrooveEvents(item.grooveId),
        loadLiveGroove(item.grooveId),
      ]);
      return events
        ? fromEvents(events, designed?.tempo ?? item.bpm ?? 100)
        : [];
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
  let voice: Voice | null;
  let notes: PreviewNote[];
  try {
    if (!(await audioReady()) || stale()) {
      if (!stale()) stopPreview();
      return;
    }
    [voice, notes] = await Promise.all([
      voiceFor(item, bpm),
      notesFor(item, song),
    ]);
  } catch (err) {
    console.warn('[library] preview did not load', err);
    if (!stale()) stopPreview();
    return;
  }
  if (stale()) return;
  if (!voice || notes.length === 0) {
    stopPreview();
    return;
  }
  setState(item.id, 'playing');
  const ctx = audioEngine.getContext();
  const t0 = ctx.currentTime + 0.05;
  voice.gain.gain.cancelScheduledValues(ctx.currentTime);
  voice.gain.gain.setValueAtTime(PREVIEW_GAIN, ctx.currentTime);
  // Each note's start and end are booked as each comes within reach, as the
  // song's MIDI scheduler books them: an instrument may act on a release at
  // once, whatever time it names (an Oracle voice, an arpeggio).
  type Booking = { at: number; on: boolean; note: PreviewNote };
  const queue: Booking[] = notes
    .flatMap((n) => [
      { at: n.at, on: true, note: n },
      { at: n.at + n.length, on: false, note: n },
    ])
    .sort((a, b) => a.at - b.at || Number(a.on) - Number(b.on));
  // Notes started and not yet released, by pitch: how many.
  const held = new Map<number, number>();
  sounding = { voice, held };
  let next = 0;
  const book = () => {
    const horizon = ctx.currentTime + AHEAD_S;
    while (next < queue.length && t0 + queue[next].at <= horizon) {
      const { at, on, note } = queue[next++];
      if (on) {
        voice.adapter.noteOn(note.note, note.velocity, t0 + at);
        held.set(note.note, (held.get(note.note) ?? 0) + 1);
      } else {
        voice.adapter.noteOff(note.note, t0 + at);
        const left = (held.get(note.note) ?? 1) - 1;
        if (left > 0) held.set(note.note, left);
        else held.delete(note.note);
      }
    }
  };
  book();
  loop = setInterval(book, TICK_MS);
  const end = Math.max(...notes.map((n) => n.at + n.length));
  ending = setTimeout(
    () => {
      if (!stale()) stopPreview();
    },
    (t0 - ctx.currentTime + end) * 1000 + 200,
  );
}
