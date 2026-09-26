/**
 * Every shipped preset must be legal against the grid it targets.
 *
 * The spec's Definition of Done says "every preset occupies exactly one
 * family". That is false for the presets the product actually needs: `title`,
 * `section`, `question`, `greeting/check-in`, `turn-and-talk`, `share-day` and
 * `personal-project-time` occupy ZERO middle-band families, deliberately — the
 * band belongs to the surface-injected live layer on those slides. So the rule
 * asserted here is "AT MOST one", plus the band-ownership rule the DoD misses
 * entirely.
 */
import { describe, expect, it } from 'vitest';
import { migrateSlideV1 } from '../migrateDeckV1';
import {
  SLIDE_GRID,
  ZONE_FAMILIES,
  hasBandContent,
  resetToPreset,
  validateLayout,
  type ZoneName,
} from '../slideGrid';
import type { Slide, SlideKind } from '../types';
import {
  LIVE_LAYER_KINDS,
  PRESETS,
  PRESET_IDS,
  PRESET_LIST,
  presetFor,
} from './presets';

const lt = (en: string) => ({ en });

/** A slide carrying one of everything, so a preset has something to place. */
const richSlide = (kind: SlideKind, presetId: string): Slide => {
  const common = {
    id: 's1',
    phase: 'connectRegulate' as const,
    title: lt('Title'),
    prompt: lt('Prompt'),
    presetId,
  };
  switch (kind) {
    case 'content':
      return {
        ...common,
        kind: 'content',
        body: lt('Body copy'),
        // TWO visuals and FIVE tiles on purpose. The old fixture carried one
        // media, no sideMedia and one tile — precisely the shapes that cannot
        // overflow a single-flow zone, which is why a preset that mapped two
        // visuals onto one zone passed this suite while rendering the second
        // invisibly on top of the first. One click of "Choose content → Songs"
        // produces media + sideMedia together.
        media: { type: 'youtube', videoId: 'abc' },
        sideMedia: { type: 'youtube', videoId: 'def' },
        launchTiles: [
          { id: 't1', module: 'globe', activityRef: 'a/1' },
          { id: 't2', module: 'globe', activityRef: 'a/2' },
          { id: 't3', module: 'globe', activityRef: 'a/3' },
          { id: 't4', module: 'globe', activityRef: 'a/4' },
          { id: 't5', module: 'globe', activityRef: 'a/5' },
        ],
        resetChecklist: [lt('Tidy up')],
      } as Slide;
    case 'media':
      return {
        ...common,
        kind: 'media',
        media: { type: 'youtube', videoId: 'abc' },
      } as Slide;
    case 'interaction':
      return {
        ...common,
        kind: 'interaction',
        interactionIds: ['i1'],
      } as Slide;
    case 'app-route':
      return { ...common, kind: 'app-route', interactionId: 'i1' } as Slide;
    case 'studio-collab':
      return { ...common, kind: 'studio-collab', grouping: 'pairs' } as Slide;
    case 'showcase':
      return { ...common, kind: 'showcase', interactionId: 'i1' } as Slide;
  }
};

const familiesUsed = (zones: ZoneName[]): string[] => {
  const fams = new Set<string>();
  for (const z of zones) {
    for (const [family, members] of Object.entries(ZONE_FAMILIES)) {
      if ((members as ZoneName[]).includes(z)) fams.add(family);
    }
  }
  return [...fams];
};

