import { describe, expect, it } from 'vitest';
import { termCopy } from '../anatomyCopy';
import { paintOrder, poseFor } from '../anatomyPose';
import {
  compiledInstrument,
  describe as describeModel,
  reachOf,
} from '../compileModel';
import { GRAND_PIANO_MODEL } from '../grandPianoModel';
import {
  blackKeySolids,
  HIGHEST_MIDI,
  KEYBOARD_HALF,
  LOWEST_MIDI,
  pianoKeys,
  WHITE_KEY_COUNT,
  whiteKeySolids,
} from '../pianoKeys';
import { UPRIGHT_PIANO_MODEL } from '../uprightPianoModel';

const grand = compiledInstrument('grandPiano', false);
const upright = compiledInstrument('uprightPiano', false);
const namesOf = (model: typeof grand) => model.terms.map((t) => t.name);

describe('the 88 keys', () => {
  const keys = pianoKeys();

  it('has 88, 52 white and 36 black', () => {
    expect(keys).toHaveLength(88);
    expect(keys.filter((k) => !k.black)).toHaveLength(WHITE_KEY_COUNT);
    expect(keys.filter((k) => k.black)).toHaveLength(36);
    const spec = { frontU: 0, z: 1 };
    expect(whiteKeySolids(spec)).toHaveLength(52);
    expect(blackKeySolids(spec)).toHaveLength(36);
  });

  it('runs from A0 on the bass side to C8 on the treble side', () => {
    expect(keys[0].midi).toBe(LOWEST_MIDI);
    expect(keys[0].midi).toBe(21);
    expect(keys[87].midi).toBe(HIGHEST_MIDI);
    expect(keys[87].midi).toBe(108);
    expect(keys[0].v).toBeLessThan(0);
    expect(keys[87].v).toBeGreaterThan(0);
    expect(keys[87].v).toBeLessThanOrEqual(KEYBOARD_HALF);
    for (let i = 1; i < 88; i++) {
      expect(keys[i].v).toBeGreaterThan(keys[i - 1].v);
    }
  });

  it('groups the black keys in twos and threes', () => {
    // From the first C: the gaps between black keys, in white-key widths, are
    // 1 within a group and 2 between groups.
    const black = keys.filter((k) => k.black && k.midi >= 24);
    const gaps = black
      .slice(0, 6)
      .map((k, i) => (i ? Math.round((k.v - black[i - 1].v) / 0.927) : 0))
      .slice(1);
    expect(gaps).toEqual([1, 2, 1, 1, 2]);
  });
});

describe('each piano has its own parts', () => {
  it('the grand has a rim, a prop stick and a lyre; no panels', () => {
    const names = namesOf(grand);
    for (const term of ['Rim', 'Prop Stick', 'Lyre']) {
      expect(names).toContain(term);
    }
    for (const term of ['Upper Panel', 'Lower Panel', 'Back Posts', 'Case']) {
      expect(names).not.toContain(term);
    }
  });

  it('the upright has a case, panels and back posts; no rim', () => {
    const names = namesOf(upright);
    for (const term of ['Case', 'Upper Panel', 'Lower Panel', 'Back Posts']) {
      expect(names).toContain(term);
    }
    for (const term of ['Rim', 'Prop Stick', 'Lyre']) {
      expect(names).not.toContain(term);
    }
  });

  it('both name what they share, so a choice survives switching', () => {
    for (const term of [
      'Lid',
      'Music Desk',
      'Fallboard',
      'Keys',
      'White Keys',
      'Black Keys',
      'Keybed',
      'Action',
      'Hammers',
      'Dampers',
      'Strings',
      'Cast-Iron Plate',
      'Tuning Pins',
      'Pinblock',
      'Bridges',
      'Soundboard',
      'Pedals',
      'Soft Pedal',
      'Middle Pedal',
      'Damper Pedal',
    ]) {
      expect(namesOf(grand)).toContain(term);
      expect(namesOf(upright)).toContain(term);
    }
  });

  it('says how the two differ', () => {
    expect(termCopy('grandPiano', 'hammers')?.what).toContain('below');
    expect(termCopy('grandPiano', 'hammers')?.what).toContain('Gravity');
    expect(termCopy('uprightPiano', 'hammers')?.what).toContain('front');
    expect(termCopy('uprightPiano', 'hammers')?.what).toContain('Springs');
    expect(termCopy('grandPiano', 'softPedal')?.what).toContain('sideways');
    expect(termCopy('uprightPiano', 'softPedal')?.what).toContain('closer');
    expect(termCopy('grandPiano', 'middlePedal')?.what).toContain('sostenuto');
    expect(termCopy('uprightPiano', 'middlePedal')?.what).toContain('many');
  });

  it('no piano copy borrows a guitar’s words', () => {
    for (const [kind, model] of [
      ['grandPiano', grand],
      ['uprightPiano', upright],
    ] as const) {
      for (const term of model.terms) {
        const copy = termCopy(kind, term.id);
        expect(`${copy?.what} ${copy?.why}`, term.id).not.toMatch(
          /guitar|\bfret|\bneck\b|\bbass guitar/i,
        );
      }
    }
  });

  it('reads as a grand piano and an upright piano', () => {
    expect(describeModel(grand)).toBe('a grand piano');
    expect(describeModel(upright)).toBe('an upright piano');
  });
});

