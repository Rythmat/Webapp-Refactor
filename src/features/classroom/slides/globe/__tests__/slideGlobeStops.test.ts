import { describe, expect, it } from 'vitest';
import {
  SLIDE_GLOBE_GO,
  SLIDE_GLOBE_KEY,
  atRef,
  isSlideGlobeGo,
  isSlideGlobeKey,
  isStopRef,
  stopAt,
  stopParams,
} from '../slideGlobeStops';

describe('a slide’s Globe stops', () => {
  it('opens a place or an event as the Globe’s own address', () => {
    expect(stopParams('place:city:detroit')).toEqual({ place: 'city:detroit' });
    expect(stopParams('place:state:Indiana:United States')).toEqual({
      place: 'state:Indiana:United States',
    });
    expect(stopParams('event:evt-pop-losangeles-1982-michaeljackson')).toEqual({
      event: 'evt-pop-losangeles-1982-michaeljackson',
    });
  });

  it('keeps a town the Globe has no city for as its position', () => {
    const ref = atRef([41.5808, -87.3456]);
    expect(ref).toBe('at:41.5808,-87.3456');
    expect(stopAt(ref)).toEqual([41.5808, -87.3456]);
    expect(stopParams(ref)).toEqual({ at: '41.5808,-87.3456' });
    expect(stopAt('at:95,0')).toBeNull();
  });

  it('refuses anything else', () => {
    for (const bad of ['artist:mj', 'place:', 'event', 'javascript:alert(1)'])
      expect(stopParams(bad), bad).toBeNull();
    for (const bad of [
      'place:<script>',
      'https://example.com',
      'at:1,2,3',
      42,
      undefined,
    ])
      expect(isStopRef(bad), String(bad)).toBe(false);
    expect(isStopRef('event:evt-makossa-douala-1972')).toBe(true);
    expect(isStopRef('at:41.5808,-87.3456')).toBe(true);
  });

  it('reads only its own messages and the lesson’s keys', () => {
    expect(isSlideGlobeGo({ type: SLIDE_GLOBE_GO, ref: 'event:x' })).toBe(true);
    expect(isSlideGlobeGo({ type: SLIDE_GLOBE_GO })).toBe(false);
    expect(isSlideGlobeGo('slide-globe:go')).toBe(false);
    expect(isSlideGlobeKey({ type: SLIDE_GLOBE_KEY, key: 'ArrowRight' })).toBe(
      true,
    );
    expect(isSlideGlobeKey({ type: SLIDE_GLOBE_KEY, key: 'a' })).toBe(false);
  });
});