describe('shipped presets', () => {
  it('exposes a stable id set', () => {
    expect(PRESET_IDS.length).toBeGreaterThanOrEqual(16);
    for (const id of PRESET_IDS) expect(PRESETS[id].id).toBe(id);
  });

  it.each(PRESET_IDS)(
    '%s produces a legal layout on every kind it claims',
    (id) => {
      const preset = PRESETS[id];
      for (const kind of preset.kinds) {
        const els = migrateSlideV1(richSlide(kind, id));
        expect(validateLayout(els), `${id} on ${kind}`).toEqual([]);
      }
    },
  );

  it.each(PRESET_IDS)('%s occupies at most one middle-band family', (id) => {
    const preset = PRESETS[id];
    for (const kind of preset.kinds) {
      const zones = migrateSlideV1(richSlide(kind, id))
        .filter((e) => !e.hidden)
        .map((e) => e.zone);
      expect(
        familiesUsed(zones).length,
        `${id} on ${kind}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it.each(PRESET_IDS)('%s never enters the footer band', (id) => {
    const preset = PRESETS[id];
    for (const kind of preset.kinds) {
      for (const el of migrateSlideV1(richSlide(kind, id))) {
        if (el.hidden) continue;
        const rect = SLIDE_GRID[el.zone].rect;
        if (SLIDE_GRID[el.zone].role === 'footer') continue;
        expect(rect.y + rect.h, `${id}: ${el.zone}`).toBeLessThanOrEqual(620);
      }
    }
  });

  /**
   * The rule the spec's DoD does not state and the one that actually bites:
   * `SlideStage` paints the live layer only over an EMPTY band, so a preset
   * that authors body copy onto a question slide removes the student's input.
   */
  it.each(PRESET_IDS)(
    '%s leaves the band free whenever it claims a live-layer kind',
    (id) => {
      const preset = PRESETS[id];
      const claimsLive = preset.kinds.some((k) => LIVE_LAYER_KINDS.includes(k));
      if (!claimsLive) return;
      expect(preset.bandFree, `${id} claims a live-layer kind`).toBe(true);
      for (const kind of preset.kinds) {
        const els = migrateSlideV1(richSlide(kind, id));
        expect(hasBandContent(els), `${id} on ${kind}`).toBe(false);
      }
    },
  );

  it('marks bandFree honestly — the flag matches what the preset actually emits', () => {
    for (const id of PRESET_IDS) {
      const preset = PRESETS[id];
      const kind = preset.kinds[0];
      const els = migrateSlideV1(richSlide(kind, id));
      expect(hasBandContent(els), `${id}.bandFree`).toBe(!preset.bandFree);
    }
  });

  it('only the objectives preset asks for the accent bar', () => {
    const withBar = PRESET_LIST.filter((p) => p.accentBar).map((p) => p.id);
    expect(withBar).toEqual(['objectives']);
  });
});

describe('resetToPreset', () => {
  it('sets the preset and drops the teacher’s stored rects', () => {
    const slide = {
      id: 's1',
      kind: 'content',
      phase: 'connectRegulate',
      title: lt('T'),
      layout: { title: { x: 1, y: 2, w: 3, h: 4 } },
    } as unknown as Slide;
    const next = resetToPreset(slide, 'objectives', true);
    expect(next.presetId).toBe('objectives');
    expect(next).not.toHaveProperty('layout');
    expect(next.accentBar).toBe(true);
  });

  it('clears the accent bar when the new preset does not use it', () => {
    const slide = {
      id: 's1',
      kind: 'content',
      phase: 'connectRegulate',
      title: lt('T'),
      accentBar: true,
    } as unknown as Slide;
    expect(resetToPreset(slide, 'section')).not.toHaveProperty('accentBar');
  });

  it('is idempotent', () => {
    const slide = {
      id: 's1',
      kind: 'content',
      phase: 'connectRegulate',
      title: lt('T'),
    } as unknown as Slide;
    const once = resetToPreset(slide, 'last-5');
    expect(resetToPreset(once, 'last-5')).toEqual(once);
  });
});

describe('unknown preset ids', () => {
  it('fall back to the derived layout rather than blanking the slide', () => {
    // A snapshot published last term can name a preset this build renamed.
    const stale = richSlide('content', 'preset-that-no-longer-exists');
    expect(presetFor('preset-that-no-longer-exists')).toBeUndefined();
    const els = migrateSlideV1(stale);
    expect(validateLayout(els)).toEqual([]);
    expect(els.some((e) => e.kind === 'text' && e.role === 'title')).toBe(true);
    expect(els.length).toBeGreaterThan(1);
  });
});

/**
 * Nothing may be rendered where it cannot be seen.
 *
 * `resolveElementRects` gives every element in a `single`-flow zone the same
 * rect, so an over-capacity zone does not overflow visibly — it stacks, and the
 * elements underneath are simply gone with no badge, no chip and no error.
 */
describe('zone capacity', () => {
  it.each(PRESET_IDS)(
    '%s never puts two visible elements in one slot',
    (id) => {
      const preset = PRESETS[id];
      for (const kind of preset.kinds) {
        const visible = migrateSlideV1(richSlide(kind, id)).filter(
          (e) => !e.hidden,
        );
        const used = new Map<ZoneName, number>();
        for (const el of visible) {
          used.set(el.zone, (used.get(el.zone) ?? 0) + 1);
        }
        for (const [zone, n] of used) {
          const spec: { flow: string; max?: number } = SLIDE_GRID[zone];
          const capacity = spec.flow === 'single' ? 1 : (spec.max ?? Infinity);
          expect(
            n,
            `${id} on ${kind}: ${zone} holds ${n}, allows ${capacity}`,
          ).toBeLessThanOrEqual(capacity);
        }
      }
    },
  );

  it('a preset never applies to a kind it does not claim', () => {
    // A seed, a kind change or a restored backup can set any preset id on any
    // slide; only the editor dropdown filtered by kind.
    const interactionOnly = PRESET_LIST.filter(
      (p) => !p.kinds.includes('content'),
    );
    expect(interactionOnly.length).toBeGreaterThan(0);
    for (const preset of interactionOnly) {
      const asContent = migrateSlideV1(richSlide('content', preset.id));
      const derived = migrateSlideV1(richSlide('content', 'no-such-preset'));
      // Falls back to the derived layout rather than applying a plan built for
      // a different kind.
      expect(asContent.map((e) => [e.zone, e.hidden ?? false])).toEqual(
        derived.map((e) => [e.zone, e.hidden ?? false]),
      );
    }
  });
});
