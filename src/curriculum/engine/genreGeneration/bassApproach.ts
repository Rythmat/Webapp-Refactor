/**
 * bassApproach.ts — Bass chromatic approach note generator
 *
 * Approach notes are chord-change-relative — they lead into ANY chord change
 * wherever it lands (beat1, beat3, mid-bar, etc.), not just bar lines.
 *
 * Rules (Funk / R&B / Neo-Soul / Blues):
 *   single_below:  b7→1     — one semitone below target
 *   double_above:  2→b2→1  — two semitones descending into target
 *   double_below:  b7→7→1  — two semitones ascending into target
 *   single_above:  FORBIDDEN except when matching a chord symbol
 *
 * Direction weights (equal): 33% each for Funk/R&B/Neo-Soul/Blues
 *
 * Rhythmic patterns — offsets relative to goal_tick:
 *   DCB1    (20%): goal-480, goal-360   beat4+e4 feel
 *   DCB2    (20%): goal-720, goal-360   dotted 8th+16th (classic)
 *   DCB3    (20%): goal-600, goal-360   punchy 8th+16th
 *   PAIR_16 (15%): goal-240, goal-120   tight consecutive 16ths
 *   PAIR_8  (15%): goal-480, goal-240   relaxed 8th pair
 *   PAIR_Q  (10%): goal-960, goal-480   spacious quarter pair
 *
 * Constraint: approach onset must be >= prevChordTick + MIN_GAP (240t)
 * Patterns that would crowd the previous chord are automatically skipped.
 *
 * Source: Peter Stoltzman — Funk SOP training + DCB rhythm chart
 */

export type ApproachDirection = 'single_below' | 'double_above' | 'double_below' | 'single_above';
export type ApproachStyle = 'funk' | 'rnb' | 'neo_soul' | 'blues' | 'jazz_l1' | 'jazz_l3';

export interface ApproachNote {
  midi: number;
  onset: number;      // absolute ticks (barOffset already applied)
  duration: number;   // ticks
}

// ── Rhythmic patterns (offsets relative to goal_tick) ───────────────────

const DOUBLE_APPROACH_RHYTHMS: Array<{
  id: string;
  offsets: [number, number];   // [first_approach_offset, second_approach_offset]
  weight: number;
}> = [
  { id: 'DCB1',    offsets: [-480, -360], weight: 20 },  // beat4 + e-of-4
  { id: 'DCB2',    offsets: [-720, -360], weight: 20 },  // and-of-3 + e-of-4
  { id: 'DCB3',    offsets: [-600, -360], weight: 20 },  // a-of-3 + e-of-4
  { id: 'PAIR_16', offsets: [-240, -120], weight: 15 },  // and-of-4 + a-of-4
  { id: 'PAIR_8',  offsets: [-480, -240], weight: 15 },  // beat4 + and-of-4
  { id: 'PAIR_Q',  offsets: [-960, -480], weight: 10 },  // beat3 + beat4
];

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[0];
}

// ── Direction picker ────────────────────────────────────────────────────

const STYLE_DIRECTIONS: Record<ApproachStyle, ApproachDirection[]> = {
  funk:      ['single_below', 'double_above', 'double_below'],
  rnb:       ['single_below', 'double_above', 'double_below'],
  neo_soul:  ['single_below', 'double_above', 'double_below'],
  blues:     ['single_below', 'double_above', 'double_below'],
  jazz_l1:   ['single_below'],
  jazz_l3:   ['single_below', 'double_above', 'double_below', 'single_above'],
};

export function pickApproachDirection(style: ApproachStyle = 'funk'): ApproachDirection {
  const available = STYLE_DIRECTIONS[style];
  return available[Math.floor(Math.random() * available.length)];
}

// ── Main builder ────────────────────────────────────────────────────────

const MIN_GAP = 240;  // minimum ticks after previous chord before approach can start

/**
 * Build chromatic approach notes leading into a chord change.
 *
 * @param targetMidi      - MIDI root note of the incoming chord
 * @param goalTick        - tick position of the chord change within the bar
 * @param barOffset       - absolute tick of the bar start
 * @param prevChordTick   - tick of the previous chord change (for spacing check)
 *                          Use 0 for beat1 of current bar, or negative for prev bar
 * @param direction       - explicit approach type, or undefined to pick randomly
 * @param style           - style context for direction selection
 *
 * Returns empty array if no valid approach pattern fits the available space.
 */
export function buildApproachNotes(
  targetMidi: number,
  goalTick: number,
  barOffset: number,
  prevChordTick: number,
  direction?: ApproachDirection,
  style: ApproachStyle = 'funk',
): ApproachNote[] {
  const dir = direction ?? pickApproachDirection(style);
  const earliestApproach = prevChordTick + MIN_GAP;

  if (dir === 'single_below') {
    const onset = goalTick - 600;  // standard: ~a-of-3 before goal
    if (onset < earliestApproach) return [];
    return [{
      midi:     targetMidi - 1,
      onset:    barOffset + onset,
      duration: 120,
    }];
  }

  if (dir === 'single_above') {
    // Jazz L3 only — one semitone above
    const onset = goalTick - 600;
    if (onset < earliestApproach) return [];
    return [{
      midi:     targetMidi + 1,
      onset:    barOffset + onset,
      duration: 120,
    }];
  }

  // Double approach — filter patterns that fit the available space
  const validRhythms = DOUBLE_APPROACH_RHYTHMS.filter(r => {
    const firstOnset = goalTick + r.offsets[0];
    return firstOnset >= earliestApproach;
  });

  if (validRhythms.length === 0) return [];

  const rhythm = weightedPick(validRhythms);
  const t1 = goalTick + rhythm.offsets[0];
  const t2 = goalTick + rhythm.offsets[1];
  // First chromatic: short (16th = 120t)
  // Second chromatic (lands on the "e"): long — held to the goal (dotted 8th feel)
  const dur1 = 120;                       // first note: short stab
  const dur2 = goalTick - t2;             // second note: holds until the goal lands
  const safeDur2 = Math.max(dur2, 240);   // at least an 8th note

  if (dir === 'double_above') {
    return [
      { midi: targetMidi + 2, onset: barOffset + t1, duration: dur1 },
      { midi: targetMidi + 1, onset: barOffset + t2, duration: safeDur2 },
    ];
  }

  // double_below
  return [
    { midi: targetMidi - 2, onset: barOffset + t1, duration: dur1 },
    { midi: targetMidi - 1, onset: barOffset + t2, duration: safeDur2 },
  ];
}

/**
 * Helper: should this chord change get an approach?
 * Always false for the last chord in a sequence (nothing to resolve to).
 */
export function shouldAddApproach(
  chordIndex: number,
  totalChords: number,
  probability = 0.55,
): boolean {
  if (chordIndex >= totalChords - 1) return false;
  return Math.random() < probability;
}
