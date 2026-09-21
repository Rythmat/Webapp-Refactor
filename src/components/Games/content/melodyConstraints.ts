// ── Musical constraints for Learn > Theory generated melodies ──────────────
//
// Contours arrive from `GET /prism/contours/start` as absolute, 1-based scale
// degrees — in D dorian the phrase F – E – F is the contour `[3, 2, 3]`.
// Mapped straight onto the scale they produce phrases that never state the
// mode's identity and never resolve, so every melody handed to a student has
// to satisfy three things:
//
//   1. Chord-tone content — at least two DISTINCT chord tones of the tonic
//      1-3-5 triad, one of which must be the 3 (major or minor, whichever the
//      mode gives). Without the 3 alongside another chord tone you cannot hear
//      the quality of the mode.
//   2. Cadence — the phrase resolves according to its second-to-last note;
//      see RESOLUTIONS. Every target is a chord tone, so this subsumes the
//      older "final note is a chord tone" rule and further fixes which chord
//      tone, and in which direction.
//   3. Leaps — how far the melody may jump, which tightens by level.
//
// Rules 2 and 3 are stated in scale steps, not semitones: "a 5th" is four
// steps in any mode, whether it is perfect or diminished, which is how a
// player counts it.
//
// Contours are fitted by filtering first (use one that already works),
// transposing second (shift the whole contour through the scale, shape
// intact), and repairing only as a last resort.

import {
  noteViolation,
  obeysMajorChordRule,
  repairMajorChordRule,
  singleChordWindow,
  type ChordWindow,
} from '@/lib/melody/majorChordRule';

/** Difficulty tier. Level 1 is the smoothest, level 3 the freest. */
export type MelodyLevel = 1 | 2 | 3;

export interface ChordToneContext {
  /** Unique scale degrees in MIDI, trailing octave duplicate stripped. */
  degreeRing: number[];
  /** Pitch classes of the tonic triad: degrees 1, 3 and 5. */
  chordTonePcs: Set<number>;
  /** Pitch class of the 3 — the degree rule 1 always requires. */
  thirdPc: number;
  /** Pitch class → 0-based scale degree. */
  degreeOfPc: Map<number, number>;
  /** The tonic triad's 5 is diminished (locrian, and any other ♭5 mode). */
  diminishedFifth: boolean;
  /** Cadence rules are written for a seven-degree scale. */
  heptatonic: boolean;
  /**
   * The tonic triad this melody plays over, for the major-chord rule. A mode
   * lesson has one chord the whole way through: its own tonic.
   */
  tonicChord: ChordWindow[];
}

/**
 * Where a phrase may go from its second-to-last note, as signed scale steps.
 * Keyed by the 0-based degree of that note, so key 4 is the 5th degree.
 *
 *   1 → repeat, or up to the 3 or 5 (0, +2, +4, −3)
 *   2 → down to the 1, or up to the 3 (−1, +1)
 *   3 → down to the 1, or up a 6th to the 1 (−2, +5)
 *   4 → up to the 5, down to the 3, or down to the 1 (+1, −1, −3)
 *   5 → up to the 1, or down to the 1 (+3, −4)
 *   6 → down to the 5, or up to the 1 (−1, +2)
 *   7 → up to the 1, or down to the 5 (+1, −2)
 *
 * The 3's +5 is the sole leap past a 5th anywhere in the table.
 */
const RESOLUTIONS: Record<number, number[]> = {
  0: [0, 2, 4, -3],
  1: [-1, 1],
  2: [-2, 5],
  3: [1, -1, -3],
  4: [3, -4],
  5: [-1, 2],
  6: [1, -2],
};

/**
 * A diminished 5 leaps a tritone to the 1 in either direction, so it falls a
 * third to the 3 instead — the way a diminished triad actually resolves.
 */
const DIMINISHED_FIFTH_RESOLUTION = [-2];

/** Scale steps in a 5th and in an octave — the two caps levels choose between. */
const FIFTH_STEPS = 4;
const OCTAVE_STEPS = 7;

