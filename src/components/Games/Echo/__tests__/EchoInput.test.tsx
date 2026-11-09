// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { chordPads, melodyPads } from '@/curriculum/engine/echo';

/**
 * Echo's input layer, as a child meets it: the melody pads (a staircase of
 * scale degrees, each with its home-row key) and the chord pads (one tap,
 * the whole chord), touch first, several fingers at once, lit by Atlas and
 * by the student's own press; the computer keys pressing them; and with
 * Keyboard, the piano and the letter keys. One note stream out of it all.
 */

const input = vi.hoisted(() => ({
  stable: {
    subscribeNoteOn: () => () => {},
    subscribeNoteOff: () => () => {},
    start: async () => {},
    stop: () => {},
  },
}));
vi.mock('@/learn/context/LearnInputContext', () => ({
  LearnInputProvider: ({ children }: { children: ReactNode }) => children,
  useLearnInputStable: () => input.stable,
}));
const piano = vi.hoisted(() => ({
  triggerPianoAttack: vi.fn(async () => {}),
  triggerPianoRelease: vi.fn(async () => {}),
}));
vi.mock('@/audio/pianoSampler', () => ({
  ...piano,
  releaseAllPianoNotes: async () => {},
  setPianoSamplerVolume: () => {},
}));

const { EchoInputSurface } = await import('../input');

// jsdom has no PointerEvent; without one fireEvent drops the pointer's id
// and button, which the pads read.
beforeAll(() => {
  if (window.PointerEvent) return;
  class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  window.PointerEvent = TestPointerEvent as typeof PointerEvent;
});

afterEach(() => {
  cleanup();
  piano.triggerPianoAttack.mockClear();
  piano.triggerPianoRelease.mockClear();
});

const C = { tonic: 'C', mode: 'major' } as const;

function renderSurface(
  props: Partial<Parameters<typeof EchoInputSurface>[0]> = {},
) {
  const onNoteOn = vi.fn();
  const onNoteOff = vi.fn();
  const view = render(
    <EchoInputSurface
      input="pads"
      kind="melody"
      keyChoice={C}
      onNoteOn={onNoteOn}
      onNoteOff={onNoteOff}
      {...props}
    />,
  );
  return { onNoteOn, onNoteOff, view };
}

const pad = (i: number) =>
  document.querySelector<HTMLButtonElement>(`[data-echo-pad="${i}"]`)!;
const touch = (el: Element, pointerId: number) =>
  fireEvent.pointerDown(el, { pointerId, button: 0, pointerType: 'touch' });
const lift = (pointerId: number) =>
  fireEvent.pointerUp(window, { pointerId, button: 0, pointerType: 'touch' });
const midisOf = (fn: ReturnType<typeof vi.fn>) =>
  fn.mock.calls.map(([note]) => note.midi);

describe('the melody pads', () => {
  it('lays out the 1 up to the 1 above, low to high, each with its key', () => {
    renderSurface();
    const pads = melodyPads(C).pads;
    const shown = screen.getAllByRole('button');
    expect(shown).toHaveLength(8);
    expect(shown.map((b) => b.getAttribute('aria-label'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '1, high',
    ]);
    expect(shown.map((b) => b.getAttribute('data-pad-key'))).toEqual([
      'A',
      'S',
      'D',
      'F',
      'G',
      'H',
      'J',
      'K',
    ]);
    // Each in its note's color; the 1s' are the key's own.
    expect(pad(3).style.borderColor).not.toBe('');
    expect(pads[0].color).toBe(melodyPads(C).keyColor);
    expect(pads[7].color).toBe(melodyPads(C).keyColor);
    // A staircase: each a step taller.
    const heights = shown.map((b) => parseFloat(b.style.height));
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });

  it('plays a pad by touch, lit and sounding until the finger lifts', () => {
    const { onNoteOn, onNoteOff } = renderSurface();
    const four = melodyPads(C).pads[3];
    act(() => {
      touch(pad(3), 7);
    });
    expect(onNoteOn).toHaveBeenCalledTimes(1);
    expect(onNoteOn.mock.calls[0][0]).toMatchObject({
      midi: four.midi,
      source: 'pads',
    });
    expect(typeof onNoteOn.mock.calls[0][0].perfMs).toBe('number');
    expect(piano.triggerPianoAttack).toHaveBeenCalledTimes(1);
    expect(pad(3).getAttribute('aria-pressed')).toBe('true');
    expect(pad(3).hasAttribute('data-lit')).toBe(true);
    act(() => {
      lift(7);
    });
    expect(onNoteOff).toHaveBeenCalledTimes(1);
    expect(onNoteOff.mock.calls[0][0].midi).toBe(four.midi);
    expect(pad(3).getAttribute('aria-pressed')).toBe('false');
    expect(pad(3).hasAttribute('data-lit')).toBe(false);
  });

  it('takes several fingers at once', () => {
    const { onNoteOn, onNoteOff } = renderSurface();
    act(() => {
      touch(pad(0), 1);
      touch(pad(4), 2);
    });
    expect(midisOf(onNoteOn)).toEqual([
      melodyPads(C).pads[0].midi,
      melodyPads(C).pads[4].midi,
    ]);
    act(() => {
      lift(2);
    });
    expect(midisOf(onNoteOff)).toEqual([melodyPads(C).pads[4].midi]);
    expect(pad(0).getAttribute('aria-pressed')).toBe('true');
  });

  it('presses the pads from the home row', () => {
    const { onNoteOn, onNoteOff } = renderSurface();
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyA' });
    });
    expect(onNoteOn.mock.calls[0][0]).toMatchObject({
      midi: melodyPads(C).pads[0].midi,
      source: 'pads',
    });
    expect(pad(0).hasAttribute('data-lit')).toBe(true);
    // A held key doesn't repeat.
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyA', repeat: true });
    });
    expect(onNoteOn).toHaveBeenCalledTimes(1);
    act(() => {
      fireEvent.keyUp(window, { code: 'KeyA' });
    });
    expect(onNoteOff).toHaveBeenCalledTimes(1);
    // Past the pads, a key does nothing: L is the ninth.
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyL' });
    });
    expect(onNoteOn).toHaveBeenCalledTimes(1);
  });

  it('lights as Atlas plays, without a sound or a note of its own', () => {
    const one = melodyPads(C).pads[0];
    const { onNoteOn } = renderSurface({ lit: [one.midi] });
    expect(pad(0).hasAttribute('data-lit')).toBe(true);
    expect(pad(0).getAttribute('aria-pressed')).toBe('false');
    // The 1 above is another pitch: it stays dark.
    expect(pad(7).hasAttribute('data-lit')).toBe(false);
    expect(onNoteOn).not.toHaveBeenCalled();
    expect(piano.triggerPianoAttack).not.toHaveBeenCalled();
  });

  it('hears nothing while it’s off', () => {
    const { onNoteOn } = renderSurface({ enabled: false });
    act(() => {
      touch(pad(0), 1);
      fireEvent.keyDown(window, { code: 'KeyS' });
    });
    expect(onNoteOn).not.toHaveBeenCalled();
  });

  it('keeps quiet when asked to, for a host with its own sound', () => {
    const { onNoteOn } = renderSurface({ sound: false });
    act(() => {
      touch(pad(1), 1);
    });
    expect(onNoteOn).toHaveBeenCalledTimes(1);
    expect(piano.triggerPianoAttack).not.toHaveBeenCalled();
  });
});

