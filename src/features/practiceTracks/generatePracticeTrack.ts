import {
  CHORDS,
  DEGREES,
  MODES,
  getChordColor,
  noteNameLetter,
  abbreviateSequence,
} from '@prism/engine';
import { getGCMEntry } from '@/curriculum/data/gcmHelpers';
import {
  generateCurriculumMelody,
  type MidiNoteEvent,
} from '@/curriculum/engine/melodyPipeline';
import { chordRegionsToMidiClip } from '@/curriculum/songLibrary/exportToStudio';
import type {
  CurriculumLevelId,
  GenreCurriculumEntry,
} from '@/curriculum/types/curriculum';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { importMidiFile } from '@/daw/midi/MidiFileIO';
import { nextChordId, type ChordRegion } from '@/daw/store/prismSlice';
import type { MidiClip } from '@/daw/store/tracksSlice';

/**
 * The 7 diatonic modes this generator supports. Non-diatonic mode families
 * (harmonic minor, melodic minor, etc.) don't get a Practice Track entry
 * point yet — see the Theory Module Simplification plan.
 */
export type DiatonicMode =
  | 'lydian'
  | 'ionian'
  | 'mixolydian'
  | 'dorian'
  | 'aeolian'
  | 'phrygian'
  | 'locrian';

export type PracticeOpenTrack = 'melody' | 'chords';

/** Difficulty tier — the student picks one on the Practice Track hand-off screen. */
export type PracticeLevel = 1 | 2 | 3;

export interface PracticeTrackResult {
  rootNote: number;
  mode: DiatonicMode;
  bpm: number;
  openTrack: PracticeOpenTrack;
  chordRegions: ChordRegion[];
  /** Only populated when openTrack === 'melody' (chords are generated). */
  chordsClip: MidiClip | null;
  bassClip: MidiClip;
  beatClip: MidiClip;
  /** Only populated when openTrack === 'chords' (melody is generated). */
  melodyClip: MidiClip | null;
}

// ── Constants ───────────────────────────────────────────────────────────

const PPQ = 480;
const TICKS_PER_BAR = 4 * PPQ; // 1920, 4/4 time
const QUARTER_NOTE_TICKS = PPQ;
const DOTTED_QUARTER_TICKS = PPQ + PPQ / 2; // 720
const EIGHTH_NOTE_TICKS = PPQ / 2; // 240
/** One dotted-quarter + eighth cell = 960 ticks, i.e. half a 4/4 bar. */
const BASS_CELL_TICKS = DOTTED_QUARTER_TICKS + EIGHTH_NOTE_TICKS;
const BPM = 96;

/** Chord quality names used below — all present in the shared `CHORDS` table. */
type ChordQuality =
  | 'major'
  | 'major7'
  | 'minor'
  | 'minor7'
  | 'dominant7'
  | 'minor7b5'
  | 'sus4';

/**
 * One chord in a practice-track progression. Degrees are 1-7, always relative
 * to the *parent major (Ionian) scale* — the standard modal-harmony
 * convention (e.g. Dorian is 1-2-b3-4-5-6-b7, so Dorian's "bVII" chord is
 * `{ degree: 7, accidental: -1 }`). This is independent of which mode the
 * progression belongs to; every chord below happens to land on that mode's
 * own natural diatonic scale degree, but is authored directly against the
 * parent-major numbering rather than looked up from TRIADS/TETRADS.
 */
interface ChordSpec {
  degree: number;
  accidental: -1 | 0 | 1;
  quality: ChordQuality;
  /** Slash chords only: bass note plays this degree instead of the chord root. */
  bassDegree?: number;
  bassAccidental?: -1 | 0 | 1;
}

const IONIAN_STEPS = [0, 2, 4, 5, 7, 9, 11];

function chord(
  degree: number,
  accidental: -1 | 0 | 1,
  quality: ChordQuality,
  bassDegree?: number,
  bassAccidental: -1 | 0 | 1 = 0,
): ChordSpec {
  return { degree, accidental, quality, bassDegree, bassAccidental };
}

