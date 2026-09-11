import {
  encodeMidiEvents,
  type CloudProjectDetail,
  type MidiClipColumnar,
} from '@/daw/persistence/SessionSerializer';
import type { InstrumentType, TrackType } from '@/daw/store/tracksSlice';

// ── Demo Projects ─────────────────────────────────────────────────────────
//
// Curated, fully client-side starter songs shown on the Studio Dashboard. Each
// is a real project bundle (same shape `studioProjectsApi.get` returns) so it
// hydrates through `deserializeCloudProject`. Opening one loads it as an
// EDITABLE COPY: the boot path nulls the projectId, so the first Save writes a
// brand-new cloud project and the demo original is never touched.
//
// Kept MIDI-only on purpose — audio-clip demos would need bundled asset bytes.

const PPQ = 480; // ticks per quarter note
const BAR = PPQ * 4; // 4/4 bar = 1920 ticks

interface DemoNote {
  note: number; // MIDI note number (60 = middle C)
  start: number; // start tick
  dur: number; // duration in ticks
  vel?: number; // velocity 0–127
}

let clipSeq = 0;
function midiClip(name: string, notes: DemoNote[]): MidiClipColumnar {
  clipSeq += 1;
  return {
    id: `demo-clip-${clipSeq}`,
    name,
    startTick: 0,
    events: encodeMidiEvents(
      notes.map((n) => ({
        note: n.note,
        velocity: n.vel ?? 100,
        startTick: n.start,
        durationTicks: n.dur,
        channel: 0,
      })),
    ),
  };
}

/** One whole-bar chord: every note sustains for the full bar at `barIndex`. */
function chordBar(barIndex: number, notes: number[], vel = 96): DemoNote[] {
  const start = barIndex * BAR;
  return notes.map((note) => ({ note, start, dur: BAR, vel }));
}

/** One root note per bar (bass), sustained for the bar. */
function bassLine(roots: number[], vel = 104): DemoNote[] {
  return roots.map((note, i) => ({ note, start: i * BAR, dur: BAR, vel }));
}

let trackSeq = 0;
function demoTrack(params: {
  name: string;
  type: TrackType;
  instrument: InstrumentType;
  color: string;
  clips: MidiClipColumnar[];
  volume?: number;
  settings?: CloudProjectDetail['tracks'][number]['settings'];
}): CloudProjectDetail['tracks'][number] {
  const ordinal = trackSeq;
  trackSeq += 1;
  return {
    id: `demo-track-${ordinal}`,
    ordinal,
    name: params.name,
    type: params.type,
    instrument: params.instrument,
    color: params.color,
    mute: false,
    solo: false,
    volume: params.volume ?? 0.8,
    pan: 0,
    activeEffects: [],
    midiClips: params.clips,
    audioClips: [],
    settings: params.settings,
  };
}

function demoBundle(params: {
  id: string;
  name: string;
  bpm: number;
  genre: string;
  /** Key center as a pitch class (C = 0). Opening the demo derives chord
   *  regions in this key, which is what the Insight panel analyses. */
  rootNote: number;
  tracks: CloudProjectDetail['tracks'];
}): CloudProjectDetail {
  const epoch = new Date(0);
  return {
    id: params.id,
    name: params.name,
    composerName: 'Music Atlas',
    bpm: params.bpm,
    prism: {
      rootNote: params.rootNote,
      rhythmName: 'Quarters',
      genre: params.genre,
      swing: 0,
    },
    createdAt: epoch,
    updatedAt: epoch,
    tracks: params.tracks,
  };
}

const RHODES = '#43aa8b';
const BASS = '#3b82f6';
const LEAD = '#8b5cf6';
const PIANO = '#f9c74f';

/** GM program 33, Electric Bass (finger) — a real bass guitar through the
 *  'soundfont' instrument (see gmPrograms.ts); 'oracle-synth' is a synth. */
const ELECTRIC_BASS_FINGER = 33;