describe('the chord pads', () => {
  it('shows the key’s six chords and the 1 again above, named the hybrid way', () => {
    renderSurface({ kind: 'chords' });
    const shown = screen.getAllByRole('button');
    expect(shown.map((b) => b.getAttribute('aria-label'))).toEqual([
      '1 maj',
      '2 min',
      '3 min',
      '4 maj',
      '5 maj',
      '6 min',
      '1 maj, high',
    ]);
    expect(shown.map((b) => b.getAttribute('data-pad-key'))).toEqual([
      'A',
      'S',
      'D',
      'F',
      'G',
      'H',
      'J',
    ]);
  });

  it('plays the 1 chord an octave up from the last pad, and lights the nearer 1', () => {
    const { onNoteOn } = renderSurface({ kind: 'chords' });
    const pads = chordPads(C);
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyJ' });
    });
    expect(midisOf(onNoteOn)).toEqual(pads[0].chord.midis.map((m) => m + 12));
    expect(pad(6).hasAttribute('data-lit')).toBe(true);
    expect(pad(0).hasAttribute('data-lit')).toBe(false);
  });

  it('plays the whole voiced chord on one tap, or one key', () => {
    const { onNoteOn, onNoteOff } = renderSurface({ kind: 'chords' });
    const [oneMaj, twoMin] = chordPads(C);
    act(() => {
      touch(pad(0), 3);
    });
    expect(midisOf(onNoteOn)).toEqual([...oneMaj.chord.midis]);
    act(() => {
      lift(3);
    });
    expect(midisOf(onNoteOff).sort()).toEqual([...oneMaj.chord.midis].sort());
    onNoteOn.mockClear();
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyS' });
    });
    expect(midisOf(onNoteOn)).toEqual([...twoMin.chord.midis]);
  });

  it('lets a shared note go only once both chords are let go', () => {
    const { onNoteOff } = renderSurface({ kind: 'chords' });
    const pads = chordPads(C);
    const shared = pads[0].chord.midis.filter((m) =>
      pads[5].chord.midis.includes(m),
    );
    expect(shared.length).toBeGreaterThan(0);
    act(() => {
      touch(pad(0), 1);
      touch(pad(5), 2);
    });
    act(() => {
      lift(1);
    });
    const off = midisOf(onNoteOff);
    expect(off.some((m) => shared.includes(m))).toBe(false);
    act(() => {
      lift(2);
    });
    expect(midisOf(onNoteOff)).toEqual(expect.arrayContaining(shared));
  });

  it('lights a chord as Atlas plays it, in any voicing', () => {
    // The 5 chord, an octave down from the pad's own voicing.
    const five = chordPads(C)[4];
    renderSurface({
      kind: 'chords',
      lit: five.chord.midis.map((m) => m - 12),
    });
    expect(pad(4).hasAttribute('data-lit')).toBe(true);
    expect(pad(0).hasAttribute('data-lit')).toBe(false);
  });
});

describe('the keyboard', () => {
  it('plays the piano from the letter keys, A = C, and names the scale’s keys', () => {
    const { onNoteOn } = renderSurface({ input: 'keyboard' });
    expect(document.querySelector('[data-echo-pads]')).toBeNull();
    const keyboard = document.querySelector('[data-echo-input="keyboard"]')!;
    const octave = Number(keyboard.getAttribute('data-typing-octave'));
    act(() => {
      fireEvent.keyDown(window, { code: 'KeyA' });
    });
    expect(onNoteOn.mock.calls[0][0]).toMatchObject({
      midi: (octave + 1) * 12,
      source: 'typing',
    });
    act(() => {
      fireEvent.keyUp(window, { code: 'KeyA' });
      fireEvent.keyDown(window, { code: 'KeyZ' });
    });
    expect(keyboard.getAttribute('data-typing-octave')).toBe(
      String(Math.max(4, octave - 1)),
    );
    expect(screen.getByText(/Letter keys/)).toBeTruthy();
  });
});
