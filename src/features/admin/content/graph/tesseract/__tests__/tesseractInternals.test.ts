import { describe, expect, it } from 'vitest';
import CHORD_PROGRESSION_LIBRARY from '@/curriculum/data/chordProgressionLibrary';
import { NODE_FLAG_END } from '../../map/render/GraphRenderer';
import { findInTesseract, readChords } from '../tesseractFind';
import { layoutForest, openToDepth } from '../tesseractLayout';
import { buildTesseractModel, readProgressionRows } from '../tesseractModel';
import {
  chordCss,
  chordName,
  chordRgb,
  keyColor,
  keyPc,
  parseKey,
  TESSERACT_KEYS,
} from '../tesseractNaming';
import { buildTesseractDrawing, nodeLabel } from '../tesseractScene';
import {
  entryMatches,
  filterOptions,
  matchingOpenings,
  maskFor,
  NO_FILTERS,
  pinnedCamera,
  stepIn,
  storyOf,
} from '../tesseractView';

/**
 * Tesseract's internals on the real library: folding and unfolding with
 * the clicked node held still, naming and colouring in every key, Find in
 * each notation and by song, the filters, and the arrow keys.
 */

const model = buildTesseractModel(
  readProgressionRows(CHORD_PROGRESSION_LIBRARY),
);

describe('folding and unfolding', () => {
  it('holds the clicked node still on screen while the forest moves', () => {
    const before = layoutForest(model, openToDepth(model, 2));
    // Open a folded node deep in the second tree: everything below it moves.
    const id = model.forest.nodes.get('1 major')!.childIds[0];
    const open = new Set([...openToDepth(model, 2), id]);
    const after = layoutForest(model, open);
    expect(after.ids.length).toBeGreaterThan(before.ids.length);
    const camera = { x: 300, y: 200, zoom: 0.8 };
    const next = pinnedCamera(camera, before, after, id);
    const a = before.indexOf.get(id)!;
    const b = after.indexOf.get(id)!;
    // Its screen position, (world − camera) × zoom, is unchanged.
    expect((after.xy[2 * b] - next.x) * next.zoom).toBeCloseTo(
      (before.xy[2 * a] - camera.x) * camera.zoom,
    );
    expect((after.xy[2 * b + 1] - next.y) * next.zoom).toBeCloseTo(
      (before.xy[2 * a + 1] - camera.y) * camera.zoom,
    );
  });

  it('comes back to the same picture when folded again', () => {
    const base = openToDepth(model, 2);
    const id = '1 major7|4 major7';
    const opened = layoutForest(model, new Set([...base, id]));
    expect(
      opened.ids.filter((n) => model.forest.nodes.get(n)!.parentId === id),
    ).toHaveLength(model.forest.nodes.get(id)!.childIds.length);
    const folded = layoutForest(model, base);
    const again = layoutForest(model, new Set([...base]));
    expect([...again.xy]).toEqual([...folded.xy]);
  });

  it('leaves the camera alone for a node not in both pictures', () => {
    const a = layoutForest(model, openToDepth(model, 1));
    const b = layoutForest(model, openToDepth(model, 2));
    const camera = { x: 1, y: 2, zoom: 3 };
    expect(pinnedCamera(camera, a, b, '1 major7|4 major7')).toBe(camera);
  });
});