describe('the drawing is true to the instrument', () => {
  const stringsOf = (model: typeof GRAND_PIANO_MODEL) =>
    model.parts.find((p) => p.id === 'strings')?.marks ?? [];

  it('a grand’s strings lie flat and run away from the player', () => {
    const lines = stringsOf(GRAND_PIANO_MODEL);
    expect(lines).toHaveLength(88);
    for (const line of lines) {
      const [a, b] = [line[0], line[line.length - 1]];
      expect(a[2]).toBe(b[2]);
      expect(b[0]).toBeGreaterThan(a[0]);
    }
  });

  it('an upright’s strings stand up', () => {
    const lines = stringsOf(UPRIGHT_PIANO_MODEL);
    expect(lines).toHaveLength(88);
    for (const line of lines) {
      const [a, b] = [line[0], line[line.length - 1]];
      expect(a[0]).toBe(b[0]);
      expect(a[2]).toBeGreaterThan(b[2]);
    }
  });

  it.each([
    ['grand', GRAND_PIANO_MODEL],
    ['upright', UPRIGHT_PIANO_MODEL],
  ] as const)('%s: its low strings are the long ones', (_, model) => {
    const lines = stringsOf(model);
    const length = (line: (typeof lines)[number]) => {
      const [a, b] = [line[0], line[line.length - 1]];
      return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    };
    expect(length(lines[0])).toBeGreaterThan(length(lines[87]) * 2);
  });

  it('the bass strings cross over the others', () => {
    for (const model of [GRAND_PIANO_MODEL, UPRIGHT_PIANO_MODEL]) {
      const lines = stringsOf(model);
      const [bass, tenor] = [lines[19], lines[22]];
      // The bass string starts on the low side of the tenor one, ends past it.
      expect(bass[0][1]).toBeLessThan(tenor[0][1]);
      expect(bass[bass.length - 1][1]).toBeGreaterThan(
        tenor[tenor.length - 1][1],
      );
    }
  });

  it('the grand’s lid opens toward the viewer, hinged on the spine', () => {
    const lid = GRAND_PIANO_MODEL.parts.find((p) => p.id === 'lid');
    const tilt = lid?.solids[0].tilt;
    expect(tilt?.angle).toBeGreaterThan(0);
    expect(tilt?.axisV).toBeLessThan(0);
  });

  it('neither piano mirrors for a left-handed player', () => {
    expect(compiledInstrument('grandPiano', true)).toEqual(grand);
    expect(compiledInstrument('uprightPiano', true)).toEqual(upright);
  });

  it('every part has its place in Build it, both halves of the rim together', () => {
    const step = GRAND_PIANO_MODEL.buildOrder.find((s) => s.term === 'rim');
    expect(step?.parts).toEqual(['rimFar', 'rimNear']);
    const caseStep = UPRIGHT_PIANO_MODEL.buildOrder.find(
      (s) => s.term === 'case',
    );
    expect(caseStep?.parts).toEqual(['caseFar', 'caseNear']);
  });
});

describe('poses', () => {
  const at = (order: readonly string[], id: string) => order.indexOf(id);

  it('paints the near side of the rim over what’s inside', () => {
    const order = paintOrder(grand, poseFor(grand, 0, null));
    expect(at(order, 'rimFar')).toBeLessThan(at(order, 'soundboard'));
    expect(at(order, 'soundboard')).toBeLessThan(at(order, 'rimNear'));
    expect(at(order, 'strings')).toBeLessThan(at(order, 'lid'));
  });

  it('paints an upright front to back', () => {
    const order = paintOrder(upright, poseFor(upright, 0, null));
    const front = ['backPosts', 'soundboard', 'plate', 'strings', 'hammers'];
    for (let i = 1; i < front.length; i++) {
      expect(at(order, front[i])).toBeGreaterThan(at(order, front[i - 1]));
    }
    expect(at(order, 'upperPanel')).toBeGreaterThan(at(order, 'hammers'));
    expect(at(order, 'caseNear')).toBeGreaterThan(at(order, 'upperPanel'));
  });

  it('keeps the upright’s casters behind its panels', () => {
    const order = paintOrder(upright, poseFor(upright, 0, null));
    expect(at(order, 'casters')).toBeLessThan(at(order, 'lowerPanel'));
  });

  it('leaves the grand’s pedals clear of the keybed when apart', () => {
    // Under it, they could not be tapped in Build it.
    const pose = poseFor(grand, 1, null);
    const keybed = reachOf([grand.partById.keybed], () => pose.keybed.offset);
    for (const id of ['softPedal', 'middlePedal', 'damperPedal', 'lyre']) {
      const box = reachOf([grand.partById[id]], () => pose[id].offset);
      const overlaps =
        box.x0 < keybed.x1 &&
        keybed.x0 < box.x1 &&
        box.y0 < keybed.y1 &&
        keybed.y0 < box.y1;
      expect(overlaps, id).toBe(false);
    }
  });

  it('clears the way to the grand’s soundboard', () => {
    const pose = poseFor(grand, 1, 'soundboard');
    expect(pose.soundboard.state).toBe('lit');
    expect(pose.plate.offset[2]).toBeGreaterThan(pose.soundboard.offset[2]);
    expect(pose.lid.offset).not.toEqual([0, 0, 0]);
  });

  it('opens the upright to show its strings', () => {
    const pose = poseFor(upright, 1, 'strings');
    expect(pose.strings.state).toBe('lit');
    expect(pose.upperPanel.offset[0]).toBeLessThan(0);
    expect(pose.lowerPanel.offset[0]).toBeLessThan(0);
    expect(pose.caseNear.seeThrough).toBe(true);
    expect(pose.hammers.offset[0]).toBeLessThan(0);
  });

  it('shows the upright’s soundboard through what’s in front of it', () => {
    const pose = poseFor(upright, 1, 'soundboard');
    expect(pose.plate.seeThrough).toBe(true);
    expect(pose.strings.seeThrough).toBe(true);
  });
});
