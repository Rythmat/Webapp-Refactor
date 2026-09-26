/**
 * v1 → v2 element migration.
 *
 * The properties that matter are determinism and idempotency: a published
 * snapshot is migrated on EVERY read (it cannot be written back), so two reads
 * of the same snapshot must produce byte-identical elements or React keys
 * thrash and the editor can never tell "changed" from "re-derived".
 */
import { describe, expect, it } from 'vitest';
import {
  migrateDeckV1,
  migrateSlideV1,
  needsElementMigration,
  resolveElements,
} from './migrateDeckV1';
import {
  SLIDE_GRID,
  ZONE_FAMILIES,
  validateLayout,
  type ZoneName,
} from './slideGrid';
import type { Slide, SlideElement } from './types';

const lt = (en: string) => ({ en });

const contentSlide = (over: Partial<Slide> = {}): Slide =>
  ({
    id: 's1',
    kind: 'content',
    phase: 'connectRegulate',
    title: lt('Title'),
    ...over,
  }) as Slide;

const byId = (els: SlideElement[], suffix: string) =>
  els.find((e) => e.id.endsWith(suffix));

/** Which middle-band family a set of zones occupies. */
const familiesUsed = (els: SlideElement[]): string[] => {
  const fams = new Set<string>();
  for (const e of els) {
    const fam = SLIDE_GRID[e.zone as ZoneName].family;
    if (fam !== 'any' && fam !== 'chrome') fams.add(fam);
  }
  return [...fams];
};

describe('block → zone mapping', () => {
  it('title always becomes a title element in the title zone', () => {
    const els = migrateSlideV1(contentSlide());
    expect(els).toHaveLength(1);
    expect(els[0]).toMatchObject({
      kind: 'text',
      role: 'title',
      zone: 'title',
    });
  });

  it('prompt becomes a subtitle', () => {
    const els = migrateSlideV1(
      contentSlide({ prompt: lt('Ask this') } as never),
    );
    expect(byId(els, ':prompt')).toMatchObject({
      kind: 'text',
      role: 'subtitle',
      zone: 'subtitle',
    });
  });

  it('body with no media fills the body zone', () => {
    const els = migrateSlideV1(contentSlide({ body: lt('Body') } as never));
    expect(byId(els, ':body')?.zone).toBe('body');
  });

  it('body shortens to make room for launch tiles', () => {
    const els = migrateSlideV1(
      contentSlide({
        body: lt('Body'),
        launchTiles: [
          { id: 't1', module: 'learn', activityRef: 'song:a:chart' },
        ],
      } as never),
    );
    expect(byId(els, ':body')?.zone).toBe('bodyShort');
    expect(byId(els, ':launchTiles:0')?.zone).toBe('tileRow');
  });

  it('media with nothing beside it goes hero', () => {
    const els = migrateSlideV1(
      contentSlide({
        media: { type: 'chordChart', songId: 'africa' },
      } as never),
    );
    expect(byId(els, ':media')?.zone).toBe('heroMedia');
  });

  it('media WITH body goes left and pushes the body right — Artist Spotlight', () => {
    const els = migrateSlideV1(
      contentSlide({
        body: lt('Questions'),
        media: { type: 'chordChart', songId: 'africa' },
      } as never),
    );
    expect(byId(els, ':media')?.zone).toBe('mediaLeft');
    expect(byId(els, ':body')?.zone).toBe('right');
  });

  it('sideMedia takes the opposite column', () => {
    const els = migrateSlideV1(
      contentSlide({
        media: { type: 'youtube', videoId: 'abc' },
        sideMedia: { type: 'artistImage', songId: 'africa' },
      } as never),
    );
    expect(byId(els, ':media')?.zone).toBe('mediaLeft');
    expect(byId(els, ':sideMedia')?.zone).toBe('mediaRight');
  });

  it('a STORED rect decides the media zone, not the default', () => {
    // The teacher dragged the media to the right half; honour that.
    const els = migrateSlideV1(
      contentSlide({
        media: { type: 'youtube', videoId: 'abc' },
        layout: { media: { x: 656, y: 288, w: 560, h: 315 } },
      } as never),
    );
    expect(byId(els, ':media')?.zone).toBe('mediaRight');
  });

  it('resetChecklist becomes a checklist under the body', () => {
    const els = migrateSlideV1(
      contentSlide({
        body: lt('Body'),
        resetChecklist: [lt('Pack up'), lt('Chairs in')],
      } as never),
    );
    const cl = byId(els, ':resetChecklist');
    expect(cl).toMatchObject({ kind: 'checklist', zone: 'body' });
    expect((cl as { items: unknown[] }).items).toHaveLength(2);
  });

  it('a hidden block stays hidden', () => {
    const els = migrateSlideV1(
      contentSlide({
        layout: { title: { x: 0, y: 0, w: 1, h: 1, hidden: true } },
      } as never),
    );
    expect(byId(els, ':title')?.hidden).toBe(true);
  });
});

