// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MeasureBox, StaffLayout } from '@/components/notation/StaffView';
import { GUITAR_ATLAS_BOOK_ONE } from '@/curriculum/data/guitar/bookOne';
import { analyzeMusicMap } from '@/lib/guitar/theory';
import {
  MusicMapOverlay,
  musicMapOverlayModel,
  type MusicMapOverlayProps,
} from '../MusicMapOverlay';

const RED = '#D2404A';
const BAR = 1920;
afterEach(cleanup);

/**
 * A TAB layout as TabStaffView reports it: `bars` measures of 200px,
 * `perLine` to a system, 168px systems (28px headroom above each stave).
 */
function tabLayout(bars: number, perLine: number, scale = 1): StaffLayout {
  const measures: MeasureBox[] = Array.from({ length: bars }, (_, i) => {
    const system = Math.floor(i / perLine);
    return {
      measureIndex: i,
      partIndex: 0,
      system,
      x: (20 + (i % perLine) * 200) * scale,
      y: (28 + system * 168) * scale,
      width: 200 * scale,
      height: 128 * scale,
      startTick: i * BAR,
      endTick: (i + 1) * BAR,
    };
  });
  return {
    barlines: [],
    measures,
    notes: [],
    rests: [],
    scale,
    systemHeight: 168 * scale,
    stepPx: 6.5 * scale,
    topLineDrop: 13 * scale,
  };
}

const G_EX4 = GUITAR_ATLAS_BOOK_ONE.G.musicMaps[3]; // 1 6 2 5
const C_EX4 = GUITAR_ATLAS_BOOK_ONE.C.musicMaps[3]; // 4 5 1 2

function renderOverlay(over: Partial<MusicMapOverlayProps> = {}) {
  return render(
    <div style={{ position: 'relative' }}>
      <MusicMapOverlay
        layout={tabLayout(9, 5)}
        keyCenter="G"
        map={G_EX4}
        countInOffset={BAR}
        keyColor={RED}
        showChordJobs={false}
        showRomanNumerals={false}
        {...over}
      />
    </div>,
  );
}

describe('musicMapOverlayModel', () => {
  it('brackets the turnaround and the wrapped 2-5-1 in both passes (G Example 4)', () => {
    const { chips } = musicMapOverlayModel({
      layout: tabLayout(9, 5), // count-in + bars 1-4 | bars 5-8
      map: G_EX4,
      analysis: analyzeMusicMap(G_EX4),
      passes: 2,
      countInOffset: BAR,
      ticksPerBar: BAR,
    });
    const summary = chips.map((c) => ({
      id: c.pattern.id,
      pass: c.pass,
      bars: `${c.firstBar}-${c.lastBar}`,
      lane: c.lane,
      left: c.left,
      width: c.width,
      top: c.top,
      labelled: c.labelled,
      open: [c.openStart, c.openEnd],
      clipped: c.clipped,
    }));
    const turnaround1 = {
      id: 'turnaround-1625',
      pass: 0,
      bars: '1-4',
      lane: 0,
      left: 224,
      width: 792,
      top: 149,
      labelled: true,
      open: [false, false],
      clipped: false,
    };
    expect(summary).toEqual([
      // Pass 1: the 2-5-1 from bar 3 across the repeat onto bar 5, breaking
      // at the line end, in the lane below the turnaround over bars 1-4
      // (measures 1-4, after the count-in).
      {
        id: 'two-five-one',
        pass: 0,
        bars: '3-5',
        lane: 1,
        left: 624,
        width: 396,
        top: 162,
        labelled: true,
        open: [false, true],
        clipped: false,
      },
      {
        id: 'two-five-one',
        pass: 0,
        bars: '3-5',
        lane: 1,
        left: 20,
        width: 196,
        top: 330,
        labelled: false,
        open: [true, false],
        clipped: false,
      },
      turnaround1,
      // Pass 2: the turnaround again. Its 2-5-1 would cross a repeat the
      // step never plays (it ends there), so it is left out.
      {
        ...turnaround1,
        pass: 1,
        bars: '5-8',
        left: 24,
        top: 317,
      },
    ]);
  });

  it('marks 5 → 1 under bars 2-3 of each pass (C Example 4)', () => {
    const { chips } = musicMapOverlayModel({
      layout: tabLayout(9, 4),
      map: C_EX4,
      analysis: analyzeMusicMap(C_EX4),
      passes: 2,
      countInOffset: BAR,
      ticksPerBar: BAR,
    });
    expect(
      chips.map((c) => [c.pattern.id, c.firstBar, c.lastBar, c.lane]),
    ).toEqual([
      ['five-to-one', 2, 3, 0],
      ['five-to-one', 6, 7, 0],
    ]);
    // Bars 2-3 are measures 2-3 (after the count-in), on the first line.
    expect(chips[0].left).toBe(20 + 2 * 200 + 4);
    expect(chips[0].width).toBe(400 - 8);
    // Bars 6-7 are measures 6-7, on the second line.
    expect(chips[1].left).toBe(20 + 2 * 200 + 4);
    expect(chips[1].top).toBe(28 + 168 + 128 - 7);
  });

  it('finds bar 1 at tick 0 out of time, and scales with the TAB', () => {
    const { chips, bars } = musicMapOverlayModel({
      layout: tabLayout(8, 8, 1.5),
      map: C_EX4,
      analysis: analyzeMusicMap(C_EX4),
      passes: 2,
      countInOffset: 0,
      ticksPerBar: BAR,
    });
    expect(chips[0].left).toBe((20 + 200 + 4) * 1.5);
    expect(chips[0].top).toBe((28 + 128 - 7) * 1.5);
    expect(bars).toHaveLength(8);
    expect(bars[0]).toMatchObject({
      group: 'away',
      roman: 'IVmaj7',
      right: (20 + 200 - 4) * 1.5,
      top: (28 - 22) * 1.5,
    });
  });
});

