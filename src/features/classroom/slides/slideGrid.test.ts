/**
 * The grid's structural guarantees.
 *
 * These are the assertions that let every other part of P2 stop checking at
 * runtime: if no content zone can reach the footer band, then "adding an
 * interaction never reflows the slide" is true by construction rather than by
 * vigilance.
 */
import { describe, expect, it } from 'vitest';
import {
  FOOTER_BAND,
  M,
  REFLOW_BAND_AFTER,
  REFLOW_ORDER,
  SAFE_AREA,
  SLIDE_CANVAS,
  SLIDE_GRID,
  SUBTITLE_COMPATIBLE,
  ZONE_FAMILIES,
  ZONE_NAMES,
  isZoneName,
  MIGRATION_TARGETS,
  nearestZone,
  rectsOverlap,
  resolveElementRects,
  revealBandRect,
  validateLayout,
  zoneRect,
  type ZoneName,
} from './slideGrid';

const contentZones = ZONE_NAMES.filter((z) => SLIDE_GRID[z].role === 'content');

describe('every zone is inside the canvas', () => {
  it.each(ZONE_NAMES)('%s', (zone) => {
    const r = zoneRect(zone);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(SLIDE_CANVAS.w);
    expect(r.y + r.h).toBeLessThanOrEqual(SLIDE_CANVAS.h);
    expect(r.w).toBeGreaterThan(0);
    expect(r.h).toBeGreaterThan(0);
  });
});

describe('THE load-bearing invariant: no content zone enters the footer band', () => {
  it.each(contentZones)('%s ends before y=620', (zone) => {
    const r = zoneRect(zone);
    expect(
      r.y + r.h,
      `${zone} bottom must not reach the footer band at y=${FOOTER_BAND.y}`,
    ).toBeLessThanOrEqual(FOOTER_BAND.y);
  });

  it('content zones all end at or above the safe-area bottom', () => {
    for (const zone of contentZones) {
      const r = zoneRect(zone);
      expect(r.y + r.h, zone).toBeLessThanOrEqual(SAFE_AREA.bottom);
    }
  });

  it('the footer band is reserved on every slide, not conditional', () => {
    expect(SLIDE_GRID.footer.rect).toEqual(FOOTER_BAND);
    expect(SLIDE_GRID.footer.role).toBe('footer');
  });
});

describe('content zones respect the margin and safe area', () => {
  // heroMedia, ctaCenter and the centre stack are deliberately centred and so
  // sit inside the margin rather than on it.
  const fullWidth: ZoneName[] = [
    'title',
    'subtitle',
    'body',
    'bodyShort',
    'tileRow',
    'rowA',
    'rowB',
    'rowC',
  ];

  it.each(fullWidth)('%s spans margin to margin', (zone) => {
    const r = zoneRect(zone);
    expect(r.x).toBe(M);
    expect(r.x + r.w).toBe(SAFE_AREA.right);
  });

  it.each(contentZones)('%s starts at or after the safe-area top', (zone) => {
    // utilityTopRight sits in the chrome band by design.
    if (zone === 'utilityTopRight') return;
    expect(zoneRect(zone).y).toBeGreaterThanOrEqual(SAFE_AREA.y);
  });
});

describe('split and media geometry', () => {
  it('left/right leave a 32px gutter and reach the safe edges', () => {
    const l = zoneRect('left');
    const r = zoneRect('right');
    expect(l.x).toBe(M);
    expect(r.x - (l.x + l.w)).toBe(32);
    expect(r.x + r.w).toBe(SAFE_AREA.right);
  });

  it('media zones are 16:9 — the corpus is video-dominant', () => {
    for (const zone of ['mediaLeft', 'mediaRight', 'heroMedia'] as ZoneName[]) {
      const r = zoneRect(zone);
      expect(Math.abs(r.w / r.h - 16 / 9), `${zone} aspect`).toBeLessThan(0.01);
    }
  });

  it('centred zones are actually centred on the canvas', () => {
    for (const zone of [
      'heroMedia',
      'ctaCenter',
      'centerStackTop',
      'centerStackBottom',
    ] as ZoneName[]) {
      const r = zoneRect(zone);
      expect(r.x, `${zone} left`).toBe((SLIDE_CANVAS.w - r.w) / 2);
    }
  });
});

