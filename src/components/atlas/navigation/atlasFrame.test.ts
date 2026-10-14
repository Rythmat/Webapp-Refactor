import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FRAME,
  applyFrameToSearchParams,
  frameFromSearchParams,
  windowFromSearchParams,
} from './atlasFrame';
import { atlasHref } from './atlasHref';
import { LEGACY_TABS, sectionFrame, sectionOf } from './sections';

const p = (query: string) => new URLSearchParams(query);
const THIS_YEAR = new Date().getFullYear();

describe('the frame on the URL', () => {
  it('reads defaults from a bare URL', () => {
    expect(frameFromSearchParams(p(''))).toEqual(DEFAULT_FRAME);
  });

  it('reads every frame param', () => {
    expect(
      frameFromSearchParams(
        p(
          'view=timeline&lens=regions&region=west-africa&from=1946&to=1979&lane=jazz',
        ),
      ),
    ).toEqual({
      view: 'timeline',
      lens: 'regions',
      region: 'west-africa',
      window: { from: 1946, to: 1979 },
      lane: 'jazz',
    });
  });

  it('ignores what it cannot read', () => {
    const frame = frameFromSearchParams(
      p('view=3d&lens=songs&region=atlantis&from=x&to=1900&lane=polka'),
    );
    expect(frame).toEqual(DEFAULT_FRAME);
    // A region only means something in the regions lens.
    expect(frameFromSearchParams(p('region=west-africa')).region).toBeNull();
  });

  it('reads an era, by id or by name, as its years', () => {
    expect(windowFromSearchParams(p('era=postwar'))).toEqual({
      from: 1946,
      to: 1979,
    });
    expect(windowFromSearchParams(p('era=Postwar%20%26%20Revolution'))).toEqual(
      { from: 1946, to: 1979 },
    );
    expect(windowFromSearchParams(p('era=global-digital'))).toEqual({
      from: 2000,
      to: THIS_YEAR,
    });
    expect(windowFromSearchParams(p('era=nope'))).toBeNull();
    // from/to win over an era.
    expect(windowFromSearchParams(p('era=postwar&from=1960&to=1970'))).toEqual({
      from: 1960,
      to: 1970,
    });
  });

  it('writes only what is not at its default, keeping the stop', () => {
    const next = applyFrameToSearchParams(p('event=e1&view=timeline'), {
      view: 'map',
    });
    expect(next.toString()).toBe('event=e1');
  });

  it('writes the window in whole years and drops the era', () => {
    const next = applyFrameToSearchParams(p('era=postwar&place=city:x'), {
      window: { from: 1950.4, to: 1969.6 },
    });
    expect(next.get('from')).toBe('1950');
    expect(next.get('to')).toBe('1970');
    expect(next.has('era')).toBe(false);
    expect(next.get('place')).toBe('city:x');
    const cleared = applyFrameToSearchParams(next, { window: null });
    expect(cleared.has('from')).toBe(false);
  });

  it('closes an open region when the lens changes', () => {
    const regions = p('view=timeline&lens=regions&region=west-africa');
    expect(
      applyFrameToSearchParams(regions, { lens: 'pathways' }).has('region'),
    ).toBe(false);
    expect(
      applyFrameToSearchParams(regions, { view: 'map' }).get('region'),
    ).toBe('west-africa');
  });
});

describe('sections', () => {
  it('maps each section to a frame and back', () => {
    for (const id of [
      'explore',
      'eras',
      'regions',
      'pathways',
      'instruments',
    ] as const) {
      expect(sectionOf(sectionFrame(id))).toBe(id);
    }
  });

  it('keeps a lens’s section on either view', () => {
    expect(sectionOf({ view: 'map', lens: 'regions' })).toBe('regions');
    expect(sectionOf({ view: 'map', lens: 'lineage' })).toBe('explore');
    expect(sectionOf({ view: 'timeline', lens: 'lineage' })).toBe('eras');
  });

  it('knows the dashboard’s old tabs', () => {
    expect(LEGACY_TABS.Regions).toBe('regions');
    expect(LEGACY_TABS.Eras).toBe('eras');
  });
});

describe('atlasHref', () => {
  it('links to the bare globe', () => {
    expect(atlasHref()).toBe('/atlas/globe');
  });

  it('links a stop through a frame', () => {
    expect(
      atlasHref(sectionFrame('pathways'), {
        kind: 'pathway',
        pathwayId: 'blues-to-rock',
      }),
    ).toBe('/atlas/globe?pathway=blues-to-rock&view=timeline&lens=pathways');
    expect(
      atlasHref({ ...sectionFrame('eras'), window: { from: 1946, to: 1979 } }),
    ).toBe('/atlas/globe?view=timeline&from=1946&to=1979');
  });
});