describe('MusicMapOverlay', () => {
  it('draws labelled chips that open their note', () => {
    renderOverlay();
    const turnaround = screen.getByRole('button', {
      name: 'Turnaround, bars 1–4',
    });
    expect(
      screen.getByRole('button', { name: 'Turnaround, bars 5–8' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: '2-5-1, bars 3–5, across the repeat',
      }),
    ).toHaveTextContent('2-5-1');
    // The last pass ends the step: no 2-5-1 across a repeat that never comes.
    expect(screen.queryByRole('button', { name: /^2-5-1, bars 7/ })).toBeNull();
    // The line-end continuation carries no second label.
    expect(document.querySelectorAll('[data-map-chip]')).toHaveLength(4);

    fireEvent.click(turnaround);
    expect(
      screen.getByText(
        '1, 6, 2, 5 leads back to 1. That is why this map loops so smoothly.',
      ),
    ).toBeInTheDocument();
  });

  it('opens the across-the-repeat note for the wrapped 2-5-1', () => {
    renderOverlay();
    fireEvent.click(
      screen.getByRole('button', {
        name: '2-5-1, bars 3–5, across the repeat',
      }),
    );
    expect(
      screen.getByText(
        'Here the 2-5-1 happens across the repeat. The map lands on 1 when it starts again.',
      ),
    ).toBeInTheDocument();
  });

  it('opens 5 → 1 in C Example 4', () => {
    renderOverlay({ keyCenter: 'C', map: C_EX4 });
    fireEvent.click(screen.getByRole('button', { name: '5 → 1, bars 2–3' }));
    expect(
      screen.getByText(
        /The 5 chord builds tension\. The 1 chord releases it\./,
      ),
    ).toBeInTheDocument();
  });

  it('shows chord jobs and Roman numerals only when asked', () => {
    const view = renderOverlay();
    expect(document.querySelector('[data-chord-job]')).toBeNull();
    expect(document.querySelector('[data-roman]')).toBeNull();

    view.rerender(
      <div style={{ position: 'relative' }}>
        <MusicMapOverlay
          layout={tabLayout(9, 5)}
          keyCenter="G"
          map={G_EX4}
          countInOffset={BAR}
          keyColor={RED}
          showChordJobs
          showRomanNumerals={false}
        />
      </div>,
    );
    const jobs = [...document.querySelectorAll('[data-chord-job]')];
    // One per bar, both passes; each an icon and a word.
    expect(jobs.map((el) => el.textContent)).toEqual([
      'Home',
      'Home',
      'Away',
      'Tension',
      'Home',
      'Home',
      'Away',
      'Tension',
    ]);
    expect(jobs.every((el) => el.querySelector('svg'))).toBe(true);
    expect(document.querySelector('[data-roman]')).toBeNull();

    view.rerender(
      <div style={{ position: 'relative' }}>
        <MusicMapOverlay
          layout={tabLayout(9, 5)}
          keyCenter="G"
          map={G_EX4}
          countInOffset={BAR}
          keyColor={RED}
          showChordJobs={false}
          showRomanNumerals
        />
      </div>,
    );
    expect(document.querySelector('[data-chord-job]')).toBeNull();
    expect(
      [...document.querySelectorAll('[data-roman]')]
        .slice(0, 4)
        .map((el) => el.textContent),
    ).toEqual(['Imaj7', 'vi7', 'ii7', 'V7']);
  });

  it('marks a triad bar in a 7th map and chord 7, on the first pass', () => {
    const dEx4 = GUITAR_ATLAS_BOOK_ONE.D.musicMaps[3];
    const triadBars = analyzeMusicMap(dEx4).triadBarsIn7thMap;
    expect(triadBars.length).toBeGreaterThan(0);
    const view = renderOverlay({ keyCenter: 'D', map: dEx4 });
    const marked = [...document.querySelectorAll('[data-bar-note]')].map((el) =>
      Number(el.closest('[data-bar-mark]')?.getAttribute('data-bar-mark')),
    );
    expect(marked).toEqual(triadBars);
    fireEvent.click(
      screen.getByRole('button', {
        name: `A triad in a 7th map, bar ${triadBars[0] + 1}`,
      }),
    );
    expect(screen.getByText(/^This bar uses a triad\./)).toBeInTheDocument();
    view.unmount();

    const bbEx4 = GUITAR_ATLAS_BOOK_ONE.Bb.musicMaps[3];
    const seven = bbEx4.bars.findIndex((b) => b.degree === 7);
    renderOverlay({ keyCenter: 'Bb', map: bbEx4 });
    fireEvent.click(
      screen.getByRole('button', { name: `Chord 7, bar ${seven + 1}` }),
    );
    expect(
      screen.getByText(/Chord 7 shares three notes with the 5 dom7 chord\./),
    ).toBeInTheDocument();
  });

  it('leaves out the change across the repeat on the last pass (D Example 3)', () => {
    // 5 → 1 from bar 2 onto bar 1 again: the second pass ends the step.
    renderOverlay({
      keyCenter: 'D',
      map: GUITAR_ATLAS_BOOK_ONE.D.musicMaps[2],
      layout: tabLayout(5, 5),
    });
    expect(
      screen.getByRole('button', {
        name: '5 → 1, bars 2–3, across the repeat',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^5 → 1, bar 4/ })).toBeNull();
  });

  it('draws nothing before the TAB has a layout', () => {
    const { container } = renderOverlay({ layout: null });
    expect(container.querySelector('[data-music-map-overlay]')).toBeNull();
  });

  it('is neutral: fixed 12px pills on white/20 brackets, no key colour', () => {
    // G: pattern chips; D: a triad-bar note too.
    const cases = [
      { keyCenter: 'G' as const, map: G_EX4 },
      { keyCenter: 'D' as const, map: GUITAR_ATLAS_BOOK_ONE.D.musicMaps[3] },
    ];
    for (const [scale, { keyCenter, map }] of [
      [1, cases[0]],
      [2, cases[0]],
      [1, cases[1]],
    ] as const) {
      const { container } = renderOverlay({
        keyCenter,
        map,
        layout: tabLayout(9, 5, scale),
        showRomanNumerals: true,
      });
      const overlay = container.querySelector('[data-music-map-overlay]')!;
      // The key colour (#D2404A = rgb(210, 64, 74)) is nowhere in it.
      expect(overlay.innerHTML).not.toMatch(/d2404a|210, 64, 74/i);
      const pills = [
        ...overlay.querySelectorAll<HTMLElement>(
          '[data-map-chip] button, [data-map-chip] span.absolute, [data-bar-mark] button',
        ),
      ];
      expect(pills.length).toBeGreaterThan(0);
      for (const pill of pills) {
        for (const cls of [
          'h-5',
          'rounded-full',
          'border-white/15',
          'text-xs',
          'text-white/55',
        ]) {
          expect(pill.className).toContain(cls);
        }
        expect(pill.className).not.toMatch(/font-(semibold|medium|bold)/);
        // Fixed, not scaled with the TAB.
        expect(pill.style.height).toBe('');
        expect(pill.style.fontSize).toBe('');
      }
      for (const rail of overlay.querySelectorAll<HTMLElement>(
        '[data-map-chip] > [aria-hidden]',
      )) {
        expect(rail.style.borderTop || rail.style.background).toMatch(
          /rgba\(255, 255, 255, 0\.2\)$/,
        );
      }
      for (const roman of overlay.querySelectorAll('[data-roman]')) {
        expect(roman.className).toContain('text-xs');
      }
      cleanup();
    }
  });

  it('draws the chord jobs as the same neutral 12px pills', () => {
    const { container } = renderOverlay({ showChordJobs: true });
    const jobs = [
      ...container.querySelectorAll<HTMLElement>('[data-chord-job]'),
    ];
    expect(jobs).toHaveLength(8);
    for (const job of jobs) {
      for (const cls of [
        'h-5',
        'rounded-full',
        'border-white/15',
        'text-xs',
        'text-white/55',
        'font-normal',
      ]) {
        expect(job.className).toContain(cls);
      }
      // Not the badge's own 10px medium look, nor its inline ink.
      expect(job.className).not.toMatch(/text-\[10px\]|font-medium/);
      expect(job.style.border).toBe('');
      expect(job.style.color).toBe('');
      // The word and its icon stay.
      expect(job.querySelector('svg')).toBeTruthy();
    }
  });
});