describe('families', () => {
  it('every non-chrome, non-any zone belongs to exactly one family', () => {
    const seen = new Map<ZoneName, string>();
    for (const [family, zones] of Object.entries(ZONE_FAMILIES)) {
      for (const z of zones) {
        expect(seen.has(z), `${z} is in two families`).toBe(false);
        seen.set(z, family);
        expect(SLIDE_GRID[z].family).toBe(family);
      }
    }
  });

  it('no two zones WITHIN one family overlap', () => {
    for (const [family, zones] of Object.entries(ZONE_FAMILIES)) {
      // `split` deliberately pairs a text column with a media column in the
      // same half — left/mediaLeft are alternatives, never both.
      const pairs =
        family === 'split'
          ? [
              ['left', 'right'],
              ['mediaLeft', 'mediaRight'],
              ['left', 'mediaRight'],
              ['mediaLeft', 'right'],
            ]
          : zones.flatMap((a, i) => zones.slice(i + 1).map((b) => [a, b]));
      for (const [a, b] of pairs as [ZoneName, ZoneName][]) {
        expect(
          rectsOverlap(zoneRect(a), zoneRect(b)),
          `${family}: ${a} overlaps ${b}`,
        ).toBe(false);
      }
    }
  });

  it('every family that INTRUDES into the subtitle band is excluded from it', () => {
    // The safety property, asserted one-directionally on purpose.
    //
    // The spec's rule lists subtitle as compatible with body, bodyShort and
    // split "only", justified by hero/rows/centreStack beginning inside the
    // subtitle band. That reason does NOT apply to `cta` (ctaCenter starts at
    // y=352, well clear of the band ending at 280) — so `cta` is excluded by
    // design choice, not by geometry. Asserting the biconditional would make
    // this test fail on a defensible spec, so it asserts only what geometry
    // actually requires.
    const subtitleBottom = zoneRect('subtitle').y + zoneRect('subtitle').h;
    for (const [family, zones] of Object.entries(ZONE_FAMILIES)) {
      const intrudes = zones.some((z) => zoneRect(z).y < subtitleBottom);
      if (!intrudes) continue;
      expect(
        SUBTITLE_COMPATIBLE.includes(family as never),
        `${family} intrudes into the subtitle band and must not be subtitle-compatible`,
      ).toBe(false);
    }
  });

  it('cta is excluded from subtitle by design, not by geometry', () => {
    // Pins the discrepancy so a future reader does not "fix" it by accident.
    const subtitleBottom = zoneRect('subtitle').y + zoneRect('subtitle').h;
    expect(zoneRect('ctaCenter').y).toBeGreaterThan(subtitleBottom);
    expect(SUBTITLE_COMPATIBLE).not.toContain('cta');
  });
});

describe('zone name guard', () => {
  it('accepts real zones and rejects anything else', () => {
    expect(isZoneName('title')).toBe(true);
    expect(isZoneName('heroMedia')).toBe(true);
    expect(isZoneName('nope')).toBe(false);
    expect(isZoneName('')).toBe(false);
    expect(isZoneName(null)).toBe(false);
    expect(isZoneName('__proto__')).toBe(false);
  });

  it('ZONE_NAMES lists every zone the spec defines', () => {
    // Asserting against Object.keys(SLIDE_GRID) would be a tautology, since
    // that is literally how ZONE_NAMES is built. Pin the real contents.
    expect([...ZONE_NAMES].sort()).toEqual(
      [
        'accentBar',
        'body',
        'bodyShort',
        'centerStackBottom',
        'centerStackTop',
        'ctaCenter',
        'footer',
        'heroMedia',
        'left',
        'logoTop',
        'mediaLeft',
        'mediaRight',
        'pageNumber',
        'phaseChip',
        'right',
        'rowA',
        'rowB',
        'rowC',
        'subtitle',
        'tileRow',
        'title',
        'utilityTopRight',
      ].sort(),
    );
    expect(ZONE_NAMES).toHaveLength(22);
  });
});

