import { describe, expect, it } from 'vitest';
import {
  chordSymbolTones,
  type ChordSymbolTones,
} from '../../genreGeneration/chordSymbolTones';
import { SCALES } from '../../genreGeneration/scaleRegistry';
import {
  followChords,
  followsChords,
  numberPart,
  partChordAt,
  type FollowedNote,
} from '../followChords';
import {
  barTicks,
  partTicks,
  playedTick,
  type InstrumentPart,
  type PartKey,
  type PartNote,
} from '../part';
import { getPart, listParts } from '../registry';

/**
 * "Follows the chords": a captured part read as numbers against its own
 * chords, then played over a student's chart. Over its own chords it must
 * play exactly as captured; over a student's it must sound like the same
 * player there — in the chart's key, on its chords, in the part's register,
 * in the player's rhythm.
 */

const NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const mod12 = (n: number) => ((n % 12) + 12) % 12;
const noteName = (midi: number) =>
  `${NAMES[mod12(midi)]}${Math.floor(midi / 12) - 1}`;

const part = (id: string): InstrumentPart => {
  const found = getPart(id);
  if (!found) throw new Error(`no part ${id}`);
  return found;
};

/** A part's numbers at one written tick, low to high (one hand if named). */
function numbersAt(p: InstrumentPart, tick: number, hand?: 'lh' | 'rh') {
  return numberPart(p)
    .filter((n) => p.notes[n.index].tick === tick)
    .filter((n) => hand === undefined || n.hand === hand)
    .sort((a, b) => p.notes[a.index].midi - p.notes[b.index].midi);
}
const labels = (p: InstrumentPart, tick: number, hand?: 'lh' | 'rh') =>
  numbersAt(p, tick, hand).map((n) => n.number);

/** A chart of one chord a bar, looping, in a part's meter. */
function chart(symbols: string[], bar: number) {
  const tones = symbols.map((s) => chordSymbolTones(s)!);
  return (tick: number) => tones[Math.floor(tick / bar) % tones.length];
}

/** The part's own notes looped from 0 for `span` ticks, as a band plays it. */
function looped(p: InstrumentPart, span: number): PartNote[] {
  const loop = partTicks(p);
  const out: PartNote[] = [];
  for (let start = 0; start < span; start += loop)
    for (const n of p.notes)
      if (start + playedTick(n) < span)
        out.push({ ...n, tick: start + n.tick });
  return out;
}

const noteKey = (n: PartNote) =>
  [n.tick, n.offset ?? 0, n.midi, n.duration, n.velocity, n.hand ?? ''].join();
const rhythmKey = (n: PartNote) =>
  [n.tick, n.offset ?? 0, n.duration, n.velocity, n.hand ?? ''].join();

const sameChord = (a: ChordSymbolTones, b: ChordSymbolTones) =>
  a.rootPc === b.rootPc &&
  a.bassPc === b.bassPc &&
  a.intervals.join() === b.intervals.join();

const keyPcs = (key: PartKey) =>
  new Set(SCALES[key.mode].map((i) => mod12(key.tonic + i)));

/** Every part that follows chords and names some. */
const FOLLOWERS = listParts().filter(
  (p) => followsChords(p) && p.chordSymbols?.length && p.notes.length,
);

