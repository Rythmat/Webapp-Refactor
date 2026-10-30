import { describe, expect, it } from 'vitest';
import { termCopy } from '../anatomyCopy';
import { poseFor } from '../anatomyPose';
import type { ModelKind } from '../anatomyTypes';
import { compiledInstrument, reachOf, termAnchor } from '../compileModel';
import { project } from '../iso';
import { fretDistance } from '../neckGeometry';

const KINDS: readonly ModelKind[] = [
  'electric',
  'acoustic',
  'electricBass',
  'acousticBass',
  'ukulele',
  'grandPiano',
  'uprightPiano',
  'keyboard',
  'synth',
];

/** The owner's reference chart, word for word. */
const REFERENCE_TERMS = [
  'Headstock',
  'Tuning Pegs',
  'Nut',
  'Neck',
  'Fretboard',
  'Frets',
  'Fret Markers',
  'Truss Rod',
  'Sound Hole',
  'Rosette',
  'Pickguard',
  'Bridge',
  'Saddle',
  'Bridge Pins',
  'Body',
  'Tonewood',
];

describe('the words', () => {
  it('has every term on the reference chart on the acoustic', () => {
    const names = compiledInstrument('acoustic', false).terms.map(
      (t) => t.name,
    );
    for (const term of REFERENCE_TERMS) expect(names).toContain(term);
  });

  it('names the electric’s own parts', () => {
    const names = compiledInstrument('electric', false).terms.map(
      (t) => t.name,
    );
    for (const term of [
      'Pickups',
      'Neck Pickup',
      'Middle Pickup',
      'Bridge Pickup',
      'Pickup Selector',
      'Volume',
      'Tone',
      'Output Jack',
      'Tremolo Arm',
      'String Tree',
      'Strap Buttons',
      'Neck Pocket',
    ]) {
      expect(names).toContain(term);
    }
  });

  it.each(KINDS)('%s: every term has words and real parts', (kind) => {
    const model = compiledInstrument(kind, false);
    expect(new Set(model.terms.map((t) => t.id)).size).toBe(model.terms.length);
    for (const term of model.terms) {
      const copy = termCopy(kind, term.id);
      expect(copy?.what, term.id).toBeTruthy();
      expect(copy?.why, term.id).toBeTruthy();
      for (const id of [
        ...term.parts,
        ...Object.keys(term.reveal ?? {}),
        ...Object.keys(term.liftOf ?? {}),
      ]) {
        expect(model.partById[id], `${term.id} → ${id}`).toBeDefined();
      }
    }
  });

  it.each(KINDS)('%s: a feature term’s feature is drawn', (kind) => {
    const model = compiledInstrument(kind, false);
    for (const term of model.terms.filter((t) => t.feature)) {
      for (const id of term.parts) {
        expect(
          model.partById[id].features[term.feature!],
          term.id,
        ).toBeTruthy();
      }
    }
  });

  it.each(KINDS)('%s: every part answers to a word when pressed', (kind) => {
    const model = compiledInstrument(kind, false);
    for (const part of model.parts) {
      expect(model.termOfPart[part.id], part.id).toBeDefined();
    }
  });
});