/**
 * Per-mode, per-level chord progressions (Level 1 = simplest). Locrian uses
 * the same progression for all three levels — its tonic triad is
 * diminished/unresolved, so there isn't a simpler/harder variant to offer.
 */
const PROGRESSIONS: Record<DiatonicMode, Record<PracticeLevel, ChordSpec[]>> = {
  ionian: {
    1: [
      chord(1, 0, 'major'),
      chord(4, 0, 'major'),
      chord(5, 0, 'major'),
      chord(1, 0, 'major'),
    ],
    2: [
      chord(4, 0, 'major7'),
      chord(1, 0, 'major'),
      chord(5, 0, 'sus4'),
      chord(6, 0, 'minor'),
    ],
    3: [
      chord(3, 0, 'minor7'),
      chord(2, 0, 'minor7'),
      chord(5, 0, 'dominant7'),
      chord(1, 0, 'major7'),
    ],
  },
  dorian: {
    1: [
      chord(1, 0, 'minor'),
      chord(4, 0, 'major'),
      chord(7, -1, 'major'),
      chord(1, 0, 'minor'),
    ],
    2: [
      chord(1, 0, 'minor7'),
      chord(2, 0, 'minor7'),
      chord(1, 0, 'minor7'),
      chord(2, 0, 'minor7'),
    ],
    3: [
      chord(1, 0, 'minor7'),
      chord(7, -1, 'major7'),
      chord(5, 0, 'minor7'),
      chord(4, 0, 'dominant7'),
    ],
  },
  phrygian: {
    1: [
      chord(1, 0, 'minor'),
      chord(3, -1, 'major'),
      chord(2, -1, 'major'),
      chord(1, 0, 'minor'),
    ],
    2: [
      chord(1, 0, 'minor7'),
      chord(2, -1, 'major7'),
      chord(1, 0, 'minor7'),
      chord(2, -1, 'major7'),
    ],
    3: [
      chord(4, 0, 'minor7'),
      chord(6, -1, 'major7'),
      chord(2, -1, 'major7'),
      chord(1, 0, 'minor'),
    ],
  },
  lydian: {
    1: [
      chord(1, 0, 'major'),
      chord(2, 0, 'major'),
      chord(2, 0, 'major'),
      chord(1, 0, 'major'),
    ],
    2: [
      chord(2, 0, 'major', 1, 0),
      chord(1, 0, 'major7'),
      chord(7, 0, 'minor7'),
      chord(1, 0, 'major7'),
    ],
    3: [
      chord(6, 0, 'minor7'),
      chord(7, 0, 'minor7'),
      chord(1, 0, 'major7'),
      chord(2, 0, 'major'),
    ],
  },
  mixolydian: {
    1: [
      chord(1, 0, 'major'),
      chord(5, 0, 'minor'),
      chord(4, 0, 'major'),
      chord(1, 0, 'major'),
    ],
    2: [
      chord(1, 0, 'major'),
      chord(5, 0, 'minor7'),
      chord(1, 0, 'major'),
      chord(5, 0, 'minor7'),
    ],
    3: [
      chord(7, -1, 'major'),
      chord(4, 0, 'major'),
      chord(1, 0, 'dominant7'),
      chord(1, 0, 'dominant7'),
    ],
  },
  aeolian: {
    1: [
      chord(1, 0, 'minor'),
      chord(6, -1, 'major'),
      chord(7, -1, 'major'),
      chord(1, 0, 'minor'),
    ],
    2: [
      chord(1, 0, 'minor7'),
      chord(6, -1, 'major7'),
      chord(5, 0, 'minor7'),
      chord(6, -1, 'major7'),
    ],
    3: [
      chord(3, -1, 'major7'),
      chord(7, -1, 'major'),
      chord(4, 0, 'minor7'),
      chord(1, 0, 'minor7'),
    ],
  },
  locrian: {
    1: [
      chord(1, 0, 'minor7b5'),
      chord(7, -1, 'minor7'),
      chord(2, -1, 'major7'),
      chord(1, 0, 'minor7b5'),
    ],
    2: [
      chord(1, 0, 'minor7b5'),
      chord(7, -1, 'minor7'),
      chord(2, -1, 'major7'),
      chord(1, 0, 'minor7b5'),
    ],
    3: [
      chord(1, 0, 'minor7b5'),
      chord(7, -1, 'minor7'),
      chord(2, -1, 'major7'),
      chord(1, 0, 'minor7b5'),
    ],
  },
};

