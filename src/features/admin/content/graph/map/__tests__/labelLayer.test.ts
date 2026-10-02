import { describe, expect, it, vi } from 'vitest';
import {
  createLabelLayer,
  HALO_DEVICE_PX,
  HOVER_LABEL_SHIFT,
  LABEL_FONT_PROBE,
  LABEL_GAP,
  type LabelCanvas,
  type LabelContext,
  labelFont,
  type LabelFrame,
  MAX_LABELS,
  wrapLabel,
} from '../render/labelLayer';

/**
 * The label layer against a recording canvas: what it asks the font loader
 * for, which names it draws where and how strongly, and how it measures.
 * Text is "measured" at half the font size per character, so a 14 px name
 * of 10 characters is 70 px wide.
 */

interface Drawn {
  text: string;
  x: number;
  y: number;
  alpha: number;
  font: string;
}

const fontPx = (font: string) => parseFloat(font) || 10;

interface Stroked {
  text: string;
  x: number;
  y: number;
  color: string;
  width: number;
  join: string;
  alpha: number;
}

function fakeCanvas() {
  const drawn: Drawn[] = [];
  const stroked: Stroked[] = [];
  /** Every stroke and fill, in the order they were made. */
  const calls: string[] = [];
  const measured: string[] = [];
  const transforms: number[][] = [];
  const ctx = {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: 'miter',
    globalAlpha: 1,
    textAlign: 'start',
    textBaseline: 'alphabetic',
    setTransform: (...m: number[]) => {
      transforms.push(m);
    },
    clearRect: vi.fn(),
    fillText(text: string, x: number, y: number) {
      calls.push(`fill ${text}`);
      drawn.push({ text, x, y, alpha: this.globalAlpha, font: this.font });
    },
    strokeText(text: string, x: number, y: number) {
      calls.push(`stroke ${text}`);
      stroked.push({
        text,
        x,
        y,
        color: this.strokeStyle,
        width: this.lineWidth,
        join: this.lineJoin,
        alpha: this.globalAlpha,
      });
    },
    measureText(text: string) {
      measured.push(text);
      return { width: text.length * fontPx(this.font) * 0.5 } as TextMetrics;
    },
  };
  const canvas: LabelCanvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '' },
    getContext: () => ctx as unknown as LabelContext,
  };
  return { canvas, ctx, drawn, stroked, calls, measured, transforms };
}

/** A frame of `n` nodes laid out on a grid inside a 1000 × 1000 screen. */
function frame(n: number, patch: Partial<LabelFrame> = {}): LabelFrame {
  const xy = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) {
    xy[2 * i] = 20 + (i % 40) * 24;
    xy[2 * i + 1] = 20 + Math.floor(i / 40) * 24;
  }
  return {
    order: Array.from({ length: n }, (_, i) => i),
    text: Array.from({ length: n }, (_, i) => `Node ${i}`),
    xy,
    radius: 8,
    size: 14,
    alpha: 1,
    hovered: -1,
    ...patch,
  };
}

const ready = (patch: Parameters<typeof createLabelLayer>[1] = {}) => {
  const fake = fakeCanvas();
  const layer = createLabelLayer(fake.canvas, { fonts: null, ...patch });
  layer.resize(1000, 1000, 1);
  return { ...fake, layer };
};