describe('naming and colouring in a key', () => {
  it('names chords in the picked key and notation', () => {
    expect(chordName('1 major7', 'jazz', keyPc('C'))).toBe('CΔ7');
    expect(chordName('1 major7', 'jazz', keyPc('Eb'))).toBe('E♭Δ7');
    expect(chordName('b7 major', 'jazz', keyPc('Eb'))).toBe('D♭');
    expect(chordName('2 minor7', 'jazz', keyPc('C'))).toBe('D−7');
    expect(chordName('2 minor7', 'roman', keyPc('Eb'))).toBe('ii7');
    expect(chordName('2 minor7', 'hybrid', keyPc('Eb'))).toBe('2 min7');
  });

  it("colours the key's own chords in the key's colour, in every key", () => {
    for (const key of TESSERACT_KEYS) {
      const pc = keyPc(key);
      expect(chordCss('1 major7', pc)).toBe(keyColor(key));
      expect(chordCss('4 major7', pc)).toBe(keyColor(key));
      expect(chordCss('2 minor7', pc)).toBe(keyColor(key));
    }
  });

  it('draws an unknown chord grey, never white', () => {
    expect(chordRgb('2 minor 7', 0)).toEqual([140, 140, 140]);
    expect(chordRgb('9 major', 0)).toEqual([140, 140, 140]);
    expect(chordRgb('1 weird', 0)).toEqual([140, 140, 140]);
    const layout = layoutForest(model, openToDepth(model, Infinity));
    for (const key of TESSERACT_KEYS) {
      const { colors } = buildTesseractDrawing(
        model,
        layout,
        keyPc(key),
        'jazz',
      );
      for (let i = 0; i < layout.ids.length; i++) {
        const white =
          colors[4 * i] === 255 &&
          colors[4 * i + 1] === 255 &&
          colors[4 * i + 2] === 255;
        expect(white, layout.ids[i]).toBe(false);
      }
    }
  });

  it('renames and recolours the same nodes when the key changes', () => {
    const layout = layoutForest(model, openToDepth(model, 2));
    const inC = buildTesseractDrawing(model, layout, keyPc('C'), 'jazz');
    const inEb = buildTesseractDrawing(model, layout, keyPc('Eb'), 'jazz');
    expect(inEb.graph.ids).toEqual(inC.graph.ids);
    expect([...inEb.graph.links]).toEqual([...inC.graph.links]);
    expect([...inEb.colors]).not.toEqual([...inC.colors]);
    const root = layout.indexOf.get('1 major7')!;
    expect(inC.graph.nodes[root].label).toBe('CΔ7');
    expect(inEb.graph.nodes[root].label).toBe('E♭Δ7');
  });

  it('reads keys loosely from a URL', () => {
    expect(parseKey('Eb')).toBe('Eb');
    expect(parseKey('E♭')).toBe('Eb');
    expect(parseKey('f#')).toBe('F#');
    expect(parseKey('H')).toBe('C');
    expect(parseKey(null)).toBe('C');
  });
});

describe('what the stage draws', () => {
  const layout = layoutForest(model, openToDepth(model, 2));
  const drawing = buildTesseractDrawing(model, layout, 0, 'jazz');

  it('labels a folded node with how many progressions it holds', () => {
    expect(nodeLabel('CΔ7', true, 298)).toBe('CΔ7 · 298');
    expect(nodeLabel('CΔ7', false, 298)).toBe('CΔ7');
    for (let i = 0; i < layout.ids.length; i++) {
      const node = model.forest.nodes.get(layout.ids[i])!;
      const folded = node.childIds.length > 0 && layout.open[i] === 0;
      expect(
        drawing.graph.nodes[i].label.endsWith(` · ${node.countBelow}`),
      ).toBe(folded);
    }
  });

  it('flags every node where a progression ends, and only those', () => {
    for (let i = 0; i < layout.ids.length; i++) {
      const ends = model.forest.nodes.get(layout.ids[i])!.endIds.length > 0;
      expect(drawing.endFlags[i] === NODE_FLAG_END).toBe(ends);
    }
  });

  it('draws one line from each parent to each child', () => {
    expect(drawing.graph.links.length / 2).toBe(layout.ids.length - 18);
    for (let k = 0; k < drawing.graph.links.length; k += 2) {
      expect(layout.parent[drawing.graph.links[k + 1]]).toBe(
        drawing.graph.links[k],
      );
    }
  });
});

describe('Find', () => {
  const first = (text: string, key = 'C') =>
    findInTesseract(model, text, keyPc(key))[0];

  it('finds an opening typed in each notation', () => {
    expect(first('ii7 V7')?.id).toBe('2 minor7|5 dominant7');
    expect(first('2 min7 5 dom7')?.id).toBe('2 minor7|5 dominant7');
    expect(first('2 minor7 - 5 dominant7')?.id).toBe('2 minor7|5 dominant7');
    expect(first('Dm7 G7 Cmaj7')?.id).toBe('2 minor7|5 dominant7|1 major7');
    // Letter names are read in the picked key.
    expect(first('Fm7 Bb7 Ebmaj7', 'Eb')?.id).toBe(
      '2 minor7|5 dominant7|1 major7',
    );
    expect(first('Fm7 Bb7 Ebmaj7', 'Eb')?.kind).toBe('opening');
  });

  it('ranks exact chords above near ones, and openings above matches inside', () => {
    const hits = findInTesseract(model, 'ii V I', 0);
    expect(hits[0].id).toBe('2 minor|5 major|1 major');
    expect(hits.some((h) => h.id === '2 minor7|5 dominant7|1 major7')).toBe(
      true,
    );
    const kinds = hits.map((h) => h.kind);
    expect(kinds.indexOf('inside')).toBeGreaterThan(
      kinds.lastIndexOf('opening'),
    );
  });

  it('finds a song by its title', () => {
    const entry = [...model.entries.values()].find((e) => e.song.length > 3)!;
    const hits = findInTesseract(model, entry.song, 0);
    const hit = hits.find(
      (h) => h.kind === 'song' && h.progressionId === entry.id,
    );
    expect(hit?.id).toBe(model.forest.endNodeOf.get(entry.id));
    // And through a linked song's title.
    const linked = [...model.entries.values()].find(
      (e) => e.songIds.length > 0,
    )!;
    const byLink = findInTesseract(model, 'A Linked Title', 0, (s) =>
      s === linked.songIds[0] ? 'A Linked Title' : undefined,
    );
    expect(byLink.some((h) => h.progressionId === linked.id)).toBe(true);
  });

  it('finds nothing for text that is neither', () => {
    expect(findInTesseract(model, 'zzzqqq', 0)).toEqual([]);
    expect(findInTesseract(model, '   ', 0)).toEqual([]);
    expect(readChords('not a chord', 0)).toBeNull();
  });
});