describe('the bass', () => {
  it('names the electric bass’s own parts, and not a guitar’s', () => {
    const names = compiledInstrument('electricBass', false).terms.map(
      (t) => t.name,
    );
    // The owner's bass reference, in this lesson's words.
    for (const term of [
      'Headstock',
      'Tuning Pegs',
      'Nut',
      'Neck',
      'Fretboard',
      'Fret Spaces',
      'Frets',
      'Strings',
      'Body',
      'Pickup',
      'Volume',
      'Tone',
      'Output Jack',
      'Saddles',
      'Bridge',
    ]) {
      expect(names).toContain(term);
    }
    expect(names).not.toContain('Tremolo Arm');
    expect(names).not.toContain('Pickup Selector');
    expect(names).not.toContain('Middle Pickup');
  });

  it('has a bass’s proportions, not a long guitar’s', () => {
    const bass = compiledInstrument('electricBass', false);
    const guitar = compiledInstrument('electric', false);
    const middleU = (kind: typeof bass, id: string) => {
      const { box } = kind.partById[id];
      // Along the guitar's length, on the page: up and to the right.
      return (box.x0 + box.x1) / 2 / Math.cos(Math.PI / 6);
    };
    // The bridge sits at the tail of the body.
    expect(middleU(bass, 'bridge')).toBeLessThan(middleU(guitar, 'bridge'));
    // The neck runs far past the body.
    const reach = (kind: typeof bass) =>
      kind.partById.frets.box.x1 - kind.partById.body.box.x1;
    expect(reach(bass)).toBeGreaterThan(reach(guitar) * 1.4);
  });

  it('gives the acoustic bass a way to plug in, which the guitar lacks', () => {
    const bass = compiledInstrument('acousticBass', false).terms.map(
      (t) => t.name,
    );
    const guitar = compiledInstrument('acoustic', false).terms.map(
      (t) => t.name,
    );
    expect(bass).toContain('Under-Saddle Pickup');
    expect(bass).toContain('Output Jack');
    expect(guitar).not.toContain('Under-Saddle Pickup');
    for (const term of REFERENCE_TERMS) expect(bass).toContain(term);
  });

  it.each(['electricBass', 'acousticBass'] as const)(
    '%s: has four strings, and its words are about a bass',
    (kind) => {
      const model = compiledInstrument(kind, false);
      // One line a string, drawn from the bridge end to its post.
      expect(model.partById.strings.layers[0].marks.match(/M/g)).toHaveLength(
        4,
      );
      expect(termCopy(kind, 'strings')?.what).toContain('Four');
      expect(termCopy(kind, 'neck')?.what).toContain('34 inches');
      expect(model.noun).toBe('bass');
    },
  );

  it('keeps the guitars on their own words', () => {
    expect(termCopy('electric', 'strings')?.what).toContain('Six');
    expect(termCopy('acoustic', 'strings')?.what).toContain('Six');
  });

  it('is longer than the guitar: a 34" scale against 25.5"', () => {
    const reach = (kind: ModelKind) => {
      const { box } = compiledInstrument(kind, false).partById.frets;
      return box.x1 - box.x0;
    };
    expect(reach('electricBass')).toBeGreaterThan(reach('electric'));
    expect(reach('acousticBass')).toBeGreaterThan(reach('acoustic'));
  });
});

describe('the ukulele', () => {
  const model = compiledInstrument('ukulele', false);
  const names = model.terms.map((t) => t.name);

  it('is not a small guitar: no truss rod, pickguard or bridge pins', () => {
    for (const term of ['Truss Rod', 'Pickguard', 'Bridge Pins']) {
      expect(names).not.toContain(term);
    }
    for (const part of ['trussRod', 'pickguard', 'bridgePins']) {
      expect(model.partById[part]).toBeUndefined();
    }
  });

  it('names its own parts', () => {
    for (const term of [
      'Headstock',
      'Tuning Pegs',
      'Nut',
      'Neck',
      'Fretboard',
      'Frets',
      'Fret Spaces',
      'Fret Markers',
      'Sound Hole',
      'Rosette',
      'Bracing',
      'Bridge',
      'Saddle',
      'Top',
      'Body',
      'Back & Sides',
      'Tonewood',
      'Strings',
    ]) {
      expect(names).toContain(term);
    }
  });

  it('has four strings, and says the G is the high one', () => {
    expect(model.partById.strings.layers[0].marks.match(/M/g)).toHaveLength(4);
    const copy = termCopy('ukulele', 'strings');
    expect(copy?.what).toContain('G, C, E, A');
    expect(copy?.what).toContain('nylon');
    expect(copy?.what).toContain('high');
  });

  it('has its own words for every part, none borrowed from a guitar', () => {
    for (const term of model.terms) {
      const copy = termCopy('ukulele', term.id);
      expect(`${copy?.what} ${copy?.why}`, term.id).not.toMatch(
        /\bguitar|\bsteel\b/i,
      );
    }
  });

  it('fills the page like the others, though it is a real 15" scale', () => {
    const guitar = compiledInstrument('acoustic', false);
    const ratio = model.view.width / guitar.view.width;
    expect(ratio).toBeGreaterThan(0.7);
    expect(ratio).toBeLessThan(1.15);
    // Each fret is to scale: 12th fret halfway from nut to saddle, drawn.
    expect(fretDistance(12, 15)).toBeCloseTo(7.5);
  });

  it('its exploded strings float clear for either hand', () => {
    const left = compiledInstrument('ukulele', true);
    expect(left.partById.strings.explode).toEqual(
      model.partById.strings.explode,
    );
  });

  it('a left-handed ukulele is rebuilt, and stays in the frame', () => {
    const left = compiledInstrument('ukulele', true);
    expect(left.view.width).toBeCloseTo(model.view.width, 0);
  });
});