describe('the label layer', () => {
  it('waits for Glacial Indifference before drawing the first label', async () => {
    let arrive!: () => void;
    const load = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          arrive = () => resolve([]);
        }),
    );
    const onReady = vi.fn();
    const fake = fakeCanvas();
    const layer = createLabelLayer(fake.canvas, { fonts: { load }, onReady });
    layer.resize(1000, 1000, 1);

    expect(load).toHaveBeenCalledWith(LABEL_FONT_PROBE);
    expect(LABEL_FONT_PROBE).toBe('14px "Glacial Indifference"');
    expect(layer.isReady()).toBe(false);
    expect(layer.draw(frame(3))).toBe(0);
    expect(fake.drawn).toEqual([]);

    arrive();
    await layer.ready;
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(layer.isReady()).toBe(true);
    expect(layer.draw(frame(3))).toBe(3);
  });

  it('still draws, in the fallback font, when Glacial does not load', async () => {
    const fake = fakeCanvas();
    const layer = createLabelLayer(fake.canvas, {
      fonts: { load: () => Promise.reject(new Error('offline')) },
    });
    layer.resize(500, 500, 1);
    await layer.ready;
    expect(layer.draw(frame(2))).toBe(2);
  });

  it('sets names in Glacial first, then the system sans', () => {
    expect(labelFont(14)).toBe(
      '14px "Glacial Indifference", system-ui, sans-serif',
    );
    const { layer, drawn } = ready();
    layer.draw(frame(1, { size: 17 }));
    expect(drawn[0].font).toBe(
      '17px "Glacial Indifference", system-ui, sans-serif',
    );
  });

  it('centres each name under its dot', () => {
    const { layer, ctx, drawn } = ready();
    const xy = new Float32Array([100, 200]);
    layer.draw(frame(1, { xy, radius: [10], size: [14] }));
    expect(ctx.textAlign).toBe('center');
    expect(ctx.textBaseline).toBe('top');
    // The dot's bottom edge plus a 5 px gap.
    expect(drawn).toEqual([
      expect.objectContaining({ text: 'Node 0', x: 100, y: 215, alpha: 1 }),
    ]);
  });

  it('puts a label where the caller says, when it says', () => {
    const { layer, drawn } = ready();
    const xy = new Float32Array([100, 200, 300, 200]);
    // The sizing model's offset: radius and gap, both scaled by √zoom.
    layer.draw(frame(2, { xy, radius: 10, offset: [30, 40], hovered: 1 }));
    expect(drawn.map((d) => [d.text, d.y])).toEqual([
      ['Node 0', 230],
      // The hovered drop is added on top of the caller's offset.
      ['Node 1', 240 + HOVER_LABEL_SHIFT],
    ]);
  });

  it('draws nothing faded out, off screen or not yet placed', () => {
    const { layer, drawn } = ready();
    const xy = new Float32Array([100, 100, -400, 100, NaN, NaN, 100, 1200]);
    const alpha = [0, 1, 1, 1];
    expect(layer.draw(frame(4, { xy, alpha }))).toBe(0);
    expect(drawn).toEqual([]);

    // Zoomed far out every name's alpha is 0, and nothing is measured.
    const many = ready();
    expect(many.layer.draw(frame(500, { alpha: 0 }))).toBe(0);
    expect(many.measured).toEqual([]);
  });

  it('takes at most 800, in the order given, with the first on top', () => {
    const { layer, drawn } = ready();
    const n = 1000;
    const order = Array.from({ length: n }, (_, i) => n - 1 - i);
    expect(layer.draw(frame(n, { order }))).toBe(MAX_LABELS);
    const names = new Set(drawn.map((d) => d.text));
    expect(names.size).toBe(MAX_LABELS);
    expect(names.has('Node 999')).toBe(true);
    expect(names.has('Node 200')).toBe(true);
    expect(names.has('Node 199')).toBe(false);
    // Painted least important first, so the most important ends on top.
    expect(drawn[drawn.length - 1].text).toBe('Node 999');
  });

  it('only considers the nodes the caller orders', () => {
    const { layer, drawn } = ready();
    expect(layer.draw(frame(10, { order: [3, 7] }))).toBe(2);
    expect(drawn.map((d) => d.text).sort()).toEqual(['Node 3', 'Node 7']);
  });

  it('always shows the hovered name, at full strength, 15 px lower, on top', () => {
    const { layer, drawn } = ready();
    const xy = new Float32Array([100, 100, 300, 100]);
    // Zoomed out: no name shows, and the hovered one is not even ordered.
    const n = layer.draw(
      frame(2, { xy, alpha: 0, order: [0], hovered: 1, radius: [8, 8] }),
    );
    expect(n).toBe(1);
    expect(drawn).toEqual([
      expect.objectContaining({
        text: 'Node 1',
        alpha: 1,
        y: 100 + 8 + LABEL_GAP + HOVER_LABEL_SHIFT,
      }),
    ]);

    drawn.length = 0;
    layer.draw(frame(2, { xy, alpha: 0.5, hovered: 0 }));
    expect(drawn.map((d) => [d.text, d.alpha])).toEqual([
      ['Node 1', 0.5],
      ['Node 0', 1],
    ]);
  });

  it('wraps a long name at 300 px, measuring it once per size', () => {
    const { layer, drawn, measured } = ready();
    const long =
      'The Rolling Stones Mobile Studio at Stargroves in Hampshire England';
    const text = [long];
    const xy = new Float32Array([500, 100]);
    layer.draw(frame(1, { text, xy, size: [14] }));
    const lines = drawn.map((d) => d.text);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe(long);
    for (const line of lines) expect(line.length * 7).toBeLessThanOrEqual(300);
    // One line under the other, 1.2 × the size apart.
    expect(drawn[1].y - drawn[0].y).toBeCloseTo(14 * 1.2);

    const measuredOnce = measured.length;
    drawn.length = 0;
    layer.draw(frame(1, { text, xy, size: [14] }));
    expect(measured.length).toBe(measuredOnce);
    expect(drawn.map((d) => d.text)).toEqual(lines);

    // A new size is a new wrap.
    layer.draw(frame(1, { text, xy, size: [20] }));
    expect(measured.length).toBeGreaterThan(measuredOnce);
  });

  it('scales the wrap with the type when asked, breaking in the same places', () => {
    const { layer, drawn } = ready();
    const text = [
      'The Rolling Stones Mobile Studio at Stargroves in Hampshire England',
    ];
    const xy = new Float32Array([500, 100]);
    layer.draw(frame(1, { text, xy, size: [14] }));
    const atOne = drawn.map((d) => d.text);
    drawn.length = 0;
    // Zoom 4: type twice the size, and the wrap twice as wide with it.
    layer.draw(frame(1, { text, xy, size: [28], wrapScale: 2 }));
    expect(drawn.map((d) => d.text)).toEqual(atOne);
    drawn.length = 0;
    // The same type at a fixed 300 px wraps into more lines.
    layer.draw(frame(1, { text, xy, size: [28] }));
    expect(drawn.length).toBeGreaterThan(atOne.length);
  });

  it('wraps the hovered name at its own size when it was kept large', () => {
    const { layer, drawn } = ready();
    // Zoomed far out: everything's type is a tenth, but the hovered name
    // keeps its full 15 px, so it must not wrap at a tenth of 300 px.
    const text = ['Los Angeles'];
    const xy = new Float32Array([500, 100]);
    layer.draw(
      frame(1, {
        text,
        xy,
        size: [15],
        alpha: 0,
        order: [],
        hovered: 0,
        wrapScale: 0.1,
      }),
    );
    expect(drawn.map((d) => d.text)).toEqual(['Los', 'Angeles']);
    drawn.length = 0;
    layer.draw(
      frame(1, {
        text,
        xy,
        size: [15],
        alpha: 0,
        order: [],
        hovered: 0,
        wrapScale: 0.1,
        hoveredWrapScale: 1,
      }),
    );
    expect(drawn.map((d) => d.text)).toEqual(['Los Angeles']);
  });

  it('measures nothing while zooming, when the wrap scales with the type', () => {
    const { layer, measured, drawn } = ready();
    const n = 50;
    const text = Array.from(
      { length: n },
      (_, i) => `A long enough name for node number ${i} to wrap onto lines`,
    );
    // The sizing model's sizes: 14 + r/4 at zoom 1, times √zoom, in three
    // sizes of dot; one wheel notch eased from zoom 1 to 1.5 over 30 frames.
    const base = Array.from({ length: n }, (_, i) => 14 + [2, 4, 7.5][i % 3]);
    const linesAt = (zoom: number) => {
      const s = Math.sqrt(zoom);
      drawn.length = 0;
      layer.draw(
        frame(n, { text, size: base.map((b) => b * s), wrapScale: s }),
      );
      return drawn.map((d) => d.text);
    };
    const atOne = linesAt(1);
    const afterFirst = measured.length;
    expect(afterFirst).toBeGreaterThan(0);
    for (let f = 1; f <= 30; f++) {
      expect(linesAt(1 + 0.5 * (f / 30))).toEqual(atOne);
    }
    expect(measured.length).toBe(afterFirst);
  });

  it('forgets the least recently used size first, keeping the busy ones', () => {
    const { layer, measured } = ready();
    const text = ['Busy name with words', 'Passing name with words'];
    const xy = new Float32Array([200, 100, 600, 100]);
    // A size used every frame, beside a hundred sizes used once each.
    for (let k = 0; k < 100; k++) {
      layer.draw(frame(2, { text, xy, size: [14, 30 + k] }));
    }
    /** How much text drawing node `i` alone at `size` measures. */
    const measuring = (i: number, size: number) => {
      const before = measured.length;
      const sizes = [14, 14];
      sizes[i] = size;
      layer.draw(frame(2, { text, xy, size: sizes, order: [i] }));
      return measured.length - before;
    };
    // The busy size was never forgotten …
    expect(measuring(0, 14)).toBe(0);
    // … the recent sizes are still there, and the first ones are not.
    expect(measuring(1, 129)).toBe(0);
    expect(measuring(1, 30)).toBeGreaterThan(0);
  });

  it('does not walk the names at all when one alpha hides them all', () => {
    const { layer, drawn } = ready();
    let reads = 0;
    const indices = Array.from({ length: 5000 }, (_, i) => i);
    const order = new Proxy(indices, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads += 1;
        return Reflect.get(target, key, receiver) as unknown;
      },
    });
    expect(layer.draw(frame(5000, { order, alpha: 0 }))).toBe(0);
    expect(reads).toBe(0);
    // The hovered name still shows.
    expect(layer.draw(frame(5000, { order, alpha: 0, hovered: 7 }))).toBe(1);
    expect(reads).toBe(0);
    expect(drawn.map((d) => d.text)).toEqual(['Node 7']);
  });

  it('drops the hovered name 15 device pixels, half that in CSS on Retina', () => {
    const fake = fakeCanvas();
    const layer = createLabelLayer(fake.canvas, { fonts: null });
    layer.resize(1000, 1000, 2);
    const xy = new Float32Array([100, 100]);
    layer.draw(frame(1, { xy, alpha: 0, order: [], hovered: 0, radius: 8 }));
    expect(fake.drawn).toEqual([
      expect.objectContaining({
        text: 'Node 0',
        y: 100 + 8 + LABEL_GAP + HOVER_LABEL_SHIFT / 2,
      }),
    ]);
  });

  it('draws sharp on Retina, at no more than twice the CSS size', () => {
    const fake = fakeCanvas();
    const layer = createLabelLayer(fake.canvas, { fonts: null });
    layer.resize(200, 100, 3);
    expect(fake.canvas.width).toBe(400);
    expect(fake.canvas.height).toBe(100 * 2);
    expect(fake.canvas.style).toEqual({ width: '200px', height: '100px' });
    layer.draw(frame(1));
    expect(fake.transforms.at(-1)).toEqual([2, 0, 0, 2, 0, 0]);
  });

  it('takes the theme colour, and draws nothing once destroyed', () => {
    const { layer, ctx, drawn } = ready({ color: '#eeeeee' });
    layer.draw(frame(1));
    expect(ctx.fillStyle).toBe('#eeeeee');
    layer.setColor('#dadada');
    layer.draw(frame(1));
    expect(ctx.fillStyle).toBe('#dadada');

    drawn.length = 0;
    layer.destroy();
    expect(layer.draw(frame(3))).toBe(0);
    expect(drawn).toEqual([]);
  });
});

