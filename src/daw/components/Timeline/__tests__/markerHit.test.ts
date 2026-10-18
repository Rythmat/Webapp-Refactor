import { describe, expect, it, vi } from 'vitest';
import type { Marker } from '@/daw/store/markersSlice';
import { tickToPixel } from '@/daw/utils/timelineScale';
import { RULER_PX } from '@/daw/shell/tracklist/rowLayout';
import { PLAYHEAD_HANDLE_H, PLAYHEAD_HIT_PX } from '@/daw/utils/rulerLoop';
import {
  MARKER_FLAG_PX,
  MARKER_NAME_GAP_PX,
  markerAtX,
  onPlayheadHandle,
} from '../markerHit';

// ── Where a marker is on the ruler (milestone 2.13, plan finding F8) ───────
// One hit test over what is drawn: the flag at the marker's tick and its
// name 10 px after it, in the ruler's font, with 3 px of slack around them.
// The press, the cursor, the double-click and the right-click all use it,
// so a press on the name takes the marker instead of seeking. Run:
// npx vitest run src/daw/components/Timeline/__tests__/markerHit.test.ts

/** The slack around what is drawn (markerHit's SLACK_PX). */
const SLACK = 3;
/** Names measured as the ruler's font would, 6 px a character here. */
const width = (name: string) => name.length * 6;

const marker = (id: string, tick: number, name: string): Marker => ({
  id,
  tick,
  name,
  color: '#e8e8f0',
});

/** Bar 2 at zoom 1: x = 160, the flag to 167, 'Verse' from 170 to 200. */
const verse = marker('verse', 1920, 'Verse');

/** The id of the marker found at x, or null. */
function at(
  x: number,
  markers: readonly Marker[] = [verse],
  zoom = 1,
  scrollLeft = 0,
) {
  return markerAtX(markers, x, zoom, scrollLeft, width)?.id ?? null;
}

