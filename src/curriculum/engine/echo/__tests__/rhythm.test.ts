import { describe, expect, it } from 'vitest';
import {
  LITERACY_MODES,
  LITERACY_TONICS,
} from '@/content/musicLiteracy/schemas';
import { bossCalls, chordCall, melodyCall } from '../calls';
import {
  BAR_TICKS,
  BEAT_TICKS,
  ECHO_LEVELS,
  ECHO_LEVEL_NUMBERS,
  type EchoLevelNumber,
} from '../levels';
import { echoRandom } from '../random';
import {
  MAX_CHORD_STRIKES_PER_BEAT,
  MAX_SILENT_BEATS,
  RHYTHM_CARDS,
  cardHits,
  cardNotes,
  chordPlayable,
  cardsOfTiers,
  rhythmCard,
} from '../rhythm';

/**
 * The 25 one-beat flashcards, and calls' rhythms made from them: the
 * contour's notes and no more, the first on beat 1, a beat's breath before
 * the response, each level's tiers, and Tier 4 for the boss alone.
 */

const SIXTEENTHS: Record<string, number> = { '4': 4, '8': 2, '8.': 3, '16': 1 };

const KEYS = LITERACY_TONICS.flatMap((tonic) =>
  LITERACY_MODES.map((mode) => ({ tonic, mode })),
);

/** Many calls of a level, across the keys, seeded. */
function manyMelodyCalls(level: EchoLevelNumber, boss = false, n = 240) {
  const rng = echoRandom(`melody-${level}-${boss}`);
  return Array.from({ length: n }, (_, i) =>
    melodyCall(level, KEYS[i % KEYS.length], rng, { boss }),
  );
}

describe('the deck', () => {
  it('has ICP Studio’s 25 cards: 6, 5, 10 and 4 a tier', () => {
    expect(RHYTHM_CARDS).toHaveLength(25);
    const tier = (t: number) => RHYTHM_CARDS.filter((c) => c.tier === t);
    expect([1, 2, 3, 4].map((t) => tier(t).length)).toEqual([6, 5, 10, 4]);
    expect(RHYTHM_CARDS.map((c) => c.id)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
  });

  it('fills every card’s beat: four 16ths, its tokens agreeing with its grid', () => {
    for (const card of RHYTHM_CARDS) {
      expect(card.grid).toMatch(/^[X.-]{4}$/);
      const total = card.tokens
        .map((token) => SIXTEENTHS[token.replace('r', '')])
        .reduce((a, b) => a + b, 0);
      expect(total, card.name).toBe(4);
      const notes = card.tokens.filter((token) => !token.endsWith('r'));
      expect(notes.length, card.name).toBe(cardNotes(card));
    }
  });

  it('reads a card’s notes off its grid', () => {
    expect(cardHits(rhythmCard(2)!)).toEqual([{ offset: 0, duration: 480 }]);
    expect(cardHits(rhythmCard(4)!)).toEqual([{ offset: 0, duration: 240 }]);
    expect(cardHits(rhythmCard(22)!)).toEqual([
      { offset: 0, duration: 120 },
      { offset: 120, duration: 240 },
      { offset: 360, duration: 120 },
    ]);
    expect(cardHits(rhythmCard(23)!)).toEqual([{ offset: 120, duration: 360 }]);
  });

  it('strikes chords in every card with a note: four strikes a beat at most', () => {
    // Every card but the three all-rest ones (1, 6, 21).
    expect(RHYTHM_CARDS.filter(chordPlayable).map((c) => c.id)).toEqual(
      RHYTHM_CARDS.map((c) => c.id).filter((id) => ![1, 6, 21].includes(id)),
    );
    expect(MAX_CHORD_STRIKES_PER_BEAT).toBe(4);
    expect(chordPlayable({ grid: 'XXXX' })).toBe(true);
    expect(chordPlayable({ grid: '....' })).toBe(false);
  });
});

describe('a melody call’s rhythm', () => {
  it('has as many notes as its contour', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const call of manyMelodyCalls(level)) {
        expect(call.notes).toHaveLength(call.contour.noteCount);
        expect(call.cards.reduce((n, c) => n + cardNotes(c), 0)).toBe(
          call.contour.noteCount,
        );
      }
    }
  });

  it('starts on beat 1, ends in bar 2, and breathes a beat before the response', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const call of [
        ...manyMelodyCalls(level),
        ...manyMelodyCalls(level, true, 80),
      ]) {
        const length = call.bars * BAR_TICKS;
        expect(call.cards).toHaveLength(8);
        expect(call.notes[0].onset).toBe(0);
        const last = call.notes.at(-1)!;
        expect(last.onset).toBeGreaterThanOrEqual(BAR_TICKS);
        // Nothing rings into the response: a beat's rest at least.
        expect(last.onset + last.duration).toBeLessThanOrEqual(
          length - BEAT_TICKS,
        );
        expect(call.cards.at(-1)!.grid).toBe('....');
        // Notes in order, none overlapping.
        call.notes.slice(1).forEach((note, i) => {
          const before = call.notes[i];
          expect(note.onset).toBeGreaterThanOrEqual(
            before.onset + before.duration,
          );
        });
      }
    }
  });

  it('holds together: never more than two silent beats between notes', () => {
    for (const call of manyMelodyCalls(3)) {
      const beats = call.notes.map((n) => Math.floor(n.onset / BEAT_TICKS));
      beats.slice(1).forEach((beat, i) => {
        expect(beat - beats[i] - 1).toBeLessThanOrEqual(MAX_SILENT_BEATS);
      });
    }
  });

  it('uses its level’s tiers, and never Tier 4 outside the boss', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      const tiers = new Set(
        manyMelodyCalls(level).flatMap((c) => c.cards.map((k) => k.tier)),
      );
      expect(tiers).toEqual(new Set(ECHO_LEVELS[level].rhythmTiers));
    }
  });

  it('puts a Tier 4 card in every boss call, with the level’s tiers', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (const call of manyMelodyCalls(level, true, 120)) {
        const tiers = call.cards.map((k) => k.tier);
        expect(tiers).toContain(4);
        for (const tier of tiers) {
          expect([...ECHO_LEVELS[level].rhythmTiers, 4]).toContain(tier);
        }
      }
    }
  });

  it('is the same call for the same seed', () => {
    const key = { tonic: 'G', mode: 'major' } as const;
    const a = melodyCall(3, key, echoRandom(42));
    const b = melodyCall(3, key, echoRandom(42));
    expect(b).toEqual(a);
    const c = melodyCall(3, key, echoRandom(43));
    expect(c).not.toEqual(a);
  });
});

