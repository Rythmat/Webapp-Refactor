// @vitest-environment jsdom
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { NODE_FLAG_END, NODE_FLAG_RING } from '../../map/render/GraphRenderer';
import type { LabelFrame, LabelLayer } from '../../map/render/labelLayer';
import type { WebglGraphRenderer } from '../../map/render/webglRenderer';
import { TesseractMap, type TesseractMapProps } from '../TesseractMap';
import { layoutForest, openToDepth } from '../tesseractLayout';
import { buildTesseractModel, readProgressionRows } from '../tesseractModel';

/**
 * Tesseract's map on the real library, in jsdom: a renderer and a label
 * layer that record what they are told. The map opens two chords deep,
 * names and colours chords in the picked key, opens and folds from the
 * toolbar, finds, walks with the keys, and opens a row from the List.
 *
 * When `TESSERACT_DUMP` names a file, the first test writes what the map
 * drew at depth 2 in C there (positions, labels, colours, end flags), for
 * a preview drawn outside the app.
 */

const ROWS = CHORD_PROGRESSION_LIBRARY as unknown as readonly unknown[];
const MODEL = buildTesseractModel(readProgressionRows(ROWS));
const DEPTH2 = layoutForest(MODEL, openToDepth(MODEL, 2)).ids.length;

function fakeStage() {
  const graphs: {
    count: number;
    links: Uint32Array;
    colors: Uint8Array;
    flags: Uint8Array;
  }[] = [];
  const colorSets: Uint8Array[] = [];
  const flagSets: Uint8Array[] = [];
  let positions: Float32Array | null = null;
  let flagsNow = new Uint8Array(0);
  let dirty = false;
  const mark = () => {
    dirty = true;
  };
  const renderer: WebglGraphRenderer = {
    get isDirty() {
      return dirty;
    },
    isLost: false,
    stats: { frames: 0, lastFrameMs: 0 },
    gpu: 'fake',
    setGraph(g) {
      graphs.push({
        count: g.count,
        links: g.links.slice(),
        colors: g.colors.slice(),
        flags: g.nodeFlags.slice(),
      });
      flagsNow = g.nodeFlags.slice();
      mark();
    },
    setPositions(xy) {
      positions = xy.slice();
      mark();
    },
    setColors(c) {
      colorSets.push(c.slice());
      mark();
    },
    setNodeFlags(f) {
      flagSets.push(f.slice());
      flagsNow = f.slice();
      mark();
    },
    setHighlight: mark,
    setCamera: mark,
    setStyle: mark,
    resize: mark,
    render() {
      dirty = false;
    },
    destroy() {},
  };
  const frames: { text: readonly string[]; order: number[] }[] = [];
  const labels: LabelLayer = {
    ready: Promise.resolve(),
    isReady: () => true,
    resize() {},
    setColor() {},
    setHaloColor() {},
    draw(frame: LabelFrame) {
      frames.push({
        text: Array.from(frame.text),
        order: Array.from(frame.order),
      });
      return frame.order.length;
    },
    clear() {},
    destroy() {},
  };
  return {
    createRenderer: () => renderer,
    createLabels: () => labels,
    graphs,
    colorSets,
    flagSets,
    frames,
    positions: () => positions,
    /** The flags drawn now: the last graph's, or the last change since. */
    flags: () => flagsNow,
    last: () => graphs[graphs.length - 1],
    lastText: () => frames[frames.length - 1]?.text ?? [],
  };
}

function renderMap(extra: Partial<TesseractMapProps> = {}) {
  const stage = fakeStage();
  const onOpenRow = vi.fn();
  const utils = render(
    <TesseractMap
      rows={ROWS}
      onOpenRow={onOpenRow}
      createRenderer={stage.createRenderer}
      createLabels={stage.createLabels}
      reducedMotion
      {...extra}
    />,
  );
  const region = utils.container.querySelector<HTMLElement>(
    '[data-tesseract-canvas]',
  )!;
  return { ...utils, stage, onOpenRow, region };
}

