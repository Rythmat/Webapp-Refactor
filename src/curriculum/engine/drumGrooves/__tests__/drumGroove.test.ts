import { describe, expect, it, vi } from 'vitest';
import {
  barTicks,
  blankGroove,
  buildDesignedDrums,
  inferGrid,
  nextVelocity,
  offGridHits,
  resizeLoop,
  toCounted,
  toQuarterBpm,
  type DrumGroove,
} from '../drumGroove';
import { getLiveGroove, listDesignedGrooves } from '../registry';

const groove = (patch: Partial<DrumGroove> = {}): DrumGroove => ({
  ...blankGroove('test', 'Test'),
  hits: [
    { tick: 0, note: 36, velocity: 100 },
    { tick: 480, note: 38, velocity: 96 },
  ],
  ...patch,
});

describe('drum groove grid', () => {
  it('measures bars by note value, not beat count', () => {
    expect(barTicks([4, 4])).toBe(1920);
    expect(barTicks([12, 8])).toBe(2880);
    expect(barTicks([6, 8])).toBe(1440);
  });

  it('infers the coarsest grid every hit sits on', () => {
    expect(inferGrid([{ tick: 240, note: 42, velocity: 90 }])).toBe('8n');
    expect(inferGrid([{ tick: 120, note: 42, velocity: 90 }])).toBe('16n');
    expect(inferGrid([{ tick: 160, note: 42, velocity: 90 }])).toBe('8t');
    expect(inferGrid([{ tick: 420, note: 38, velocity: 90 }])).toBe('32n');
  });

  it('reports hits between steps rather than snapping them', () => {
    const hits = [
      { tick: 0, note: 36, velocity: 90 },
      { tick: 420, note: 38, velocity: 60 },
    ];
    expect(offGridHits(hits, '16n')).toEqual([hits[1]]);
    expect(offGridHits(hits, '32n')).toEqual([]);
  });
});

describe('tempo units', () => {
  it('shows a 12/8 shuffle in dotted quarters while storing quarters', () => {
    expect(toCounted(234, 'dotted-quarter')).toBe(156);
    expect(toQuarterBpm(156, 'dotted-quarter')).toBe(234);
    expect(toCounted(100, 'quarter')).toBe(100);
  });
});

describe('velocity cycle', () => {
  it('goes ghost → soft → normal → accent → ghost', () => {
    expect(nextVelocity(38)).toBe(70);
    expect(nextVelocity(70)).toBe(96);
    expect(nextVelocity(96)).toBe(112);
    expect(nextVelocity(112)).toBe(38);
  });
});

describe('buildDesignedDrums', () => {
  it('tiles the pattern across the backing', () => {
    const notes = buildDesignedDrums(groove(), 4);
    expect(notes.filter((n) => n.note === 36).map((n) => n.onset)).toEqual([
      0, 1920, 3840, 5760,
    ]);
    expect(notes.every((n) => n.part === 'drums')).toBe(true);
  });

  it('applies pad trims to velocity, clamped to MIDI range', () => {
    const notes = buildDesignedDrums(
      groove({ padGains: { 36: 0.5, 38: 2 } }),
      1,
    );
    expect(notes.find((n) => n.note === 36)?.velocity).toBe(50);
    expect(notes.find((n) => n.note === 38)?.velocity).toBe(127);
  });

  it('never humanizes a hit earlier than written', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    const notes = buildDesignedDrums(
      groove({ humanize: { timing: 6, velocity: 0 } }),
      1,
    );
    random.mockRestore();
    expect(notes.map((n) => n.onset)).toEqual([6, 486]);
  });

  it('drops hits past the pattern end and past the backing', () => {
    const notes = buildDesignedDrums(
      groove({
        bars: 2,
        hits: [
          { tick: 0, note: 36, velocity: 90 },
          { tick: 1920, note: 38, velocity: 90 },
        ],
      }),
      3,
    );
    expect(notes.map((n) => n.onset)).toEqual([0, 1920, 3840]);
  });
});

describe('resizeLoop', () => {
  const twoBars = groove({
    bars: 2,
    hits: [
      { tick: 0, note: 36, velocity: 100 },
      { tick: 1920 + 480, note: 38, velocity: 96 },
    ],
  });
  const ticks = (g: DrumGroove) =>
    g.hits.map((h) => `${h.tick}:${h.note}`).sort();

  it('fills new bars by repeating the pattern', () => {
    const four = resizeLoop(twoBars, 4);
    expect(four.bars).toBe(4);
    expect(ticks(four)).toEqual(
      ['0:36', '2400:38', '3840:36', '6240:38'].sort(),
    );
  });

  it('keeps hits past the end when shrinking, and restores them on growing', () => {
    const edited = {
      ...resizeLoop(twoBars, 4),
      // bar 4 rewritten as a fill
      hits: [
        ...resizeLoop(twoBars, 4).hits.filter((h) => h.tick < 5760),
        { tick: 5760 + 1440, note: 45, velocity: 96 },
      ],
    };
    const shrunk = resizeLoop(edited, 2);
    expect(shrunk.bars).toBe(2);
    expect(shrunk.hits).toEqual(edited.hits);
    expect(ticks(resizeLoop(shrunk, 4))).toEqual(ticks(edited));
  });
});

describe('registry', () => {
  it('only hands lessons published grooves', () => {
    for (const g of listDesignedGrooves()) {
      expect(getLiveGroove(g.id)).toBe(g.status === 'live' ? g : undefined);
    }
    expect(getLiveGroove(undefined)).toBeUndefined();
    expect(getLiveGroove('no_such_groove')).toBeUndefined();
  });

  it('every groove file is well-formed', () => {
    for (const g of listDesignedGrooves()) {
      expect(g.id, g.id).toMatch(/^[a-z0-9][a-z0-9_-]*$/);
      expect(['draft', 'live'], g.id).toContain(g.status);
      expect(g.bars, g.id).toBeGreaterThan(0);
      for (const h of g.hits) {
        expect(h.velocity, g.id).toBeGreaterThanOrEqual(1);
        expect(h.velocity, g.id).toBeLessThanOrEqual(127);
        expect(h.tick, g.id).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