/**
 * One fixed, neutral, real groove — same for every mode. This is one of
 * Studio's own curated Grooves-browser entries (`GROOVES` in
 * `daw/data/groovesLibrary.ts`): a plain, straight-ahead rock backbeat
 * (kick/snare/hi-hat, no swing, no genre-extreme character like Trap or
 * Latin), picked over the curriculum's procedural `DRUM_GROOVE_LIBRARY`
 * because that data's `positions` arrays don't encode real per-instrument
 * slot placement (they're always `[0,1,...,hitCount-1]`), so anything built
 * from it — even after fixing the tick math — never sounded musically
 * right. Reusing a real, hand-authored MIDI performance sidesteps that
 * entirely.
 */
const PRACTICE_TRACK_GROOVE_ID = 'groove-rock-2';

// ── Internal shape: one built chord per bar ────────────────────────────

interface BarChord {
  /** Semitone offsets from the tonic (rootMidi) for every chord tone. */
  intervals: number[];
  startTick: number;
  endTick: number;
  /** Long-form degree-qualified label, e.g. "4 dominant7" — for coloring/regions. */
  degreeLabel: string;
  /** Slash chords only: semitone offset from tonic for the bass note. */
  bassOffset?: number;
}

/** Ionian-relative degree+accidental → semitone offset from tonic (0-11). */
function degreeOffset(degree: number, accidental: -1 | 0 | 1): number {
  return (IONIAN_STEPS[degree - 1] + accidental + 12) % 12;
}

/** Build one chord (absolute-from-tonic semitone offsets) per spec in the progression. */
function buildBarChords(mode: DiatonicMode, level: PracticeLevel): BarChord[] {
  const progression = PROGRESSIONS[mode][level];

  return progression.map((spec, barIndex) => {
    const offset = degreeOffset(spec.degree, spec.accidental);
    const intervals = CHORDS[spec.quality].map((iv) => iv + offset);
    const degreeLabel = `${DEGREES[offset]} ${spec.quality}`;
    const bassOffset =
      spec.bassDegree != null
        ? degreeOffset(spec.bassDegree, spec.bassAccidental ?? 0)
        : undefined;

    return {
      intervals,
      startTick: barIndex * TICKS_PER_BAR,
      endTick: (barIndex + 1) * TICKS_PER_BAR,
      degreeLabel,
      bassOffset,
    };
  });
}

// ── Chord regions (harmonic skeleton) ──────────────────────────────────

function buildChordRegions(
  barChords: BarChord[],
  rootMidi: number,
  mode: DiatonicMode,
): ChordRegion[] {
  return barChords.map((bar) => {
    const midis = bar.intervals.map((offset) => rootMidi + offset);
    const chordRootLetter = noteNameLetter(rootMidi + bar.intervals[0]);
    const quality = bar.degreeLabel.slice(bar.degreeLabel.indexOf(' ') + 1);
    // getChordColor expects `mode` explicitly — omitting it silently defaults
    // to Ionian coloring (a known bug elsewhere in dawBridge.ts); don't repeat that.
    const color = getChordColor(bar.degreeLabel, rootMidi, mode);
    // Slash chords (e.g. Lydian's "2/1"): append the bass degree so the
    // label reads correctly in the Chords lane.
    const slashSuffix =
      bar.bassOffset != null && bar.bassOffset !== bar.intervals[0] % 12
        ? `/${DEGREES[bar.bassOffset]}`
        : '';

    return {
      id: nextChordId(),
      startTick: bar.startTick,
      endTick: bar.endTick,
      name: abbreviateSequence(bar.degreeLabel) + slashSuffix,
      noteName:
        abbreviateSequence(`${chordRootLetter} ${quality}`) + slashSuffix,
      color,
      degreeKey: bar.degreeLabel,
      midis,
    };
  });
}

