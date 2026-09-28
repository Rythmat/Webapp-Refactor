// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FretDiagram } from '../FretDiagram';
import type { FretDiagramDot, FretDiagramProps } from '../types';

const RED = '#D2404A';

function renderDiagram(props: Partial<FretDiagramProps> = {}) {
  return render(
    <FretDiagram
      startFret={1}
      muted={[]}
      open={[]}
      dots={[]}
      keyColor={RED}
      ariaLabel="diagram"
      {...props}
    />,
  ).container;
}

describe('FretDiagram', () => {
  afterEach(cleanup);

  it('draws each dot state with its own shape', () => {
    const dots: FretDiagramDot[] = [
      { string: 6, fret: 1, label: '1' },
      { string: 5, fret: 2, label: '2', state: 'next' },
      { string: 4, fret: 3, label: '3', state: 'done' },
      { string: 3, fret: 4, label: '4', state: 'missing' },
      { string: 2, fret: 5, label: '1', state: 'extra' },
    ];
    const host = renderDiagram({ dots });
    const dot = (state: string) =>
      host.querySelector(`[data-dot][data-state="${state}"]`)!;

    expect(dot('idle').querySelectorAll('circle')).toHaveLength(1);
    // next: a solid ring around the dot.
    const nextRing = dot('next').querySelectorAll('circle')[1];
    expect(nextRing.getAttribute('fill')).toBe('none');
    expect(nextRing.hasAttribute('stroke-dasharray')).toBe(false);
    // done: muted, and a check where the label was.
    expect(dot('done').querySelector('[data-check]')).not.toBeNull();
    expect(dot('done').querySelector('text')).toBeNull();
    // missing: a dashed ring.
    expect(
      dot('missing').querySelector('circle[stroke-dasharray]'),
    ).not.toBeNull();
    // extra: an x badge.
    expect(dot('extra').querySelector('[data-extra]')).not.toBeNull();
  });

  it('emphasises the frame of the current box', () => {
    const idle = renderDiagram().querySelector('[data-frame]')!;
    const current = renderDiagram({ state: 'current' }).querySelector(
      '[data-frame]',
    )!;
    expect(Number(current.getAttribute('stroke-width'))).toBeGreaterThan(
      Number(idle.getAttribute('stroke-width')),
    );
    expect(current.getAttribute('fill')).toBe(RED);
  });

  it('glows when heard, and only pulses when motion is allowed', () => {
    const host = renderDiagram({ state: 'heard' });
    const glow = host.querySelector('[data-glow]');
    expect(glow?.getAttribute('class')).toBe('motion-safe:animate-pulse');
    expect(renderDiagram().querySelector('[data-glow]')).toBeNull();
  });

  it('dims a finished box and checks it off', () => {
    const host = renderDiagram({ state: 'done', title: 'C major' });
    expect(host.firstElementChild?.className).toContain('opacity-50');
    expect(host.querySelector('[data-done-check]')).not.toBeNull();
  });

  it('decorates an open string from a dot at fret 0', () => {
    const host = renderDiagram({
      open: [6, 1],
      dots: [{ string: 6, fret: 0, isRoot: true, state: 'next' }],
    });
    const low = host.querySelector('[data-marker="open"][data-string="6"]')!;
    expect(low.getAttribute('data-root')).toBe('true');
    expect(low.getAttribute('data-state')).toBe('next');
    expect(low.querySelector('polygon')).not.toBeNull();
    const high = host.querySelector('[data-marker="open"][data-string="1"]')!;
    expect(high.getAttribute('data-state')).toBe('idle');
    expect(host.querySelectorAll('[data-dot]')).toHaveLength(0);
  });

  it('gives a barre the state its dots share', () => {
    const barres = [
      { fret: 1, fromString: 2, toString: 1, finger: 1 },
    ] as const;
    const barreOf = (states: FretDiagramDot['state'][]) =>
      renderDiagram({
        barres,
        dots: [
          { string: 2, fret: 1, state: states[0] },
          { string: 1, fret: 1, state: states[1] },
          // Off the barre's fret: not one of its dots.
          { string: 3, fret: 2, state: 'missing' },
        ],
      }).querySelector('[data-barre]')!;

    const idle = barreOf([undefined, 'idle']);
    expect(idle.getAttribute('data-string')).toBe('2-1');
    expect(idle.getAttribute('data-fret')).toBe('1');
    expect(idle.getAttribute('data-state')).toBe('idle');
    const done = barreOf(['done', 'done']);
    expect(done.getAttribute('data-state')).toBe('done');
    expect(Number(done.getAttribute('fill-opacity'))).toBeLessThan(
      Number(idle.getAttribute('fill-opacity')),
    );
    expect(barreOf(['missing', 'idle']).getAttribute('data-state')).toBe(
      'idle',
    );
  });

  it('draws as many rows as asked for', () => {
    const host = renderDiagram({ startFret: 3, rows: 4 });
    expect(
      [...host.querySelectorAll('[data-fret-label]')].map((t) => t.textContent),
    ).toEqual(['3', '4', '5', '6']);
  });
});
