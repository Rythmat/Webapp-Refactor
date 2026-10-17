import { describe, expect, it } from 'vitest';
import {
  CLIP_HEADER_PX,
  FADE_HANDLE_PX,
  TRIM_ZONE_PX,
  clipZoneAt,
  fadeHandles,
} from '../clipChrome';

// ── What a press on a clip grabs (milestone 2.12) ──────────────────────────
// Visible trim zones on both edges, and on audio clips a fade handle in each
// top corner, at the fade's end. Run:
// npx vitest run src/daw/components/Timeline/__tests__/clipChrome.test.ts

const box = { x: 100, y: 60, w: 200, h: 60 };
const middle = box.y + CLIP_HEADER_PX + 20;
const noFades = { inPx: 0, outPx: 0 };

describe('clipZoneAt', () => {
  it('trims at either edge and moves in between', () => {
    expect(clipZoneAt(box.x + 2, middle, box)).toBe('trim-left');
    expect(clipZoneAt(box.x + TRIM_ZONE_PX - 1, middle, box)).toBe('trim-left');
    expect(clipZoneAt(box.x + box.w - 2, middle, box)).toBe('trim-right');
    expect(clipZoneAt(box.x + box.w / 2, middle, box)).toBe('body');
  });

  it('keeps a thin clip movable: only its right edge trims', () => {
    const thin = { ...box, w: TRIM_ZONE_PX * 3 };
    expect(clipZoneAt(thin.x + 2, middle, thin)).toBe('body');
    expect(clipZoneAt(thin.x + thin.w - 2, middle, thin)).toBe('trim-right');
  });

  it('grabs an audio clip’s fade handles in its top corners', () => {
    const top = box.y + CLIP_HEADER_PX / 2;
    expect(clipZoneAt(box.x + 4, top, box, noFades)).toBe('fade-in');
    expect(clipZoneAt(box.x + box.w - 4, top, box, noFades)).toBe('fade-out');
    // Below the header the corners trim as before.
    expect(clipZoneAt(box.x + 4, middle, box, noFades)).toBe('trim-left');
    // A MIDI clip has none.
    expect(clipZoneAt(box.x + 4, top, box)).toBe('trim-left');
  });

  it('puts a handle where its fade ends', () => {
    const fades = { inPx: 50, outPx: 30 };
    const handles = fadeHandles(box, fades);
    expect(handles.in.x).toBe(box.x + 50);
    expect(handles.out.x).toBe(box.x + box.w - 30 - FADE_HANDLE_PX);
    const top = box.y + CLIP_HEADER_PX / 2;
    expect(clipZoneAt(box.x + 55, top, box, fades)).toBe('fade-in');
    expect(clipZoneAt(box.x + box.w - 35, top, box, fades)).toBe('fade-out');
  });
});
