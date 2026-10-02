// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { NEW_PARAM } from '../../../../table/grid/tableQuery';
import { parseChords } from '../../../../table/panel/newItems';
import { openAll, openPathTo, openToDepth } from '../tesseractLayout';
import {
  DEFAULT_VIEW,
  hasViewParams,
  newProgressionHref,
  parseDepth,
  parseTesseractView,
  progressionOfNode,
  readStoredView,
  showInCortexHref,
  storeView,
  TESSERACT_VIEW_KEY,
  tesseractHrefForProgression,
  tesseractSearch,
} from '../tesseractLinks';
import { buildTesseractModel, readProgressionRows } from '../tesseractModel';
import { encodeOpen, resolveOpen } from '../tesseractOpenState';

/**
 * Tesseract's view in the URL and in the browser, and the links into the
 * map and out of it, on the real library.
 */

const MODEL = buildTesseractModel(
  readProgressionRows(
    CHORD_PROGRESSION_LIBRARY as unknown as readonly unknown[],
  ),
);
const params = (search: string) => new URLSearchParams(search);
const same = (a: ReadonlySet<string>, b: ReadonlySet<string>) =>
  a.size === b.size && [...a].every((id) => b.has(id));

afterEach(() => window.localStorage.clear());

describe('the view in the URL', () => {
  it('writes the defaults out but the depth, so a URL the map wrote is never bare', () => {
    expect(tesseractSearch(DEFAULT_VIEW)).toBe('?depth=2');
    expect(hasViewParams(params('?depth=2'))).toBe(true);
    expect(hasViewParams(params(''))).toBe(false);
    // The row panel's own parameters are not the map's.
    expect(hasViewParams(params('?field=chords'))).toBe(false);
  });

  it('reads back what it writes, keeping what is not its own', () => {
    const view = {
      key: 'Eb',
      notation: 'roman',
      list: true,
      open: {
        depth: Infinity,
        open: [],
        fold: ['1 major7', '2 minor7|5 dominant7'],
      },
    };
    const search = tesseractSearch(view, params('?field=chords&depth=9'));
    expect(search).toBe(
      '?field=chords&key=Eb&notation=roman&list=1&depth=all&fold=1+major7%2C2+minor7%7C5+dominant7',
    );
    expect(parseTesseractView(params(search))).toEqual(view);
  });

  it('reads a depth loosely and an unreadable one as none', () => {
    expect(parseDepth('3')).toBe(3);
    expect(parseDepth('ALL')).toBe(Infinity);
    expect(parseDepth('99')).toBe(8);
    // Nothing open is one deep: the starting chords alone.
    expect(parseDepth('0')).toBe(1);
    expect(parseDepth('two')).toBeNull();
    expect(parseDepth(null)).toBeNull();
    expect(parseTesseractView(params('?depth=two')).open.depth).toBe(2);
  });
});

describe('what is open, in the fewest words', () => {
  it('says a plain depth as just that depth', () => {
    for (const depth of [1, 2, 3]) {
      expect(encodeOpen(MODEL, openToDepth(MODEL, depth))).toEqual({
        depth,
        open: [],
        fold: [],
      });
    }
    expect(encodeOpen(MODEL, openAll(MODEL))).toEqual({
      depth: Infinity,
      open: [],
      fold: [],
    });
  });

  it('says two deep with one branch opened as the depth and that branch', () => {
    const deep = [...MODEL.forest.endNodeOf.values()].find(
      (id) => id.split('|').length === 5,
    )!;
    const open = openPathTo(MODEL, openToDepth(MODEL, 2), deep);
    const spec = encodeOpen(MODEL, open);
    expect(spec.depth).toBe(2);
    expect(spec.fold).toEqual([]);
    // The openings two, three and four chords long on the way.
    expect(spec.open).toHaveLength(3);
    expect(same(resolveOpen(MODEL, spec), open)).toBe(true);
  });

  it('says everything but one branch from the other end', () => {
    const open = openAll(MODEL);
    open.delete('1 major7');
    const spec = encodeOpen(MODEL, open);
    expect(spec).toEqual({ depth: Infinity, open: [], fold: ['1 major7'] });
    expect(same(resolveOpen(MODEL, spec), open)).toBe(true);
  });

  it('reads past openings the library no longer has', () => {
    const spec = { depth: 1, open: ['9 nothing|1 major7'], fold: [] };
    expect(same(resolveOpen(MODEL, spec), openToDepth(MODEL, 1))).toBe(true);
  });
});

describe('the browser’s copy', () => {
  it('keeps the last view, and reads none where nothing was kept', () => {
    expect(readStoredView()).toBeNull();
    const view = {
      key: 'F#',
      notation: 'hybrid',
      list: false,
      open: { depth: Infinity, open: [], fold: ['1 major'] },
    };
    storeView(view);
    expect(readStoredView()).toEqual(view);
  });

  it('reads past a copy that is not one', () => {
    window.localStorage.setItem(TESSERACT_VIEW_KEY, '{nope');
    expect(readStoredView()).toBeNull();
    window.localStorage.setItem(
      TESSERACT_VIEW_KEY,
      JSON.stringify({ key: 7, open: { depth: 'x', open: 'no' } }),
    );
    expect(readStoredView()).toEqual(DEFAULT_VIEW);
  });
});

describe('the links', () => {
  it('reads a progression from its node in Cortex, and nothing else', () => {
    expect(progressionOfNode('progression:12')).toBe(12);
    expect(progressionOfNode('progression:x')).toBeNull();
    expect(progressionOfNode('song:12')).toBeNull();
  });

  it('opens a progression in Tesseract in the last key and view, on the map', () => {
    expect(tesseractHrefForProgression(12, null)).toBe(
      '/console/cortex/tesseract/progressions/12?depth=2',
    );
    storeView({
      key: 'Eb',
      notation: 'jazz',
      list: true,
      open: { depth: 1, open: ['1 major7'], fold: [] },
    });
    expect(tesseractHrefForProgression(12)).toBe(
      '/console/cortex/tesseract/progressions/12?key=Eb&depth=1&open=1+major7',
    );
  });

  it('shows a progression in Cortex as its local graph', () => {
    expect(showInCortexHref(12)).toBe('/console/cortex?focus=progression%3A12');
  });

  it('starts a new progression in the Table with the chords the New panel reads', () => {
    const chords = ['1 major7', '2 minor7', '5 dominant7#5'];
    const href = newProgressionHref(chords);
    expect(href.startsWith('/console/table/progressions?')).toBe(true);
    const query = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(parseChords(query.get(NEW_PARAM)!)).toEqual(chords);
  });
});
