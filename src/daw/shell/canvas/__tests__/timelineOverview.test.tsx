// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishTimelineWidth } from '@/daw/editor/viewport';
import { useStore } from '@/daw/store';
import { clockText, labelStep, TimelineOverview } from '../TimelineOverview';

// ── The song at a glance, under the lanes (owner, 2026-10-22) ──────────────
// After Suno's timeline strip: the song in minutes and seconds, a box over
// what the lanes show that follows the zoom, its middle dragged to scroll
// and its edges to zoom. Run:
// npx vitest run src/daw/shell/canvas/__tests__/timelineOverview.test.tsx

const s = () => useStore.getState();
const STRIP_PX = 800;

// jsdom has no PointerEvent: a drag's position would be lost without one.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventStandIn extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventStandIn as unknown as typeof PointerEvent;
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    bpm: 120,
    timelineZoom: 1,
    timelineScrollLeft: 0,
    followPlayhead: false,
  });
  publishTimelineWidth(STRIP_PX);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      if (this.dataset.testid === 'timeline-overview') return STRIP_PX;
      if (this.dataset.testid === 'timeline-overview-view') {
        return parseFloat(this.style.width) || 0;
      }
      return 0;
    },
  );
  // jsdom lays nothing out: the box stands where its style puts it.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const left =
        this.dataset.testid === 'timeline-overview-view'
          ? parseFloat(this.style.left) || 0
          : 0;
      return { left, top: 0, width: 0, height: 0 } as DOMRect;
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  publishTimelineWidth(0);
});

const box = () => screen.getByTestId('timeline-overview-view');
const boxWidth = () => parseFloat(box().style.width);

describe('the song overview', () => {
  it('writes the time as Suno does', () => {
    expect(clockText(0)).toBe('00:00');
    expect(clockText(20)).toBe('00:20');
    expect(clockText(100)).toBe('01:40');
    // A label every 20 s for two minutes over 800 px; every 5 s for 30 s.
    expect(labelStep(120, 800)).toBe(10);
    expect(labelStep(30, 800)).toBe(5);
  });

  it('labels the song from 00:00', () => {
    render(<TimelineOverview />);
    expect(screen.getByTestId('timeline-overview')).toHaveTextContent('00:00');
  });

  it('follows the zoom: zoomed in, the box narrows', () => {
    // A long song, so the view is a part of it.
    useStore.setState({
      sections: [
        {
          id: 'x',
          type: 'verse',
          label: 'Verse',
          startTick: 0,
          endTick: 480 * 4 * 64,
        },
      ] as never,
    });
    render(<TimelineOverview />);
    const wide = boxWidth();
    act(() => s().setTimelineZoom(2));
    expect(boxWidth()).toBeLessThan(wide);
    expect(boxWidth()).toBeCloseTo(wide / 2, 0);
  });

  it('zooms when an edge is dragged, the other edge staying put', () => {
    useStore.setState({
      sections: [
        {
          id: 'x',
          type: 'verse',
          label: 'Verse',
          startTick: 0,
          endTick: 480 * 4 * 64,
        },
      ] as never,
    });
    render(<TimelineOverview />);
    const width = boxWidth();
    // The end edge, dragged to half the box: twice the zoom, from 0.
    fireEvent.pointerDown(box(), {
      button: 0,
      clientX: width - 2,
      pointerId: 1,
    });
    fireEvent.pointerMove(box(), { clientX: width / 2, pointerId: 1 });
    fireEvent.pointerUp(box(), { pointerId: 1 });
    expect(s().timelineZoom).toBeCloseTo(2, 1);
    expect(s().timelineScrollLeft).toBe(0);
  });

  it('scrolls when the box is dragged', () => {
    useStore.setState({
      sections: [
        {
          id: 'x',
          type: 'verse',
          label: 'Verse',
          startTick: 0,
          endTick: 480 * 4 * 64,
        },
      ] as never,
    });
    render(<TimelineOverview />);
    const width = boxWidth();
    fireEvent.pointerDown(box(), {
      button: 0,
      clientX: width / 2,
      pointerId: 1,
    });
    fireEvent.pointerMove(box(), { clientX: width / 2 + 100, pointerId: 1 });
    fireEvent.pointerUp(box(), { pointerId: 1 });
    expect(s().timelineScrollLeft).toBeGreaterThan(0);
    expect(s().timelineZoom).toBe(1);
  });
});