describe('numbering a part', () => {
  it('reads the funk take’s 9th shapes as ♭7–9–5 of each chord', () => {
    const funk = part('funk-pianist-1-l2-syncopation-sauce-take-24');
    expect(labels(funk, 0)).toEqual(['b7', '9', '5']);
    expect(numbersAt(funk, 0)[0].chord).toBe('Am7');
    // Its chart is one chord a bar, as the band take wrote it.
    expect(labels(funk, 1920)).toEqual(['b7', '9', '5']);
    expect(numbersAt(funk, 1920)[0].chord).toBe('D7');
  });

  it('tags the chord a half step below the next one as an approach', () => {
    const funk = part('funk-pianist-1-l2-syncopation-sauce-take-24');
    // G♭–B♭–E♭ into G–B–E, numbered by the key's scale degree.
    expect(numbersAt(funk, 480).map((n) => n.role)).toEqual([
      'approach',
      'approach',
      'approach',
    ]);
    expect(labels(funk, 480)).toEqual(['6', 'b2', '#4']);
    // A♭9 into A9, where the chart names it.
    const funk9 = part('funk-l2-d2-2-lh-funk9-approach-rh-motivic-melody');
    expect(numbersAt(funk9, 240).every((n) => n.role === 'approach')).toBe(
      true,
    );
    expect(numbersAt(funk9, 360).map((n) => n.role)).toEqual([
      'chord',
      'chord',
      'chord',
    ]);
  });

  it('follows a voice-led change, with the bass under it', () => {
    const jam = part('hip-hop-l1-d2-2-jam-cm-g-1st-inversion');
    expect(labels(jam, 0, 'rh')).toEqual(['1', 'b3', '5']);
    expect(labels(jam, 1920, 'rh')).toEqual(['3', '5', '1']);
    // The unmarked bass of a right-hand part is its own hand.
    const bass = numbersAt(jam, 1920).find((n) => n.hand === undefined)!;
    expect(bass).toMatchObject({ number: '1', voice: 0, voices: 1 });
  });

  it('keeps each note’s hand and place in its hand’s stack', () => {
    const p = part('funk-l2-d3-1-integrated-performance-lh-bass-rh-chords');
    expect(numbersAt(p, 0, 'lh')).toMatchObject([
      { number: '1', voice: 0, voices: 1 },
    ]);
    expect(numbersAt(p, 0, 'rh')).toMatchObject([
      { number: 'b3', voice: 0, voices: 3, chord: 'Am9' },
      { number: 'b7', voice: 1, voices: 3 },
      { number: '9', voice: 2, voices: 3 },
    ]);
    expect(labels(p, 5760, 'rh')).toEqual(['b7', '3', '#5']); // E7#5
    // A note a two-hand part leaves unmarked joins the hand it sits in.
    const stab = part('funk-l1-d1-1-lh-root-pattern-rh-funk-stab-1');
    expect(numbersAt(stab, 1320).map((n) => n.hand)).toEqual([
      'rh',
      'rh',
      'rh',
    ]);
  });

  it('numbers a line’s passing tones and approaches by scale degree', () => {
    const boomBap = part('hip-hop-l2-c4-c1-boom-bap-bass');
    expect(numbersAt(boomBap, 840)).toMatchObject([
      { role: 'passing', number: 'b7' }, // G between E and A
    ]);
    const trap = part('hip-hop-l1-c27-c1-the-trap-bass-pattern-copy');
    expect(numbersAt(trap, 1200)).toMatchObject([
      { role: 'approach', number: 'b6' }, // A♭ into G
    ]);
    expect(labels(trap, 1920)).toEqual(['5']);
  });

  it('starts a chord at its bar when its bass comes before its first strike', () => {
    // The vals' bass on 1, the chord on 2 and 3: the bass is already C's.
    const vals = part('latin-l1-d3-2-mariachi-lh-vals-through-the-progression');
    expect(numbersAt(vals, 1440)).toMatchObject([{ number: '1', chord: 'C' }]);
    expect(numbersAt(vals, 2880)).toMatchObject([{ number: '1', chord: 'D7' }]);
  });

  it('has no numbers, and no chart, for a part that names no chords', () => {
    const bare = part('funk-l2-d93-d1-lh-bass-rh-chords-headhunters-copy');
    expect(bare.chordSymbols).toBeUndefined();
    expect(numberPart(bare)).toEqual([]);
    expect(partChordAt(bare)).toBeNull();
    expect(followChords(bare, chart(['C'], 1920), 1920, bare.key)).toBeNull();
  });

  it('leaves melodies and drums to play as written', () => {
    const melody = part('funk-l1-a1-scale-d-minor-pentatonic');
    expect(followsChords(melody)).toBe(false);
    expect(followsChords({ instrument: 'drums', role: 'groove' })).toBe(false);
    expect(followsChords({ instrument: 'bass', role: 'bassline' })).toBe(true);
  });
});