// The stage needs a size for the camera and the labels: a 1440 by 900 screen.
const realRect = HTMLElement.prototype.getBoundingClientRect;
beforeEach(() => {
  HTMLElement.prototype.getBoundingClientRect = function rect() {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      width: 1440,
      height: 900,
      right: 1440,
      bottom: 900,
      toJSON: () => ({}),
    } as DOMRect;
  };
});
afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = realRect;
  cleanup();
});

describe('Tesseract on the stage', () => {
  it('draws the forest two chords deep, in C, with ends flagged', async () => {
    const { stage } = renderMap();
    await waitFor(() => expect(stage.positions()).not.toBeNull());
    const drawn = stage.last();
    expect(drawn.count).toBe(DEPTH2);
    const xy = stage.positions()!;
    expect(xy).toHaveLength(DEPTH2 * 2);
    await waitFor(() => expect(stage.lastText().length).toBe(DEPTH2));
    const text = stage.lastText();
    const layout = layoutForest(MODEL, openToDepth(MODEL, 2));
    expect(text[layout.indexOf.get('1 major7')!]).toBe('CΔ7');
    // A folded opening carries its count.
    const folded = layout.ids.findIndex(
      (_, i) =>
        layout.open[i] === 0 &&
        MODEL.forest.nodes.get(layout.ids[i])!.childIds.length > 0,
    );
    expect(text[folded]).toMatch(/ · \d+$/);
    for (let i = 0; i < drawn.count; i++) {
      const ends = MODEL.forest.nodes.get(layout.ids[i])!.endIds.length > 0;
      expect((drawn.flags[i] & NODE_FLAG_END) !== 0).toBe(ends);
    }

    const out = process.env.TESSERACT_DUMP;
    if (out) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(
        out,
        JSON.stringify(
          {
            key: 'C',
            notation: 'jazz',
            depth: 2,
            count: drawn.count,
            trees: layout.trees,
            width: layout.width,
            height: layout.height,
            nodes: layout.ids.map((id, i) => ({
              id,
              x: xy[2 * i],
              y: xy[2 * i + 1],
              parent: layout.parent[i],
              label: text[i],
              color: `rgb(${drawn.colors[4 * i]}, ${drawn.colors[4 * i + 1]}, ${drawn.colors[4 * i + 2]})`,
              end: (drawn.flags[i] & NODE_FLAG_END) !== 0,
              open: layout.open[i] === 1,
            })),
          },
          null,
          1,
        ),
      );
    }
  });

  it('renames and recolours every chord when the key changes', async () => {
    const { stage } = renderMap();
    await waitFor(() => expect(stage.lastText().length).toBe(DEPTH2));
    const layout = layoutForest(MODEL, openToDepth(MODEL, 2));
    const root = layout.indexOf.get('1 major7')!;
    const before = stage.last().colors;
    fireEvent.click(screen.getByRole('button', { name: 'Key of E♭' }));
    await waitFor(() => expect(stage.lastText()[root]).toBe('E♭Δ7'));
    // The same nodes: new colours, no new graph.
    expect(stage.graphs).toHaveLength(1);
    const after = stage.colorSets[stage.colorSets.length - 1];
    expect([...after]).not.toEqual([...before]);
    expect(
      screen
        .getByRole('button', { name: 'Key of E♭' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Roman' }));
    await waitFor(() => expect(stage.lastText()[root]).toBe('IΔ7'));
  });

  it('opens and folds the whole forest from the toolbar', async () => {
    const { stage } = renderMap();
    await waitFor(() => expect(stage.last()?.count).toBe(DEPTH2));
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
    await waitFor(() =>
      expect(stage.last().count).toBe(MODEL.forest.nodes.size),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
    await waitFor(() => expect(stage.last().count).toBe(MODEL.rootIds.length));
    fireEvent.click(screen.getByRole('button', { name: 'Open to depth 3' }));
    await waitFor(() =>
      expect(stage.last().count).toBe(
        [...MODEL.forest.nodes.values()].filter((n) => n.depth <= 3).length,
      ),
    );
  });

  it('finds an opening and opens the way to it', async () => {
    const { stage } = renderMap();
    await waitFor(() => expect(stage.last()?.count).toBe(DEPTH2));
    const field = screen.getByRole('searchbox');
    fireEvent.change(field, { target: { value: 'Dm7 G7 Cmaj7' } });
    const results = screen.getByRole('list', { name: 'Find results' });
    expect(within(results).getAllByRole('button')[0].textContent).toContain(
      'D−7 → G7 → CΔ7',
    );
    fireEvent.keyDown(field, { key: 'Enter' });
    const opened = '2 minor7|5 dominant7';
    await waitFor(() =>
      expect(stage.last().count).toBe(
        DEPTH2 + MODEL.forest.nodes.get(opened)!.childIds.length,
      ),
    );
  });

  it('walks the trees with the arrow keys and says where it is', async () => {
    const { stage, region, container } = renderMap();
    await waitFor(() => expect(stage.last()?.count).toBe(DEPTH2));
    const live = () =>
      container.querySelector('[aria-live]')?.textContent ?? '';
    act(() => region.focus());
    fireEvent.keyDown(region, { key: 'ArrowDown' });
    await waitFor(() => expect(live()).toContain('CΔ7, starting chord'));
    // The current node wears the ring.
    await waitFor(() =>
      expect(stage.flags()[0] & NODE_FLAG_RING).toBe(NODE_FLAG_RING),
    );
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    const first = MODEL.forest.nodes.get('1 major7')!.childIds[0];
    await waitFor(() => expect(live()).toContain('after CΔ7'));
    // Into a folded node: it opens.
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(stage.last().count).toBe(
        DEPTH2 + MODEL.forest.nodes.get(first)!.childIds.length,
      ),
    );
  });

  it('opens a row from the List, and offers both of a duplicate pair', async () => {
    const { onOpenRow } = renderMap({ defaultDepth: Infinity });
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    const list = screen.getByRole('list', { name: 'Tesseract as a list' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(
      MODEL.forest.nodes.size,
    );
    const pair = [...MODEL.forest.nodes.values()].find(
      (n) => n.endIds.length > 1,
    );
    const buttons = within(list).getAllByRole('button', { name: /^Open row/ });
    fireEvent.click(buttons[0]);
    expect(onOpenRow).toHaveBeenCalledTimes(1);
    if (pair) {
      const row = list.querySelector(
        `[data-opening="${CSS.escape(pair.id)}"]`,
      )!;
      fireEvent.click(
        within(row as HTMLElement).getByRole('button', { name: /^Open row/ }),
      );
      expect(onOpenRow).toHaveBeenLastCalledWith(pair.endIds[0], pair.endIds);
    }
  });

  it('opens the way to a progression the page asks for', async () => {
    const target = [...MODEL.forest.endNodeOf.entries()].find(
      ([, id]) => id.split('|').length >= 4,
    )!;
    const { stage, rerender, onOpenRow } = renderMap();
    await waitFor(() => expect(stage.last()?.count).toBe(DEPTH2));
    const stage2 = stage;
    rerender(
      <TesseractMap
        rows={ROWS}
        onOpenRow={onOpenRow}
        createRenderer={stage2.createRenderer}
        createLabels={stage2.createLabels}
        reducedMotion
        revealProgressionId={target[0]}
        selectedProgressionId={target[0]}
      />,
    );
    await waitFor(() => expect(stage.last().count).toBeGreaterThan(DEPTH2));
    const open = new Set(openToDepth(MODEL, 2));
    let at = MODEL.forest.nodes.get(target[1])!.parentId;
    while (at) {
      open.add(at);
      at = MODEL.forest.nodes.get(at)!.parentId;
    }
    const layout = layoutForest(MODEL, open);
    expect(stage.last().count).toBe(layout.ids.length);
    const i = layout.indexOf.get(target[1])!;
    await waitFor(() =>
      expect(stage.flags()[i] & NODE_FLAG_RING).toBe(NODE_FLAG_RING),
    );
  });
});
