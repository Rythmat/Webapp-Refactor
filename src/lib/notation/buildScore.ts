import {
  midiToPitchName,
  parseNoteName,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { drumStaffPosition, isFootDrum, type DrumNotehead } from './drumMap';
import { inferKeyFifths, keySignatureAlterations } from './keySignature';
import { makeMeter, splitMetric, splitTriplet, type Meter } from './meter';
import { quantizeStaff } from './quantize';
import { assignStaves } from './staffSplit';
import type {
  Accidental,
  NotationItem,
  NotationKey,
  NotationMeasure,
  NotationNoteInput,
  NotationOptions,
  NotationScore,
  NotationVoice,
  StaffId,
} from './types';

// ── Piano roll → grand staff ───────────────────────────────────────────────
// 1. Spell and place each note on a staff (hand tags win — see staffSplit.ts).
// 2. Quantize each staff per beat (see quantize.ts).
// 3. Chords: notes sharing a start and end. A note held under moving notes
//    goes to a second voice (stems down) rather than being chopped.
// 4. Cut at barlines, fill gaps with rests, split into written values with
//    ties (see meter.ts).
// 5. Accidentals against the key signature and earlier notes in the bar.

const LETTERS = ['c', 'd', 'e', 'f', 'g', 'a', 'b'];
const LETTER_PITCH_CLASS = [0, 2, 4, 5, 7, 9, 11];
const STAVES: StaffId[] = ['treble', 'bass'];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

interface Pitch {
  midi: number;
  slash?: boolean;
  letterIndex: number;
  alteration: number;
  octave: number;
  noteId: string;
  /** Drumset staff only: how the note is drawn and what it is called. */
  notehead?: DrumNotehead;
  articulation?: 'open';
  drumLabel?: string;
}

interface StaffNote {
  start: number;
  end: number;
  pitch: Pitch;
}

interface Chord {
  start: number;
  end: number;
  pitches: Pitch[];
}

function spellPitch(
  note: NotationNoteInput,
  spell: (midi: number) => string,
): Pitch {
  const parse = (name: string | undefined) => {
    const parsed = name ? parseNoteName(name) : null;
    if (!parsed) return null;
    const pc = mod12(
      LETTER_PITCH_CLASS[parsed.letterIndex] + parsed.accidental,
    );
    return pc === mod12(note.midi) ? parsed : null;
  };
  const parsed =
    parse(note.name) ??
    parse(spell(note.midi)) ??
    parseNoteName(midiToPitchName(note.midi))!;
  const { letterIndex, accidental } = parsed;
  // The octave follows the written letter: C♭5 sounds as MIDI 71.
  const octave =
    (note.midi - accidental - LETTER_PITCH_CLASS[letterIndex]) / 12 - 1;
  return {
    midi: note.midi,
    letterIndex,
    alteration: accidental,
    octave,
    noteId: note.id,
    ...(note.slash ? { slash: true } : {}),
  };
}

/**
 * Chords per voice. Voice 0 takes each onset's top notes; notes that end at a
 * different time go to voice 1 when it's free, else join voice 0's chord.
 * Small legato overlaps (≤ a sixteenth) are trimmed, not split into voices.
 */
function assignVoices(notes: StaffNote[], quarter: number): [Chord[], Chord[]] {
  const voices: [Chord[], Chord[]] = [[], []];
  const byStart = new Map<number, StaffNote[]>();
  for (const n of notes) {
    const group = byStart.get(n.start) ?? [];
    group.push(n);
    byStart.set(n.start, group);
  }
  const lastEnd = (voice: 0 | 1) => voices[voice].at(-1)?.end ?? -Infinity;

  for (const start of [...byStart.keys()].sort((a, b) => a - b)) {
    const group = byStart.get(start)!;
    // Sub-chords by end; the one holding the top note leads.
    const byEnd = new Map<number, Pitch[]>();
    for (const n of group) {
      const pitches = byEnd.get(n.end) ?? [];
      pitches.push(n.pitch);
      byEnd.set(n.end, pitches);
    }
    const top = group.reduce((a, b) => (b.pitch.midi > a.pitch.midi ? b : a));
    const main: Chord = { start, end: top.end, pitches: byEnd.get(top.end)! };
    byEnd.delete(top.end);

    // Trim a voice-0 chord that only overlaps by a hair.
    const previous = voices[0].at(-1);
    if (
      previous &&
      previous.end > start &&
      previous.end - start <= quarter / 4 &&
      previous.end - start < (previous.end - previous.start) / 2
    ) {
      previous.end = start;
    }

    let mainVoice: 0 | 1;
    if (lastEnd(0) <= start) mainVoice = 0;
    else if (lastEnd(1) <= start) mainVoice = 1;
    else {
      voices[0].at(-1)!.end = start;
      mainVoice = 0;
    }
    voices[mainVoice].push(main);

    if (byEnd.size > 0) {
      const rest = [...byEnd.entries()];
      const otherVoice: 0 | 1 = mainVoice === 0 ? 1 : 0;
      if (lastEnd(otherVoice) <= start) {
        // The longest-held remainder gets its own voice; the others join it.
        const end = Math.max(...rest.map(([e]) => e));
        voices[otherVoice].push({
          start,
          end,
          pitches: rest.flatMap(([, pitches]) => pitches),
        });
      } else {
        main.pitches.push(...rest.flatMap(([, pitches]) => pitches));
      }
    }
  }
  for (const voice of voices) {
    for (const chord of voice) chord.pitches.sort((a, b) => a.midi - b.midi);
  }
  return voices;
}

/** Written pieces for [start, end) inside one measure (measure-relative). */
function splitSpan(
  start: number,
  end: number,
  isRest: boolean,
  measureStart: number,
  meter: Meter,
  tripletBeats: Set<number>,
): Array<ReturnType<typeof splitMetric>[number] & { tupletStart?: number }> {
  const quarter = meter.ticksPerQuarter;
  // Cut at the edges of triplet beats; they're written on their own.
  const cuts = [start];
  for (
    let beat = Math.floor(start / quarter) * quarter;
    beat < end;
    beat += quarter
  ) {
    if (!tripletBeats.has(measureStart + beat)) continue;
    if (beat > start) cuts.push(beat);
    if (beat + quarter < end) cuts.push(beat + quarter);
  }
  cuts.push(end);
  const pieces = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const [from, to] = [cuts[i], cuts[i + 1]];
    if (to <= from) continue;
    const beat = Math.floor(from / quarter) * quarter;
    if (tripletBeats.has(measureStart + beat)) {
      const whole = from === beat && to === beat + quarter;
      for (const piece of splitTriplet(from, to, beat, quarter)) {
        pieces.push(
          whole ? piece : { ...piece, tupletStart: measureStart + beat },
        );
      }
    } else {
      pieces.push(...splitMetric(from, to, isRest, meter));
    }
  }
  return pieces;
}

