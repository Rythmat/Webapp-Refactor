// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArtCover } from '../ArtCover';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const covers = () => [...document.querySelectorAll('[data-art-cover]')];

describe('ArtCover', () => {
  it('is decoration: hidden from assistive tech, every line on one gradient', () => {
    render(<ArtCover seed="chroma" kind="rings" aspect={0.75} />);
    const [cover] = covers();
    expect(cover).toHaveAttribute('aria-hidden', 'true');
    const gradients = cover.querySelectorAll('linearGradient');
    expect(gradients).toHaveLength(1);
    const id = gradients[0].getAttribute('id');
    const paths = [...cover.querySelectorAll('path')];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.getAttribute('stroke')).toBe(`url(#${id})`);
    }
  });

  it('fades its lines out with a mask on the box, and glows behind them', () => {
    render(<ArtCover seed="share" kind="strands" aspect={0.75} />);
    const [cover] = covers();
    expect((cover as HTMLElement).style.maskImage).toMatch(/linear-gradient/);
    const paths = [...cover.querySelectorAll('path')];
    expect(paths[0]).toHaveAttribute('data-art-glow');
    expect(Number(paths[0].getAttribute('stroke-width'))).toBeGreaterThan(
      Number(paths[1].getAttribute('stroke-width')),
    );
    cleanup();
    render(<ArtCover seed="share" kind="strands" aspect={0.75} fade="none" />);
    expect((covers()[0] as HTMLElement).style.maskImage).toBe('');
  });

  it('draws the lines again in its hover palette, to crossfade to', () => {
    render(
      <ArtCover
        seed="h"
        kind="rays"
        aspect={1}
        palette="white"
        hoverPalette="spectrum"
      />,
    );
    const [cover] = covers();
    expect(cover.querySelectorAll('linearGradient')).toHaveLength(2);
    const base = cover.querySelector('.art-base');
    const hover = cover.querySelector('.art-hover');
    expect(hover).toHaveAttribute('data-art-hover', 'spectrum');
    expect(hover?.querySelectorAll('path').length).toBe(
      base?.querySelectorAll('path').length,
    );
  });

  it('gives each cover its own gradient id', () => {
    render(
      <>
        <ArtCover seed="a" aspect={1} />
        <ArtCover seed="a" aspect={1} />
      </>,
    );
    const ids = covers().map((c) =>
      c.querySelector('linearGradient')?.getAttribute('id'),
    );
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[0]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('draws a drifting flow cover two frames wide, stretched to its box', () => {
    render(
      <ArtCover
        seed="jam"
        kind="strands"
        aspect={2.6}
        density="hero"
        motion="drift"
      />,
    );
    const [cover] = covers();
    expect(cover).toHaveAttribute('data-flow');
    const svg = cover.querySelector('svg');
    const [, , w, h] = (svg?.getAttribute('viewBox') ?? '')
      .split(' ')
      .map(Number);
    expect(w / h).toBeCloseTo((2 * 400) / Math.round(400 / 2.6), 1);
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  });

  it('keeps a still cover filling and cropping its box', () => {
    render(<ArtCover seed="x" kind="contours" aspect={0.75} />);
    const svg = covers()[0].querySelector('svg');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
    expect(covers()[0]).not.toHaveAttribute('data-flow');
  });

  it('rests a drifting cover while it is off screen', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(
          private cb: (entries: { isIntersecting: boolean }[]) => void,
        ) {}
        observe() {
          this.cb([{ isIntersecting: false }]);
        }
        disconnect() {}
      },
    );
    render(<ArtCover seed="x" kind="helix" aspect={2} motion="drift" />);
    expect(covers()[0]).toHaveAttribute('data-paused');
  });
});