describe('interactions live only in the footer band', () => {
  it.each([
    ['interaction', { kind: 'interaction', interactionIds: ['ix-1', 'ix-2'] }],
    ['app-route', { kind: 'app-route', interactionId: 'ix-3' }],
    ['showcase', { kind: 'showcase', interactionId: 'ix-4' }],
  ])('%s slide', (_kind, over) => {
    const els = migrateSlideV1(contentSlide(over as never));
    const ix = els.filter((e) => e.kind === 'interaction');
    expect(ix.length).toBeGreaterThan(0);
    for (const e of ix) expect(e.zone).toBe('footer');
  });

  it('preserves the interaction id — the response join key', () => {
    const els = migrateSlideV1(
      contentSlide({
        kind: 'interaction',
        interactionIds: ['ix-keep'],
      } as never),
    );
    expect(
      (els.find((e) => e.kind === 'interaction') as { interactionId: string })
        .interactionId,
    ).toBe('ix-keep');
  });

  it('carries the reveal style through', () => {
    const els = migrateSlideV1(
      contentSlide({
        kind: 'interaction',
        interactionIds: ['ix-1'],
        reveal: 'words',
      } as never),
    );
    expect(els.find((e) => e.kind === 'interaction')).toMatchObject({
      reveal: 'words',
    });
  });
});

describe('the result is always family-valid', () => {
  const cases: [string, Partial<Slide>][] = [
    ['bare', {}],
    ['body only', { body: lt('b') } as never],
    [
      'body + tiles',
      {
        body: lt('b'),
        launchTiles: [{ id: 't', module: 'learn', activityRef: 'r' }],
      } as never,
    ],
    ['hero media', { media: { type: 'youtube', videoId: 'v' } } as never],
    [
      'split media + body',
      { media: { type: 'youtube', videoId: 'v' }, body: lt('b') } as never,
    ],
    [
      'media + sideMedia',
      {
        media: { type: 'youtube', videoId: 'v' },
        sideMedia: { type: 'artistImage', songId: 's' },
      } as never,
    ],
    [
      'split + tiles',
      {
        media: { type: 'youtube', videoId: 'v' },
        body: lt('b'),
        launchTiles: [{ id: 't', module: 'learn', activityRef: 'r' }],
      } as never,
    ],
  ];

  it.each(cases)(
    '%s occupies at most ONE middle-band family',
    (_name, over) => {
      const fams = familiesUsed(migrateSlideV1(contentSlide(over)));
      expect(fams.length, `families: ${fams.join(', ')}`).toBeLessThanOrEqual(
        1,
      );
    },
  );

  it('never places a content element in the footer band', () => {
    for (const [, over] of cases) {
      for (const e of migrateSlideV1(contentSlide(over))) {
        if (e.kind === 'interaction') continue;
        const r = SLIDE_GRID[e.zone as ZoneName].rect;
        expect(r.y + r.h, `${e.id} in ${e.zone}`).toBeLessThanOrEqual(620);
      }
    }
  });

  it('tiles fall back out of tileRow when the band is split', () => {
    const els = migrateSlideV1(
      contentSlide({
        media: { type: 'youtube', videoId: 'v' },
        body: lt('b'),
        launchTiles: [{ id: 't', module: 'learn', activityRef: 'r' }],
      } as never),
    );
    // tileRow belongs to bodyShort; a split band must not mix families.
    expect(byId(els, ':launchTiles:0')?.zone).not.toBe('tileRow');
    expect(ZONE_FAMILIES.split).toContain(byId(els, ':launchTiles:0')?.zone);
  });
});

