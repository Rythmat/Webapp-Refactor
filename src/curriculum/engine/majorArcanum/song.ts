/**
 * A run of Major Arcanum: the notes that fall, phrase by phrase, and the
 * band under them.
 *
 * A Melody run alternates open phrases and home ones (questions and
 * answers) on two motifs, A coming back as a hook does: A A B A, then again.
 * A soft chord pad and a bass play the phrase's chords under it, so every
 * note is heard against its harmony.
 *
 * A Chords run plays a progression a phrase, open and home by turns, each
 * chord struck in one of the owner's comping rhythms (Echo's library, by
 * tier), voiced as the mode asks: root position in Novice and Pro, the
 * nearest inversion (voice leading) in Expert and Maestro. A bass plays the
 * roots under it.
 *
 * Each note knows its phrase: a streak is phrases played without a miss.
 *
 * Pure, no React.
 */

import { BEAT_TICKS } from '../echo/levels';
import { pickOne, type EchoRandom } from '../echo/random';
import { CHORD_RHYTHMS, chordRhythmBars } from '../echo/rhythm';
import {
  buildSpellingMap,
  MIDI_ROOT_TO_KEY,
} from '../genreGeneration/enharmonicEngine';
import {
  chordSymbol,
  chordTones,
  MAJOR_STEPS,
  pickProgression,
  positionSemitones,
  voiceChord,
  type ArcanumChord,
  type PhraseEnding,
} from './harmony';
import {
  keyRootMidi,
  levelBpm,
  MODES,
  type ArcanumLevel,
  type ArcanumMode,
  type ArcanumPart,
} from './levels';
import { chooseMotif, melodyPhrase, type Motif } from './melody';

/**
 * Which motif opens each phrase, and which one its contrast bar borrows: a
 * song's form, A A B A, then C C B A, the hook coming home at the end.
 */
const MOTIF_ORDER: readonly (readonly ['A' | 'B' | 'C', 'A' | 'B' | 'C'])[] = [
  ['A', 'B'],
  ['A', 'B'],
  ['B', 'A'],
  ['A', 'C'],
  ['C', 'B'],
  ['C', 'A'],
  ['B', 'C'],
  ['A', 'B'],
];

/** One bar of drums before the music. */
export const LEAD_IN_BEATS = 4;

export interface ArcanumNote {
  /** Beats from the run's start (the lead-in bar's downbeat). */
  beat: number;
  duration: number;
  midi: number;
  isChord: boolean;
  phrase: number;
}

export interface ArcanumPhrase {
  index: number;
  startBeat: number;
  endBeat: number;
  ending: PhraseEnding;
}

export interface BackingNote {
  beat: number;
  duration: number;
  midi: number;
  voice: 'pad' | 'bass';
}

/** A chord's symbol, from the downbeat it's played on. */
export interface ChordMark {
  beat: number;
  symbol: string;
}

export interface ArcanumRun {
  mode: ArcanumMode;
  level: ArcanumLevel;
  keyPc: number;
  part: ArcanumPart;
  bpm: number;
  /** The key's 1 as the run plays it. */
  rootMidi: number;
  notes: ArcanumNote[];
  phrases: ArcanumPhrase[];
  backing: BackingNote[];
  chords: ChordMark[];
  totalBeats: number;
  /** The lowest and highest notes that fall. */
  low: number;
  high: number;
}

export interface RunInput {
  mode: ArcanumMode;
  level: ArcanumLevel;
  keyPc: number;
  part: ArcanumPart;
  rng: EchoRandom;
}

/** The key's note names: F♯ in D, B♭ in F, E♯ in F♯. */
function keySpelling(keyPc: number): (midi: number) => string {
  const names = buildSpellingMap(MIDI_ROOT_TO_KEY[((keyPc % 12) + 12) % 12], [
    ...MAJOR_STEPS,
  ]);
  return (midi) => names.get(((midi % 12) + 12) % 12) ?? '';
}

/** How often a chord in a mode with 7ths is a 7th chord (V nearly always). */
const SEVENTH_SHARE: Readonly<Record<ArcanumMode, number>> = {
  novice: 0,
  pro: 0.5,
  expert: 0.5,
  maestro: 0.75,
};

function chordOf(
  degree: number,
  mode: ArcanumMode,
  rng: EchoRandom,
): ArcanumChord {
  const share = SEVENTH_SHARE[mode];
  const seventh =
    share > 0 && (degree === 4 ? rng() < 0.85 : degree !== 6 && rng() < share);
  return { degree, seventh };
}

/** The band under a bar: the chord held soft in the middle, its root low. */
function backingBar(
  chord: ArcanumChord,
  rootMidi: number,
  beat: number,
  withPad: boolean,
): BackingNote[] {
  const out: BackingNote[] = [];
  const bassRoot = rootMidi - 24 + positionSemitones(chord.degree % 7);
  out.push({ beat, duration: 2, midi: bassRoot, voice: 'bass' });
  out.push({ beat: beat + 2, duration: 2, midi: bassRoot, voice: 'bass' });
  if (withPad) {
    for (const tone of chordTones({ ...chord, seventh: false }))
      out.push({
        beat,
        duration: 4,
        midi: rootMidi - 12 + positionSemitones(tone % 7),
        voice: 'pad',
      });
  }
  return out;
}