/** How far any interval inside the phrase may leap, by level. */
const INTERIOR_CAP: Record<MelodyLevel, number> = {
  1: FIFTH_STEPS,
  2: OCTAVE_STEPS,
  3: Number.POSITIVE_INFINITY,
};

const pc = (midi: number) => ((midi % 12) + 12) % 12;

/**
 * Build the chord-tone context for a lesson scale.
 *
 * `buildScaleMidis` in LessonContainer normalises steps so the root and its
 * octave are both present, so a diatonic scale arrives here as 8 MIDI values.
 * The ring drops that duplicate so degree arithmetic wraps over 7 degrees.
 *
 * Returns null for a scale too small to stack a triad on, so callers can fall
 * back rather than generate nonsense.
 */
export function buildChordToneContext(
  scale: number[],
): ChordToneContext | null {
  const clean = scale.filter(
    (n) => typeof n === 'number' && Number.isFinite(n),
  );
  if (clean.length < 5) return null;

  const last = clean[clean.length - 1];
  const degreeRing =
    clean.length > 1 && pc(last) === pc(clean[0]) ? clean.slice(0, -1) : clean;
  if (degreeRing.length < 5) return null;

  const degreeOfPc = new Map<number, number>();
  degreeRing.forEach((midi, index) => {
    if (!degreeOfPc.has(pc(midi))) degreeOfPc.set(pc(midi), index);
  });

  return {
    degreeRing,
    chordTonePcs: new Set(
      [degreeRing[0], degreeRing[2], degreeRing[4]].map(pc),
    ),
    thirdPc: pc(degreeRing[2]),
    degreeOfPc,
    diminishedFifth: (degreeRing[4] - degreeRing[0] + 120) % 12 === 6,
    heptatonic: degreeRing.length === 7,
    tonicChord: singleChordWindow(
      pc(degreeRing[0]),
      (degreeRing[2] - degreeRing[0] + 120) % 12 === 4,
    ),
  };
}

/**
 * Resolve one absolute, 1-based contour degree onto the scale.
 *
 * Degree 1 is the root and the ladder continues uniformly in both directions:
 * degrees past the top of the ring wrap into the octave above, and 0 or
 * negative degrees descend into the octave below. The mapper this replaces
 * dropped both ends — the contour library contains values up to 14, and a
 * dropped note silently changes which note a phrase ends on. It also had a
 * discontinuity at the bottom, where 1 and -1 both landed on the root and 0
 * vanished.
 */
function resolveDegree(
  value: number,
  ring: number[],
  transpose: number,
): number {
  const len = ring.length;
  const degree = value - 1 + transpose;
  const idx = ((degree % len) + len) % len;
  const octave = Math.floor(degree / len);
  return ring[idx] + 12 * octave;
}

/** How far a sequence falls outside the playable window around the root. */
function windowViolation(seq: number[], root: number): number {
  const low = Math.min(...seq);
  const high = Math.max(...seq);
  return Math.max(0, root - 12 - low) + Math.max(0, high - (root + 24));
}

/**
 * Shift a sequence by whole octaves to bring it inside a playable window —
 * an octave below the root to two above, matching the auto-scaled lane range
 * of the piano roll. Contours that already sit in the window are left alone,
 * so one designed to dip below the root keeps its register. Pitch classes and
 * the distances between notes are untouched, so this cannot affect any rule.
 */
function normalizeRange(seq: number[], root: number): number[] {
  if (seq.length === 0) return seq;

  let best = seq;
  let bestViolation = windowViolation(seq, root);
  if (bestViolation === 0) return seq;

  for (let shift = -2; shift <= 2; shift += 1) {
    if (shift === 0) continue;
    const moved = seq.map((midi) => midi + 12 * shift);
    const violation = windowViolation(moved, root);
    if (violation < bestViolation) {
      best = moved;
      bestViolation = violation;
    }
  }

  return best;
}

