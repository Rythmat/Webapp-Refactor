import { render, waitFor } from '@testing-library/react';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import { StaffView, type StaffLayout, type StaffViewProps } from '../StaffView';

// ── Engraving a StaffView in jsdom, for comparing two drawings ─────────────
// The stubs and readers staffIncremental.test.tsx uses, for the Studio views
// that check their own staves draw the same through the incremental path.
// jsdom has no canvas, no text layout and no ResizeObserver; these stand in
// for them with fixed measurements, so two drawings of the same music agree.

/** Call at the top of a test file, before anything is drawn. */
export function installStaffStubs(box = { width: 900, height: 700 }) {
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
    // A rest's glyph width comes from here.
    Object.defineProperty(
      window.SVGElement.prototype,
      'getComputedTextLength',
      {
        configurable: true,
        value: textLength,
      },
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe() {
          this.callback(
            [{ contentRect: { ...box } } as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
        }
        disconnect() {}
      },
    );
  });
  afterAll(() => vi.unstubAllGlobals());
  return { textLength };
}

/** Draws a StaffView and waits for its first layout. */
export async function drawn(props: StaffViewProps) {
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
export const markup = (svg: SVGSVGElement) =>
  svg.outerHTML.replace(/ id="vf-[^"]*"/g, '');

const INHERITED = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray'];
const FONT = ['font-family', 'font-size', 'font-weight', 'font-style'];

/**
 * Every drawn primitive with what decides its look: its own geometry, the
 * presentation attributes it inherits, the `fill`/`stroke="none"` the theme's
 * CSS keys on, and the VexFlow groups whose classes it colours. Sorted, so a
 * tie drawn at the end of the page and one drawn with its system compare
 * equal, and the incremental path's system groups are left out.
 */
export function primitives(svg: SVGSVGElement): string[] {
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
export const kept = (before: SVGGElement[], after: SVGGElement[]) =>
  after.map((group, i) => group === before[i]);

/** Layout as the overlay reads it, element references left out. */
export const plain = (layout: StaffLayout) =>
  JSON.parse(JSON.stringify(layout));
