// @vitest-environment jsdom
/**
 * The map's handle tells the page where places are on screen, and which of
 * them the globe hides on its far side.
 */
import { describe, expect, it, vi } from 'vitest';
import { handleFor } from './mapHandle';

function fakeMap(center = { lat: 0, lng: 0 }) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientHeight', { value: 800 });
  return {
    getCenter: () => center,
    getZoom: () => 2,
    getVerticalFieldOfView: () => 36.8699,
    getContainer: () => container,
    project: ([lng, lat]: [number, number]) => ({ x: 600 + lng, y: 400 - lat }),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('the map’s handle', () => {
  it('places points on screen, and hides the far side', () => {
    const handle = handleFor(fakeMap() as never);
    const [near, far] = handle.project([
      { id: 'lagos', lat: 6.5, lng: 3.4 },
      { id: 'honolulu', lat: 21.3, lng: -157.8 },
    ]);
    expect(near).toEqual({ id: 'lagos', x: 603.4, y: 393.5, visible: true });
    expect(far.visible).toBe(false);
  });

  it('follows the camera until told to stop', () => {
    const map = fakeMap();
    const handle = handleFor(map as never);
    const listener = vi.fn();
    const stop = handle.onCamera(listener);
    expect(map.on).toHaveBeenCalledWith('move', listener);
    stop();
    expect(map.off).toHaveBeenCalledWith('move', listener);
  });
});