function toKeys(pitches: Pitch[]): NotationKey[] {
  return pitches.map((p) => ({
    midi: p.midi,
    letter: LETTERS[p.letterIndex],
    alteration: p.alteration,
    octave: p.octave,
    accidental: null,
    noteId: p.noteId,
    ...(p.notehead ? { notehead: p.notehead } : {}),
    ...(p.articulation ? { articulation: p.articulation } : {}),
    ...(p.drumLabel ? { drumLabel: p.drumLabel } : {}),
    ...(p.slash ? { slash: true } : {}),
  }));
}

// ── Drumset staff ──────────────────────────────────────────────────────────

/** Where a GM drum note is written, as a pitch the renderer can place. */
function drumPitch(note: NotationNoteInput): Pitch {
  const position = drumStaffPosition(note.midi);
  return {
    midi: note.midi,
    letterIndex: LETTERS.indexOf(position.letter),
    alteration: 0,
    octave: position.octave,
    noteId: note.id,
    notehead: position.notehead,
    drumLabel: position.label,
    ...(position.articulation ? { articulation: position.articulation } : {}),
  };
}

/**
 * Hands over feet: cymbals, snare and toms in the upper voice (stems up),
 * bass drum and hi-hat pedal in the lower (stems down) — the split every
 * drum chart uses.
 *
 * A drum sounds for an instant, so what is written is the rhythm, not how
 * long the sample rings: each hit runs to the next hit in its own voice, and
 * no further than a beat or its own bar, so hi-hat eighths read as eighths, a
 * backbeat reads as quarters with rests between, and nothing ties over a
 * barline.
 */
function percussionVoices(
  notes: StaffNote[],
  meter: Meter,
): [Chord[], Chord[]] {
  const build = (group: StaffNote[]): Chord[] => {
    const byStart = new Map<number, Pitch[]>();
    for (const note of group) {
      const at = byStart.get(note.start) ?? [];
      at.push(note.pitch);
      byStart.set(note.start, at);
    }
    const starts = [...byStart.keys()].sort((a, b) => a - b);
    return starts.map((start, i) => {
      const next = starts[i + 1] ?? Infinity;
      const barEnd =
        (Math.floor(start / meter.measureTicks) + 1) * meter.measureTicks;
      return {
        start,
        end: Math.min(next, start + meter.beatTicks, barEnd),
        pitches: byStart.get(start)!.sort((a, b) => a.midi - b.midi),
      };
    });
  };

  const hands: StaffNote[] = [];
  const feet: StaffNote[] = [];
  for (const note of notes) {
    (isFootDrum(note.pitch.midi) ? feet : hands).push(note);
  }
  return [build(hands), build(feet)];
}