describe('the frame', () => {
  it.each(KINDS)('%s: every pose stays inside it', (kind) => {
    const model = compiledInstrument(kind, false);
    const { x, y, width, height } = model.view;
    const inside = (termId: string | null, explode: number) => {
      const pose = poseFor(model, explode, termId);
      const box = reachOf(model.parts, (id) => pose[id].offset);
      expect(box.x0, String(termId)).toBeGreaterThanOrEqual(x);
      expect(box.y0, String(termId)).toBeGreaterThanOrEqual(y);
      expect(box.x1, String(termId)).toBeLessThanOrEqual(x + width);
      expect(box.y1, String(termId)).toBeLessThanOrEqual(y + height);
    };
    inside(null, 0);
    inside(null, 1);
    for (const term of model.terms) inside(term.id, 1);
  });

  it.each(KINDS)('%s: anchors are in the frame', (kind) => {
    const model = compiledInstrument(kind, false);
    for (const term of model.terms) {
      const [ax, ay] = termAnchor(model, term);
      expect(ax, term.id).toBeGreaterThanOrEqual(model.view.x);
      expect(ax, term.id).toBeLessThanOrEqual(model.view.x + model.view.width);
      expect(ay, term.id).toBeGreaterThanOrEqual(model.view.y);
      expect(ay, term.id).toBeLessThanOrEqual(model.view.y + model.view.height);
    }
  });
});

describe('the guitars themselves', () => {
  it('spaces frets to a real scale: the 12th halves the string', () => {
    expect(fretDistance(12, 25.5)).toBeCloseTo(12.75);
  });

  it.each(KINDS)('%s: Build it holds every part exactly once', (kind) => {
    const model = compiledInstrument(kind, false);
    const inOrder = model.buildOrder.flatMap((step) => step.parts);
    expect(new Set(inOrder).size).toBe(inOrder.length);
    expect([...inOrder].sort()).toEqual(model.parts.map((p) => p.id).sort());
    for (const step of model.buildOrder) {
      expect(model.termById[step.term], step.term).toBeDefined();
    }
  });

  it('a left-handed guitar has its parts on the other side', () => {
    const right = compiledInstrument('electric', false);
    const left = compiledInstrument('electric', true);
    // The volume knob sits toward the treble side, nearer the viewer's right.
    const rightKnob = right.partById.volume.box;
    const leftKnob = left.partById.volume.box;
    const [mid] = project(7.1, 0, 0);
    expect((rightKnob.x0 + rightKnob.x1) / 2).toBeGreaterThan(mid);
    expect((leftKnob.x0 + leftKnob.x1) / 2).toBeLessThan(mid);
    // Parts lift the same way; sideways moves change sides.
    expect(left.partById.neckPickup.explode[1]).toBe(
      -right.partById.neckPickup.explode[1],
    );
    expect(left.partById.neckPickup.explode[2]).toBe(
      right.partById.neckPickup.explode[2],
    );
  });
});