// ── Bass line (always generated) ───────────────────────────────────────

function buildBassClip(barChords: BarChord[], rootMidi: number): MidiClip {
  const bassRegister = rootMidi - 24; // 2 octaves below the chord root
  const events = barChords.flatMap((bar) => {
    // Root-only bass line: slash chords (e.g. Lydian's "2/1") play the
    // specified bass degree instead of the chord root; every other bar's
    // bass root is the chord root.
    const chordRoot = bassRegister + (bar.bassOffset ?? bar.intervals[0]);
    // Dotted quarter + eighth, repeating — two cells fill each 4/4 bar.
    const cellCount = TICKS_PER_BAR / BASS_CELL_TICKS; // 2

    return Array.from({ length: cellCount }, (_, cell) => {
      const cellStart = bar.startTick + cell * BASS_CELL_TICKS;
      return [
        {
          note: chordRoot,
          velocity: 90,
          startTick: cellStart,
          durationTicks: DOTTED_QUARTER_TICKS,
          channel: 0,
        },
        {
          note: chordRoot,
          velocity: 85,
          startTick: cellStart + DOTTED_QUARTER_TICKS,
          durationTicks: EIGHTH_NOTE_TICKS,
          channel: 0,
        },
      ];
    }).flat();
  });

  const durationTicks = barChords.length * TICKS_PER_BAR;
  return {
    id: crypto.randomUUID(),
    name: 'Bass',
    startTick: 0,
    durationTicks,
    events,
  };
}

// ── Beat/drum track (always generated, mode-agnostic) ──────────────────

/**
 * Fetch + parse the fixed practice-track groove through the exact same
 * pipeline Studio's own Grooves browser uses when a user manually drops a
 * groove onto a Drums track — see `doLoadGroove` in
 * `daw/components/Controls/GroovesBrowser.tsx`: `fetch` the `.mid` file,
 * parse it with `importMidiFile` (`daw/midi/MidiFileIO.ts`), then rescale
 * its ticks from the file's own PPQ to ours (480, matching `OUR_PPQ` in
 * GroovesBrowser).
 *
 * This groove's source file is a real ~8-bar drum performance, not a tight
 * 1-bar loop — so, mirroring GroovesBrowser exactly, the resulting clip is
 * used at its *natural* length with no forced repeat/truncate to
 * `barCount`. The practice track's transport loop range (set from
 * `bassClip.durationTicks` back in `seedStudioFromPracticeTrack.ts`) already
 * caps playback to the progression's first `barCount` bars, which has the
 * same audible effect as a user dropping this same groove on a Drums track
 * and then setting a loop region shorter than the clip: only the opening
 * bars of the performance ever play.
 */
async function buildBeatClip(barCount: number): Promise<MidiClip> {
  const fallbackClip: MidiClip = {
    id: crypto.randomUUID(),
    name: 'Drums',
    startTick: 0,
    durationTicks: barCount * TICKS_PER_BAR,
    events: [],
  };

  const groove = GROOVES.find((g) => g.id === PRACTICE_TRACK_GROOVE_ID);
  if (!groove) return fallbackClip;

  try {
    const resp = await fetch(groove.url);
    if (!resp.ok) return fallbackClip;
    const buf = await resp.arrayBuffer();
    const sequences = importMidiFile(buf);
    if (sequences.length === 0) return fallbackClip;

    const seq = sequences[0];
    const ppq = seq.ticksPerQuarterNote;
    const events = seq.events.map((evt) => ({
      ...evt,
      startTick: Math.round((evt.startTick / ppq) * PPQ),
      durationTicks: Math.round((evt.durationTicks / ppq) * PPQ),
    }));
    const durationTicks = events.reduce(
      (max, e) => Math.max(max, e.startTick + e.durationTicks),
      0,
    );

    return {
      id: crypto.randomUUID(),
      name: 'Drums',
      startTick: 0,
      durationTicks,
      events,
    };
  } catch (err) {
    console.error('Failed to load practice track groove:', err);
    return fallbackClip;
  }
}

// ── Melody (only when openTrack === 'chords') ──────────────────────────

