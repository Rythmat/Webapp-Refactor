import { describe, expect, it } from 'vitest';
import type { DrumGroove } from '../../drumGrooves/drumGroove';
import { getDesignedGroove } from '../../drumGrooves/registry';
import {
  gradeGrid,
  gradePlayed,
  playTolerance,
  timedNotes,
  type PlayedHit,
} from '../grade';
import { GROOVE_LAB_GROOVE_IDS, GROOVE_LAB_GROOVES } from '../grooveList';
import { buildLabGroove, laneSteps, secondBarDiffers } from '../labGroove';
import {
  GROOVE_LAB_LEVELS,
  gridOf,
  grooveBag,
  LEVEL_SPECS,
  levelBpm,
  levelPool,
  type GrooveLabLevel,
} from '../levels';

const groove = (over: Partial<DrumGroove>): DrumGroove => ({
  id: 'test',
  name: 'Test',
  status: 'live',
  timeSignature: [4, 4],
  feltBeats: 4,
  bars: 2,
  tempo: 100,
  tempoUnit: 'quarter',
  swing: 50,
  grid: '16n',
  kit: 'natural',
  padGains: {},
  humanize: { timing: 0, velocity: 0 },
  hits: [],
  ...over,
});

/** Straight 8ths on the hat, kick on 1 and 3, snare on 2 and 4, per bar. */
const rock = (bars = 2) =>
  Array.from({ length: bars }, (_, b) => [
    ...Array.from({ length: 8 }, (_, i) => ({
      tick: b * 1920 + i * 240,
      note: 42,
      velocity: 90,
    })),
    { tick: b * 1920, note: 36, velocity: 100 },
    { tick: b * 1920 + 960, note: 36, velocity: 100 },
    { tick: b * 1920 + 480, note: 38, velocity: 100 },
    { tick: b * 1920 + 1440, note: 38, velocity: 100 },
  ]).flat();