function melodyRun(input: RunInput): Omit<ArcanumRun, 'low' | 'high'> {
  const { mode, level, keyPc, rng } = input;
  const config = MODES[mode];
  const rootMidi = keyRootMidi(keyPc, mode, 'melody');
  const name = keySpelling(keyPc);
  const bars = config.phraseBars;
  const motifA = chooseMotif(config, mode, level, rng);
  const motifB: Motif = chooseMotif(config, mode, level, rng, motifA);
  const motifC: Motif = chooseMotif(config, mode, level, rng, motifB);
  const motifs = { A: motifA, B: motifB, C: motifC };
  const notes: ArcanumNote[] = [];
  const phrases: ArcanumPhrase[] = [];
  const backing: BackingNote[] = [];
  const chords: ChordMark[] = [];
  let previous: number | null = null;
  let lastProgression: number[] | undefined;

  for (let index = 0; index < config.runPhrases.melody; index++) {
    const ending: PhraseEnding = index % 2 === 0 ? 'open' : 'home';
    const degrees = pickProgression(bars, ending, rng, lastProgression);
    lastProgression = degrees;
    const phraseChords = degrees.map((d) => chordOf(d, mode, rng));
    const startBeat = LEAD_IN_BEATS + index * bars * 4;
    const [lead, other] = MOTIF_ORDER[index % MOTIF_ORDER.length];
    const phrase = melodyPhrase({
      config,
      mode,
      chords: phraseChords,
      ending,
      motif: motifs[lead],
      contrast: motifs[other],
      previous,
      rng,
    });
    for (const n of phrase)
      notes.push({
        beat: startBeat + n.beat,
        duration: n.duration,
        midi: rootMidi + positionSemitones(n.position),
        isChord: false,
        phrase: index,
      });
    previous = phrase[phrase.length - 1]?.position ?? previous;
    phraseChords.forEach((chord, bar) => {
      const beat = startBeat + bar * 4;
      backing.push(...backingBar(chord, rootMidi, beat, true));
      chords.push({
        beat,
        symbol: chordSymbol(chord, (p) =>
          name(rootMidi + positionSemitones(p)),
        ),
      });
    });
    phrases.push({
      index,
      startBeat,
      endBeat: startBeat + bars * 4,
      ending,
    });
  }
  return {
    mode,
    level,
    keyPc,
    part: 'melody',
    bpm: levelBpm(mode, level),
    rootMidi,
    notes,
    phrases,
    backing,
    chords,
    totalBeats: LEAD_IN_BEATS + config.runPhrases.melody * bars * 4,
  };
}

/** The comping rhythms a level strikes its chords in, a bar at a time. */
function compingPool(mode: ArcanumMode, level: ArcanumLevel) {
  const tiers = MODES[mode].rhythmTiers;
  return CHORD_RHYTHMS.filter((r) => tiers.includes(r.tier)).filter((r) => {
    if (mode !== 'novice' || level > 3) return true;
    // Novice's first levels: two strikes a bar at most, on the beats.
    const perBar = r.hits.length / r.bars;
    return perBar <= 2 && r.hits.every((h) => h.onset % BEAT_TICKS === 0);
  });
}

/** The positions a mode's chords may use. */
function chordWindow(mode: ArcanumMode): { low: number; high: number } {
  // On the computer keyboard, Novice's triads stay on the home row (1 to the
  // 11th); Pro's 7th chords reach the row above.
  if (mode === 'novice') return { low: 0, high: 10 };
  return MODES[mode].midiRequired
    ? { low: -3, high: 12 }
    : { low: 0, high: 12 };
}

function chordsRun(input: RunInput): Omit<ArcanumRun, 'low' | 'high'> {
  const { mode, level, keyPc, rng } = input;
  const config = MODES[mode];
  const rootMidi = keyRootMidi(keyPc, mode, 'chords');
  const name = keySpelling(keyPc);
  const pool = compingPool(mode, level);
  const notes: ArcanumNote[] = [];
  const phrases: ArcanumPhrase[] = [];
  const backing: BackingNote[] = [];
  const chords: ChordMark[] = [];
  let voicing: number[] | null = null;
  let lastProgression: number[] | undefined;

  for (let index = 0; index < config.runPhrases.chords; index++) {
    const ending: PhraseEnding = index % 2 === 0 ? 'open' : 'home';
    const degrees = pickProgression(4, ending, rng, lastProgression);
    lastProgression = degrees;
    const startBeat = LEAD_IN_BEATS + index * 16;
    const rhythm = pickOne(rng, pool);
    const strikes = chordRhythmBars(rhythm, 4);
    degrees.forEach((degree, bar) => {
      const chord = chordOf(degree, mode, rng);
      voicing = voiceChord(
        chord,
        voicing,
        {
          window: chordWindow(mode),
          inversions: chord.seventh
            ? config.seventhInversions
            : config.triadInversions,
        },
        rng,
      );
      const beat = startBeat + bar * 4;
      for (const strike of strikes[bar])
        for (const position of voicing)
          notes.push({
            beat: beat + strike.onset / BEAT_TICKS,
            duration: strike.duration / BEAT_TICKS,
            midi: rootMidi + positionSemitones(position),
            isChord: true,
            phrase: index,
          });
      backing.push(...backingBar(chord, rootMidi, beat, false));
      chords.push({
        beat,
        symbol: chordSymbol(chord, (p) =>
          name(rootMidi + positionSemitones(p)),
        ),
      });
    });
    phrases.push({ index, startBeat, endBeat: startBeat + 16, ending });
  }
  return {
    mode,
    level,
    keyPc,
    part: 'chords',
    bpm: levelBpm(mode, level),
    rootMidi,
    notes,
    phrases,
    backing,
    chords,
    totalBeats: LEAD_IN_BEATS + config.runPhrases.chords * 16,
  };
}

/** A run of a part in a key, for a level of a mode. */
export function buildRun(input: RunInput): ArcanumRun {
  const run = input.part === 'melody' ? melodyRun(input) : chordsRun(input);
  const midis = run.notes.map((n) => n.midi);
  return { ...run, low: Math.min(...midis), high: Math.max(...midis) };
}