/**
 * Map a contour onto the scale, preserving its shape exactly.
 *
 * `transpose` shifts every degree by that many scale steps, which is how a
 * contour whose written degrees miss the chord tones is brought into line.
 */
export function resolveContour(
  contour: number[],
  ring: number[],
  transpose = 0,
): number[] {
  if (ring.length === 0) return [];
  const seq = contour
    .filter((v) => typeof v === 'number' && Number.isFinite(v))
    .map((value) => resolveDegree(value, ring, transpose));
  return normalizeRange(seq, ring[0]);
}

// ── Degrees and distances ──────────────────────────────────────────────────

/**
 * A note's position on the endless degree ladder: degree index plus seven per
 * octave. Differences between these are distances in scale steps, which is
 * how both the cadence table and the leap caps are written.
 */
function absoluteDegree(midi: number, ctx: ChordToneContext): number | null {
  const index = ctx.degreeOfPc.get(pc(midi));
  if (index === undefined) return null;
  const octave = Math.round((midi - ctx.degreeRing[index]) / 12);
  return octave * ctx.degreeRing.length + index;
}

/** The MIDI note at a position on that ladder. */
function midiAtDegree(absolute: number, ctx: ChordToneContext): number {
  const len = ctx.degreeRing.length;
  const index = ((absolute % len) + len) % len;
  const octave = Math.floor(absolute / len);
  return ctx.degreeRing[index] + 12 * octave;
}

/** Distance in scale steps, or null when a note is outside the scale. */
function stepDistance(
  a: number,
  b: number,
  ctx: ChordToneContext,
): number | null {
  const from = absoluteDegree(a, ctx);
  const to = absoluteDegree(b, ctx);
  if (from === null || to === null) return null;
  return Math.abs(to - from);
}

// ── The rules ──────────────────────────────────────────────────────────────

/** Rule 1: two distinct chord tones present, one of them the 3. */
export function hasRequiredChordTones(
  seq: number[],
  ctx: ChordToneContext,
): boolean {
  const found = new Set<number>();
  seq.forEach((midi) => {
    if (ctx.chordTonePcs.has(pc(midi))) found.add(pc(midi));
  });
  return found.size >= 2 && found.has(ctx.thirdPc);
}

/** The phrase's last note is a chord tone. Implied by a valid cadence. */
export function endsOnChordTone(seq: number[], ctx: ChordToneContext): boolean {
  if (seq.length === 0) return false;
  return ctx.chordTonePcs.has(pc(seq[seq.length - 1]));
}

/**
 * Every note the phrase may end on, given the note before it. Empty when the
 * cadence table does not apply.
 */
export function cadenceTargets(
  penultimate: number,
  ctx: ChordToneContext,
): number[] {
  if (!ctx.heptatonic) return [];
  const from = absoluteDegree(penultimate, ctx);
  if (from === null) return [];
  const degree = ((from % 7) + 7) % 7;
  const offsets =
    degree === 4 && ctx.diminishedFifth
      ? DIMINISHED_FIFTH_RESOLUTION
      : RESOLUTIONS[degree];
  return (offsets ?? []).map((offset) => midiAtDegree(from + offset, ctx));
}

/**
 * Rule 2: the phrase resolves the way its second-to-last note requires.
 * A one-note phrase has no cadence to judge, so it falls back to rule 2's
 * older form — it must simply land on a chord tone.
 */
export function endsWithValidCadence(
  seq: number[],
  ctx: ChordToneContext,
): boolean {
  if (seq.length === 0) return false;
  if (seq.length === 1 || !ctx.heptatonic) return endsOnChordTone(seq, ctx);
  const targets = cadenceTargets(seq[seq.length - 2], ctx);
  if (targets.length === 0) return endsOnChordTone(seq, ctx);
  return targets.includes(seq[seq.length - 1]);
}

/**
 * Rule 3: no interval leaps further than the level allows. The closing
 * interval is always held to a 5th, whatever the level — except the 3's rise
 * of a 6th to the 1, the one leap the cadence table permits past a 5th.
 */
