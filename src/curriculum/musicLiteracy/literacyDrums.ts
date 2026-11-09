// ── Music Literacy's drums ─────────────────────────────────────────────────
// The play-along groove's kit: the same DrumMachineEngine, kits and 1.38
// bridge the genre lessons' backing (useBackingTrack) and the console's
// Drum Grooves designer (useGroovePlayer) play through, so a groove sounds
// here as it was balanced there. literacyRun.ts strikes it from the run's
// Tone.Part at transport times.
//
// Owned at module level, as every Learn sound is: a Tone node built in
// useMemo and disposed in an effect cleanup ends up disposed for good under
// StrictMode (learn/audio/metronomeClick.ts tells that story). The engine is
// built on first use, after the audio context is running, and kept.
//
// Its level is the lesson volume times the drums' own (Settings → Drums),
// and follows both as they move.

import * as Tone from 'tone';
import { ensureToneUsesSharedContext } from '@/audio/core/toneBridge';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import { DRUM_KIT_CONFIGS } from '@/daw/instruments/drumKits';
import {
  getDrumGrooveSettings,
  subscribeDrumGrooveSettings,
} from '@/learn/audio/drumGrooveSettingsStore';
import {
  getLessonVolume,
  subscribeLessonVolume,
} from '@/learn/audio/lessonVolumeStore';

/** The lessons run the drum engine through a 1.38 bridge (useBackingTrack). */
const LESSON_DRUM_GAIN = 1.38;

const FALLBACK_KIT = 'natural';

let bridge: Tone.Gain | null = null;
let engine: DrumMachineEngine | null = null;
let building: Promise<DrumMachineEngine> | null = null;

const level = () =>
  LESSON_DRUM_GAIN * getLessonVolume() * getDrumGrooveSettings().volume;

const knownKit = (kit: string) =>
  DRUM_KIT_CONFIGS.some((config) => config.id === kit) ? kit : FALLBACK_KIT;

function build(kit: string): Promise<DrumMachineEngine> {
  building ??= (async () => {
    // Bind to the shared context first, so the drums land on the same
    // destination as the piano and the click.
    ensureToneUsesSharedContext();
    bridge ??= new Tone.Gain(level()).toDestination();
    const drums = new DrumMachineEngine(kit);
    await drums.init(
      Tone.getContext().rawContext as AudioContext,
      bridge.input as unknown as AudioNode,
    );
    engine = drums;
    return drums;
  })().catch((error: unknown) => {
    building = null;
    throw error;
  });
  return building;
}

/** Ready the drums on `kit` (an unknown kit plays on Natural). */
export async function loadDrumKit(kit: string): Promise<void> {
  const id = knownKit(kit);
  const drums = await build(id);
  await drums.setKit(id);
}

/** One hit at a transport callback's `time`; silent until a kit is ready. */
export function strikeDrum(note: number, velocity: number, time: number): void {
  if (Tone.getContext().state !== 'running') return;
  engine?.noteOn(note, velocity, time);
}

const follow = () => bridge?.gain.rampTo(level(), 0.05);
subscribeLessonVolume(follow);
subscribeDrumGrooveSettings(follow);