describe('the round trip', () => {
  it('covers the library', () => {
    expect(FOLLOWERS.length).toBeGreaterThan(60);
  });

  it.each(FOLLOWERS.map((p) => [p.id, p] as const))(
    '%s plays exactly as captured over its own chords',
    (_, p) => {
      const span = 3 * partTicks(p);
      const notes = followChords(p, partChordAt(p)!, span, p.key)!;
      expect(notes.map(noteKey).sort()).toEqual(
        looped(p, span).map(noteKey).sort(),
      );
    },
  );
});

/** Student-style charts: diatonic triads in major and natural minor. */
const CHARTS: { name: string; chords: string[]; key: PartKey }[] = [
  {
    name: 'C F G C in C major',
    chords: ['C', 'F', 'G', 'C'],
    key: { tonic: 0, mode: 'ionian' },
  },
  {
    name: 'Dm Gm Am Bb in D minor',
    chords: ['Dm', 'Gm', 'Am', 'Bb'],
    key: { tonic: 2, mode: 'aeolian' },
  },
  {
    name: 'Em C D Em in E minor',
    chords: ['Em', 'C', 'D', 'Em'],
    key: { tonic: 4, mode: 'aeolian' },
  },
  {
    name: 'a 2-bar C G in C major',
    chords: ['C', 'G'],
    key: { tonic: 0, mode: 'ionian' },
  },
];

/** A part played over a student chart for 8 bars, with what it played. */
function overChart(p: InstrumentPart, c: (typeof CHARTS)[number]) {
  const bar = barTicks(p.timeSignature);
  const span = 8 * bar;
  const notes = followChords(p, chart(c.chords, bar), span, c.key)!;
  const numbers = numberPart(p);
  const key = keyPcs(c.key);
  const own = keyPcs(p.key);
  const sameKey = key.size === own.size && [...key].every((x) => own.has(x));
  // Over the very chord, in the very key, it was played on, a note is as
  // the player played it, so the rules for new chords don't apply to it.
  const asPlayed = (n: FollowedNote) =>
    sameKey && sameChord(chordSymbolTones(numbers[n.source].chord)!, n.chord);
  // The notes each hand strikes together.
  const hits = new Map<string, FollowedNote[]>();
  for (const n of notes) {
    const at = `${numbers[n.source].hand ?? '-'}@${n.tick}`;
    hits.set(at, [...(hits.get(at) ?? []), n]);
  }
  return { notes, numbers, key, span, asPlayed, hits: [...hits.values()] };
}

const triad = (c: ChordSymbolTones) =>
  new Set([0, c.third ?? 0, c.fifth ?? 7].map((i) => mod12(c.rootPc + i)));

