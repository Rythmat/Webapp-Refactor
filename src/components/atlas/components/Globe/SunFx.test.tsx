// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SunFx } from './SunFx';

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});

const motion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

function fakeMap(center = { lat: 0, lng: 0 }) {
  return {
    getCenter: () => center,
    getZoom: () => 2,
    getVerticalFieldOfView: () => 36.87,
    getContainer: () => ({ clientHeight: 800 }),
    project: ([lng, lat]: [number, number]) => ({ x: 100 + lng, y: 100 - lat }),
    on: vi.fn(),
    off: vi.fn(),
  };
}

const sun = () => document.querySelector<HTMLElement>('[data-atlas-sun]');

describe('the sun’s burst and pulse', () => {
  it('stands at its place, and hides on the far side of the globe', () => {
    motion(false);
    const { rerender } = render(
      <SunFx lat={6} lng={3} map={fakeMap() as never} />,
    );
    expect(sun()?.style.transform).toBe('translate(103px, 94px)');
    expect(sun()?.style.visibility).toBe('visible');
    rerender(<SunFx lat={6} lng={179} map={fakeMap() as never} />);
    expect(sun()?.style.visibility).toBe('hidden');
  });

  it('is not there under reduced motion', () => {
    motion(true);
    render(<SunFx lat={6} lng={3} map={fakeMap() as never} />);
    expect(sun()).toBeNull();
  });
});