export function respectsIntervalCap(
  seq: number[],
  ctx: ChordToneContext,
  level: MelodyLevel,
): boolean {
  if (seq.length < 2) return true;
  const interior = INTERIOR_CAP[level];

  for (let i = 1; i < seq.length; i += 1) {
    const steps = stepDistance(seq[i - 1], seq[i], ctx);
    if (steps === null) continue;
    const closing = i === seq.length - 1;
    // A valid cadence has already vetted the closing leap, including the 6th.
    const cap = closing ? Math.max(interior, FIFTH_STEPS) : interior;
    if (steps > cap && !(closing && endsWithValidCadence(seq, ctx))) {
      return false;
    }
  }
  return true;
}

/**
 * Nearest chord tone to a note, searching outward from the note's own
 * register. Ties resolve downward, as in the practice-track generator.
 */
export function nearestChordTone(note: number, ctx: ChordToneContext): number {
  for (let distance = 0; distance <= 12; distance += 1) {
    if (ctx.chordTonePcs.has(pc(note - distance))) return note - distance;
    if (ctx.chordTonePcs.has(pc(note + distance))) return note + distance;
  }
  return note;
}

/** Nearest note of a given pitch class, ties resolving downward. */
function snapToPitchClass(note: number, pitchClass: number): number {
  for (let distance = 0; distance <= 12; distance += 1) {
    if (pc(note - distance) === pitchClass) return note - distance;
    if (pc(note + distance) === pitchClass) return note + distance;
  }
  return note;
}

// ── Fitting a contour to the rules ─────────────────────────────────────────

/** How far a resolved sequence strays outside a single octave above the root. */
function rangePenalty(seq: number[], root: number): number {
  if (seq.length === 0) return 0;
  const low = Math.min(...seq);
  const high = Math.max(...seq);
  return Math.max(0, root - low) + Math.max(0, high - (root + 12));
}

/**
 * What a slot in the lesson demands of its contour. A phrase played on its own
 * needs everything; the opening half of a two-contour phrase needs neither the
 * chord tones nor the cadence, because the phrase as a whole supplies them.
 */
interface SlotRequirement {
  chordTones: boolean;
  cadence: boolean;
}

const STANDALONE: SlotRequirement = { chordTones: true, cadence: true };
const PHRASE_HEAD: SlotRequirement = { chordTones: false, cadence: false };
const PHRASE_TAIL: SlotRequirement = { chordTones: false, cadence: true };

/** Ticks the lesson gives each contour note — see midiSequenceToEvents. */
const NOTE_TICKS = 480;

/** A bare MIDI note placed on the lesson's grid, for the shared melody rules. */
function ruleNote(midi: number, index: number) {
  return { midi, startTick: index * NOTE_TICKS, durationTicks: NOTE_TICKS };
}

/**
 * The 4 over a major tonic must resolve to the 3 — see lib/melody. In a minor
 * mode the tonic triad has no major 3rd and the rule does not apply; in lydian
 * the 4 is raised, so it never arises there either.
 */
function respectsMajorChordRule(seq: number[], ctx: ChordToneContext): boolean {
  return obeysMajorChordRule(seq.map(ruleNote), ctx.tonicChord);
}

function satisfies(
  seq: number[],
  ctx: ChordToneContext,
  level: MelodyLevel,
  need: SlotRequirement,
): boolean {
  if (seq.length === 0) return false;
  if (!respectsMajorChordRule(seq, ctx)) return false;
  // A handful of library contours span more than the three octaves a lesson
  // can show, and no octave shift brings them in — they are simply unplayable
  // here, so they never reach a student.
  if (windowViolation(seq, ctx.degreeRing[0]) > 0) return false;
  if (need.cadence && !endsWithValidCadence(seq, ctx)) return false;
  if (!respectsIntervalCap(seq, ctx, level)) return false;
  return !need.chordTones || hasRequiredChordTones(seq, ctx);
}