describe('the halo behind a name', () => {
  it('strokes the marked names in the halo colour before filling them', () => {
    const { layer, stroked, calls, drawn } = ready({ haloColor: '#101012' });
    layer.resize(1000, 1000, 2);
    layer.draw(frame(3, { halo: [0, 1, 1], alpha: [1, 0.5, 1], hovered: 2 }));
    expect(stroked.map((s) => s.text)).toEqual(['Node 1', 'Node 2']);
    for (const s of stroked) {
      expect(s.color).toBe('#101012');
      expect(s.join).toBe('round');
      // 3.5 device pixels beyond the letters: a 3.5 CSS px stroke at 2×.
      expect(s.width).toBeCloseTo((2 * HALO_DEVICE_PX) / 2, 10);
    }
    // The halo fades with its name.
    expect(stroked[0].alpha).toBe(0.5);
    // Each halo goes under its own name.
    expect(calls.indexOf('stroke Node 1')).toBeLessThan(
      calls.indexOf('fill Node 1'),
    );
    expect(calls.indexOf('stroke Node 2')).toBeLessThan(
      calls.indexOf('fill Node 2'),
    );
    // The hovered name's halo moves down with it.
    const hovered = drawn.find((d) => d.text === 'Node 2')!;
    expect(stroked[1].y).toBe(hovered.y);
    expect(drawn).toHaveLength(3);
  });

  it('keeps small type’s halo to a quarter of its size', () => {
    const { layer, stroked } = ready({ haloColor: '#101012' });
    layer.draw(frame(1, { halo: 1, size: 6 }));
    expect(stroked[0].width).toBeCloseTo(2 * 6 * 0.25, 10);
  });

  it('draws no halo without a colour, or for names not marked', () => {
    const plain = ready();
    plain.layer.draw(frame(2, { halo: 1 }));
    expect(plain.stroked).toEqual([]);
    expect(plain.drawn).toHaveLength(2);

    const unmarked = ready({ haloColor: '#101012' });
    unmarked.layer.draw(frame(2));
    unmarked.layer.draw(frame(2, { halo: 0 }));
    expect(unmarked.stroked).toEqual([]);

    unmarked.layer.setHaloColor(null);
    unmarked.layer.draw(frame(2, { halo: 1 }));
    expect(unmarked.stroked).toEqual([]);
  });
});

describe('wrapping a name', () => {
  const measure = (s: string) => s.length * 10;

  it('keeps a short name on one line', () => {
    expect(wrapLabel('Toto', 300, measure)).toEqual(['Toto']);
  });

  it('breaks at spaces, and never inside a word', () => {
    expect(wrapLabel('aaaa bbbb cccc', 90, measure)).toEqual([
      'aaaa bbbb',
      'cccc',
    ]);
    expect(wrapLabel('Supercalifragilistic', 50, measure)).toEqual([
      'Supercalifragilistic',
    ]);
  });
});
