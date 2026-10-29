import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FRAME,
  applyFrameToSearchParams,
  frameFromSearchParams,
  windowFromSearchParams,
} from './atlasFrame';
import { atlasHref } from './atlasHref';
import { sectionFrame, sectionOf } from './sections';

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
          'view=timeline&lens=pathways&open=americas,north-america,americas&from=1946&to=1979&genres=blues-jazz,polka',
        ),
      ),
    ).toEqual({
      view: 'timeline',
      lens: 'pathways',
      open: ['americas', 'north-america'],
      window: { from: 1946, to: 1979 },
      genres: ['blues-jazz'],
    });
  });

  it('ignores what it cannot read', () => {
    const frame = frameFromSearchParams(
      p('view=3d&lens=songs&open=Atlantis!&from=x&to=1900&genres=polka'),
    );
    expect(frame).toEqual(DEFAULT_FRAME);
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

  it('writes the opened places and the genres as lists', () => {
    const next = applyFrameToSearchParams(p('view=timeline'), {
      open: ['americas', 'north-america'],
      genres: ['rock', 'pop'],
    });
    expect(next.get('open')).toBe('americas,north-america');
    expect(next.get('genres')).toBe('rock,pop');
    expect(applyFrameToSearchParams(next, { open: [] }).has('open')).toBe(
      false,
    );
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
      expect(sectionOf({ ...DEFAULT_FRAME, ...sectionFrame(id) })).toBe(id);
    }
  });

  it('tells the sections apart by view, lens and opened places', () => {
    expect(sectionOf({ view: 'map', lens: 'pathways', open: [] })).toBe(
      'pathways',
    );
    expect(sectionOf({ view: 'map', lens: 'places', open: [] })).toBe(
      'explore',
    );
    expect(sectionOf({ view: 'timeline', lens: 'places', open: [] })).toBe(
      'eras',
    );
    expect(
      sectionOf({ view: 'timeline', lens: 'places', open: ['americas'] }),
    ).toBe('regions');
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
