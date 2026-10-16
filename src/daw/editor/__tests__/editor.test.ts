// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { pixelToTick } from '@/daw/utils/timelineScale';
import {
  followScroll,
  isFollowPaused,
  pauseFollow,
  resumeFollow,
} from '../follow';
import { gridChoice, gridChoices, gridLabel, fitsMetre } from '../snap';
import {
  fitTimeline,
  publishTimelineWidth,
  songLengthOf,
  zoomTimelineIn,
  zoomTimelineOut,
} from '../viewport';
import {
  clampZoom,
  fitZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_OUT_STEP,
  ZOOM_STEP,
  zoomAround,
} from '../zoom';

// ── The editor's zoom, grid and Follow (milestone 2.7) ─────────────────────

const FOUR_FOUR = { numerator: 4, denominator: 4 };
const s = () => useStore.getState();

describe('zoom', () => {
  it('keeps the music under the anchor where it was, also when scrolled (timeline-15)', () => {
    const view = { zoom: 1, scrollLeft: 900 };
    const anchorX = 300;
    const tickBefore = pixelToTick(anchorX, view.zoom, view.scrollLeft);
    const next = zoomAround(view, ZOOM_STEP, anchorX);
    expect(next.zoom).toBeCloseTo(1.25);
    expect(pixelToTick(anchorX, next.zoom, next.scrollLeft)).toBeCloseTo(
      tickBefore,
    );
  });

  it('never scrolls before the start, and stays within its range', () => {
    expect(zoomAround({ zoom: 1, scrollLeft: 0 }, -0.5, 400).scrollLeft).toBe(
      0,
    );
    expect(clampZoom(100)).toBe(MAX_ZOOM);
    expect(clampZoom(0)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('a step out undoes a step in', () => {
    const out = zoomAround(
      zoomAround({ zoom: 1, scrollLeft: 0 }, ZOOM_STEP, 0),
      ZOOM_OUT_STEP,
      0,
    );
    expect(out.zoom).toBeCloseTo(1);
  });

  it('fits the song in the width the canvas measured, not 800 px (shell-32)', () => {
    // 16 bars of 4/4 at 40 px a beat is 2,560 px at zoom 1.
    expect(fitZoom(1280, 16 * 1920)).toBeCloseTo(0.5);
    expect(fitZoom(0, 1920)).toBe(1);
  });

  it('the toolbar and keys zoom around the middle and fit the published width', () => {
    useStore.setState({
      tracks: [],
      timelineZoom: 1,
      timelineScrollLeft: 0,
    });
    s().setTimeSignature(4, 4);
    publishTimelineWidth(1000);
    zoomTimelineIn();
    // The middle of the screen (500 px) stays put.
    expect(pixelToTick(500, s().timelineZoom, s().timelineScrollLeft)).toBe(
      pixelToTick(500, 1, 0),
    );
    zoomTimelineOut();
    expect(s().timelineZoom).toBeCloseTo(1);
    fitTimeline();
    // An empty song is 8 bars plus 4 of room: 12 bars in 1,000 px.
    expect(s().timelineZoom).toBeCloseTo(fitZoom(1000, 12 * 1920));
    expect(s().timelineScrollLeft).toBe(0);
    publishTimelineWidth(0);
  });

  it('measures the song from its last clip, with four bars of room', () => {
    const tracks = [
      {
        midiClips: [{ startTick: 1920 * 10, durationTicks: 1920, events: [] }],
        audioClips: [],
      },
    ] as unknown as Parameters<typeof songLengthOf>[0];
    expect(songLengthOf(tracks, 1920)).toBe(1920 * 15);
    expect(songLengthOf([], 1920)).toBe(1920 * 12);
  });
});

describe('the grid', () => {
  it('offers the grids that fit the metre', () => {
    expect(gridChoices(FOUR_FOUR)).toEqual([
      '1/1',
      '1/2',
      '1/4',
      '1/8',
      '1/16',
    ]);
    // A half note doesn't fill a 3/4 bar evenly.
    expect(gridChoices({ numerator: 3, denominator: 4 })).toEqual([
      '1/1',
      '1/4',
      '1/8',
      '1/16',
    ]);
    // 6/8's beat is a dotted quarter.
    expect(gridChoices({ numerator: 6, denominator: 8 })).toEqual([
      '1/1',
      '1/4',
      '1/8',
      '1/16',
    ]);
    // A grid the metre no longer fits still shows while it is chosen.
    expect(gridChoices({ numerator: 3, denominator: 4 }, '1/2')).toContain(
      '1/2',
    );
  });

  it('names grids in the metre', () => {
    expect(gridLabel('1/1', FOUR_FOUR)).toBe('Bar');
    expect(gridLabel('1/4', { numerator: 6, denominator: 8 })).toBe(
      'Dotted 1/4',
    );
    expect(gridLabel('1/8T', FOUR_FOUR)).toBe('1/8 triplet');
  });

  it('has no bar triplet, and checks triplets against the metre', () => {
    expect(gridChoice('1/1', true)).toEqual({
      timelineGridSize: '1/1',
      timelineTripletMode: false,
    });
    expect(gridChoice('1/8', true)).toEqual({
      timelineGridSize: '1/8T',
      timelineTripletMode: true,
    });
    expect(fitsMetre('1/8T', FOUR_FOUR)).toBe(true);
    // 4.5 quarter triplets in a 3/4 bar: off; 9 eighth triplets fit.
    expect(fitsMetre('1/4T', { numerator: 3, denominator: 4 })).toBe(false);
    expect(fitsMetre('1/8T', { numerator: 3, denominator: 4 })).toBe(true);
  });
});

describe('Follow', () => {
  beforeEach(resumeFollow);

  it('turns the page when the playhead passes 85% of the width', () => {
    expect(followScroll(800, 0, 1000)).toBeNull();
    expect(followScroll(860, 0, 1000)).toBe(760);
  });

  it('turns back to a playhead before the page (a loop), never before 0', () => {
    expect(followScroll(100, 2000, 1000)).toBe(0);
    expect(followScroll(1500, 2000, 1000)).toBe(1400);
  });

  it('does nothing without a width', () => {
    expect(followScroll(5000, 0, 0)).toBeNull();
  });

  it('pauses while the student takes the view, until Play or Stop', () => {
    publishTimelineWidth(1000);
    zoomTimelineIn();
    expect(isFollowPaused()).toBe(true);
    resumeFollow();
    expect(isFollowPaused()).toBe(false);
    pauseFollow();
    expect(isFollowPaused()).toBe(true);
    publishTimelineWidth(0);
  });
});
