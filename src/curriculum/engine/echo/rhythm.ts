/**
 * Echo's rhythms: ICP Studio's 25 one-beat rhythm flashcards
 * (rhythmFlashcards.json), and calls' rhythms made from them a beat at a
 * time. A card is a quarter-note beat on a 16th grid: X a note starts, -
 * it's held, . a rest. A note never runs past its card's beat.
 *
 *   Tier 1  quarters and eighths, with their rests
 *   Tier 2  sixteenths
 *   Tier 3  sixteenth rests
 *   Tier 4  dotted and syncopated: the Final Boss's
 *
 * A MELODY CALL'S RHYTHM (`melodyRhythm`)
 * Eight beats, a card each, whose notes are as many as the contour's:
 *
 *   1. the first note on beat 1 (the first card starts on its beat);
 *   2. a breath before the response: the last beat is a quarter rest, so
 *      nothing rings into the answer;
 *   3. the call is two bars: its last note starts in bar 2;
 *   4. it holds together: no more than two silent beats between notes.
 *
 * A silent beat is always the quarter rest: the three all-rest cards sound
 * the same. Any way of spreading the notes over the beats that keeps the
 * rules may come, the likelier the more it holds together, so a call is
 * a phrase to remember, not notes dotted about: each silent beat between
 * notes halves its chance, and a note on bar 2's downbeat doubles it. Then
 * every card with that many notes on its beat is as likely. The boss's
 * calls have a Tier 4 card on at least one beat.
 *
 * A CHORD CALL'S RHYTHM (`chordRhythm`)
 * One card a bar, struck on every beat of it, as Melodies and Chords'
 * progressions repeat one rhythm a bar. The first bar's card starts on its
 * beat (the first chord on beat 1), and the call's last beat is the
 * breath. Only cards a chord can be struck in: a note at least, and, the
 * card repeated, no two notes a 16th apart (a chord a 16th after another
 * can't be told from a ragged one, chordGrading.ts CHORD_CLUSTER_TICKS).
 * That leaves no Tier 2 card, and of Tier 4 only the 16th rest and dotted
 * eighth.
 *
 * Pure, no React.
 */

import CARD_FILE from '@/curriculum/data/echo/rhythmFlashcards.json';
import { BEAT_TICKS, SIXTEENTH_TICKS, type EchoTier } from './levels';
import { pickOne, pickWeighted, type EchoRandom } from './random';

/** One flashcard: a beat's rhythm. */
export interface RhythmCard {
  /** Its number in the deck, 1–25. */
  id: number;
  tier: EchoTier;
  /** Four 16ths: X a note starts, - it's held, . a rest. */
  grid: string;
  /** "eighth, eighth rest". */
  name: string;
  /** "8", "8r", "16", "8.": a note value each, r a rest. */
  tokens: readonly string[];
  /** "1 (&)": the syllables played, rests in parentheses. */
  count: string;
}

/** A note of a card: where it starts in its beat, and how long it lasts. */
export interface CardHit {
  offset: number;
  duration: number;
}

/** The whole deck, in its order. */
export const RHYTHM_CARDS: readonly RhythmCard[] = CARD_FILE.cards.map(
  (card) => ({ ...card, tier: card.tier as EchoTier }),
);

const CARD_BY_ID = new Map(RHYTHM_CARDS.map((card) => [card.id, card]));

/** A card by its number. */
export const rhythmCard = (id: number): RhythmCard | undefined =>
  CARD_BY_ID.get(id);

/** The quarter rest: every silent beat, and the breath. */
export const QUARTER_REST: RhythmCard = CARD_BY_ID.get(1)!;

/** A card's notes, in ticks within its beat. */
export function cardHits(card: Pick<RhythmCard, 'grid'>): CardHit[] {
  const hits: CardHit[] = [];
  [...card.grid].forEach((cell, i) => {
    if (cell === 'X') {
      hits.push({ offset: i * SIXTEENTH_TICKS, duration: SIXTEENTH_TICKS });
    } else if (cell === '-' && hits.length) {
      hits[hits.length - 1].duration += SIXTEENTH_TICKS;
    }
  });
  return hits;
}

/** How many notes a card has. */
export const cardNotes = (card: Pick<RhythmCard, 'grid'>): number =>
  [...card.grid].filter((cell) => cell === 'X').length;

/** Whether a card's first note is on its beat. */
export const startsOnBeat = (card: Pick<RhythmCard, 'grid'>): boolean =>
  card.grid[0] === 'X';

/** The deck's cards of some tiers. */
export const cardsOfTiers = (tiers: readonly EchoTier[]): RhythmCard[] =>
  RHYTHM_CARDS.filter((card) => tiers.includes(card.tier));

/**
 * Whether a chord can be struck in a card on every beat: it has a note, and
 * no two notes, round the beat and into the next, are only a 16th apart.
 */
export function chordPlayable(card: Pick<RhythmCard, 'grid'>): boolean {
  const onsets = [...card.grid].flatMap((cell, i) => (cell === 'X' ? [i] : []));
  if (onsets.length === 0) return false;
  const cells = card.grid.length;
  return onsets.every((onset, i) => {
    const next = i + 1 < onsets.length ? onsets[i + 1] : onsets[0] + cells;
    return next - onset >= 2;
  });
}

/** A note of a rhythm laid out over beats, in ticks from its first beat. */
export interface RhythmHit {
  tick: number;
  duration: number;
  /** Its beat, from 0. */
  beat: number;
  card: RhythmCard;
}