describe('nearestZone — how v1 rects are resolved', () => {
  it('maps a rect to the zone it actually sits on', () => {
    expect(nearestZone({ x: 64, y: 96, w: 1152, h: 104 })).toBe('title');
    expect(nearestZone({ x: 292, y: 200, w: 696, h: 392 })).toBe('heroMedia');
  });

  it('a block dragged to the right half lands on the right, not a default', () => {
    // The whole point of resolving by centroid rather than by preset.
    const right = nearestZone({ x: 700, y: 300, w: 500, h: 300 });
    expect(['right', 'mediaRight']).toContain(right);
  });

  it('is deterministic', () => {
    const r = { x: 400, y: 400, w: 200, h: 100 };
    expect(nearestZone(r)).toBe(nearestZone(r));
  });

  it('honours an explicit candidate list', () => {
    expect(nearestZone({ x: 0, y: 0, w: 10, h: 10 }, ['body', 'title'])).toBe(
      'title',
    );
  });
});

describe('validateLayout', () => {
  const el = (
    over: Partial<{
      id: string;
      zone: string;
      kind: string;
      hidden: boolean;
    }> = {},
  ) => ({
    id: 'e1',
    zone: 'title',
    kind: 'text',
    ...over,
  });

  it('accepts a plain title + body slide', () => {
    expect(
      validateLayout([el({ id: 'a' }), el({ id: 'b', zone: 'body' })]),
    ).toEqual([]);
  });

  it('rejects an unknown zone', () => {
    const [issue] = validateLayout([el({ zone: 'nowhere' })]);
    expect(issue.code).toBe('unknown-zone');
  });

  it('rejects content placed in chrome', () => {
    expect(validateLayout([el({ zone: 'phaseChip' })])[0].code).toBe(
      'zone-is-chrome',
    );
  });

  it('rejects an interaction outside the footer', () => {
    expect(
      validateLayout([el({ kind: 'interaction', zone: 'body' })])[0].code,
    ).toBe('interaction-outside-footer');
  });

  it('accepts an interaction IN the footer', () => {
    expect(
      validateLayout([el({ kind: 'interaction', zone: 'footer' })]),
    ).toEqual([]);
  });

  it('rejects a second element in a single-flow zone', () => {
    const issues = validateLayout([
      el({ id: 'a', zone: 'title' }),
      el({ id: 'b', zone: 'title' }),
    ]);
    expect(issues.some((i) => i.code === 'zone-overfull')).toBe(true);
  });

  it('allows stacking in a column zone', () => {
    expect(
      validateLayout([
        el({ id: 'a', zone: 'body' }),
        el({ id: 'b', zone: 'body' }),
        el({ id: 'c', zone: 'body' }),
      ]),
    ).toEqual([]);
  });

  it('enforces the tileRow max of 4', () => {
    const five = [1, 2, 3, 4, 5].map((i) =>
      el({ id: `t${i}`, zone: 'tileRow' }),
    );
    expect(validateLayout(five).some((i) => i.code === 'zone-overfull')).toBe(
      true,
    );
    expect(validateLayout(five.slice(0, 4))).toEqual([]);
  });

  it('rejects mixing two middle-band families', () => {
    const issues = validateLayout([
      el({ id: 'a', zone: 'body' }),
      el({ id: 'b', zone: 'heroMedia' }),
    ]);
    expect(issues.some((i) => i.code === 'mixed-families')).toBe(true);
  });

  it('rejects a subtitle on a family that replaces its band', () => {
    const issues = validateLayout([
      el({ id: 'a', zone: 'subtitle' }),
      el({ id: 'b', zone: 'heroMedia' }),
    ]);
    expect(issues.some((i) => i.code === 'subtitle-incompatible')).toBe(true);
  });

  it('allows a subtitle beside body, bodyShort and split', () => {
    for (const zone of ['body', 'bodyShort', 'left']) {
      expect(
        validateLayout([
          el({ id: 'a', zone: 'subtitle' }),
          el({ id: 'b', zone }),
        ]),
        zone,
      ).toEqual([]);
    }
  });

  it('centreStack excludes title and the utility link', () => {
    const issues = validateLayout([
      el({ id: 'a', zone: 'title' }),
      el({ id: 'b', zone: 'centerStackTop' }),
    ]);
    expect(issues.some((i) => i.code === 'centrestack-exclusive')).toBe(true);
  });

  it('ignores hidden elements when judging families', () => {
    expect(
      validateLayout([
        el({ id: 'a', zone: 'body' }),
        el({ id: 'b', zone: 'heroMedia', hidden: true }),
      ]),
    ).toEqual([]);
  });
});

