// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react';
import { Formatter } from 'vexflow/bravura';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  buildScore,
  type NotationNoteInput,
  type NotationScore,
} from '@/lib/notation';
import { LETTER_PORTRAIT } from '@/lib/notation/pageLayout';
import {
  StaffView,
  type ScorePart,
  type StaffLayout,
  type StaffViewProps,
} from '../StaffView';

// ── Incremental engraving (score-06, score-19) ──────────────────────────────
// With `incremental`, one Score edit used to re-engrave every bar of every
// part twice. These check that the opt-in path draws the same music as the
// original one, redraws only the systems an edit touched (and both systems
// a tie joins), measures a bar's width only when its content changed, and
// rescales on a width-only resize without engraving again. Without the prop
// a lesson goes through the original path.

const Q = 480;
const BAR = 4 * Q;

let box = { width: 900, height: 700 };
let resize: ((box: { width: number; height: number }) => void) | null = null;
const textLength = vi.fn(function (this: SVGElement) {
  return 7 + ((this.textContent?.codePointAt(0) ?? 0) % 11);
});

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
  window.matchMedia = ((media: string) => ({
    matches: false,
    media,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollTo =
    function () {} as typeof Element.prototype.scrollTo;
  // jsdom has no text layout; a rest's glyph width comes from here.
  Object.defineProperty(window.SVGElement.prototype, 'getComputedTextLength', {
    configurable: true,
    value: textLength,
  });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        const report = (next: { width: number; height: number }) =>
          this.callback(
            [{ contentRect: { ...next } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
        resize = report;
        report(box);
      }
      disconnect() {}
    },
  );
});
afterAll(() => vi.unstubAllGlobals());
beforeEach(() => {
  box = { width: 900, height: 700 };
  textLength.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ── Fixtures ────────────────────────────────────────────────────────────────

const note = (
  id: string,
  midi: number,
  startTick: number,
  durationTicks: number,
): NotationNoteInput => ({ id, midi, startTick, durationTicks });

/** A melody: a few notes a bar, a rest now and then, a tie into bar 5. */
function leadNotes(bars = 12): NotationNoteInput[] {
  const out: NotationNoteInput[] = [];
  for (let bar = 0; bar < bars; bar++) {
    if (bar % 5 === 2) continue; // a bar of rest
    const t = bar * BAR;
    // Bar 5 opens on the note held over from bar 4.
    if (bar !== 4) out.push(note(`lead:${bar}:a`, 72 + (bar % 5), t, Q));
    out.push(note(`lead:${bar}:b`, 74 + (bar % 3), t + Q, Q / 2));
    out.push(note(`lead:${bar}:c`, 76, t + 1.5 * Q, Q / 2));
    // Bar 4's last note is held over the barline into bar 5: across systems.
    out.push(
      note(`lead:${bar}:d`, 79 - (bar % 4), t + 3 * Q, bar === 3 ? 2 * Q : Q),
    );
  }
  return out;
}

function pianoNotes(bars = 12): NotationNoteInput[] {
  const out: NotationNoteInput[] = [];
  for (let bar = 0; bar < bars; bar += 2) {
    out.push(note(`piano:${bar}:l`, 36 + (bar % 7), bar * BAR, 2 * BAR));
    out.push(note(`piano:${bar}:m`, 64, bar * BAR, BAR));
    out.push(note(`piano:${bar}:h`, 67, bar * BAR, BAR));
  }
  return out;
}

function bassNotes(bars = 11): NotationNoteInput[] {
  const out: NotationNoteInput[] = [];
  for (let bar = 0; bar < bars; bar++) {
    out.push(note(`bass:${bar}:a`, 40 + (bar % 5), bar * BAR, 2 * Q));
    out.push(note(`bass:${bar}:b`, 43, bar * BAR + 2 * Q, Q));
  }
  return out;
}

function drumNotes(bars = 12): NotationNoteInput[] {
  const out: NotationNoteInput[] = [];
  for (let bar = 0; bar < bars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const t = bar * BAR + beat * Q;
      out.push(note(`drums:${bar}:${beat}`, beat % 2 ? 38 : 36, t, Q));
      out.push(note(`drums:${bar}:${beat}h`, 42, t + Q / 2, Q / 2));
    }
  }
  return out;
}

const score = (
  notes: NotationNoteInput[],
  staves: 'grand' | 'treble' | 'bass' | 'percussion',
): NotationScore =>
  buildScore(notes, {
    ticksPerQuarter: Q,
    timeSignature: [4, 4],
    minMeasures: 12,
    staves,
    ...(staves === 'percussion' ? {} : { keyFifths: 2 }),
  });

function scoreParts(lead = leadNotes()): ScorePart[] {
  return [
    { id: 'lead', name: 'Lead', score: score(lead, 'treble') },
    { id: 'piano', name: 'Piano', score: score(pianoNotes(), 'grand') },
    { id: 'bass', name: 'Bass', score: score(bassNotes(), 'bass') },
    { id: 'drums', name: 'Drums', score: score(drumNotes(), 'percussion') },
  ];
}

/** The same parts with the lead's note `id` moved to another pitch. */
function withLeadNote(parts: ScorePart[], id: string, midi: number) {
  const lead = leadNotes().map((n) => (n.id === id ? { ...n, midi } : n));
  return [{ ...parts[0], score: score(lead, 'treble') }, ...parts.slice(1)];
}

const pageProps = {
  page: LETTER_PORTRAIT,
  measuresPerSystem: 4,
  repeatStarts: new Set([4]),
  repeatEnds: new Set([7]),
  headroom: 20,
} satisfies Partial<StaffViewProps>;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function drawn(props: StaffViewProps) {
  const onLayout = vi.fn<(layout: StaffLayout | null) => void>();
  const view = render(<StaffView {...props} onLayout={onLayout} />);
  await waitFor(
    () => expect(onLayout).toHaveBeenLastCalledWith(expect.anything()),
    { timeout: 10_000 },
  );
  const svg = () => view.container.querySelector('svg')!;
  const systems = () => [
    ...view.container.querySelectorAll<SVGGElement>('g.ma-staff-system'),
  ];
  const layout = () => onLayout.mock.lastCall![0]!;
  /** Draws again with new props, and waits until the drawing settles. */
  const redraw = async (next: StaffViewProps) => {
    const before = onLayout.mock.calls.length;
    view.rerender(<StaffView {...next} onLayout={onLayout} />);
    await waitFor(() =>
      expect(onLayout.mock.calls.length).toBeGreaterThan(before),
    );
  };
  return { ...view, onLayout, svg, systems, layout, redraw };
}

/** The page's markup, without VexFlow's running element ids. */
const markup = (svg: SVGSVGElement) =>
  svg.outerHTML.replace(/ id="vf-[^"]*"/g, '');

const INHERITED = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray'];
const FONT = ['font-family', 'font-size', 'font-weight', 'font-style'];

/**
 * Every drawn primitive with what decides its look: its own geometry, the
 * presentation attributes it inherits, the `fill`/`stroke="none"` the theme's
 * CSS keys on, and the VexFlow groups whose classes it colours. Sorted, so a
 * tie drawn at the end of the page and one drawn with its system compare
 * equal.
 */
function primitives(svg: SVGSVGElement): string[] {
  return [...svg.querySelectorAll('path, rect, text')]
    .map((el) => {
      const own: Record<string, string> = {};
      for (const attr of el.attributes) {
        if (![...INHERITED, ...FONT, 'id'].includes(attr.name)) {
          own[attr.name] = attr.value;
        }
      }
      const inherit =
        el.tagName === 'text' ? [...INHERITED, ...FONT] : INHERITED;
      const effective = inherit.map(
        (name) => el.closest(`[${name}]`)?.getAttribute(name) ?? null,
      );
      const classes: string[] = [];
      for (
        let node: Element | null = el.parentElement;
        node && node !== svg;
        node = node.parentElement
      ) {
        const name = node.getAttribute('class');
        if (name && name !== 'ma-staff-system') classes.push(name);
      }
      return JSON.stringify([
        el.tagName,
        own,
        effective,
        el.getAttribute('fill') === 'none',
        el.getAttribute('stroke') === 'none',
        el.textContent,
        classes,
      ]);
    })
    .sort();
}

/** Which systems are still the very groups they were. */
const kept = (before: SVGGElement[], after: SVGGElement[]) =>
  after.map((group, i) => group === before[i]);

/** Layout as the overlay reads it, element references left out. */
const plain = (layout: StaffLayout) => JSON.parse(JSON.stringify(layout));

// ── Tests ───────────────────────────────────────────────────────────────────

describe('StaffView without `incremental`', () => {
  it('draws a lesson through the original path, a new page each pass', async () => {
    const lesson = [{ id: 'part', score: score(leadNotes(), 'grand') }];
    const view = await drawn({
      parts: lesson,
      wrapToFit: true,
      fitHeight: true,
    });
    const first = view.svg();
    expect(view.systems()).toHaveLength(0);

    await view.redraw({
      parts: [{ id: 'part', score: score(leadNotes(), 'grand') }],
      wrapToFit: true,
      fitHeight: true,
    });
    expect(view.svg()).not.toBe(first);
    expect(view.systems()).toHaveLength(0);
  });
});

describe('StaffView with `incremental`', () => {
  it('draws the same music and reports the same layout as the original path', async () => {
    for (const props of [
      { parts: scoreParts(), ...pageProps },
      { parts: scoreParts().slice(0, 3), wrapToFit: true },
    ] satisfies StaffViewProps[]) {
      const original = await drawn(props);
      const before = {
        svg: primitives(original.svg()),
        layout: plain(original.layout()),
      };
      cleanup();
      const incremental = await drawn({ ...props, incremental: true });
      expect(incremental.systems().length).toBeGreaterThan(1);
      expect(primitives(incremental.svg())).toEqual(before.svg);
      expect(plain(incremental.layout())).toEqual(before.layout);
      cleanup();
    }
  });

  it('redraws only the system an edit touched, measuring only the edited bar', async () => {
    const parts = scoreParts();
    const view = await drawn({ parts, ...pageProps, incremental: true });
    const systems = view.systems();
    expect(systems).toHaveLength(3);
    const measured = vi.spyOn(Formatter.prototype, 'preCalculateMinTotalWidth');
    const formatted = vi.spyOn(Formatter.prototype, 'format');

    // Bar 10 (the third system) gets a new pitch, in the lead only.
    const edited = withLeadNote(parts, 'lead:9:a', 60);
    await view.redraw({ parts: edited, ...pageProps, incremental: true });

    expect(kept(systems, view.systems())).toEqual([true, true, false]);
    // One bar of one part measured; the third system's four bars of four
    // parts formatted again, and nothing else.
    expect(measured).toHaveBeenCalledTimes(1);
    expect(formatted).toHaveBeenCalledTimes(4 * 4);

    // What it left is exactly what a fresh engraving of the edit draws.
    const page = markup(view.svg());
    cleanup();
    const fresh = await drawn({
      parts: edited,
      ...pageProps,
      incremental: true,
    });
    expect(page).toBe(markup(fresh.svg()));
  });

  it('redraws both systems a tie joins', async () => {
    const parts = scoreParts();
    const view = await drawn({ parts, ...pageProps, incremental: true });
    const systems = view.systems();

    // Bar 4 ends the first system with a note tied into bar 5. Editing
    // another note of bar 4 redraws the second system too: it holds the tie.
    const edited = withLeadNote(parts, 'lead:3:a', 62);
    await view.redraw({ parts: edited, ...pageProps, incremental: true });
    expect(kept(systems, view.systems())).toEqual([false, false, true]);

    const page = markup(view.svg());
    cleanup();
    const fresh = await drawn({
      parts: edited,
      ...pageProps,
      incremental: true,
    });
    expect(page).toBe(markup(fresh.svg()));
  });

  it('rescales on a width-only resize without engraving again', async () => {
    const parts = scoreParts();
    const view = await drawn({ parts, ...pageProps, incremental: true });
    const systems = view.systems();
    const before = view.layout();
    const measured = vi.spyOn(Formatter.prototype, 'preCalculateMinTotalWidth');
    const formatted = vi.spyOn(Formatter.prototype, 'format');

    const calls = view.onLayout.mock.calls.length;
    resize!({ width: 600, height: 700 });
    await waitFor(() =>
      expect(view.onLayout.mock.calls.length).toBeGreaterThan(calls),
    );

    expect(measured).not.toHaveBeenCalled();
    expect(formatted).not.toHaveBeenCalled();
    expect(kept(systems, view.systems())).toEqual([true, true, true]);
    const ratio = view.layout().scale / before.scale;
    expect(ratio).toBeCloseTo(600 / 900, 6);
    view.layout().notes.forEach((n, i) => {
      expect(n.x).toBeCloseTo(before.notes[i].x * ratio, 6);
      expect(n.y).toBeCloseTo(before.notes[i].y * ratio, 6);
    });
    expect(Number(view.svg().getAttribute('width'))).toBeCloseTo(
      LETTER_PORTRAIT.width * (600 / LETTER_PORTRAIT.width),
      6,
    );
  });

  it('measures each rest glyph once, where the original path measures every rest', async () => {
    const parts = scoreParts();
    await drawn({ parts, ...pageProps });
    const perRest = textLength.mock.calls.length;
    cleanup();
    textLength.mockClear();

    const view = await drawn({ parts, ...pageProps, incremental: true });
    const glyphs = new Set(
      [...view.svg().querySelectorAll('.vf-notehead text')].map(
        (t) => t.textContent,
      ),
    );
    expect(view.layout().rests.length).toBeGreaterThan(glyphs.size);
    expect(textLength.mock.calls.length).toBeLessThanOrEqual(glyphs.size);
    expect(textLength.mock.calls.length).toBeLessThan(perRest);

    // Later passes measure nothing at all.
    textLength.mockClear();
    await view.redraw({
      parts: withLeadNote(parts, 'lead:0:a', 61),
      ...pageProps,
      incremental: true,
    });
    expect(textLength).not.toHaveBeenCalled();
  });

  it('reports nothing new when nothing changed', async () => {
    const view = await drawn({
      parts: scoreParts(),
      ...pageProps,
      incremental: true,
    });
    const systems = view.systems();
    const calls = view.onLayout.mock.calls.length;
    // New objects, the same music.
    view.rerender(
      <StaffView
        parts={scoreParts()}
        {...pageProps}
        incremental
        onLayout={view.onLayout}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(view.onLayout.mock.calls.length).toBe(calls);
    expect(kept(systems, view.systems())).toEqual([true, true, true]);
  });

  it('goes back to the original path when the prop is turned off', async () => {
    const view = await drawn({
      parts: scoreParts(),
      ...pageProps,
      incremental: true,
    });
    expect(view.systems().length).toBeGreaterThan(0);
    await view.redraw({ parts: scoreParts(), ...pageProps });
    expect(view.systems()).toHaveLength(0);
  });
});