/**
 * **The 2 Bar Melody Phrase Rule.** Every melody generated for a Practice
 * Track is a musical 2-bar phrase, with its rhythmic and intervallic
 * complexity correlating to the exercise's level. The phrase is then tiled
 * across the progression (see `buildMelodyClip`).
 */
const PHRASE_BARS = 2;
const PHRASE_TICKS = PHRASE_BARS * TICKS_PER_BAR;

/** Practice level → the GCM level whose melody rules define its complexity. */
const LEVEL_TO_GCM_LEVEL: Record<PracticeLevel, CurriculumLevelId> = {
  1: 'L1',
  2: 'L2',
  3: 'L3',
};

/**
 * The melody rules for one Practice Track, handed to the curriculum melody
 * engine (`curriculum/engine/melodyPipeline.ts`) — the same pipeline that
 * generates melodies for genre activities, so all the phrase-generation
 * rules (contour library, phrase rhythm library, scale resolution) come
 * from one place.
 *
 * We start from POP's L1/L2/L3 melody params because those already encode
 * the complexity ladder we want: note counts per cell (L1 3 → L2 3-4 → L3
 * 4-5, which is the rhythmic density lever, since phrase rhythms are
 * selected by note count), contour tiers (L1 1-2 → L2 1-3 → L3 2-4, the
 * intervallic lever), and zero points (L1 [0] → L3 [0,2,4,6]).
 *
 * Two Practice-Track overrides on top:
 *  - `scale` becomes the track's own mode, not POP's genre scale, so every
 *    note lands inside the key center and mode the student is practicing.
 *  - `phraseRhythmBars: 1` + `contourConcat: 2` is what enforces the 2 Bar
 *    Melody Phrase Rule. Asking the pipeline for a 2-bar rhythm directly
 *    does NOT work: the rhythm library's 2-bar entries are dense 6-23 note
 *    licks with nothing at our 3-5 note counts, so selection falls back to
 *    a 1-bar rhythm and the pipeline then skips concatenation (it only
 *    concatenates when `bars === 1`) — yielding a 1-bar melody. Requesting
 *    1-bar cells and chaining two of them always spans a full 2 bars.
 */
function practiceMelodyRules(
  mode: DiatonicMode,
  level: PracticeLevel,
): GenreCurriculumEntry {
  const base = getGCMEntry('POP', LEVEL_TO_GCM_LEVEL[level]);

  return {
    ...base,
    melody: {
      ...base.melody,
      scale: { name: mode, intervals: MODES[mode] },
      scaleAlts: undefined,
      phraseRhythmBars: 1,
      contourConcat: PHRASE_BARS,
    },
  };
}

/**
 * Snap `note` to the nearest pitch sharing a pitch class with one of
 * `chordMidis`, searching both directions from the note's own register so
 * the resolution never leaps out of the phrase's range. Ties resolve
 * downward, which reads as the more settled of the two options.
 */
