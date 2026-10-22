// ── Make Your Song's playback ──────────────────────────────────────────────
// The mini-Studio plays the song as the Studio will: every track on the
// Studio's own instrument for its sound string (daw/instruments/
// soundString.ts `createSoundInstrument`), so the band's drums are the
// style's kit on the DrumMachineEngine, its bass the lesson's voice, a
// guitar layer its sampled guitar, the Melody the Studio's piano and the
// Chords its Rhodes. Taking the song to the Studio changes nothing heard.
//
// One run at a time, on the one Tone.Transport: transport zero is the
// count-in's first beat (if any), then the song's ticks from `from` to
// `to`, every note scheduled from a single Tone.Part in seconds at the
// run's tempo. Count-in clicks are the lessons' click (metronomeClick.ts).
// What draws (the count-in beat, the downbeat, the end) is called through
// Tone.getDraw() when it's heard. The run's clock is a transport clock
// (transportClock.ts), so a take's notes are stamped where they land in
// the music, as Music Literacy stamps them.
//
// Module-level, as every Learn sound is: Tone nodes built in useMemo and
// disposed in an effect's cleanup end up disposed for good under
// StrictMode (learn/audio/metronomeClick.ts tells that story). The
// instruments are made on first use, after the context runs, and kept.

import * as Tone from 'tone';
import { ensureToneUsesSharedContext } from '@/audio/core/toneBridge';
import {
  createTransportClock,
  heardLatencySec,
  TRANSPORT_LEAD_SEC,
} from '@/curriculum/components/transportClock';
import { BAR_TICKS, BEAT_TICKS } from '@/curriculum/engine/echo';
import type { InstrumentAdapter } from '@/daw/instruments/InstrumentAdapter';
import { playClick, resetClickSpacing } from '@/learn/audio/metronomeClick';

/** A note as a clip holds it (the Studio's MidiNoteEvent). */
export interface PlayerNote {
  note: number;
  /** 1–127. */
  velocity: number;
  startTick: number;
  durationTicks: number;
}

/** One track of a run: its notes on its sound, at its level. */
export interface PlayerTrack {
  id: string;
  /** A sound string: 'piano-sampler', 'drum-machine:808'. */
  sound: string;
  /** 0–1. */
  volume: number;
  events: readonly PlayerNote[];
}

export interface PlayRequest {
  tracks: readonly PlayerTrack[];
  bpm: number;
  /** The song's ticks to play: from `from` up to `to`. */
  from: number;
  to: number;
  /** Bars of clicks before `from`. */
  countInBars?: number;
  /** Each count-in beat as it's heard: 1, 2, 3, 4. */
  onCountIn?: (beat: number) => void;
  /** `from`'s downbeat, as it's heard. */
  onStart?: () => void;
  /** `to`, as it's heard: the run is over. */
  onEnd?: () => void;
}

export interface SongPlayer {
  /** Get the sounds ready (each loads once). */
  load(sounds: readonly string[]): Promise<void>;
  /**
   * Start a run (stopping any other). Resolves true once it's under way,
   * false when a stop or another run got there first.
   */
  play(request: PlayRequest): Promise<boolean>;
  stop(): void;
  /** The song tick being heard now; null with nothing playing. */
  heardTick(): number | null;
  /**
   * The song tick a note played now lands on (negative in the count-in);
   * null with nothing playing.
   */
  playedTick(): number | null;
  /** A key the student plays, heard on `sound`. */
  noteOn(sound: string, midi: number, velocity: number): void;
  noteOff(sound: string, midi: number): void;
  /** Ready the sounds the student plays live, ahead of their first key. */
  prepareLive(sounds: readonly string[]): Promise<void>;
}

/** Each track's level, under the Studio's own default fader. */
const TRACK_GAIN = 0.8;

/** If the end never draws (a hidden tab), end the run anyway. */
const WATCHDOG_SPARE_SEC = 1;

/** Shortest note that sounds, in seconds. */
const MIN_NOTE_SEC = 0.03;

interface Voice {
  adapter: InstrumentAdapter;
  gain: Tone.Gain;
}

/** Playback voices by sound; the student's live keys on voices of their own. */
const voices = new Map<string, Promise<Voice | null>>();
const ready = new Map<string, Voice>();
const LIVE = 'live|';

async function makeVoice(sound: string): Promise<Voice | null> {
  ensureToneUsesSharedContext();
  // Loaded on demand: the Studio's instruments are a chunk of their own.
  const { createSoundInstrument, applySynthSound } = await import(
    '@/daw/instruments/soundString'
  );
  const adapter = createSoundInstrument(sound);
  if (!adapter) return null;
  const gain = new Tone.Gain(TRACK_GAIN).toDestination();
  await adapter.init(
    Tone.getContext().rawContext as AudioContext,
    gain.input as unknown as AudioNode,
  );
  applySynthSound(adapter, sound);
  return { adapter, gain };
}

function voiceFor(key: string, sound: string): Promise<Voice | null> {
  let made = voices.get(key);
  if (!made) {
    made = makeVoice(sound)
      .then((voice) => {
        if (voice) ready.set(key, voice);
        return voice;
      })
      .catch((error: unknown) => {
        console.warn(`[Echo] the sound ${sound} did not load`, error);
        voices.delete(key);
        return null;
      });
    voices.set(key, made);
  }
  return made;
}

