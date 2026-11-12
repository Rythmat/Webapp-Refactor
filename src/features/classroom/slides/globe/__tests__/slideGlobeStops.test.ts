import { describe, expect, it } from 'vitest';
import {
  SLIDE_GLOBE_GO,
  SLIDE_GLOBE_KEY,
  atRef,
  decodePath,
  encodePath,
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

  it('carries the story’s path in the frame’s address', () => {
    const path: [number, number][] = [
      [41.5808, -87.3456],
      [35.7056, 139.7519],
    ];
    const text = encodePath(path);
    expect(text).toBe('41.5808,-87.3456;35.7056,139.7519');
    expect(decodePath(text)).toEqual(path);
    expect(decodePath('1,2;bad;95,0;3,4')).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(decodePath(null)).toEqual([]);
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
    expect(isSlideGlobeGo({ type: SLIDE_GLOBE_GO, at: 2 })).toBe(true);
    expect(isSlideGlobeGo({ type: SLIDE_GLOBE_GO, at: -1 })).toBe(false);
    expect(isSlideGlobeGo({ type: SLIDE_GLOBE_GO, at: 1.5 })).toBe(false);
    expect(isSlideGlobeGo({ type: SLIDE_GLOBE_GO })).toBe(false);
    expect(isSlideGlobeGo('slide-globe:go')).toBe(false);
    expect(isSlideGlobeKey({ type: SLIDE_GLOBE_KEY, key: 'ArrowRight' })).toBe(
      true,
    );
    expect(isSlideGlobeKey({ type: SLIDE_GLOBE_KEY, key: 'a' })).toBe(false);
  });
});

describe('the story’s path', () => {
  it('runs along the great circle, end to end', async () => {
    const { greatCircle } = await import('../SlideGlobePage');
    const leg = greatCircle([0, 0], [0, 90], 2);
    expect(leg).toHaveLength(3);
    expect(leg[1]![0]).toBeCloseTo(0);
    expect(leg[1]![1]).toBeCloseTo(45);
    expect(leg[2]![1]).toBeCloseTo(90);
    expect(greatCircle([1, 1], [1, 1], 8)).toEqual([[1, 1]]);
  });
});