/**
 * Fit a contour by transposing it through the scale, preferring the offset
 * that keeps the melody closest to a single octave. Returns null if no offset
 * works. Leap distances are unchanged by transposition, so a contour that
 * breaks the level's cap can never be rescued this way — it is filtered out.
 */
function fitByTransposition(
  contour: number[],
  ctx: ChordToneContext,
  level: MelodyLevel,
  need: SlotRequirement,
  allowTransposition: boolean,
): number[] | null {
  const root = ctx.degreeRing[0];
  const limit = allowTransposition ? ctx.degreeRing.length : 1;
  let best: number[] | null = null;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let transpose = 0; transpose < limit; transpose += 1) {
    const seq = resolveContour(contour, ctx.degreeRing, transpose);
    if (!satisfies(seq, ctx, level, need)) continue;
    const penalty = rangePenalty(seq, root);
    if (penalty < bestPenalty) {
      best = seq;
      bestPenalty = penalty;
    }
  }
  return best;
}

/**
 * Last resort when nothing in the pool fits at any offset: rewrite the fewest
 * notes that satisfy the rules. This alters the contour's shape, so it runs
 * only after filtering and transposition have both failed.
 */
function repairSequence(seq: number[], ctx: ChordToneContext): number[] {
  if (seq.length === 0) return seq;
  const repaired = [...seq];
  const lastIdx = repaired.length - 1;
  const edited = new Set<number>();

  // The cadence first: land where the second-to-last note wants to go, on
  // whichever permitted target is nearest the note already written. Where the
  // note before it is the 4 of a major tonic, only the 3 will do — the cadence
  // table offers the 5 and the 1 too, and both leave the 4 hanging.
  const allTargets =
    lastIdx > 0 ? cadenceTargets(repaired[lastIdx - 1], ctx) : [];
  const resolving = allTargets.filter(
    (target) =>
      noteViolation(
        ruleNote(repaired[lastIdx - 1], lastIdx - 1),
        ruleNote(target, lastIdx),
        ctx.tonicChord,
      ) === null,
  );
  const targets = resolving.length > 0 ? resolving : allTargets;
  if (targets.length > 0) {
    repaired[lastIdx] = targets.reduce((best, target) =>
      Math.abs(target - repaired[lastIdx]) < Math.abs(best - repaired[lastIdx])
        ? target
        : best,
    );
  } else {
    repaired[lastIdx] = nearestChordTone(repaired[lastIdx], ctx);
  }
  edited.add(lastIdx);

  const presentPcs = () => {
    const found = new Set<number>();
    repaired.forEach((midi) => {
      if (ctx.chordTonePcs.has(pc(midi))) found.add(pc(midi));
    });
    return found;
  };

  /**
   * Move one note onto one of `wanted`, choosing the cheapest edit among the
   * notes that are still free. The last two are left alone: they carry the
   * cadence, and moving either would undo it.
   */
  const snapOneNoteTo = (wanted: number[]): boolean => {
    if (wanted.length === 0) return false;
    let targetIdx = -1;
    let targetNote = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < repaired.length; i += 1) {
      if (edited.has(i) || i >= repaired.length - 2) continue;
      const candidate = wanted
        .map((want) => snapToPitchClass(repaired[i], want))
        .reduce((best, note) =>
          Math.abs(note - repaired[i]) < Math.abs(best - repaired[i])
            ? note
            : best,
        );
      const distance = Math.abs(candidate - repaired[i]);
      if (distance < bestDistance) {
        targetIdx = i;
        targetNote = candidate;
        bestDistance = distance;
      }
    }

    if (targetIdx < 0) return false;
    repaired[targetIdx] = targetNote;
    edited.add(targetIdx);
    return true;
  };

  // Rule 1, step one: the 3 has to be in there or the mode has no quality.
  if (!presentPcs().has(ctx.thirdPc)) snapOneNoteTo([ctx.thirdPc]);
  // Rule 1, step two: a second, different chord tone alongside it.
  const present = presentPcs();
  if (present.size < 2) {
    snapOneNoteTo([...ctx.chordTonePcs].filter((p) => !present.has(p)));
  }

  // Finally the major-chord rule, on the notes inside the phrase. The cadence
  // was chosen to satisfy it already, so this only moves interior notes.
  return repairMajorChordRule(
    repaired.map((midi, i) => ruleNote(midi, i)),
    ctx.tonicChord,
  ).map((note) => note.midi);
}

