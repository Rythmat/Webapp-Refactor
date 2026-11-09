import { describe, expect, it } from 'vitest';
import {
  applyFrameToSearchParams,
  DEFAULT_FRAME,
  frameFromSearchParams,
  isMapView,
  isRingView,
  isTimelineView,
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
          'view=timeline&lens=pathways&open=americas,north-america,americas&from=1946&to=1979&genres=blues-jazz,polka&panel=layers',
        ),
      ),
    ).toEqual({
      view: 'timeline',
      lens: 'pathways',
      open: ['americas', 'north-america'],
      window: { from: 1946, to: 1979 },
      genres: ['blues-jazz'],
      panel: 'layers',
    });
  });

  it('ignores what it cannot read', () => {
    const frame = frameFromSearchParams(
      p(
        'view=3d&lens=songs&open=Atlantis!&from=x&to=1900&genres=polka&panel=chat',
      ),
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

describe('views', () => {
  it('tells the map from the timeline', () => {
    expect(isMapView({ view: 'map' })).toBe(true);
    expect(isTimelineView({ view: 'map' })).toBe(false);
    expect(isMapView({ view: 'timeline' })).toBe(false);
    expect(isTimelineView({ view: 'timeline' })).toBe(true);
    // The ring is neither: it stands over the map.
    expect(isRingView({ view: 'ring' })).toBe(true);
    expect(isMapView({ view: 'ring' })).toBe(false);
    expect(isTimelineView({ view: 'ring' })).toBe(false);
  });

  it('reads and writes the ring’s view', () => {
    expect(frameFromSearchParams(p('view=ring')).view).toBe('ring');
    expect(
      applyFrameToSearchParams(p('place=city:london'), {
        view: 'ring',
      }).toString(),
    ).toBe('place=city%3Alondon&view=ring');
  });
});

describe('sections', () => {
  it('maps each view to a frame and back', () => {
    for (const id of ['explore', 'ring', 'eras', 'regions'] as const) {
      expect(sectionOf({ ...DEFAULT_FRAME, ...sectionFrame(id) })).toBe(id);
    }
  });

  it('tells the views apart by view and opened places', () => {
    expect(sectionOf({ view: 'map', open: [] })).toBe('explore');
    expect(sectionOf({ view: 'ring', open: [] })).toBe('ring');
    expect(sectionOf({ view: 'timeline', open: [] })).toBe('eras');
    expect(sectionOf({ view: 'timeline', open: ['americas'] })).toBe('regions');
  });

  it('writes and clears the Inspector’s panel', () => {
    expect(
      applyFrameToSearchParams(p('event=evt-1'), {
        panel: 'pathways',
      }).toString(),
    ).toBe('event=evt-1&panel=pathways');
    expect(
      applyFrameToSearchParams(p('panel=pathways'), {
        panel: 'none',
      }).toString(),
    ).toBe('panel=none');
    expect(
      applyFrameToSearchParams(p('panel=pathways&view=timeline'), {
        panel: null,
      }).toString(),
    ).toBe('view=timeline');
  });
});

describe('atlasHref', () => {
  it('links to the bare globe', () => {
    expect(atlasHref()).toBe('/globe');
  });

  it('links a stop through a frame', () => {
    expect(
      atlasHref(sectionFrame('regions'), {
        kind: 'pathway',
        pathwayId: 'blues-to-rock',
      }),
    ).toBe(
      '/globe?pathway=blues-to-rock&view=timeline&open=americas%2Ceurope%2Cafrica-me%2Casia-pacific',
    );
    expect(atlasHref({ panel: 'instruments' })).toBe(
      '/globe?panel=instruments',
    );
    expect(
      atlasHref({ ...sectionFrame('eras'), window: { from: 1946, to: 1979 } }),
    ).toBe('/globe?view=timeline&from=1946&to=1979');
  });
});