describe('resolveElementRects', () => {
  it('a single element fills its zone', () => {
    const [r] = resolveElementRects([{ id: 'a', zone: 'title' }]);
    expect(r.rect).toEqual(zoneRect('title'));
  });

  it('a column zone stacks evenly with a 16px gap', () => {
    const rects = resolveElementRects([
      { id: 'a', zone: 'body', order: 0 },
      { id: 'b', zone: 'body', order: 1 },
    ]);
    const body = zoneRect('body');
    const each = (body.h - 16) / 2;
    expect(rects[0].rect).toMatchObject({ x: body.x, y: body.y, h: each });
    expect(rects[1].rect.y).toBe(body.y + each + 16);
    // Never escapes the zone, so never reaches the footer band.
    const last = rects[1].rect;
    expect(last.y + last.h).toBeLessThanOrEqual(body.y + body.h);
  });

  it('a row zone splits horizontally', () => {
    const rects = resolveElementRects([
      { id: 'a', zone: 'tileRow', order: 0 },
      { id: 'b', zone: 'tileRow', order: 1 },
    ]);
    expect(rects[0].rect.y).toBe(rects[1].rect.y);
    expect(rects[1].rect.x).toBeGreaterThan(rects[0].rect.x);
  });

  it('honours order, then array position', () => {
    const rects = resolveElementRects([
      { id: 'second', zone: 'body', order: 5 },
      { id: 'first', zone: 'body', order: 1 },
    ]);
    expect(rects.map((r) => r.element.id)).toEqual(['first', 'second']);
  });

  it('skips hidden elements entirely', () => {
    const rects = resolveElementRects([
      { id: 'a', zone: 'title', hidden: true },
      { id: 'b', zone: 'body' },
    ]);
    expect(rects.map((r) => r.element.id)).toEqual(['b']);
  });

  it('skips unknown zones rather than throwing', () => {
    expect(resolveElementRects([{ id: 'a', zone: 'bogus' }])).toEqual([]);
  });

  it('no resolved rect for a content zone ever reaches the footer band', () => {
    const els = ZONE_NAMES.filter((z) => SLIDE_GRID[z].role === 'content').map(
      (zone, i) => ({ id: `e${i}`, zone }),
    );
    for (const { rect } of resolveElementRects(els)) {
      expect(rect.y + rect.h).toBeLessThanOrEqual(620);
    }
  });
});