describe('markerAtX', () => {
  const mx = tickToPixel(verse.tick, 1, 0);
  const nameStart = mx + MARKER_NAME_GAP_PX;
  const nameEnd = nameStart + width(verse.name);

  it('draws the flag 7 px wide and the name 10 px after the tick', () => {
    expect(mx).toBe(160);
    expect(MARKER_FLAG_PX).toBe(7);
    expect(MARKER_NAME_GAP_PX).toBe(10);
  });

  it('finds a marker by its flag', () => {
    for (const x of [mx, mx + 3.5, mx + MARKER_FLAG_PX]) {
      expect(at(x)).toBe('verse');
    }
  });

  it('finds it by its name, all along it', () => {
    for (const x of [nameStart, (nameStart + nameEnd) / 2, nameEnd]) {
      expect(at(x)).toBe('verse');
    }
    // The gap between the flag and the name is no hole.
    expect(at(mx + MARKER_FLAG_PX + 1.5)).toBe('verse');
  });

  it('allows 3 px of slack either side, and no more', () => {
    expect(at(mx - SLACK)).toBe('verse');
    expect(at(mx - SLACK - 0.5)).toBeNull();
    expect(at(nameEnd + SLACK)).toBe('verse');
    expect(at(nameEnd + SLACK + 0.5)).toBeNull();
  });

  it('measures each name with the width it is given', () => {
    const measure = vi.fn(width);
    const long = marker('long', 1920, 'Pre-chorus build');
    // 16 characters: 96 px of name, where 'Verse' had 30.
    expect(markerAtX([long], mx + 100, 1, 0, measure)?.id).toBe('long');
    expect(measure).toHaveBeenCalledWith('Pre-chorus build');
    expect(at(mx + 100)).toBeNull();
    expect(
      markerAtX([long], mx + MARKER_NAME_GAP_PX + 96 + SLACK + 1, 1, 0, width),
    ).toBeNull();
  });

  it('still finds a marker without a name by its flag', () => {
    const bare = marker('bare', 1920, '');
    expect(at(mx, [bare])).toBe('bare');
    expect(at(mx + MARKER_FLAG_PX, [bare])).toBe('bare');
    expect(at(mx + 20, [bare])).toBeNull();
  });

  it('finds none away from every marker, or with none', () => {
    expect(at(0)).toBeNull();
    expect(at(mx - 20)).toBeNull();
    expect(at(nameEnd + 40)).toBeNull();
    expect(at(mx, [])).toBeNull();
  });

  it('takes the topmost where two overlap: the one drawn last', () => {
    // 'Chorus' 20 px after 'Verse' (tick 2160): its flag sits on Verse's name.
    const chorus = marker('chorus', 2160, 'Chorus');
    const overlap = tickToPixel(chorus.tick, 1, 0) + 2;
    expect(at(overlap, [verse, chorus])).toBe('chorus');
    expect(at(overlap, [chorus, verse])).toBe('verse');
    // Where only one of them is, that one, whichever is on top.
    expect(at(mx + 1, [verse, chorus])).toBe('verse');
    expect(at(tickToPixel(chorus.tick, 1, 0) + 40, [chorus, verse])).toBe(
      'chorus',
    );
  });

  it('follows the zoom, the name keeping its width in px', () => {
    // Zoom 2: bar 2 at 320. The name is still 30 px: it is text.
    expect(at(320, [verse], 2)).toBe('verse');
    expect(at(320 + MARKER_NAME_GAP_PX + 30 + SLACK, [verse], 2)).toBe('verse');
    expect(
      at(320 + MARKER_NAME_GAP_PX + 30 + SLACK + 1, [verse], 2),
    ).toBeNull();
    // Where the marker is at zoom 1 is nothing at zoom 2.
    expect(at(mx, [verse], 2)).toBeNull();
    // Zoom 0.5: bar 2 at 80.
    expect(at(80, [verse], 0.5)).toBe('verse');
    expect(at(mx, [verse], 0.5)).toBeNull();
  });

  it('follows the scroll', () => {
    // Bar 9 is at 1280 unscrolled: at 280 scrolled by 1000.
    const late = marker('late', 8 * 1920, 'Outro');
    expect(at(280, [late], 1, 1000)).toBe('late');
    expect(at(1280, [late], 1, 1000)).toBeNull();
  });

  it('finds a marker whose flag has scrolled off by the name still in view', () => {
    // Bar 2 scrolled by 180: the flag at -20, 'Introduction' from -10 to 62.
    const intro = marker('intro', 1920, 'Introduction');
    expect(at(0, [intro], 1, 180)).toBe('intro');
    expect(at(62 + SLACK, [intro], 1, 180)).toBe('intro');
    expect(at(62 + SLACK + 1, [intro], 1, 180)).toBeNull();
  });
});

describe('onPlayheadHandle', () => {
  // The handle's rows: 23 to 31 px under the ruler's top, the foot of the
  // bar numbers; its hit width: 6 px either side of the playhead.
  const top = RULER_PX - PLAYHEAD_HANDLE_H;
  it('is the handle’s rows at the foot of the ruler', () => {
    expect(onPlayheadHandle(160, top, 160)).toBe(true);
    expect(onPlayheadHandle(160, RULER_PX - 1, 160)).toBe(true);
    expect(onPlayheadHandle(160, top - 1, 160)).toBe(false);
    expect(onPlayheadHandle(160, RULER_PX, 160)).toBe(false);
  });

  it('is within its hit width of the playhead', () => {
    expect(onPlayheadHandle(160 + PLAYHEAD_HIT_PX, top, 160)).toBe(true);
    expect(onPlayheadHandle(160 - PLAYHEAD_HIT_PX, top, 160)).toBe(true);
    expect(onPlayheadHandle(160 + PLAYHEAD_HIT_PX + 1, top, 160)).toBe(false);
  });
});
