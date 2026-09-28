// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { fretToMidi, shapeNotes } from '@/lib/guitar/fretboard';
import { buildTab } from '@/lib/notation';
import type { NoteStyle, StaffLayout } from '../StaffView';
import { TabStaffView } from '../TabStaffView';

const Q = 480;

// VexFlow measures its glyphs as canvas text, and the view sizes itself from
// a ResizeObserver; jsdom has neither.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => ({
    font: '',
    measureText: (text: string) => ({
      width: text.length * 10,
      fontBoundingBoxAscent: 10,
      fontBoundingBoxDescent: 3,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 3,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 10,
    }),
  })) as unknown as HTMLCanvasElement['getContext'];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        this.callback(
          [{ contentRect: { width: 900, height: 300 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      disconnect() {}
    },
  );
});
afterAll(() => vi.unstubAllGlobals());
afterEach(cleanup);

// Open C on beat 4, held over the barline: a quarter, then a ghost quarter.
const notes = shapeNotes('X-3-2-0-1-0').map(({ position }, i) => ({
  id: `c${i}`,
  midi: fretToMidi(position),
  startTick: 3 * Q,
  durationTicks: 2 * Q,
  fretPosition: position,
}));
const score = buildTab(notes, { timeSignature: [4, 4], minMeasures: 2 });

async function drawn(noteStyles: ReadonlyMap<string, NoteStyle>) {
  const onLayout = vi.fn<(layout: StaffLayout | null) => void>();
  render(
    <TabStaffView score={score} noteStyles={noteStyles} onLayout={onLayout} />,
  );
  await waitFor(
    () => expect(onLayout).toHaveBeenLastCalledWith(expect.anything()),
    {
      timeout: 5000,
    },
  );
  const host = screen.getByRole('img', { name: 'Guitar TAB, 2 bars' });
  const chords = [...host.querySelectorAll<SVGElement>('.vf-tabnote')];
  const digit = (chord: SVGElement, fret: string) =>
    [...chord.querySelectorAll<SVGElement>('text')].find(
      (text) => text.textContent === fret,
    )!;
  return { layout: onLayout.mock.lastCall![0]!, chords, digit };
}

describe('TabStaffView', () => {
  it('lights a whole chord when every note agrees', async () => {
    const red = { color: 'rgb(255, 0, 0)', glow: true };
    const { layout, chords } = await drawn(
      new Map(notes.map((n) => [n.id, red])),
    );
    expect(layout.measures).toHaveLength(2);
    expect(chords).toHaveLength(2);
    for (const chord of chords) {
      expect(chord.style.color).toBe('rgb(255, 0, 0)');
      expect(chord.classList.contains('ma-note-glow')).toBe(true);
    }
  });

  it('lights one string of a partly played chord in every tied segment', async () => {
    // c0 is the C on the A string (fret 3); only it has been heard.
    const { chords, digit } = await drawn(
      new Map([['c0', { color: 'rgb(255, 0, 0)' }]]),
    );
    const [struck, ringing] = chords;
    expect(struck.style.color).toBe('');
    expect(digit(struck, '3').style.color).toBe('rgb(255, 0, 0)');
    expect(digit(ringing, '(3)').style.color).toBe('rgb(255, 0, 0)');
    expect(digit(struck, '2').style.color).toBe('');
  });
});