describe('regressions the P2 mapping caught', () => {
  it('the footer holds the exit poll\u2019s TWO interactions', () => {
    // Both shipping templates emit `interactionIds: [exitText, exitCheckIn]`
    // (songSession.ts:302, genreLesson.ts:272). A single-flow footer rejected
    // every exit-poll slide the product ships.
    expect(SLIDE_GRID.footer.flow).toBe('row');
    expect(SLIDE_GRID.footer.max).toBe(2);
    expect(
      validateLayout([
        { id: 'a', zone: 'footer', kind: 'interaction' },
        { id: 'b', zone: 'footer', kind: 'interaction' },
      ]),
    ).toEqual([]);
  });

  it('still refuses a THIRD interaction in the footer', () => {
    const issues = validateLayout(
      ['a', 'b', 'c'].map((id) => ({
        id,
        zone: 'footer',
        kind: 'interaction',
      })),
    );
    expect(issues.some((i) => i.code === 'zone-overfull')).toBe(true);
  });

  it('migration targets exclude the utility slot and the footer', () => {
    // A body block whose centroid drifted high must not land in a one-link
    // chrome-band slot, and only interactions belong in the footer.
    expect(MIGRATION_TARGETS).not.toContain('utilityTopRight');
    expect(MIGRATION_TARGETS).not.toContain('footer');
    for (const z of MIGRATION_TARGETS) {
      expect(SLIDE_GRID[z].role, z).toBe('content');
    }
  });

  it('nearestZone throws rather than returning undefined for no candidates', () => {
    expect(() => nearestZone({ x: 0, y: 0, w: 1, h: 1 }, [])).toThrow(
      /at least one candidate/i,
    );
  });

  it('there is exactly ONE SLIDE_CANVAS in the codebase', () => {
    // slideGrid re-exports slideLayout's rather than declaring a second.
    expect(SLIDE_CANVAS).toEqual({ w: 1280, h: 720 });
  });
});

describe('revealBandRect — where a revealed interaction renders', () => {
  const body = zoneRect('body');
  const el = (zone: string, hidden?: boolean) => ({ zone, hidden });

  it('a plain body slide reveals over the body', () => {
    expect(revealBandRect([el('title'), el('body')])).toEqual(body);
  });

  it('NEVER covers the slide’s own heading', () => {
    // title/subtitle are family `any` and must be excluded from the band.
    const r = revealBandRect([el('title'), el('subtitle'), el('body')]);
    expect(r.y).toBeGreaterThanOrEqual(
      zoneRect('subtitle').y + zoneRect('subtitle').h,
    );
    expect(r).toEqual(body);
  });

  it('a split slide reveals across BOTH columns, not one', () => {
    const r = revealBandRect([el('mediaLeft'), el('right')]);
    expect(r.x).toBe(zoneRect('mediaLeft').x);
    expect(r.x + r.w).toBe(zoneRect('right').x + zoneRect('right').w);
  });

  it('a rows slide gets the taller rowA–rowC union', () => {
    const r = revealBandRect([el('rowA'), el('rowB'), el('rowC')]);
    expect(r.y).toBe(zoneRect('rowA').y);
    expect(r.y + r.h).toBe(zoneRect('rowC').y + zoneRect('rowC').h);
    expect(r.h).toBeGreaterThan(body.h);
  });

  it('floors to `body` when the family band is smaller — cta would be 448×128', () => {
    expect(revealBandRect([el('ctaCenter')])).toEqual(body);
    expect(revealBandRect([el('heroMedia')])).toEqual(body);
    expect(
      revealBandRect([el('centerStackTop'), el('centerStackBottom')]),
    ).toEqual(body);
  });

  it('a bare slide still gets a usable band', () => {
    expect(revealBandRect([])).toEqual(body);
    expect(revealBandRect([el('title')])).toEqual(body);
  });

  it('ignores hidden elements and the footer strip itself', () => {
    expect(revealBandRect([el('heroMedia', true), el('body')])).toEqual(body);
    expect(revealBandRect([el('footer'), el('body')])).toEqual(body);
  });

  it('ignores unknown zones rather than throwing', () => {
    expect(revealBandRect([el('bogus'), el('body')])).toEqual(body);
  });

  it('the band NEVER enters the footer band, for any family', () => {
    const families: string[][] = [
      ['body'],
      ['bodyShort', 'tileRow'],
      ['left', 'right'],
      ['mediaLeft', 'mediaRight'],
      ['heroMedia'],
      ['rowA', 'rowB', 'rowC'],
      ['ctaCenter'],
      ['centerStackTop', 'centerStackBottom'],
      [],
    ];
    for (const zones of families) {
      const r = revealBandRect(zones.map((z) => el(z)));
      expect(r.y + r.h, zones.join('+') || '(bare)').toBeLessThanOrEqual(620);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1280);
      // Always at least as roomy as the plainest slide.
      expect(r.w).toBeGreaterThanOrEqual(body.w);
      expect(r.h).toBeGreaterThanOrEqual(body.h);
    }
  });

  it('is deterministic', () => {
    const els = [el('mediaLeft'), el('right')];
    expect(revealBandRect(els)).toEqual(revealBandRect(els));
  });
});