const clock = createTransportClock();

let part: Tone.Part | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
/** Bumped by every start and stop: an older run never draws. */
let generation = 0;
/** The run under way: where song ticks sit on the transport. */
let running: { offset: number; from: number } | null = null;

function disposePart(): void {
  if (!part) return;
  try {
    part.stop();
  } catch {
    // Disposed below.
  }
  part.dispose();
  part = null;
}

function stop(): void {
  generation += 1;
  running = null;
  if (watchdog !== null) clearTimeout(watchdog);
  watchdog = null;
  disposePart();
  // A stop runs in unmounts: where there's no Web Audio (a test's page),
  // there's nothing to stop.
  try {
    clock.stop();
    const transport = Tone.getTransport();
    transport.cancel();
    transport.position = 0;
  } catch {
    // Nothing was playing.
  }
  for (const [key, voice] of ready)
    if (!key.startsWith(LIVE)) voice.adapter.allNotesOff();
}

interface Scheduled {
  time: number;
  voice: Voice;
  note: number;
  velocity: number;
  length: number;
}

async function play(request: PlayRequest): Promise<boolean> {
  // On the click that asked: the context resumes on a gesture.
  ensureToneUsesSharedContext();
  const starting = Tone.start();
  stop();
  const run = generation;
  await starting.catch(() => {});
  await load(request.tracks.map((t) => t.sound));
  if (run !== generation) return false;

  const { bpm, from, to } = request;
  const transport = Tone.getTransport();
  transport.bpm.value = bpm;
  transport.loop = false;
  resetClickSpacing();
  const spt = 60 / bpm / BEAT_TICKS;
  const countInTicks = (request.countInBars ?? 0) * BAR_TICKS;
  const offset = countInTicks - from;
  const draw = (fn?: () => void) => (time: number) => {
    if (!fn) return;
    Tone.getDraw().schedule(() => {
      if (run === generation) fn();
    }, time + heardLatencySec());
  };

  const events: Scheduled[] = [];
  for (const track of request.tracks) {
    const voice = ready.get(track.sound);
    if (!voice) continue;
    for (const e of track.events) {
      if (e.startTick < from || e.startTick >= to) continue;
      const end = Math.min(e.startTick + e.durationTicks, to);
      events.push({
        time: (e.startTick + offset) * spt,
        voice,
        note: e.note,
        velocity: Math.max(1, Math.round(e.velocity * track.volume)),
        length: Math.max(MIN_NOTE_SEC, (end - e.startTick) * spt * 0.98),
      });
    }
  }
  part = new Tone.Part<Scheduled>((time, e) => {
    e.voice.adapter.noteOn(e.note, e.velocity, time);
    e.voice.adapter.noteOff(e.note, time + e.length);
  }, events);
  part.start(0);

  const beats = countInTicks / BEAT_TICKS;
  for (let beat = 0; beat < beats; beat++) {
    const at = beat * BEAT_TICKS * spt;
    transport.schedule((time) => {
      playClick(beat % 4 === 0, time);
      draw(() => request.onCountIn?.(beat + 1))(time);
    }, at);
  }
  transport.schedule(draw(request.onStart), countInTicks * spt);
  const endAt = (to + offset) * spt;
  transport.schedule(draw(request.onEnd), endAt);

  running = { offset, from };
  clock.start();
  watchdog = setTimeout(
    () => {
      if (run === generation) request.onEnd?.();
    },
    (TRANSPORT_LEAD_SEC + endAt + heardLatencySec() + WATCHDOG_SPARE_SEC) *
      1000,
  );
  await clock.wait();
  return run === generation;
}

async function load(sounds: readonly string[]): Promise<void> {
  await Promise.all([...new Set(sounds)].map((s) => voiceFor(s, s)));
}

/** The transport's ticks as the song's. */
const songTicks = (ticks: number | null) =>
  ticks === null || !running ? null : ticks - running.offset;

/** Live keys held now, by sound: a key let go while loading never starts. */
const held = new Set<string>();

function noteOn(sound: string, midi: number, velocity: number): void {
  ensureToneUsesSharedContext();
  if (Tone.getContext().state !== 'running') void Tone.start();
  const key = `${LIVE}${sound}`;
  held.add(`${key}#${midi}`);
  const voice = ready.get(key);
  if (voice) {
    voice.adapter.noteOn(midi, velocity);
    return;
  }
  // Its first note loads the sound; heard once ready, if still held.
  void voiceFor(key, sound).then((made) => {
    if (made && held.has(`${key}#${midi}`)) made.adapter.noteOn(midi, velocity);
  });
}

function noteOff(sound: string, midi: number): void {
  const key = `${LIVE}${sound}`;
  held.delete(`${key}#${midi}`);
  ready.get(key)?.adapter.noteOff(midi);
}

/** Ready the student's live sounds ahead of their first key. */
async function prepareLive(sounds: readonly string[]): Promise<void> {
  await Promise.all(sounds.map((sound) => voiceFor(`${LIVE}${sound}`, sound)));
}

export const songPlayer: SongPlayer = {
  load,
  play,
  stop,
  heardTick: () => songTicks(clock.playbackTicks()),
  playedTick: () => songTicks(clock.soundingTicks()),
  noteOn,
  noteOff,
  prepareLive,
};
