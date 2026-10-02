// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { fretToMidi, shapeNotes } from '@/lib/guitar/fretboard';
import type { FretPosition, GuitarStringNumber } from '@/lib/guitar/types';
import { buildTab, type TabNoteInput } from '@/lib/notation';
import { renderTabSystem } from '../TabStaffView';

const Q = 480;
const BAR = 4 * Q;

// VexFlow measures its glyphs as canvas text; jsdom has no canvas. Returning
// plausible metrics keeps the layout honest and the output quiet.
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
});

let host: HTMLDivElement;
afterEach(() => host?.remove());

let nextId = 0;
const fretted = (
  string: GuitarStringNumber,
  fret: number,
  startTick: number,
  durationTicks: number,
): TabNoteInput => {
  const fretPosition: FretPosition = { string, fret };
  return {
    id: `n${nextId++}`,
    midi: fretToMidi(fretPosition),
    startTick,
    durationTicks,
    fretPosition,
  };
};

const strum = (frets: string, startTick: number, durationTicks: number) =>
  shapeNotes(frets).map(({ position }) =>
    fretted(position.string, position.fret, startTick, durationTicks),
  );

async function draw(notes: TabNoteInput[], bars: number, width = 900) {
  const vf = await import('vexflow/bravura');
  const score = buildTab(notes, {
    timeSignature: [4, 4],
    minMeasures: bars,
  });
  host = document.createElement('div');
  document.body.appendChild(host);
  const rendered = renderTabSystem(vf, host, score, width, 0, {
    fitHeight: false,
  });
  return { rendered, svg: host.innerHTML, score };
}

/**
 * The renderer's contract with VexFlow, drawn for real so a VexFlow rename or
 * a bad glyph code fails here rather than on screen.
 */