/** Cards a beat each, from `start`: their notes in order. */
export function rhythmHits(
  cards: readonly RhythmCard[],
  start = 0,
): RhythmHit[] {
  return cards.flatMap((card, beat) =>
    cardHits(card).map((hit) => ({
      tick: start + beat * BEAT_TICKS + hit.offset,
      duration: hit.duration,
      beat,
      card,
    })),
  );
}

/** The most silent beats a melody call has between two notes. */
export const MAX_SILENT_BEATS = 2;

/** What a call's rhythm is made of: the level's cards, and the boss's. */
export interface RhythmPool {
  /** Every card it may use. */
  cards: readonly RhythmCard[];
  /** Cards it must use one of, at least (the boss's Tier 4); none: none. */
  required?: readonly RhythmCard[];
}

/** Notes per beat: how a call spreads its notes, before its cards. */
type Spread = number[];

/**
 * Every way of spreading `notes` over `beats` sounding beats that keeps
 * the rules (A MELODY CALL'S RHYTHM), with a card for each count.
 */
function spreads(
  notes: number,
  beats: number,
  firstCounts: ReadonlySet<number>,
  counts: ReadonlySet<number>,
  lastBarStart: number,
): Spread[] {
  const found: Spread[] = [];
  const spread: number[] = [];
  const walk = (beat: number, left: number, silent: number) => {
    if (left === 0) {
      const last = spread.reduce((at, n, i) => (n > 0 ? i : at), -1);
      if (last >= lastBarStart) {
        found.push([...spread, ...Array(beats - beat).fill(0)]);
      }
      return;
    }
    if (beat === beats) return;
    const allowed = beat === 0 ? firstCounts : counts;
    for (const n of [0, ...allowed]) {
      if (n === 0 && (beat === 0 || silent === MAX_SILENT_BEATS)) continue;
      if (n > left) continue;
      spread.push(n);
      walk(beat + 1, left - n, n === 0 ? silent + 1 : 0);
      spread.pop();
    }
  };
  walk(0, notes, 0);
  return found;
}

const countsOf = (cards: readonly RhythmCard[]) =>
  new Set(cards.map(cardNotes).filter((n) => n > 0));

/**
 * How likely a spread is, against the others: halved for each silent beat
 * between its notes, doubled for a note on bar 2's downbeat.
 */
function spreadWeight(spread: Spread, lastBarStart: number): number {
  const last = spread.reduce((at, n, i) => (n > 0 ? i : at), 0);
  const silent = spread.slice(0, last).filter((n) => n === 0).length;
  return (1 / 3) ** silent * (spread[lastBarStart] > 0 ? 2 : 1);
}

/**
 * A melody call's rhythm: a card for each of `beats` beats (the last the
 * breath) holding `notes` notes, by the rules above.
 */
export function melodyRhythm(
  notes: number,
  pool: RhythmPool,
  rng: EchoRandom,
  { beats = 8, beatsPerBar = 4 }: { beats?: number; beatsPerBar?: number } = {},
): RhythmCard[] {
  const sounding = pool.cards.filter((card) => cardNotes(card) > 0);
  const onBeat = sounding.filter(startsOnBeat);
  const required = pool.required?.filter((card) => cardNotes(card) > 0);
  const playable = beats - 1; // the last is the breath
  const lastBarStart = Math.max(0, beats - beatsPerBar);
  const all = spreads(
    notes,
    playable,
    countsOf(onBeat),
    countsOf(sounding),
    lastBarStart,
  );
  // A beat that can take a required card, in a spread.
  const takesRequired = (spread: Spread, beat: number) =>
    !!required?.some(
      (card) =>
        cardNotes(card) === spread[beat] && (beat > 0 || startsOnBeat(card)),
    );
  const options = required?.length
    ? all.filter((spread) => spread.some((_, b) => takesRequired(spread, b)))
    : all;
  if (options.length === 0) {
    throw new Error(`No rhythm holds ${notes} notes in ${beats} beats`);
  }
  const spread = pickWeighted(rng, options, (o) =>
    spreadWeight(o, lastBarStart),
  );
  const special = required?.length
    ? pickOne(
        rng,
        spread.flatMap((_, b) => (takesRequired(spread, b) ? [b] : [])),
      )
    : -1;
  const cards = spread.map((count, beat) => {
    if (count === 0) return QUARTER_REST;
    const from = beat === special ? required! : sounding;
    return pickOne(
      rng,
      from.filter(
        (card) => cardNotes(card) === count && (beat > 0 || startsOnBeat(card)),
      ),
    );
  });
  return [...cards, QUARTER_REST];
}

/**
 * A chord call's rhythm: a card for each of its bars, struck on every beat
 * of the bar (A CHORD CALL'S RHYTHM). The first bar's starts on its beat;
 * the boss's have a Tier 4 card in at least one bar.
 */
export function chordRhythm(
  pool: RhythmPool,
  rng: EchoRandom,
  { bars = 2 }: { bars?: number } = {},
): RhythmCard[] {
  const playable = pool.cards.filter(chordPlayable);
  const required = pool.required?.filter(chordPlayable) ?? [];
  const fits = (card: RhythmCard, bar: number) => bar > 0 || startsOnBeat(card);
  const special = required.length
    ? pickOne(
        rng,
        Array.from({ length: bars }, (_, b) => b).filter((b) =>
          required.some((card) => fits(card, b)),
        ),
      )
    : -1;
  return Array.from({ length: bars }, (_, bar) =>
    pickOne(
      rng,
      (bar === special ? required : playable).filter((card) => fits(card, bar)),
    ),
  );
}