function nearestChordTone(note: number, chordMidis: number[]): number {
  let best = note;
  let bestDistance = Infinity;

  for (const chordMidi of chordMidis) {
    const pitchClass = ((chordMidi % 12) + 12) % 12;
    // Highest pitch <= note carrying this pitch class, and the one above it.
    const below = note - (((note % 12) - pitchClass + 12) % 12);

    for (const candidate of [below, below + 12]) {
      const distance = Math.abs(candidate - note);
      if (
        distance < bestDistance ||
        (distance === bestDistance && candidate < best)
      ) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }

  return best;
}

/**
 * Fallback used only if the melody engine can't produce a phrase (no
 * contour or phrase rhythm matched): arpeggiate root-3rd-5th-3rd as quarter
 * notes per bar, the shape Practice Tracks used before they were wired to
 * the engine.
 */
function buildFallbackMelodyEvents(
  barChords: BarChord[],
  melodyRegister: number,
): MidiClip['events'] {
  return barChords.flatMap((bar) => {
    const [root, third, fifth] = bar.intervals;
    const pattern = [root, third, fifth, third];
    return pattern.map((offset, i) => ({
      note: melodyRegister + offset,
      velocity: 75,
      startTick: bar.startTick + i * QUARTER_NOTE_TICKS,
      durationTicks: QUARTER_NOTE_TICKS,
      channel: 0,
    }));
  });
}

/**
 * Generate the Melody clip: one 2-bar phrase from the curriculum melody
 * engine, repeated to fill the progression, with one Practice-Track
 * override — the very last note is snapped to a chord tone of the
 * progression's final chord, so the line resolves instead of leaving the
 * student hanging on a passing tone.
 */
function buildMelodyClip(
  barChords: BarChord[],
  rootMidi: number,
  mode: DiatonicMode,
  level: PracticeLevel,
): MidiClip {
  const melodyRegister = rootMidi + 12; // one octave above the chord register
  const durationTicks = barChords.length * TICKS_PER_BAR;

  // Practice tracks run on a straight rock groove, so no swing displacement.
  const phrase: MidiNoteEvent[] = generateCurriculumMelody(
    practiceMelodyRules(mode, level),
    melodyRegister,
    0,
  );

  const events: MidiClip['events'] =
    phrase.length === 0
      ? buildFallbackMelodyEvents(barChords, melodyRegister)
      : tilePhrase(phrase, durationTicks);

  resolveFinalNote(events, barChords, rootMidi);

  return {
    id: crypto.randomUUID(),
    name: 'Melody',
    startTick: 0,
    durationTicks,
    events,
  };
}

/** Repeat the 2-bar phrase across the progression, trimming at the end. */
function tilePhrase(
  phrase: MidiNoteEvent[],
  durationTicks: number,
): MidiClip['events'] {
  const events: MidiClip['events'] = [];

  for (let offset = 0; offset < durationTicks; offset += PHRASE_TICKS) {
    for (const note of phrase) {
      const startTick = offset + note.onset;
      if (startTick >= durationTicks) continue;
      events.push({
        note: note.note,
        velocity: 75,
        startTick,
        // Never let the last repeat's tail run past the progression.
        durationTicks: Math.min(note.duration, durationTicks - startTick),
        channel: 0,
      });
    }
  }

  return events;
}

/**
 * Resolution override: retune the melody's final note (in place) to the
 * nearest chord tone of the progression's last chord.
 */
function resolveFinalNote(
  events: MidiClip['events'],
  barChords: BarChord[],
  rootMidi: number,
): void {
  if (events.length === 0) return;

  const finalNote = events.reduce((latest, e) =>
    e.startTick >= latest.startTick ? e : latest,
  );
  const lastChord = barChords[barChords.length - 1];
  const chordMidis = lastChord.intervals.map((offset) => rootMidi + offset);

  finalNote.note = nearestChordTone(finalNote.note, chordMidis);
}

// ── Main entry point ────────────────────────────────────────────────────

/**
 * Generate a Practice Track: a chord progression + bass line + beat, plus
 * either a generated Chords clip or a generated Melody clip (whichever
 * ISN'T `openTrack`, which is left empty for the student to fill in).
 */
export async function generatePracticeTrack(
  mode: DiatonicMode,
  root: number,
  openTrack: PracticeOpenTrack,
  level: PracticeLevel = 1,
): Promise<PracticeTrackResult> {
  const clampedRoot = Math.max(0, Math.min(11, Math.round(root)));
  const rootMidi = 60 + clampedRoot;
  const barChords = buildBarChords(mode, level);
  const barCount = barChords.length;

  const chordRegions = buildChordRegions(barChords, rootMidi, mode);
  const chordsClip =
    openTrack === 'melody' ? chordRegionsToMidiClip(chordRegions) : null;
  const bassClip = buildBassClip(barChords, rootMidi);
  const beatClip = await buildBeatClip(barCount);
  const melodyClip =
    openTrack === 'chords'
      ? buildMelodyClip(barChords, rootMidi, mode, level)
      : null;

  return {
    rootNote: clampedRoot,
    mode,
    bpm: BPM,
    openTrack,
    chordRegions,
    chordsClip,
    bassClip,
    beatClip,
    melodyClip,
  };
}