describe('a designed groove on three rows', () => {
  it('keeps the kick, the snare and the cymbal that keeps time, on its coarsest grid', () => {
    const g = buildLabGroove(
      groove({ hits: [...rock(), { tick: 0, note: 49, velocity: 100 }] }),
      1,
    )!;
    expect(g.cymbal).toBe('hat');
    expect(g.stepsPerBeat).toBe(2);
    expect(g.steps).toBe(8);
    expect([...laneSteps(g).kick]).toEqual([0, 4]);
    expect([...laneSteps(g).snare]).toEqual([2, 6]);
    expect(g.lanes.cymbal).toHaveLength(8);
    // The crash isn't one of the three.
    expect(g.lanes.cymbal.every((h) => h.note === 42)).toBe(true);
  });

  it('takes the ride when it plays more than the hat', () => {
    const hits = [
      ...Array.from({ length: 6 }, (_, i) => ({
        tick: i * 320,
        note: 51,
        velocity: 90,
      })),
      { tick: 480, note: 44, velocity: 60 },
      { tick: 1440, note: 44, velocity: 60 },
      { tick: 0, note: 36, velocity: 100 },
      { tick: 960, note: 38, velocity: 100 },
    ];
    const g = buildLabGroove(groove({ grid: '8t', bars: 1, hits }), 1)!;
    expect(g.cymbal).toBe('ride');
    expect(g.pads.cymbal).toBe(51);
    expect(g.stepsPerBeat).toBe(3);
  });

  it('puts the sidestick on the snare row when the bars have no snare', () => {
    const hits = rock(1).map((h) => (h.note === 38 ? { ...h, note: 40 } : h));
    const g = buildLabGroove(groove({ bars: 1, hits }), 1)!;
    expect(g.pads.snare).toBe(40);
    expect(g.lanes.snare).toHaveLength(2);
  });

  it('never goes finer than the grid it was designed on', () => {
    const hits = [...rock(1), { tick: 60, note: 42, velocity: 40 }];
    const g = buildLabGroove(groove({ bars: 1, grid: '16n', hits }), 1)!;
    expect(g.stepsPerBeat).toBe(4);
  });

  it('sounds the drummer’s feel, while the cell stays written', () => {
    const hits = rock(1).map((h) =>
      h.tick === 240 && h.note === 42 ? { ...h, offset: 80 } : h,
    );
    const g = buildLabGroove(groove({ bars: 1, hits }), 1)!;
    const skip = g.lanes.cymbal.find((h) => h.step === 1)!;
    expect(skip.tick).toBe(240);
    expect(skip.playedTick).toBe(320);
  });

  it('keeps an open hi-hat open on the hat’s row', () => {
    const hits = [...rock(1), { tick: 1680, note: 46, velocity: 90 }].filter(
      (h) => !(h.tick === 1680 && h.note === 42),
    );
    const g = buildLabGroove(groove({ bars: 1, hits }), 1)!;
    expect([...laneSteps(g).open]).toEqual([7]);
    expect(g.lanes.cymbal.find((h) => h.step === 7)?.note).toBe(46);
  });

  it('puts a sidestick backbeat on the snare row beside the snare', () => {
    const hits = rock(1).map((h) =>
      h.tick === 480 && h.note === 38 ? { ...h, note: 40 } : h,
    );
    const g = buildLabGroove(groove({ bars: 1, hits }), 1)!;
    expect([...laneSteps(g).snare]).toEqual([2, 6]);
    expect(g.pads.snare).toBe(38);
  });

  it('starts at a later bar, and puts an off-grid hit where it was played', () => {
    const hits = [
      ...rock(3).filter((h) => h.tick < 3840 || h.note !== 36),
      // A swung "e" of beat 3, written on a 16th triplet, played late.
      { tick: 3840 + 1120, note: 36, velocity: 100, offset: -5 },
      { tick: 3840, note: 36, velocity: 100 },
    ];
    const g = buildLabGroove(groove({ bars: 3, hits }), 1, { fromBar: 3 })!;
    expect(g.stepsPerBeat).toBe(4);
    expect([...laneSteps(g).kick]).toEqual([0, 9]);
    // It still sounds where it was played.
    expect(g.lanes.kick[1].playedTick).toBe(1115);
  });

  it('leaves out bars with no cymbal keeping time', () => {
    const hits = rock(1).filter((h) => h.note !== 42);
    expect(buildLabGroove(groove({ bars: 1, hits }), 1)).toBeNull();
  });

  it('knows a second bar that is more than the first again', () => {
    const same = buildLabGroove(groove({ hits: rock() }), 2)!;
    expect(secondBarDiffers(same)).toBe(false);
    const fill = buildLabGroove(
      groove({
        hits: [...rock(), { tick: 1920 + 1680, note: 38, velocity: 80 }],
      }),
      2,
    )!;
    expect(secondBarDiffers(fill)).toBe(true);
  });
});