describe('determinism and idempotency', () => {
  const rich = contentSlide({
    prompt: lt('p'),
    body: lt('b'),
    media: { type: 'youtube', videoId: 'v' },
    launchTiles: [{ id: 't', module: 'learn', activityRef: 'r' }],
  } as never);

  it('two runs are byte-identical', () => {
    expect(migrateSlideV1(rich)).toEqual(migrateSlideV1(rich));
  });

  it('element ids are derived, not random', () => {
    const a = migrateSlideV1(rich).map((e) => e.id);
    const b = migrateSlideV1(rich).map((e) => e.id);
    expect(a).toEqual(b);
    expect(a.every((id) => id.startsWith('s1:'))).toBe(true);
  });

  it('resolveElements returns AUTHORED elements untouched', () => {
    const authored: SlideElement[] = [
      { id: 'x', zone: 'title', kind: 'text', role: 'title', text: lt('mine') },
    ];
    const slide = contentSlide({ elements: authored } as never);
    expect(resolveElements(slide)).toBe(authored);
    expect(needsElementMigration(slide)).toBe(false);
  });

  it('migrateDeckV1 is a no-op on an already-migrated deck', () => {
    const deck = { slides: [rich] };
    const once = migrateDeckV1(deck);
    const twice = migrateDeckV1(once);
    expect(twice).toEqual(once);
    expect(twice.slides[0].elements).toBe(once.slides[0].elements);
  });

  it('never mutates the input slide', () => {
    const before = JSON.stringify(rich);
    migrateSlideV1(rich);
    expect(JSON.stringify(rich)).toBe(before);
  });
});

describe('every content element carries a link', () => {
  it('media elements get an href from the total hrefForEmbed', () => {
    const els = migrateSlideV1(
      contentSlide({
        media: { type: 'youtube', videoId: 'abc', startSec: 30 },
      } as never),
    );
    const m = byId(els, ':media') as { href: { kind: string; url?: string } };
    expect(m.href.kind).toBe('external');
    expect(m.href.url).toContain('abc');
    expect(m.href.url).toContain('t=30');
  });

  it('launch tiles keep their atlas ref as the href', () => {
    const els = migrateSlideV1(
      contentSlide({
        launchTiles: [
          { id: 't', module: 'learn', activityRef: 'song:africa:chart' },
        ],
      } as never),
    );
    expect(byId(els, ':launchTiles:0')).toMatchObject({
      href: { kind: 'atlas', ref: 'song:africa:chart' },
      embed: { type: 'atlasCard', ref: 'song:africa:chart' },
    });
  });

  it('NO content element ever lacks an href', () => {
    const els = migrateSlideV1(
      contentSlide({
        media: { type: 'chordChart', songId: 'africa' },
        sideMedia: { type: 'artistImage', songId: 'africa' },
        launchTiles: [{ id: 't', module: 'learn', activityRef: 'r' }],
      } as never),
    );
    for (const e of els) {
      if (e.kind !== 'content') continue;
      expect(e.href, `${e.id} has no href`).toBeTruthy();
    }
  });
});