export interface DemoProject {
  id: string;
  label: string;
  description: string;
  accent: string;
  bundle: CloudProjectDetail;
  /** Grooves-library id (groovesLibrary.ts) added as a Drums track when the
   *  demo opens, trimmed to the demo's length — see applyDemoDrums.ts. */
  drumGrooveId?: string;
  /** Oracle Synth factory preset name (factoryPresets.ts) per track name,
   *  applied as that track's patch when the demo opens — see
   *  demoSynthPresets.ts. */
  synthPresets?: Record<string, string>;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    id: 'demo-sunset-keys',
    label: 'Sunset Keys',
    description:
      'Warm neo-soul Rhodes, bass & drums — a 4-bar loop to build on.',
    accent: RHODES,
    drumGrooveId: 'groove-neosoul-1',
    bundle: demoBundle({
      id: 'demo-sunset-keys',
      name: 'Sunset Keys',
      bpm: 85,
      genre: 'R&B',
      rootNote: 0, // C major
      tracks: [
        demoTrack({
          name: 'Rhodes',
          type: 'midi',
          instrument: 'electric-piano',
          color: RHODES,
          clips: [
            midiClip('Chords', [
              ...chordBar(0, [53, 57, 60, 64]), // Fmaj7
              ...chordBar(1, [52, 55, 59, 62]), // Em7
              ...chordBar(2, [50, 53, 57, 60]), // Dm7
              ...chordBar(3, [48, 52, 55, 59]), // Cmaj7
            ]),
          ],
        }),
        demoTrack({
          name: 'Bass',
          type: 'midi',
          instrument: 'soundfont',
          settings: { gmProgram: ELECTRIC_BASS_FINGER },
          color: BASS,
          clips: [midiClip('Bass', bassLine([41, 40, 38, 36]))], // F E D C
        }),
      ],
    }),
  },
  {
    id: 'demo-midnight-groove',
    label: 'Midnight Groove',
    description: 'A smooth 2–5–1–6 R&B progression with a synth hook & drums.',
    accent: LEAD,
    drumGrooveId: 'groove-hiphop-1',
    synthPresets: { Lead: 'DRIFT' },
    bundle: demoBundle({
      id: 'demo-midnight-groove',
      name: 'Midnight Groove',
      bpm: 92,
      genre: 'R&B',
      rootNote: 0, // C major
      tracks: [
        demoTrack({
          name: 'Keys',
          type: 'midi',
          instrument: 'electric-piano',
          color: RHODES,
          clips: [
            // Voice-led upper-structure voicings — the bass carries the roots.
            midiClip('Chords', [
              ...chordBar(0, [53, 57, 60, 64]), // Dm7: F3 A3 C4 E4
              ...chordBar(1, [53, 57, 59, 64]), // G7: F3 A3 B3 E4
              ...chordBar(2, [52, 55, 59, 62]), // Cmaj7: E3 G3 B3 D4
              ...chordBar(3, [52, 55, 57, 60]), // Am7: E3 G3 A3 C4
            ]),
          ],
        }),
        demoTrack({
          name: 'Bass',
          type: 'midi',
          instrument: 'soundfont',
          settings: { gmProgram: ELECTRIC_BASS_FINGER },
          color: BASS,
          clips: [midiClip('Bass', bassLine([38, 31, 36, 33]))], // D G C A
        }),
        demoTrack({
          name: 'Lead',
          type: 'midi',
          instrument: 'oracle-synth',
          color: LEAD,
          volume: 0.7,
          clips: [
            midiClip('Hook', [
              { note: 69, start: 0, dur: 240 }, // A4
              { note: 72, start: 240, dur: 240 }, // C5
              { note: 74, start: 480, dur: 480 }, // D5
              { note: 71, start: 1920, dur: 240 }, // B4
              { note: 74, start: 2160, dur: 240 }, // D5
              { note: 76, start: 2400, dur: 480 }, // E5
              { note: 72, start: 3840, dur: 960 }, // C5
              { note: 71, start: 5760, dur: 960 }, // B4
            ]),
          ],
        }),
      ],
    }),
  },
  {
    id: 'demo-first-light',
    label: 'First Light',
    description:
      'A bright indie-pop 1–5–6–4 piano & drums bed, ready for vocals.',
    accent: PIANO,
    drumGrooveId: 'groove-rock-2',
    bundle: demoBundle({
      id: 'demo-first-light',
      name: 'First Light',
      bpm: 110,
      genre: 'Indie',
      rootNote: 0, // C major
      tracks: [
        demoTrack({
          name: 'Piano',
          type: 'midi',
          instrument: 'piano-sampler',
          color: PIANO,
          clips: [
            // Open pop voicings: root on the bottom, the 3rd lifted an octave
            // over the 5th (1–5–8–10) instead of sitting muddy down low.
            midiClip('Chords', [
              ...chordBar(0, [48, 55, 60, 64]), // C
              ...chordBar(1, [43, 50, 55, 59]), // G
              ...chordBar(2, [45, 52, 57, 60]), // Am
              ...chordBar(3, [41, 48, 53, 57]), // F
            ]),
          ],
        }),
        demoTrack({
          name: 'Bass',
          type: 'midi',
          instrument: 'soundfont',
          settings: { gmProgram: ELECTRIC_BASS_FINGER },
          color: BASS,
          clips: [midiClip('Bass', bassLine([36, 31, 33, 29]))], // C G A F
        }),
      ],
    }),
  },
];

export function getDemoProject(id: string): DemoProject | undefined {
  return DEMO_PROJECTS.find((d) => d.id === id);
}