describe.each(CHARTS)('over $name', (c) => {
  it.each(FOLLOWERS.map((p) => [p.id, p] as const))(
    '%s keeps the player’s rhythm, the key and the chords',
    (_, p) => {
      const { notes, numbers, key, span, asPlayed, hits } = overChart(p, c);

      // The rhythm is the player's: every note's timing, length, velocity
      // and hand, as captured, looped.
      expect(notes.map(rhythmKey).sort()).toEqual(
        looped(p, span).map(rhythmKey).sort(),
      );

      // Diatonic to the chart's key, but for approach notes.
      const outside = notes.filter(
        (n) => n.role !== 'approach' && !key.has(mod12(n.midi)) && !asPlayed(n),
      );
      expect(outside.map((n) => `${noteName(n.midi)}@${n.tick}`)).toEqual([]);

      // No avoid note a chord doesn't name: a ♭9 over any chord, a ♮11 over
      // a major one, a ♭13 over a minor one.
      const avoid = notes.filter((n) => {
        if (n.role !== 'chord' || asPlayed(n)) return false;
        const i = mod12(n.midi - n.chord.rootPc);
        if (n.chord.intervals.includes(i)) return false;
        return (
          i === 1 ||
          (i === 5 && n.chord.third === 4) ||
          (i === 8 && n.chord.third === 3)
        );
      });
      expect(avoid.map((n) => `${noteName(n.midi)}@${n.tick}`)).toEqual([]);

      // A chord the player built on its chord's root, 3rd or 5th holds the
      // new chord's.
      for (const hit of hits) {
        if (hit.length < 2 || hit.some((n) => n.role !== 'chord')) continue;
        const own = triad(chordSymbolTones(numbers[hit[0].source].chord)!);
        if (!hit.some((n) => own.has(mod12(p.notes[n.source].midi)))) continue;
        const target = triad(hit[0].chord);
        expect(
          hit.some((n) => target.has(mod12(n.midi))),
          `${hit.map((n) => noteName(n.midi)).join(' ')} @${hit[0].tick}`,
        ).toBe(true);
      }
    },
  );

  it.each(FOLLOWERS.map((p) => [p.id, p] as const))(
    '%s voice-leads in its own register',
    (_, p) => {
      const { notes, numbers, hits } = overChart(p, c);

      // Each hand within a tritone of where it was captured (an approach a
      // half step past the note it leads into).
      const range = new Map<string, [number, number]>();
      p.notes.forEach((n, i) => {
        const hand = numbers[i].hand ?? '-';
        const [lo, hi] = range.get(hand) ?? [n.midi, n.midi];
        range.set(hand, [Math.min(lo, n.midi), Math.max(hi, n.midi)]);
      });
      for (const n of notes) {
        const [lo, hi] = range.get(numbers[n.source].hand ?? '-')!;
        const past = Math.max(lo - n.midi, n.midi - hi, 0);
        expect(past, `${noteName(n.midi)}@${n.tick}`).toBeLessThanOrEqual(
          n.role === 'approach' ? 7 : 6,
        );
      }

      // Between one chord of a hand and its next of as many notes, no voice
      // moves more than a fifth further than the player's own voice moved
      // there, and on average no more than a minor third further: a new
      // chord can need some motion where the player's held still (a 1-3-7
      // shell from C to G moves its voices about that far).
      const chords = new Map<string, FollowedNote[][]>();
      for (const hit of hits) {
        const pitches = new Set(hit.map((n) => n.midi));
        if (pitches.size < 2 || hit.some((n) => n.role !== 'chord')) continue;
        const line = `${numbers[hit[0].source].hand ?? '-'}:${pitches.size}`;
        chords.set(line, [...(chords.get(line) ?? []), hit]);
      }
      const voices = (hit: FollowedNote[], own: boolean) =>
        [
          ...new Set(hit.map((n) => (own ? p.notes[n.source].midi : n.midi))),
        ].sort((a, b) => a - b);
      let further = 0;
      let moves = 0;
      for (const line of chords.values()) {
        line.sort((a, b) => a[0].tick - b[0].tick);
        for (let k = 1; k < line.length; k++) {
          const [from, to] = [
            voices(line[k - 1], false),
            voices(line[k], false),
          ];
          const [was, now] = [voices(line[k - 1], true), voices(line[k], true)];
          if (was.length !== now.length) continue;
          to.forEach((m, j) => {
            const extra = Math.abs(m - from[j]) - Math.abs(now[j] - was[j]);
            expect(
              extra,
              `${noteName(m)}@${line[k][0].tick}`,
            ).toBeLessThanOrEqual(7);
            further += extra;
            moves++;
          });
        }
      }
      if (moves) expect(further / moves).toBeLessThanOrEqual(3);
    },
  );
});