describe('the filters', () => {
  it('keeps the openings on the way to every matching progression', () => {
    const f = { ...NO_FILTERS, hasSongs: true };
    const kept = matchingOpenings(model, f);
    let matches = 0;
    for (const entry of model.entries.values()) {
      const end = model.forest.endNodeOf.get(entry.id)!;
      if (entryMatches(entry, f)) {
        matches += 1;
        expect(kept.has(end)).toBe(true);
        expect(kept.has(model.forest.nodes.get(end)!.rootId)).toBe(true);
      }
    }
    expect(matches).toBeGreaterThan(0);
    // An opening is kept only when a match lies at or below it.
    for (const id of kept) {
      const node = model.forest.nodes.get(id)!;
      const below = [...model.forest.endNodeOf.entries()].filter(
        ([, end]) => end === id || end.startsWith(`${id}|`),
      );
      expect(
        below.some(([pid]) => entryMatches(model.entries.get(pid)!, f)),
        node.id,
      ).toBe(true);
    }
  });

  it('combines vibe, style and complexity', () => {
    const options = filterOptions(model);
    expect(options.vibes.length).toBeGreaterThan(0);
    expect(options.styles.length).toBeGreaterThan(0);
    expect(options.complexities.length).toBeGreaterThan(0);
    for (const list of [options.vibes, options.styles, options.complexities])
      for (let k = 1; k < list.length; k++)
        expect(list[k].count).toBeLessThanOrEqual(list[k - 1].count);
    const vibe = options.vibes[0].value;
    const style = options.styles[0].value;
    const both = { ...NO_FILTERS, vibes: [vibe], styles: [style] };
    const one = { ...NO_FILTERS, vibes: [vibe] };
    expect(matchingOpenings(model, both).size).toBeLessThanOrEqual(
      matchingOpenings(model, one).size,
    );
    const layout = layoutForest(model, openToDepth(model, 2));
    const mask = maskFor(layout, matchingOpenings(model, one))!;
    expect(mask).toHaveLength(layout.ids.length);
    expect(maskFor(layout, null)).toBeNull();
  });
});

describe('the arrow keys and the card', () => {
  const layout = layoutForest(model, openToDepth(model, 1));

  it('walks parents, children and siblings', () => {
    expect(stepIn(model, layout, '1 major7', 'parent').to).toBeNull();
    expect(stepIn(model, layout, '1 major7', 'previous').to).toBeNull();
    expect(stepIn(model, layout, '1 major7', 'next').to).toBe('1 major');
    const child = stepIn(model, layout, '1 major7', 'child');
    expect(child.to).toBe(model.forest.nodes.get('1 major7')!.childIds[0]);
    // The root is folded at depth 1, so stepping in opens it.
    expect(child.open).toBe('1 major7');
    const deeper = layoutForest(model, openToDepth(model, 2));
    expect(stepIn(model, deeper, '1 major7', 'child').open).toBeUndefined();
    expect(stepIn(model, deeper, child.to!, 'parent').to).toBe('1 major7');
  });

  it('tells a node in the key: the opening named, its degrees and its ends', () => {
    const end = model.forest.endNodeOf.get(1)!;
    const story = storyOf(model, end, (c) => chordName(c, 'jazz', 0))!;
    expect(story.degrees.split(' - ')).toEqual(end.split('|'));
    expect(story.named.split(' → ')).toHaveLength(end.split('|').length);
    expect(story.ends.map((e) => e.id)).toContain(1);
  });
});