describe('a chord call’s rhythm', () => {
  it('strikes each bar’s card on its beats, from beat 1, breathing at the end', () => {
    const rng = echoRandom('chord-rhythm');
    for (const level of ECHO_LEVEL_NUMBERS) {
      for (let i = 0; i < 120; i++) {
        const call = chordCall(level, KEYS[i % KEYS.length], rng, {
          boss: i % 4 === 0,
        });
        expect(call.cards).toHaveLength(2);
        expect(call.attacks[0].onset).toBe(0);
        const last = call.attacks.at(-1)!;
        expect(last.onset + last.duration).toBeLessThanOrEqual(
          2 * BAR_TICKS - BEAT_TICKS,
        );
        // Bar 1's card on all four beats, bar 2's on three.
        const perBar = call.cards.map(cardNotes);
        expect(call.attacks).toHaveLength(4 * perBar[0] + 3 * perBar[1]);
        // A chord at most every 16th: four a beat at most.
        call.attacks.slice(1).forEach((attack, a) => {
          expect(attack.onset - call.attacks[a].onset).toBeGreaterThanOrEqual(
            120,
          );
        });
        for (let beat = 0; beat < 8; beat++) {
          const inBeat = call.attacks.filter(
            (attack) => Math.floor(attack.onset / BEAT_TICKS) === beat,
          );
          expect(inBeat.length).toBeLessThanOrEqual(4);
        }
        for (const card of call.cards) {
          expect(chordPlayable(card)).toBe(true);
          if (!call.boss) {
            expect(ECHO_LEVELS[level].rhythmTiers).toContain(card.tier);
          }
        }
        if (call.boss) {
          expect(call.cards.map((card) => card.tier)).toContain(4);
        }
      }
    }
  });

  it('plays 16ths from Level 2, and every Tier 4 card in the boss’s', () => {
    const tiersAt = (level: EchoLevelNumber, boss: boolean) => {
      const rng = echoRandom(`chord-tiers-${level}-${boss}`);
      const ids = new Set<number>();
      for (let i = 0; i < 300; i++) {
        const call = chordCall(level, KEYS[i % KEYS.length], rng, { boss });
        call.cards.forEach((card) => ids.add(card.id));
      }
      return ids;
    };
    const tier = (t: 1 | 2 | 3 | 4) => cardsOfTiers([t]).filter(chordPlayable);
    // Level 1: quarters and eighths only.
    expect(
      [...tiersAt(1, false)].every((id) => rhythmCard(id)!.tier === 1),
    ).toBe(true);
    // Level 2 and 3: every 16th card (Tier 2), in chord calls too.
    for (const level of [2, 3] as const) {
      const ids = tiersAt(level, false);
      for (const card of tier(2)) expect(ids).toContain(card.id);
    }
    // The boss: all four Tier 4 cards, the off-beat 16th-rest one in bar 2.
    const boss = tiersAt(1, true);
    for (const card of tier(4)) expect(boss).toContain(card.id);
  });

  it('puts Tier 4 in the boss’s calls only', () => {
    for (const level of ECHO_LEVEL_NUMBERS) {
      const rng = echoRandom(`boss-${level}`);
      for (let i = 0; i < 40; i++) {
        const calls = bossCalls(level, KEYS[i % KEYS.length], rng);
        for (const call of calls) {
          expect(call.boss).toBe(true);
          expect(call.cards.map((c) => c.tier)).toContain(4);
        }
        const plain = chordCall(level, KEYS[i % KEYS.length], rng);
        expect(plain.cards.map((c) => c.tier)).not.toContain(4);
      }
    }
  });
});