describe('EVERY combination migrates to a layout validateLayout accepts', () => {
  // The two defects that slipped past hand-picked cases were both combinations
  // nobody thought to write down: prompt+hero (title zone overfull) and
  // hero+tiles (mixed families). Enumerate the power set instead of guessing.
  const parts = {
    prompt: { prompt: lt('P') },
    body: { body: lt('B') },
    media: { media: { type: 'youtube', videoId: 'v' } },
    sideMedia: { sideMedia: { type: 'artistImage', songId: 's' } },
    tiles: { launchTiles: [{ id: 't', module: 'learn', activityRef: 'r' }] },
    checklist: { resetChecklist: [lt('C')] },
  } as const;
  const names = Object.keys(parts) as (keyof typeof parts)[];

  const combos: { label: string; over: Record<string, unknown> }[] = [];
  for (let mask = 0; mask < 1 << names.length; mask++) {
    const picked = names.filter((_, i) => mask & (1 << i));
    combos.push({
      label: picked.join('+') || '(bare)',
      over: Object.assign({}, ...picked.map((n) => parts[n])),
    });
  }

  it.each(combos.map((c) => [c.label, c.over] as const))(
    'content slide: %s',
    (label, over) => {
      const els = migrateSlideV1(contentSlide(over as never));
      const issues = validateLayout(els);
      expect(
        issues,
        `${label} → ${els.map((e) => `${e.id.split(':')[1]}:${e.zone}`).join(', ')}`,
      ).toEqual([]);
    },
  );

  it.each(combos.map((c) => [c.label, c.over] as const))(
    'interaction slide (exit-poll shape): %s',
    (label, over) => {
      const els = migrateSlideV1(
        contentSlide({
          ...(over as object),
          kind: 'interaction',
          interactionIds: ['ix-a', 'ix-b'],
        } as never),
      );
      const issues = validateLayout(els);
      expect(
        issues,
        `${label} → ${els.map((e) => `${e.id.split(':')[1]}:${e.zone}`).join(', ')}`,
      ).toEqual([]);
    },
  );
});

/**
 * Two things the editor lets a teacher do that the migration used to drop.
 *
 * Both were invisible rather than broken: the teacher saw their change applied
 * on the editor canvas (still block mode) while every class-facing surface —
 * which now renders exclusively from elements — ignored it.
 */
describe('v1 fields the element path must not drop', () => {
  it('carries textStyle onto the title, subtitle and body elements', () => {
    const els = migrateSlideV1(
      contentSlide({
        prompt: lt('Prompt'),
        body: lt('Body'),
        textStyle: {
          title: { align: 'center', bold: true },
          prompt: { fontScale: 1.4 },
          body: { align: 'right' },
        },
      } as Partial<Slide>),
    );

    expect(byId(els, ':title')?.style).toEqual({ align: 'center', bold: true });
    expect(byId(els, ':prompt')?.style).toEqual({ fontScale: 1.4 });
    expect(byId(els, ':body')?.style).toEqual({ align: 'right' });
  });

  it('omits style entirely when the teacher set none', () => {
    // An empty object would defeat the idempotency check this file exists for.
    const els = migrateSlideV1(contentSlide({ prompt: lt('Prompt') }));
    expect(byId(els, ':title')).not.toHaveProperty('style');
    expect(byId(els, ':prompt')).not.toHaveProperty('style');
  });

  it('honours hidden on media, sideMedia and launch tiles, not just on text', () => {
    const slide = contentSlide({
      media: { type: 'youtube', videoId: 'abc' },
      launchTiles: [{ id: 't1', module: 'globe', activityRef: 'a/b' }],
      layout: {
        media: { x: 64, y: 208, w: 560, h: 340, hidden: true },
        launchTiles: { x: 64, y: 560, w: 1152, h: 56, hidden: true },
      },
    } as Partial<Slide>);

    const els = migrateSlideV1(slide);
    expect(byId(els, ':media')?.hidden).toBe(true);
    expect(byId(els, 'launchTiles:0')?.hidden).toBe(true);
  });

  it('leaves visible blocks unhidden', () => {
    const els = migrateSlideV1(
      contentSlide({
        media: { type: 'youtube', videoId: 'abc' },
        layout: { media: { x: 64, y: 208, w: 560, h: 340 } },
      } as Partial<Slide>),
    );
    expect(byId(els, ':media')).not.toHaveProperty('hidden');
  });

  it('stays idempotent with styles and hidden flags applied', () => {
    const slide = contentSlide({
      prompt: lt('Prompt'),
      media: { type: 'youtube', videoId: 'abc' },
      textStyle: { title: { bold: true } },
      layout: { media: { x: 64, y: 208, w: 560, h: 340, hidden: true } },
    } as Partial<Slide>);
    expect(migrateSlideV1(slide)).toEqual(migrateSlideV1(slide));
  });
});