/** One voice's items for one measure; `hideRests` for a second voice. */
function voiceItems(
  chords: Chord[],
  measure: { startTick: number; endTick: number },
  meter: Meter,
  tripletBeats: Set<number>,
  hideRests: boolean,
): NotationItem[] {
  const items: NotationItem[] = [];
  const { startTick: m0, endTick: m1 } = measure;
  const push = (
    from: number,
    to: number,
    chord: Chord | null,
    tieFromPrev: boolean,
    tieToNext: boolean,
  ) => {
    const pieces = splitSpan(
      from - m0,
      to - m0,
      !chord,
      m0,
      meter,
      tripletBeats,
    );
    pieces.forEach((piece, i) => {
      items.push({
        kind: chord ? 'note' : 'rest',
        startTick: m0 + piece.start,
        durationTicks: piece.duration,
        value: piece.value,
        dots: piece.dots,
        ...(piece.tupletStart !== undefined
          ? { tupletStart: piece.tupletStart }
          : {}),
        ...(!chord && hideRests ? { hidden: true } : {}),
        keys: chord ? toKeys(chord.pitches) : [],
        tieFromPrev: !!chord && (i > 0 || tieFromPrev),
        tieToNext: !!chord && (i < pieces.length - 1 || tieToNext),
      });
    });
  };

  let cursor = m0;
  for (const chord of chords) {
    if (chord.end <= m0 || chord.start >= m1) continue;
    const from = Math.max(chord.start, m0);
    const to = Math.min(chord.end, m1);
    if (from > cursor) push(cursor, from, null, false, false);
    push(from, to, chord, chord.start < m0, chord.end > m1);
    cursor = to;
  }
  if (cursor < m1) push(cursor, m1, null, false, false);
  return items;
}

const ACCIDENTAL_SYMBOL: Record<number, Accidental> = {
  [-2]: 'bb',
  [-1]: 'b',
  0: 'n',
  1: '#',
  2: '##',
};

/** Mark which keys print an accidental, bar by bar, per staff and octave. */
function applyAccidentals(voices: NotationVoice[], signature: number[]): void {
  const inBar = new Map<string, number>();
  const items = voices
    .flatMap((v) => v.items)
    .filter((item) => item.kind === 'note')
    .sort((a, b) => a.startTick - b.startTick);
  for (const item of items) {
    for (const key of item.keys) {
      const slot = `${key.letter}${key.octave}`;
      if (item.tieFromPrev) continue;
      const letterIndex = LETTERS.indexOf(key.letter);
      const expected = inBar.get(slot) ?? signature[letterIndex];
      if (key.alteration !== expected) {
        key.accidental = ACCIDENTAL_SYMBOL[key.alteration];
        inBar.set(slot, key.alteration);
      }
    }
  }
}

