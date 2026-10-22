// @vitest-environment jsdom
/**
 * The automation lane zooms as the timeline does: it shares the timeline's
 * zoom and scroll, Ctrl or ⌘ with the wheel (a trackpad pinch) zooms at the
 * pointer, a sideways swipe scrolls, and its own − / + / Fit sit at hand.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import { useStore } from '@/daw/store';
import { AutomationLaneEditor } from '../AutomationLaneEditor';

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ timelineZoom: 1, timelineScrollLeft: 0 });
  s().setAutomationOpenTrackId(MASTER_AUTOMATION_ID);
});
afterEach(cleanup);

const lane = () =>
  screen.getByTestId('automation-lane-editor').querySelector('canvas')!
    .parentElement!;

describe('the automation lane’s zoom', () => {
  it('zooms in and out with Ctrl or ⌘ and the wheel', () => {
    render(<AutomationLaneEditor />);
    fireEvent.wheel(lane(), { deltaY: -100, ctrlKey: true });
    const zoomedIn = s().timelineZoom;
    expect(zoomedIn).toBeGreaterThan(1);
    fireEvent.wheel(lane(), { deltaY: 100, metaKey: true });
    fireEvent.wheel(lane(), { deltaY: 100, metaKey: true });
    expect(s().timelineZoom).toBeLessThan(zoomedIn);
  });

  it('scrolls sideways with a swipe or Shift and the wheel, not zoom', () => {
    render(<AutomationLaneEditor />);
    fireEvent.wheel(lane(), { deltaX: 120 });
    expect(s().timelineScrollLeft).toBe(120);
    fireEvent.wheel(lane(), { deltaY: 30, shiftKey: true });
    expect(s().timelineScrollLeft).toBe(150);
    expect(s().timelineZoom).toBe(1);
  });

  it('has the timeline’s zoom buttons, on the same zoom', () => {
    render(<AutomationLaneEditor />);
    fireEvent.click(screen.getByTestId('automation-zoom-in'));
    expect(s().timelineZoom).toBeGreaterThan(1);
    expect(screen.getByTestId('automation-zoom-level').textContent).toMatch(
      /%$/,
    );
    const zoomed = s().timelineZoom;
    fireEvent.click(screen.getByTestId('automation-zoom-out'));
    expect(s().timelineZoom).toBeLessThan(zoomed);
    expect(screen.getByTestId('automation-zoom-fit')).toBeTruthy();
  });
});
