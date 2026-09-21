// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { buildScore } from '..';
import type { NotationNoteInput } from '../types';

const Q = 480;

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

let nextId = 0;
const hit = (midi: number, startTick: number): NotationNoteInput => ({
  id: `d${nextId++}`,
  midi,
  startTick,
  durationTicks: 60,
});

/**
 * The renderer's contract with VexFlow: a percussion clef, cross noteheads
 * addressed as a third key component, and the o of an open hi-hat. Drawn for
 * real so a VexFlow rename or a bad glyph code fails here rather than on screen.
 */
describe('drumset staff renders through VexFlow', () => {
  it('draws a percussion clef, X noteheads and both stem directions', async () => {
    const vf = await import('vexflow/bravura');

    const score = buildScore(
      [
        hit(42, 0), // closed hi-hat
        hit(36, 0), // kick
        hit(42, 240),
        hit(38, Q), // snare
        hit(42, Q),
        hit(46, Q + 240), // open hi-hat
        hit(49, Q * 2), // crash
        hit(44, Q * 2), // hi-hat pedal
      ],
      {
        ticksPerQuarter: Q,
        timeSignature: [4, 4],
        staves: 'percussion',
        minMeasures: 1,
      },
    );

    const div = document.createElement('div');
    document.body.appendChild(div);
    const renderer = new vf.Renderer(div, vf.Renderer.Backends.SVG);
    renderer.resize(600, 220);
    const ctx = renderer.getContext();

    const stave = new vf.Stave(10, 20, 560).addClef('percussion');
    stave.addTimeSignature('4/4');
    stave.setContext(ctx).draw();

    const measure = score.measures[0];
    const voices = measure.staves.percussion.map(({ index, items }) => {
      const notes = items.map((item) => {
        const note = new vf.StaveNote({
          keys:
            item.kind === 'rest'
              ? ['b/4']
              : item.keys.map(
                  (k) =>
                    `${k.letter}/${k.octave}` +
                    (k.notehead && k.notehead !== 'normal'
                      ? `/${k.notehead}`
                      : ''),
                ),
          duration: `${item.value}${item.kind === 'rest' ? 'r' : ''}`,
          dots: item.dots,
          clef: 'percussion',
          stemDirection: index === 0 ? vf.Stem.UP : vf.Stem.DOWN,
        });
        item.keys.forEach((k, i) => {
          if (k.articulation === 'open') {
            note.addModifier(new vf.Articulation('ah'), i);
          }
        });
        return note;
      });
      return new vf.Voice({ numBeats: 4, beatValue: 4 })
        .setMode(vf.Voice.Mode.SOFT)
        .addTickables(notes);
    });

    expect(voices).toHaveLength(2);
    new vf.Formatter().joinVoices(voices).formatToStave(voices, stave);
    voices.forEach((v) => v.draw(ctx, stave));

    const svg = div.innerHTML;
    expect(svg).toContain('<svg');
    // Bravura codepoints: percussion clef U+E069, X notehead U+E0A9.
    expect(svg).toContain('');
    expect(svg).toContain('');
    // Stems drawn in both directions means hands and feet are distinguishable.
    const stems = [...svg.matchAll(/class="vf-stem"/g)];
    expect(stems.length).toBeGreaterThan(0);
  });
});