describe('over a student’s chart', () => {
  const dMinor = CHARTS[1];
  const cMajor = CHARTS[0];
  const firstHits = (
    p: InstrumentPart,
    c: (typeof CHARTS)[number],
    bar: number,
  ) => {
    const { notes } = overChart(p, c);
    const at = (tick: number) =>
      notes
        .filter((n) => n.tick === tick)
        .map((n) => n.midi)
        .sort((a, b) => a - b)
        .map(noteName);
    return at(bar * barTicks(p.timeSignature));
  };

  it('keeps a band’s color over plain triads, from the chart’s scale', () => {
    const funk = part('funk-pianist-1-l2-syncopation-sauce-take-24');
    // ♭7–9–5 over Dm in D minor: Dm9 without its root.
    expect(firstHits(funk, dMinor, 0)).toEqual(['C5', 'E5', 'A5']);
    // Over B♭ the 7th is the scale's major 7th: B♭maj9.
    expect(firstHits(funk, dMinor, 3)).toEqual(['F4', 'A4', 'C5']);
    // Over G in C major the 7th is F: G9, the 5 chord's own.
    expect(firstHits(funk, cMajor, 2).map((n) => n.slice(0, -1))).toEqual(
      expect.arrayContaining(['F']),
    );
  });

  it('turns a 9th the scale would flat into the chord’s root', () => {
    // Am in D minor: its 9th would be B♭, a ♭9.
    const funk = part('funk-pianist-1-l2-syncopation-sauce-take-24');
    const am = firstHits(funk, dMinor, 2);
    expect(am).not.toContain('B♭4');
    expect(am).toContain('A4');
  });

  it('keeps an approach chord a half step from the chord it leads into', () => {
    const funk = part('funk-pianist-1-l2-syncopation-sauce-take-24');
    const { notes } = overChart(funk, dMinor);
    const at = (tick: number) =>
      notes
        .filter((n) => n.tick === tick)
        .map((n) => n.midi)
        .sort((a, b) => a - b);
    expect(at(480)).toEqual(at(840).map((m) => m - 1));
  });

  it('lands a bass line’s roots on the new chords’ roots', () => {
    const boomBap = part('hip-hop-l2-c4-c1-boom-bap-bass');
    const { notes } = overChart(boomBap, dMinor);
    const roots = [0, 1, 2, 3].map(
      (bar) => notes.find((n) => n.tick === bar * 1920)!.midi,
    );
    expect(roots.map((m) => NAMES[mod12(m)])).toEqual(['D', 'G', 'A', 'B♭']);
  });

  it('follows a longer chart pass by pass, from where the last pass left off', () => {
    // A 2-bar line over 4 bars: its second pass plays Am and B♭.
    const boomBap = part('hip-hop-l2-c4-c1-boom-bap-bass');
    const bar = 1920;
    const chordAt = chart(dMinor.chords, bar);
    const four = followChords(boomBap, chordAt, 4 * bar, dMinor.key)!;
    const two = followChords(boomBap, chordAt, 2 * bar, dMinor.key)!;
    // The first pass is the same either way; the second follows its own bars.
    expect(four.filter((n) => n.tick < 2 * bar).map(noteKey)).toEqual(
      two.map(noteKey),
    );
    expect(
      four
        .filter((n) => n.tick >= 2 * bar)
        .every((n) => n.chord.rootPc === 9 || n.chord.rootPc === 10),
    ).toBe(true);
  });

  it('pushes into the next chord where the player pushed', () => {
    // The D9 shape on the last 16th of the bar rings into the next: over the
    // student's chart it is that bar's chord.
    const p = part(
      'funk-l2-d3-2-integrated-performance-two-bar-call-and-answer',
    );
    const { notes } = overChart(p, dMinor);
    const push = notes.filter((n) => n.tick === 1800);
    expect(push.length).toBe(3);
    expect(push.every((n) => n.chord.rootPc === 7)).toBe(true); // Gm
  });

  it('stays safe over any chart chordSymbolTones reads', () => {
    const odd = [
      'C5',
      'F#dim7',
      'G7alt',
      'Bb/D',
      'Ebm6',
      'Fsus4',
      'E7#9',
      'Abmaj7#11',
    ];
    for (const p of FOLLOWERS) {
      const bar = barTicks(p.timeSignature);
      const span = 8 * bar;
      const notes = followChords(p, chart(odd, bar), span, {
        tonic: 0,
        mode: 'ionian',
      })!;
      expect(notes.map(rhythmKey).sort()).toEqual(
        looped(p, span).map(rhythmKey).sort(),
      );
      for (const n of notes) {
        expect(Number.isInteger(n.midi)).toBe(true);
        expect(n.midi).toBeGreaterThanOrEqual(21);
        expect(n.midi).toBeLessThanOrEqual(108);
      }
    }
  });
});