/**
 * Octave-shift a tail phrase so it joins the head without a jump the level
 * forbids. Pitch classes and inner distances are untouched.
 */
function fitJoin(
  tail: number[],
  head: number[],
  ctx: ChordToneContext,
  level: MelodyLevel,
): number[] {
  if (tail.length === 0 || head.length === 0) return tail;
  const cap = INTERIOR_CAP[level];
  if (!Number.isFinite(cap)) return tail;

  const last = head[head.length - 1];
  const root = ctx.degreeRing[0];

  const shifted = [-2, -1, 0, 1, 2].map((shift) =>
    shift === 0 ? tail : tail.map((m) => m + 12 * shift),
  );
  // Never shift a phrase out of the playable range to tighten a join — an
  // unreachable tail is worse than a wide joining leap. Where no shift stays
  // in range (nothing should, given `satisfies`), fall back to them all.
  const inRange = shifted.filter((seq) => windowViolation(seq, root) === 0);
  const candidates = inRange.length > 0 ? inRange : shifted;

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const moved of candidates) {
    const steps = stepDistance(last, moved[0], ctx);
    if (steps === null) continue;
    const score = (steps > cap ? 10_000 : 0) + steps;
    if (score < bestScore) {
      best = moved;
      bestScore = score;
    }
  }
  return best;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Draws contours from a shuffled pool without handing the same one out twice. */
class ContourDraw {
  private readonly order: number[][];
  private readonly used = new Set<number>();

  constructor(pool: number[][]) {
    this.order = shuffle(pool.filter((c) => Array.isArray(c) && c.length > 0));
  }

  get size(): number {
    return this.order.length;
  }

  /**
   * The first unused contour that fits the slot, trying it as written before
   * transposing it. Marks it used, so later slots get different material.
   */
  take(
    ctx: ChordToneContext,
    level: MelodyLevel,
    need: SlotRequirement,
    accept?: (seq: number[]) => boolean,
  ): number[] | null {
    for (const allowTransposition of [false, true]) {
      for (let i = 0; i < this.order.length; i += 1) {
        if (this.used.has(i)) continue;
        const seq = fitByTransposition(
          this.order[i],
          ctx,
          level,
          need,
          allowTransposition,
        );
        if (!seq || (accept && !accept(seq))) continue;
        this.used.add(i);
        return seq;
      }
    }
    return null;
  }

  /** Any contour at all, used or not — the last resort before repairing. */
  anyResolved(ctx: ChordToneContext): number[] | null {
    const first = this.order[0];
    return first ? resolveContour(first, ctx.degreeRing) : null;
  }
}

// ── What the lesson asks for ───────────────────────────────────────────────

/**
 * The melodies one mode lesson needs. Each is a complete phrase, already
 * resolved to MIDI.
 *
 * A student hears a phrase change every time they have played one in time, so
 * no phrase carries across an In Time activity:
 *
 *   1 Musical Contour · Hold          short
 *   2 Musical Contour · Play Along    short        ← in time
 *   3 Melodic Phrase  · Hold          long
 *   4 Melodic Phrase  · Play Along    long         ← in time
 *   5 Musical Contour · Staccato      articulation ← in time
 *   6 Musical Contour · Legato        articulation
 *   7 Musical Contour · Mixed         articulation
 *
 * The three articulation activities deliberately share one phrase: they teach
 * touch, and fixing the notes is what lets a student hear the touch change.
 */