describe('the levels', () => {
  const lab = buildLabGroove(groove({ tempo: 118, hits: rock() }), 1)!;
  const designed = new Map(
    GROOVE_LAB_GROOVE_IDS.flatMap((id) => {
      const g = getDesignedGroove(id);
      return g ? [[id, g] as const] : [];
    }),
  );
  const ids = (n: GrooveLabLevel) => levelPool(n, designed).map((g) => g.id);

  it('plays Levels 1–5 at a learning tempo, 6–10 at the groove’s own', () => {
    for (const n of [1, 2, 3, 4, 5] as const) expect(levelBpm(n, lab)).toBe(95);
    for (const n of [6, 7, 8, 9, 10] as const)
      expect(levelBpm(n, lab)).toBe(118);
  });

  it('climbs a bar of 8ths, of 16ths, two of each, then the advanced, then all five fast', () => {
    expect(GROOVE_LAB_LEVELS.map((n) => LEVEL_SPECS[n].title)).toEqual([
      'One bar of 8ths',
      'One bar of 16ths',
      'Two bars of 8ths',
      'Two bars of 16ths',
      'Advanced: two bars of 16ths',
      'One bar of 8ths, full tempo',
      'One bar of 16ths, full tempo',
      'Two bars of 8ths, full tempo',
      'Two bars of 16ths, full tempo',
      'Advanced: two bars of 16ths, full tempo',
    ]);
  });

  it('plays the owner’s pick where he placed it', () => {
    // Pop: Straight 8 and Pop 01 a bar of 8ths; Dance Pop everywhere it
    // fits, a bar of 8ths without its open hat.
    expect(ids(1)).toEqual(
      expect.arrayContaining(['straight-8', 'pop-01', 'dance-pop-8ths']),
    );
    expect(ids(2)).toContain('dance-pop');
    expect(ids(4)).toContain('dance-pop');
    expect(ids(3)).not.toContain('straight-8');
    // Jazz: Blues Shuffle one bar; Boogaloo and New Orleans two; Poinciana a
    // bar of 16ths; Jazz Swing one and two.
    expect(ids(1)).toEqual(
      expect.arrayContaining(['blues-shuffle', 'jazz-swing']),
    );
    expect(ids(3)).toEqual(
      expect.arrayContaining(['boogaloo', 'new-orleans', 'jazz-swing']),
    );
    expect(ids(2)).toContain('poinciana');
    // Funk: Funk 01 and Heavy Funk a bar of 16ths; Funk and Four on the
    // Floor two.
    expect(ids(2)).toEqual(expect.arrayContaining(['funk-01', 'heavy-funk']));
    expect(ids(4)).toEqual(
      expect.arrayContaining(['funk', 'four-on-the-floor-funk']),
    );
    // Hip hop: Boom Bap a bar of 8ths and two of 16ths.
    expect(ids(1)).toContain('boom-bap');
    expect(ids(4)).toContain('boom-bap');
    // Latin: salsa and merengue two bars only.
    for (const n of [1, 2] as const)
      expect(ids(n)).not.toEqual(expect.arrayContaining(['salsa-2-3']));
    expect([...ids(3), ...ids(4)]).toEqual(
      expect.arrayContaining(['salsa-2-3', 'salsa-3-2', 'merengue']),
    );
    // The advanced level, and only it, has Drum 'n' Bass and Afrobeat.
    expect(ids(5).sort()).toEqual(['afrobeat', 'drum-n-bass']);
    expect(ids(4)).not.toContain('drum-n-bass');
    // The fast levels are the same grooves.
    expect(ids(6)).toEqual(ids(1));
    expect(ids(10)).toEqual(ids(5));
  });

  it('holds only the owner’s pick, each level with grooves to play', () => {
    const picked = new Set(GROOVE_LAB_GROOVES.map((e) => e.key));
    for (const n of GROOVE_LAB_LEVELS) {
      const pool = levelPool(n, designed);
      expect(pool.length, `Level ${n}`).toBeGreaterThanOrEqual(2);
      expect(pool.every((g) => picked.has(g.id))).toBe(true);
      expect(pool.every((g) => gridOf(g) === LEVEL_SPECS[n].grid)).toBe(true);
    }
  });

  it('keeps the owner’s changes: Poinciana’s 4& on the kick, New Orleans without its 32nds', () => {
    const poinciana = levelPool(2, designed).find((g) => g.id === 'poinciana')!;
    expect(laneSteps(poinciana).kick.has(14)).toBe(true);
    const newOrleans = levelPool(3, designed).find(
      (g) => g.id === 'new-orleans',
    )!;
    expect(gridOf(newOrleans)).toBe('eighths');
  });

  it('deals each groove once before any comes again, never twice running, and Level 1 opens on Straight 8', () => {
    const pool = ['a', 'b', 'c'].map((id) => ({ ...lab, id, lead: false }));
    const bag = grooveBag(pool, () => 0, 'b');
    expect(bag.map((g) => g.id).sort()).toEqual(['a', 'b', 'c']);
    expect(bag[0].id).not.toBe('b');
    const first = grooveBag(
      levelPool(1, designed),
      Math.random,
      undefined,
      true,
    );
    expect(first[0].id).toBe('straight-8');
  });
});

