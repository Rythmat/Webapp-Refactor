import { describe, expect, it } from 'vitest';
import {
  applyMove,
  applyResize,
  blocksForKind,
  clampRect,
  defaultLayoutForKind,
  hiddenBlocks,
  hideBlock,
  isBlockHidden,
  MIN_BLOCK,
  preserveLayoutOnKindChange,
  resolveLayout,
  showBlock,
  SLIDE_CANVAS,
  snap,
} from './slideLayout';
import type { ContentSlide, MediaSlide, Slide } from './types';

const content = (over: Partial<ContentSlide> = {}): ContentSlide => ({
  id: 's1',
  kind: 'content',
  phase: 'connectRegulate',
  title: { en: 'Hi' },
  ...over,
});

describe('blocksForKind', () => {
  it('content shows the core blocks; reflect adds the checklist', () => {
    expect(blocksForKind(content())).toContain('title');
    expect(blocksForKind(content())).not.toContain('resetChecklist');
    expect(blocksForKind(content({ phase: 'respondReflectReset' }))).toContain(
      'resetChecklist',
    );
  });
  it('media slides expose title/prompt/media/sideMedia', () => {
    const m: MediaSlide = {
      id: 'm',
      kind: 'media',
      phase: 'connectRegulate',
      title: { en: 'M' },
      media: { type: 'youtube', videoId: 'x' },
    };
    expect(blocksForKind(m)).toEqual(['title', 'prompt', 'media', 'sideMedia']);
  });
});

describe('defaultLayoutForKind / resolveLayout', () => {
  it('media-bearing slides place media on the right', () => {
    const withMedia = content({ media: { type: 'youtube', videoId: 'x' } });
    expect(defaultLayoutForKind(withMedia).media?.x).toBeGreaterThan(600);
  });
  it('stored rects win over defaults, per key', () => {
    const s = content({ layout: { title: { x: 10, y: 20, w: 300, h: 80 } } });
    const resolved = resolveLayout(s);
    expect(resolved.title).toMatchObject({ x: 10, y: 20, w: 300, h: 80 });
    // untouched keys still resolve from defaults
    expect(resolved.launchTiles).toBeDefined();
  });
});

describe('clampRect', () => {
  it('keeps rects inside the canvas and above the minimum size', () => {
    const r = clampRect({ x: -50, y: -50, w: 10, h: 10 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.w).toBe(MIN_BLOCK.w);
    expect(r.h).toBe(MIN_BLOCK.h);
    const r2 = clampRect({ x: 5000, y: 5000, w: 400, h: 200 });
    expect(r2.x).toBe(SLIDE_CANVAS.w - 400);
    expect(r2.y).toBe(SLIDE_CANVAS.h - 200);
  });
});

describe('move / resize / snap', () => {
  it('applyMove translates', () => {
    expect(
      applyMove({ x: 100, y: 100, w: 200, h: 100 }, 25, -10),
    ).toMatchObject({ x: 125, y: 90 });
  });
  it('applyResize on w/e grows width; on n/w moves origin', () => {
    expect(
      applyResize({ x: 100, y: 100, w: 200, h: 100 }, ['e'], 30, 0).w,
    ).toBe(230);
    const nw = applyResize(
      { x: 100, y: 100, w: 200, h: 100 },
      ['n', 'w'],
      20,
      20,
    );
    expect(nw).toMatchObject({ x: 120, y: 120, w: 180, h: 80 });
  });
  it('snap rounds to the grid', () => {
    expect(snap(103, 8)).toBe(104);
    expect(snap(100, 20)).toBe(100);
  });
});

describe('hide / show', () => {
  it('hideBlock marks hidden; showBlock clears it; isBlockHidden reflects state', () => {
    const hidden = content({ layout: hideBlock(content(), 'title') });
    expect(isBlockHidden(hidden, 'title')).toBe(true);
    expect(hiddenBlocks(hidden)).toContain('title');
    const shown = content({ layout: showBlock(hidden, 'title') });
    expect(isBlockHidden(shown, 'title')).toBe(false);
  });
});

describe('preserveLayoutOnKindChange', () => {
  it('content→media keeps title/prompt/media, drops tiles/checklist', () => {
    const layout = {
      title: { x: 0, y: 0, w: 100, h: 50 },
      media: { x: 0, y: 0, w: 100, h: 50 },
      launchTiles: { x: 0, y: 0, w: 100, h: 50 },
      resetChecklist: { x: 0, y: 0, w: 100, h: 50 },
    };
    const next = preserveLayoutOnKindChange(layout, 'media', 'connectRegulate');
    expect(next).toHaveProperty('title');
    expect(next).toHaveProperty('media');
    expect(next).not.toHaveProperty('launchTiles');
    expect(next).not.toHaveProperty('resetChecklist');
  });
  it('returns undefined when nothing survives', () => {
    const layout = { launchTiles: { x: 0, y: 0, w: 1, h: 1 } };
    expect(
      preserveLayoutOnKindChange(layout, 'media', 'connectRegulate'),
    ).toBeUndefined();
  });
});

// Type guard: every kind is handled by blocksForKind (compile-time safety net).
const _exhaustive = (s: Slide) => blocksForKind(s);
void _exhaustive;