export interface MelodyPhrases {
  /** Activities 1–2. One contour. */
  short: number[];
  /** Activities 3–4. Two contours joined, sharing nothing with `short`. */
  long: number[];
  /** Activities 5–7. One contour. */
  articulation: number[];
}

/** True when two phrases would sound the same. */
function sameNotes(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((note, i) => note === b[i]);
}

/**
 * Build a two-contour phrase: an opening that need only respect the leap cap,
 * and a close that carries the cadence. The two are judged together, so the
 * chord-tone rule and the cap apply across the join.
 */
function drawLongPhrase(
  draw: ContourDraw,
  ctx: ChordToneContext,
  level: MelodyLevel,
  avoid: number[],
): number[] | null {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const head = draw.take(
      ctx,
      level,
      PHRASE_HEAD,
      (seq) => !sameNotes(seq, avoid),
    );
    if (!head) return null;
    const tail = draw.take(ctx, level, PHRASE_TAIL, (seq) => {
      const joined = [...head, ...fitJoin(seq, head, ctx, level)];
      return satisfies(joined, ctx, level, STANDALONE);
    });
    if (tail) return [...head, ...fitJoin(tail, head, ctx, level)];
  }
  return null;
}

/**
 * Pick the lesson's melodies from the fetched contour pool.
 *
 * Returns null only when the pool is empty or the scale cannot carry a triad;
 * otherwise it always produces three phrases, falling back to repair and then
 * to reuse rather than leaving the lesson without melody activities.
 */
export function selectMelodyPhrases(
  pool: number[][],
  scale: number[],
  level: MelodyLevel = 1,
): MelodyPhrases | null {
  const ctx = buildChordToneContext(scale);
  const draw = new ContourDraw(pool);
  if (draw.size === 0 || !ctx) return null;

  const repaired = () => {
    const raw = draw.anyResolved(ctx);
    return raw ? repairSequence(raw, ctx) : null;
  };

  const short = draw.take(ctx, level, STANDALONE) ?? repaired();
  if (!short) return null;

  const long = drawLongPhrase(draw, ctx, level, short) ?? short;

  const articulation =
    draw.take(ctx, level, STANDALONE, (seq) => !sameNotes(seq, short)) ??
    draw.take(ctx, level, STANDALONE) ??
    short;

  return { short, long, articulation };
}

/**
 * Pick `count` standalone phrases. Kept for callers that want a plain list;
 * the lesson itself uses `selectMelodyPhrases`.
 */
export function selectConstrainedContours(
  pool: number[][],
  scale: number[],
  count: number,
  level: MelodyLevel = 1,
): number[][] {
  const ctx = buildChordToneContext(scale);
  const draw = new ContourDraw(pool);
  if (draw.size === 0) return [];

  // Without a usable triad (a malformed scale) fall back to plain resolution
  // rather than dropping the melody activities entirely.
  if (!ctx) {
    const ring = scale.filter((n) => Number.isFinite(n));
    if (ring.length === 0) return [];
    return shuffle(pool)
      .slice(0, count)
      .map((contour) => resolveContour(contour, ring))
      .filter((seq) => seq.length > 0);
  }

  const selected: number[][] = [];
  while (selected.length < count) {
    const need = selected.length === 0 ? STANDALONE : PHRASE_TAIL;
    const seq = draw.take(ctx, level, need);
    if (!seq) break;
    selected.push(
      selected.length === 0
        ? seq
        : fitJoin(seq, selected[selected.length - 1], ctx, level),
    );
  }

  if (selected.length === 0) {
    const raw = draw.anyResolved(ctx);
    if (raw) selected.push(repairSequence(raw, ctx));
  }

  // With a short pool, cycle through what we have rather than dropping
  // activities — the flow needs at least two sequences to show any melody.
  const distinct = selected.length;
  while (distinct > 0 && selected.length < count) {
    selected.push(selected[selected.length % distinct]);
  }
  return selected.slice(0, count);
}