describe('TAB renders through VexFlow', () => {
  // Bar 1: open C strummed on beats 1–2, then an eighth-note run and a rest.
  // Bar 2: G held for the whole bar.
  const lesson = () => [
    ...strum('X-3-2-0-1-0', 0, 2 * Q),
    fretted(3, 0, 2 * Q, Q / 2),
    fretted(3, 2, 2 * Q + Q / 2, Q / 2),
    ...strum('3-2-0-0-0-3', BAR, BAR),
  ];

  it('draws a TAB clef, stemmed tab notes, beams and a rest', async () => {
    const { svg } = await draw(lesson(), 2);
    // Bravura: six-string TAB clef U+E06D.
    expect(svg).toContain('\u{E06D}');
    expect(svg).toContain('class="vf-tabnote"');
    expect([...svg.matchAll(/class="vf-stem"/g)].length).toBeGreaterThan(0);
    expect(svg).toContain('class="vf-beam"');
    // The quarter rest on beat 4 is a real rest, not a gap.
    expect(svg).toContain('class="vf-stavenote"');
  });

  it('writes the frets as text', async () => {
    const { svg } = await draw(lesson(), 2);
    const digits = [...svg.matchAll(/<text[^>]*>(\d+)<\/text>/g)].map(
      (m) => m[1],
    );
    // Open C (3 2 0 1 0), the run (0 2) and G (3 2 0 0 0 3).
    for (const fret of ['3', '2', '0', '1']) expect(digits).toContain(fret);
  });

  it('names the strings at the start of every system', async () => {
    // Narrow enough that eight bars wrap onto several lines.
    const notes = Array.from({ length: 8 }, (_, bar) =>
      strum('X-3-2-0-1-0', bar * BAR, BAR),
    ).flat();
    const { rendered } = await draw(notes, 8, 400);
    expect(rendered.systems.length).toBeGreaterThan(1);
    const names = [...host.querySelectorAll('.vf-string-names')];
    expect(names).toHaveLength(rendered.systems.length);
    for (const group of names) {
      expect(
        [...group.querySelectorAll('text')].map((t) => t.textContent),
      ).toEqual(['e', 'B', 'G', 'D', 'A', 'E']);
    }
  });

  it('writes a tied note as a ghost fret', async () => {
    const { svg } = await draw([fretted(3, 5, 2 * Q, BAR)], 2);
    expect(svg).toContain('>(5)</text>');
  });

  it('lays out notes and bars for the overlays, in time order', async () => {
    const notes = lesson();
    const { rendered } = await draw(notes, 2);
    expect(rendered.measures.map((m) => [m.partIndex, m.startTick])).toEqual([
      [0, 0],
      [0, BAR],
    ]);
    // Every lesson note is drawn, and knows its tick.
    expect(new Set(rendered.notes.map((n) => n.id))).toEqual(
      new Set(notes.map((n) => n.id)),
    );
    const onsets = [...new Set(rendered.notes.map((n) => n.tick))];
    expect(onsets).toEqual([0, 2 * Q, 2 * Q + Q / 2, BAR]);
    // Later notes sit further right on one line.
    const xAt = (tick: number) =>
      rendered.notes.find((n) => n.tick === tick)!.x;
    for (let i = 1; i < onsets.length; i++) {
      expect(xAt(onsets[i])).toBeGreaterThan(xAt(onsets[i - 1]));
    }
    // The playhead's anchors rise with time.
    const [start, end] = rendered.systems[0].anchors;
    expect(end.tick).toBeGreaterThan(start.tick);
    expect(end.x).toBeGreaterThan(start.x);
  });

  it('keeps a lesson note to its own fret digit for highlighting', async () => {
    const notes = strum('X-3-2-0-1-0', 0, BAR);
    const { rendered } = await draw(notes, 1);
    for (const note of notes) {
      const [digit, ...more] = rendered.digits.get(note.id)!;
      expect(more).toHaveLength(0);
      expect(digit.textContent).toBe(String(note.fretPosition.fret));
      expect(rendered.groups.get(note.id)![0].contains(digit)).toBe(true);
    }
  });

  it('keeps every tied segment of a chord note, so a partial strum lights both', async () => {
    // Beat 4 pushed over the barline: a quarter, then a tied (ghost) quarter.
    const notes = strum('X-3-2-0-1-0', 3 * Q, 2 * Q);
    const { rendered } = await draw(notes, 2);
    for (const note of notes) {
      const fret = note.fretPosition.fret;
      expect(
        rendered.digits.get(note.id)!.map((digit) => digit.textContent),
      ).toEqual([String(fret), `(${fret})`]);
      expect(rendered.groups.get(note.id)).toHaveLength(2);
    }
  });

  it('hangs the rhythm below the strings and centres rests on them', async () => {
    // A dotted quarter, an eighth, a quarter rest, a quarter.
    const { rendered } = await draw(
      [
        fretted(6, 3, 0, 3 * (Q / 2)),
        fretted(5, 2, 3 * (Q / 2), Q / 2),
        fretted(4, 0, 3 * Q, Q),
      ],
      1,
    );
    const lineYs = [...host.querySelectorAll('.vf-stave path')].map((path) =>
      Number(path.getAttribute('d')!.split(' ')[1].split('L')[0]),
    );
    expect(lineYs).toHaveLength(6);
    const [top, bottom] = [Math.min(...lineYs), Math.max(...lineYs)];
    const stemYs = [...host.querySelectorAll('.vf-stem path')].flatMap(
      (path) => [...path.getAttribute('d')!.matchAll(/[\d.]+ ([\d.]+)/g)],
    );
    expect(stemYs.length).toBeGreaterThan(0);
    for (const [, y] of stemYs) expect(Number(y)).toBeGreaterThan(bottom);
    expect(rendered.notes.every((n) => n.stem === 'down')).toBe(true);

    const rest = host.querySelector('.vf-stavenote .vf-notehead text')!;
    const restY = Number(rest.getAttribute('y'));
    expect(Math.abs(restY - (top + bottom) / 2)).toBeLessThan(13);
    // The dotted quarter's rhythm dot (Bravura U+E1E7).
    expect(host.innerHTML).toContain('\u{E1E7}');
  });

  it('tells a half note from a quarter by its shorter stem', async () => {
    const { rendered } = await draw(
      [
        fretted(3, 0, 0, 2 * Q),
        fretted(3, 2, 2 * Q, Q),
        fretted(3, 4, BAR, BAR),
      ],
      2,
    );
    const lengths = [...host.querySelectorAll('.vf-stem path')].map((path) => {
      const [, y1, y2] = path
        .getAttribute('d')!
        .match(/ ([\d.]+)L[\d.]+ ([\d.]+)/)!;
      return Number(y2) - Number(y1);
    });
    // Half, quarter — and the whole note in bar 2 has no stem at all.
    expect(lengths).toHaveLength(2);
    expect(lengths[0]).toBeLessThan(lengths[1]);
    expect(rendered.notes.find((n) => n.tick === BAR)!.stem).toBeNull();
  });

  it('opens every system with the TAB clef, and only the first with the time', async () => {
    const notes = Array.from({ length: 8 }, (_, bar) =>
      strum('X-3-2-0-1-0', bar * BAR, BAR),
    ).flat();
    const { rendered } = await draw(notes, 8, 400);
    expect(host.querySelectorAll('.vf-clef')).toHaveLength(
      rendered.systems.length,
    );
    expect(host.querySelectorAll('.vf-timesignature')).toHaveLength(1);
  });

  it('scales up to fill a tall panel and down to fit a short one', async () => {
    const vf = await import('vexflow/bravura');
    const score = buildTab(strum('X-3-2-0-1-0', 0, BAR), {
      timeSignature: [4, 4],
      minMeasures: 1,
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    // A one-line step fills a tall panel at twice the size: ~24px digits.
    const tall = renderTabSystem(vf, host, score, 900, 600, {
      fitHeight: true,
    });
    expect(tall.scale).toBe(2);
    expect(tall.paged).toBe(false);
    const short = renderTabSystem(vf, host, score, 900, 150, {
      fitHeight: true,
    });
    expect(short.scale).toBeLessThan(1);
    // One line: nothing to page through.
    expect(short.paged).toBe(false);
  });

  it('pages a step whose lines do not all fit at scale 1, rather than shrinking it', async () => {
    const vf = await import('vexflow/bravura');
    const notes = Array.from({ length: 8 }, (_, bar) =>
      strum('X-3-2-0-1-0', bar * BAR, BAR),
    ).flat();
    const score = buildTab(notes, { timeSignature: [4, 4], minMeasures: 8 });
    host = document.createElement('div');
    document.body.appendChild(host);
    // 400px wide wraps eight bars onto several lines; 200px holds one.
    const rendered = renderTabSystem(vf, host, score, 400, 200, {
      fitHeight: true,
    });
    expect(rendered.systems.length).toBeGreaterThan(1);
    expect(rendered.paged).toBe(true);
    // Not shrunk: one line a page, drawn to fill the 200px (no part of the
    // next line shows under it).
    expect(rendered.scale).toBeGreaterThanOrEqual(1);
    expect(rendered.systemHeight * rendered.scale).toBeLessThanOrEqual(200);
    expect(rendered.systems[1].y * rendered.scale).toBeGreaterThan(200 - 9);
    // Taller than the panel: the view turns a line at a time.
    expect(rendered.height).toBeGreaterThan(200);
  });

  it('sets the string names and bar numbers in Glacial, never under 12px', async () => {
    const vf = await import('vexflow/bravura');
    const score = buildTab(strum('X-3-2-0-1-0', 0, BAR), {
      timeSignature: [4, 4],
      minMeasures: 1,
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    const at = (height: number) => {
      const rendered = renderTabSystem(vf, host, score, 900, height, {
        fitHeight: true,
      });
      const texts = [
        ...host.querySelectorAll(
          '.vf-string-names text, .vf-measure-number text',
        ),
      ];
      expect(texts.length).toBe(7);
      // VexFlow writes a font on the text or, when it hasn't changed, only
      // on the group around it.
      const inherited = (el: Element, name: string) =>
        el.closest(`[${name}]`)!.getAttribute(name)!;
      return texts.map((text) => ({
        family: inherited(text, 'font-family'),
        // In px (VexFlow reads a bare number as pt), drawn at the TAB's scale.
        px: /px$/.test(inherited(text, 'font-size'))
          ? parseFloat(inherited(text, 'font-size')) * rendered.scale
          : NaN,
      }));
    };
    for (const height of [150, 250, 600]) {
      for (const { family, px } of at(height)) {
        expect(family).toBe('Glacial Indifference');
        expect(px).toBeGreaterThanOrEqual(12 - 1e-9);
      }
    }
  });
});