export function buildScore(
  input: ReadonlyArray<NotationNoteInput>,
  options: NotationOptions = {},
): NotationScore {
  const ticksPerQuarter = options.ticksPerQuarter ?? 480;
  const timeSignature = options.timeSignature ?? [4, 4];
  const originTick = options.originTick ?? 0;
  const splitMidi = options.splitMidi ?? 60;
  const spell = options.spell ?? ((midi: number) => midiToPitchName(midi));
  const meter = makeMeter(timeSignature, ticksPerQuarter);
  // A single-staff part ignores hand tags and the split: it is all one clef.
  const layout = options.staves ?? 'grand';
  const staves: StaffId[] = layout === 'grand' ? ['treble', 'bass'] : [layout];
  // A drumset staff places notes by instrument, so it has no key and no
  // spelling — see drumMap.ts.
  const drums = layout === 'percussion';

  // 1. Spell + staff
  const perStaff: Record<
    StaffId,
    Array<{ start: number; end: number; pitch: Pitch }>
  > = {
    treble: [],
    bass: [],
    percussion: [],
  };
  const staffOf =
    layout === 'grand'
      ? assignStaves(input, splitMidi)
      : new Map<string, StaffId>();
  for (const note of input) {
    const start = note.startTick - originTick;
    // A drum trigger often carries no length at all (a pad hit, an imported
    // groove). It still sounds, and percussionVoices writes the rhythm from
    // the hits alone, so an instant is enough to keep it.
    const durationTicks = drums
      ? Math.max(note.durationTicks, 1)
      : note.durationTicks;
    if (durationTicks <= 0 || start + durationTicks <= 0) continue;
    const staff =
      layout === 'grand'
        ? (note.staff ?? staffOf.get(note.id) ?? 'treble')
        : layout;
    perStaff[staff].push({
      start: Math.max(0, start),
      end: start + durationTicks,
      pitch: drums ? drumPitch(note) : spellPitch(note, spell),
    });
  }

  const keyFifths = drums
    ? 0
    : (options.keyFifths ??
      inferKeyFifths(
        [...perStaff.treble, ...perStaff.bass].map((n) => n.pitch),
        options.keyTonicPc,
      ));
  const signature = keySignatureAlterations(keyFifths);

  // The piece is as long as what was played. Quantizing nudges notes onto the
  // grid, but it must never push the music into a bar nobody played in.
  // A drum hit counts by its onset alone: its recorded length never reaches
  // the page (percussionVoices writes each hit up to the next, within its
  // bar), so a hi-hat on the last "and" can't invent a bar of its own.
  let rawEnd = 0;
  for (const notes of Object.values(perStaff)) {
    for (const note of notes) {
      rawEnd = Math.max(rawEnd, drums ? note.start + 1 : note.end);
    }
  }
  const measureCount = Math.max(
    options.minMeasures ?? 1,
    Math.ceil(rawEnd / meter.measureTicks),
    1,
  );
  const musicEnd = measureCount * meter.measureTicks;

  // 2–3. Quantize, trim same-pitch overlaps, voice
  const staffVoices = {} as Record<StaffId, [Chord[], Chord[]]>;
  const tripletBeats = {} as Record<StaffId, Set<number>>;
  for (const staff of drums ? (['percussion'] as StaffId[]) : STAVES) {
    const quantized = quantizeStaff(perStaff[staff], meter);
    tripletBeats[staff] = quantized.tripletBeats;
    // A note snapped onto the final barline has nowhere left to sound. It is
    // the next pass's downbeat played a hair early — a loop's kick pushed into
    // bar 1 — so it is not given a bar of its own.
    const spans = quantized.spans.filter((s) => s.start < musicEnd);
    for (const span of spans) span.end = Math.min(span.end, musicEnd);
    spans.sort((a, b) => a.start - b.start || a.pitch.midi - b.pitch.midi);
    const lastByMidi = new Map<number, (typeof spans)[number]>();
    for (const span of spans) {
      const previous = lastByMidi.get(span.pitch.midi);
      if (previous && previous.end > span.start) previous.end = span.start;
      lastByMidi.set(span.pitch.midi, span);
    }
    const kept = spans.filter((s) => s.end > s.start);
    staffVoices[staff] = drums
      ? percussionVoices(kept, meter)
      : assignVoices(kept, ticksPerQuarter);
  }

  // 4. Measures
  const firstNumber = options.firstMeasureNumber ?? 1;
  const measures: NotationMeasure[] = [];
  for (let index = 0; index < measureCount; index++) {
    const startTick = index * meter.measureTicks;
    const endTick = startTick + meter.measureTicks;
    const bounds = { startTick, endTick };
    const measureStaves = {} as Record<StaffId, NotationVoice[]>;
    for (const staff of staves) {
      const [main, second] = staffVoices[staff];
      const overlaps = (chords: Chord[]) =>
        chords.some((c) => c.start < endTick && c.end > startTick);
      const voices: NotationVoice[] = [];
      if (overlaps(main)) {
        voices.push({
          index: 0,
          items: voiceItems(main, bounds, meter, tripletBeats[staff], false),
        });
        if (overlaps(second)) {
          voices.push({
            index: 1,
            items: voiceItems(second, bounds, meter, tripletBeats[staff], true),
          });
        }
      } else if (overlaps(second)) {
        // Only a held second-voice note reaches this bar: write it plainly.
        voices.push({
          index: 0,
          items: voiceItems(second, bounds, meter, tripletBeats[staff], false),
        });
      } else {
        voices.push({
          index: 0,
          items: [
            {
              kind: 'rest',
              startTick,
              durationTicks: meter.measureTicks,
              value: 'w',
              dots: 0,
              wholeMeasure: true,
              keys: [],
              tieFromPrev: false,
              tieToNext: false,
            },
          ],
        });
      }
      // 5. Accidentals (a drumset staff has no key and no accidentals)
      if (!drums) applyAccidentals(voices, signature);
      measureStaves[staff] = voices;
    }
    measures.push({
      index,
      number: firstNumber + index,
      startTick: originTick + startTick,
      endTick: originTick + endTick,
      staves: measureStaves,
    });
  }

  // Items were built origin-relative; report absolute ticks.
  if (originTick !== 0) {
    for (const measure of measures) {
      for (const staff of staves) {
        for (const voice of measure.staves[staff]) {
          for (const item of voice.items) {
            item.startTick += originTick;
            if (item.tupletStart !== undefined) item.tupletStart += originTick;
          }
        }
      }
    }
  }

  return {
    staves,
    timeSignature,
    keyFifths,
    ticksPerQuarter,
    ticksPerMeasure: meter.measureTicks,
    beatTicks: meter.beatTicks,
    originTick,
    measures,
  };
}