describe('grading the grid', () => {
  const lab = buildLabGroove(groove({ bars: 1, hits: rock(1) }), 1)!;
  const target = laneSteps(lab);

  it('passes the groove, and a slip a bar', () => {
    expect(gradeGrid(lab, target).passed).toBe(true);
    const slip = { ...target, kick: new Set([0]) };
    expect(gradeGrid(lab, slip)).toMatchObject({ passed: true, mistakes: 1 });
  });

  it('gives no credit for empty cells: a blank grid scores nothing', () => {
    const blank = {
      cymbal: new Set<number>(),
      snare: new Set<number>(),
      kick: new Set<number>(),
    };
    expect(gradeGrid(lab, blank)).toMatchObject({ passed: false, accuracy: 0 });
  });

  it('counts an open hat clicked closed (or closed clicked open) as a slip', () => {
    const hits = [...rock(1), { tick: 1680, note: 46, velocity: 90 }].filter(
      (h) => !(h.tick === 1680 && h.note === 42),
    );
    const g = buildLabGroove(groove({ bars: 1, hits }), 1)!;
    const closed = { ...laneSteps(g), open: new Set<number>() };
    expect(gradeGrid(g, closed)).toMatchObject({ mistakes: 1 });
    expect(gradeGrid(g, closed).missing.cymbal).toEqual([7]);
    expect(gradeGrid(g, laneSteps(g)).mistakes).toBe(0);
  });

  it('counts extra hits as mistakes', () => {
    const busy = { ...target, snare: new Set([0, 1, 2, 3, 4, 5, 6, 7]) };
    const grade = gradeGrid(lab, busy);
    expect(grade.extra.snare).toEqual([0, 1, 3, 4, 5, 7]);
    expect(grade.passed).toBe(false);
  });
});

describe('grading the pads, in time', () => {
  const lab = buildLabGroove(groove({ bars: 1, hits: rock(1) }), 1)!;
  const notes = timedNotes(lab, 100);
  const tolerance = playTolerance(notes);
  const start = 10;
  const played = (shift = 0): PlayedHit[] =>
    notes.map((n) => ({ t: start + n.at + shift, lane: n.lane }));

  it('passes the groove played a little early or late', () => {
    expect(
      gradePlayed(notes, played(0.03), start, 2.4, 1, tolerance).passed,
    ).toBe(true);
    expect(
      gradePlayed(notes, played(-0.03), start, 2.4, 1, tolerance).passed,
    ).toBe(true);
  });

  it('misses a note played on the wrong drum', () => {
    const hits = played();
    hits[0] = { ...hits[0], lane: hits[0].lane === 'kick' ? 'snare' : 'kick' };
    const grade = gradePlayed(notes, hits, start, 2.4, 1, tolerance);
    expect(grade.matched.size).toBe(notes.length - 1);
    expect(grade.passed).toBe(false);
  });

  it('hears a closed hat for an open one as a miss', () => {
    const hits = [...rock(1), { tick: 1680, note: 46, velocity: 90 }].filter(
      (h) => !(h.tick === 1680 && h.note === 42),
    );
    const g = buildLabGroove(groove({ bars: 1, hits }), 1)!;
    const n = timedNotes(g, 100);
    const tol = playTolerance(n);
    const asHeard = n.map((x) => ({
      t: start + x.at,
      lane: x.lane,
      open: x.open,
    }));
    expect(gradePlayed(n, asHeard, start, 2.4, 1, tol).passed).toBe(true);
    const allClosed = asHeard.map((h) => ({ ...h, open: false }));
    expect(gradePlayed(n, allClosed, start, 2.4, 1, tol).matched.size).toBe(
      n.length - 1,
    );
  });

  it('lets one stray hit a bar pass, not two', () => {
    const one = [...played(), { t: start + 0.05, lane: 'snare' as const }];
    expect(gradePlayed(notes, one, start, 2.4, 1, tolerance).passed).toBe(true);
    const two = [...one, { t: start + 1.1, lane: 'kick' as const }];
    expect(gradePlayed(notes, two, start, 2.4, 1, tolerance).passed).toBe(
      false,
    );
  });
});
