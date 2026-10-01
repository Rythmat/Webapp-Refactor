import {
  CHORD_RHYTHMS,
  generateChordMidi,
  getScaleSpellings,
  InstrumentChannel,
  StrumMode,
  VelocityTilt,
} from '@prism/engine';
import { activityPayoff } from '@/components/Games/activityPayoff';
import type { HistoricalEvent } from '@/components/atlas/types';
import { isnt_she_lovely } from '@/curriculum/data/songs/isnt_she_lovely';
import type { Song } from '@/curriculum/types/songLibrary';
import { buildChordInsights } from '@/daw/components/Library/buildChordInsights';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  demoChord,
  diatonicTriads,
  keyCenterColor,
  parallelModes,
  songDemoChart,
} from '../../../music';
import { buildSong } from '../studio/studioSong';

/**
 * Everything the "Connected" demo shows, from the app's real data and engines:
 * one song (Isn't She Lovely) through its chart, its story on the Globe, its
 * loop in the Studio's Insight panel and the lesson for its key. Imported file
 * by file — never the song store or the Atlas event bundle.
 */

export const SONG = isnt_she_lovely;

/** E major: the key center the whole demo is colored from. */
export const KEY_PC = 4;
export const KEY_ROOT = isnt_she_lovely.keyRoot;
export const KEY_COLOR = keyCenterColor(KEY_PC);

/** The song trimmed to its loop: the Verse's first eight bars, two rows of four. */
export const SONG_DEMO: Song = {
  ...isnt_she_lovely,
  sections: isnt_she_lovely.sections.slice(0, 1).map((s) => ({
    ...s,
    measuresPerRow: 4,
    bars: s.bars.slice(0, 8),
  })),
};

/** The chart the Song surface draws (one section, eight bars). */
export const CHART = songDemoChart(SONG_DEMO)[0];

/**
 * The loop as Prism chord tokens (degrees in E major): vi7 – II7 – V7sus – I,
 * C♯m7 F♯7 B7sus E. F♯7 is the dominant of B, not a chord of E.
 */
export const LOOP_TOKENS = [
  '6 minor7',
  '2 dominant7',
  '5 dominant7sus4',
  '1 major',
] as const;

export interface LoopChord {
  token: string;
  /** As the song's chart spells it: "C♯min7", "F♯7", "B7sus", "E". */
  name: string;
  /** As the Studio's chord ruler labels it: "C♯ min7". */
  label: string;
  midis: number[];
  /** Its Prism color: E's for the chords of E, B's for F♯7. */
  color: string;
}

export const LOOP: LoopChord[] = LOOP_TOKENS.map((token, i) => {
  const chord = demoChord(token, KEY_ROOT);
  return {
    token,
    name: CHART.bars[i][0].name,
    label: chord.label,
    midis: chord.midis,
    color: chord.color,
  };
});

/** The loop's one chord from outside the key. */
export const BORROWED = 1;

/**
 * The loop as the Studio writes it: the chord ruler's regions (the Studio
 * demo's own `buildSong`), and the piano roll's MIDI from the same engine
 * call with the "Half Notes" rhythm — each chord struck twice in its bar —
 * every note in its chord's Prism color.
 */
export const LOOP_SONG = {
  regions: buildSong({
    clip: [...LOOP_TOKENS],
    keyRoot: KEY_ROOT,
    style: 'Pop',
  }).regions,
  chordNotes: generateChordMidi({
    chordSeq: LOOP.map((c) => c.midis),
    stringSeq: [...LOOP_TOKENS],
    rhythmPattern: CHORD_RHYTHMS['Half Notes'],
    swing: 0,
    strum: StrumMode.Synchronized,
    strumAmount: 0,
    tilt: VelocityTilt.Balanced,
    tiltAmount: 0,
    channel: InstrumentChannel.Chords,
  }).events,
};

/**
 * The Insight panel's chord cards for the loop (the Studio's own engine, with
 * the session key E Ionian). Chords of E carry the "Song's key" lesson link;
 * F♯7's parent scale is B Ionian.
 */
export const INSIGHT = buildChordInsights(
  [...LOOP_TOKENS],
  KEY_PC,
  'ionian',
  new Map(),
);

/** E Ionian — the song's key — as the lesson shows it. */
const ionian = parallelModes(KEY_PC).find((m) => m.mode === 'ionian')!;
const spellings = getScaleSpellings(KEY_PC, 'ionian');
export const LESSON = {
  name: `${displayAccidentals(ionian.parent.name)} Ionian`,
  color: ionian.parent.color,
  /** E F♯ G♯ A B C♯ D♯ E, tonic to octave. */
  notes: ionian.midis.map((midi, i) => ({
    midi,
    name: displayAccidentals(spellings.get(midi % 12) ?? ''),
    degree: i === 7 ? 1 : i + 1,
  })),
  /** E's seven chords; the loop uses vi, V and I of them. */
  chords: diatonicTriads(KEY_PC).map((c) => ({
    ...c,
    inLoop: ['vi', 'V', 'I'].includes(c.roman),
  })),
};

/** The lesson's closing lines, as the app writes them for a song's key. */
export const PAYOFF = activityPayoff({
  activityKey: 'scale',
  modeSlug: 'ionian',
  modeTitle: 'Ionian',
  rootKey: displayAccidentals(ionian.parent.name),
  steps: ionian.intervals,
  origin: { song: isnt_she_lovely.title },
});

export const BACK_LABEL = `Back to ${isnt_she_lovely.title}`;

type EventCopy = Pick<
  HistoricalEvent,
  'id' | 'year' | 'location' | 'genre' | 'title'
>;

/**
 * The song's own Globe event (what "Open in Globe" opens), copied from the
 * Atlas data with its real id (a test keeps them in step).
 */
export const SONG_EVENT: EventCopy & { description: string } = {
  id: 'song-isnt_she_lovely',
  year: 1976,
  location: { lat: 42.33, lng: -83.05, city: 'Detroit', country: 'US' },
  genre: ['Funk', 'Pop'],
  title: "Isn't She Lovely — Stevie Wonder",
  description: isnt_she_lovely.historicalDescription ?? '',
};

/** The events the Globe links in as its "Influenced by" (with their arcs). */
export const INFLUENCES: EventCopy[] = [
  {
    id: 'evt-funk-detroit-1972-stevie-wonder-superstition',
    year: 1972,
    location: { lat: 42.3314, lng: -83.0458, city: 'Detroit', country: 'US' },
    genre: ['Funk', 'Soul', 'R&B'],
    title: 'Stevie Wonder releases "Superstition"',
  },
  {
    id: 'evt-jazz-herbie-hancock-headhunters-la-1973',
    year: 1973,
    location: {
      lat: 34.0522,
      lng: -118.2437,
      city: 'Los Angeles',
      country: 'US',
    },
    genre: ['Jazz', 'Jazz Funk', 'Funk'],
    title: "Herbie Hancock releases 'Head Hunters' — jazz meets funk",
  },
];

export const DETROIT: [number, number] = [
  SONG_EVENT.location.lat,
  SONG_EVENT.location.lng,
];

/** Where each flight to Detroit starts: out over the Atlantic. */
export const FLIGHT_FROM: [number, number] = [24, -40];