/**
 * The property the spec's own reflow list fails.
 *
 * Its order names 13 of the 17 content zones. A reflow coded from it would
 * render `bodyShort`, `centerStackTop`, `centerStackBottom` and
 * `utilityTopRight` nowhere — silently, since a missing zone simply has no
 * output. This is the test that turns "I remembered to add them" into
 * "a zone added later cannot be forgotten".
 */
describe('REFLOW_ORDER', () => {
  const contentZones = ZONE_NAMES.filter(
    (z) => SLIDE_GRID[z].role === 'content',
  );

  it('lists every content zone exactly once', () => {
    for (const zone of contentZones) {
      expect(
        REFLOW_ORDER.filter((z) => z === zone).length,
        `${zone} in REFLOW_ORDER`,
      ).toBe(1);
    }
  });

  it('has no duplicates and no unknown zones', () => {
    expect(new Set(REFLOW_ORDER).size).toBe(REFLOW_ORDER.length);
    for (const zone of REFLOW_ORDER) expect(isZoneName(zone)).toBe(true);
  });

  it('reads top-to-bottom by the zones’ own geometry, per family', () => {
    // Only zones that can APPEAR TOGETHER need to be in geometric order.
    // Comparing across families is meaningless — `rowC` (y=496) precedes
    // `heroMedia` (y=200) in the column, but a rows slide and a hero slide are
    // mutually exclusive, so no student ever sees both.
    for (const [family, members] of Object.entries(ZONE_FAMILIES)) {
      const shared: ZoneName[] = ['phaseChip', 'utilityTopRight', 'title'];
      if (SUBTITLE_COMPATIBLE.includes(family as never))
        shared.push('subtitle');
      const coOccurring = new Set<ZoneName>([
        ...shared,
        ...(members as ZoneName[]),
      ]);
      const placed = REFLOW_ORDER.filter(
        (z) => coOccurring.has(z) && z !== 'footer',
      );
      for (let i = 1; i < placed.length; i++) {
        const prev = SLIDE_GRID[placed[i - 1]].rect;
        const cur = SLIDE_GRID[placed[i]].rect;
        expect(
          prev.y,
          `${family}: ${placed[i - 1]} before ${placed[i]}`,
        ).toBeLessThanOrEqual(cur.y);
      }
    }
  });

  it('ends with the footer band', () => {
    expect(REFLOW_ORDER[REFLOW_ORDER.length - 1]).toBe('footer');
  });

  it('places the band where the middle band would be', () => {
    expect(REFLOW_ORDER).toContain(REFLOW_BAND_AFTER);
    const i = REFLOW_ORDER.indexOf(REFLOW_BAND_AFTER);
    // Everything after it is middle-band content or the footer — so the
    // student's question/input lands above the slide's own body copy.
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(REFLOW_ORDER.length - 1);
  });
});
