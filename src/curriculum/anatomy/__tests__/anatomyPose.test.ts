import { describe, expect, it } from 'vitest';
import { buildPose, cameraFor, paintOrder, poseFor } from '../anatomyPose';
import {
  frameFor,
  labelsScale,
  layoutCallouts,
  throughCamera,
} from '../callouts';
import { compiledInstrument } from '../compileModel';
import { projectOffset } from '../iso';

const electric = compiledInstrument('electric', false);
const acoustic = compiledInstrument('acoustic', false);

describe('poseFor', () => {
  it('has everything home at no explode, and apart at full', () => {
    for (const part of electric.parts) {
      expect(poseFor(electric, 0, null)[part.id].offset).toEqual([0, 0, 0]);
      expect(poseFor(electric, 1, null)[part.id].offset).toEqual(part.explode);
    }
  });

  it('scrubs in proportion', () => {
    expect(poseFor(electric, 0.5, null).pickguard.offset[2]).toBeCloseTo(
      electric.partById.pickguard.explode[2] / 2,
    );
  });

  it('choosing a term sends the rest home and dims it, whatever the explode', () => {
    const pose = poseFor(electric, 1, 'nut');
    expect(pose.nut.state).toBe('lit');
    expect(pose.nut.offset).toEqual(electric.termById.nut.lift);
    expect(pose.pickguard.offset).toEqual([0, 0, 0]);
    expect(pose.pickguard.state).toBe('dim');
  });

  it('the truss rod moves the fretboard off it', () => {
    const pose = poseFor(electric, 1, 'trussRod');
    expect(pose.trussRod.state).toBe('lit');
    expect(pose.fretboard.state).toBe('dim');
    expect(pose.fretboard.offset[2]).toBeGreaterThan(pose.trussRod.offset[2]);
    expect(pose.frets.offset).toEqual(pose.fretboard.offset);
  });

  it('bracing shows through a clear top', () => {
    const pose = poseFor(acoustic, 1, 'bracing');
    expect(pose.bracing.state).toBe('lit');
    expect(pose.top.seeThrough).toBe(true);
    expect(pose.top.offset).toEqual([0, 0, 0]);
    expect(pose.sides.seeThrough).toBeFalsy();
  });

  it('a saddle rises above its bridge, which rises a little', () => {
    const pose = poseFor(acoustic, 1, 'saddle');
    expect(pose.bridge.offset[2]).toBeGreaterThan(0);
    expect(pose.saddle.offset[2]).toBeGreaterThan(pose.bridge.offset[2]);
  });

  it('a feature lights only itself: the sound hole, not the whole top', () => {
    const pose = poseFor(acoustic, 1, 'soundHole');
    expect(pose.top.state).toBe('dim');
    expect(pose.top.feature).toBe('soundHole');
    expect(pose.top.offset[2]).toBeGreaterThan(0);
  });

  it('the electric’s neck pocket slides the neck away', () => {
    const pose = poseFor(electric, 1, 'neckPocket');
    expect(pose.body.feature).toBe('pocket');
    expect(pose.neckShaft.offset[0]).toBeGreaterThan(0);
    expect(pose.headstock.offset).toEqual(pose.neckShaft.offset);
  });

  it('groups move together', () => {
    const pose = poseFor(electric, 1, 'pickups');
    expect(pose.neckPickup.state).toBe('lit');
    expect(pose.bridgePickup.state).toBe('lit');
    expect(pose.neckPickup.offset).toEqual(pose.bridgePickup.offset);
  });
});

describe('buildPose', () => {
  it('holds placed parts home and the rest apart', () => {
    const pose = buildPose(electric, new Set(['body', 'pickguard']), [
      'pickguard',
    ]);
    expect(pose.pickguard).toEqual({ offset: [0, 0, 0], state: 'lit' });
    expect(pose.body.state).toBe('seated');
    expect(pose.nut.offset).toEqual(electric.partById.nut.explode);
    expect(pose.nut.state).toBe('idle');
  });
});

describe('paintOrder', () => {
  const at = (order: readonly string[], id: string) => order.indexOf(id);

  it('keeps the model’s order with nothing risen', () => {
    expect(paintOrder(electric, poseFor(electric, 1, null))).toEqual(
      electric.parts.map((part) => part.id),
    );
    expect(paintOrder(electric, poseFor(electric, 1, 'body'))).toEqual(
      electric.parts.map((part) => part.id),
    );
  });

  it('paints a lifted knob over the pickups', () => {
    const order = paintOrder(electric, poseFor(electric, 1, 'volume'));
    expect(at(order, 'volume')).toBeGreaterThan(at(order, 'neckPickup'));
    expect(at(order, 'volume')).toBeGreaterThan(at(order, 'strings'));
  });

  it('keeps a truss rod under the fretboard lifted above it', () => {
    const order = paintOrder(electric, poseFor(electric, 1, 'trussRod'));
    expect(at(order, 'trussRod')).toBeLessThan(at(order, 'fretboard'));
    expect(at(order, 'trussRod')).toBeGreaterThan(at(order, 'body'));
  });

  it('keeps a saddle over the bridge that rose less', () => {
    const order = paintOrder(acoustic, poseFor(acoustic, 1, 'saddle'));
    expect(at(order, 'saddle')).toBeGreaterThan(at(order, 'bridge'));
  });

  it('keeps what sits on the top over a lifted top', () => {
    const order = paintOrder(acoustic, poseFor(acoustic, 1, 'top'));
    expect(at(order, 'top')).toBeLessThan(at(order, 'bridge'));
    expect(at(order, 'top')).toBeLessThan(at(order, 'rosette'));
  });

  it('holds every part once', () => {
    for (const model of [electric, acoustic]) {
      for (const term of model.terms) {
        const order = paintOrder(model, poseFor(model, 1, term.id));
        expect([...order].sort(), term.id).toEqual(
          model.parts.map((part) => part.id).sort(),
        );
      }
    }
  });
});

describe('cameraFor', () => {
  it('stays wide with nothing chosen', () => {
    expect(cameraFor(electric, null, poseFor(electric, 1, null))).toEqual({
      x: 0,
      y: 0,
      scale: 1,
    });
  });

  it('moves in on a small part and not on a big one', () => {
    const saddle = acoustic.termById.saddle;
    expect(
      cameraFor(acoustic, saddle, poseFor(acoustic, 1, 'saddle')).scale,
    ).toBeGreaterThan(1.5);
    const neck = acoustic.termById.neck;
    expect(
      cameraFor(acoustic, neck, poseFor(acoustic, 1, 'neck')).scale,
    ).toBeLessThan(1.5);
  });

  it('never shows past the drawing’s edge', () => {
    for (const model of [electric, acoustic]) {
      const { x, y, width, height } = model.view;
      for (const term of model.terms) {
        const camera = cameraFor(model, term, poseFor(model, 1, term.id));
        expect(camera.x + x * camera.scale, term.id).toBeLessThanOrEqual(
          x + 1e-6,
        );
        expect(camera.y + y * camera.scale, term.id).toBeLessThanOrEqual(
          y + 1e-6,
        );
        expect(
          camera.x + (x + width) * camera.scale,
          term.id,
        ).toBeGreaterThanOrEqual(x + width - 1e-6);
        expect(
          camera.y + (y + height) * camera.scale,
          term.id,
        ).toBeGreaterThanOrEqual(y + height - 1e-6);
      }
    }
  });
});

describe('layoutCallouts', () => {
  const SIZE = 0.82;

  it.each([0, 0.5, 1])(
    'keeps every word a row apart, in the frame, at explode %s',
    (explode) => {
      for (const model of [electric, acoustic]) {
        const pose = poseFor(model, explode, null);
        const camera = cameraFor(model, null, pose, 0.8);
        const callouts = layoutCallouts(model, model.terms, pose, camera, SIZE);
        expect(callouts).toHaveLength(model.terms.length);
        for (const side of ['left', 'right'] as const) {
          const column = callouts
            .filter((c) => c.side === side)
            .sort((a, b) => a.y - b.y);
          column.forEach((c, i) => {
            expect(c.y).toBeGreaterThanOrEqual(model.view.y);
            expect(c.y).toBeLessThanOrEqual(model.view.y + model.view.height);
            if (i > 0) {
              expect(c.y - column[i - 1].y).toBeGreaterThanOrEqual(SIZE);
            }
          });
        }
      }
    },
  );

  it('splits the words evenly, however the parts are placed', () => {
    for (const explode of [0, 1]) {
      const pose = poseFor(electric, explode, null);
      const camera = cameraFor(electric, null, pose);
      const callouts = layoutCallouts(
        electric,
        electric.terms,
        pose,
        camera,
        SIZE,
      );
      const left = callouts.filter((c) => c.side === 'left').length;
      expect(Math.abs(left * 2 - callouts.length)).toBeLessThanOrEqual(1);
    }
  });

  it('never lets a word alone sit on its part', () => {
    for (const kind of [
      'electric',
      'acoustic',
      'electricBass',
      'acousticBass',
    ] as const) {
      const model = compiledInstrument(kind, false);
      for (const term of model.terms) {
        const pose = poseFor(model, 1, term.id);
        const camera = cameraFor(model, term, pose);
        const [callout] = layoutCallouts(model, [term], pose, camera, SIZE);
        const [dx, dy] = projectOffset(pose[callout.part].offset);
        const [px] = throughCamera(
          [callout.anchor[0] + dx, callout.anchor[1] + dy],
          camera,
        );
        const width = term.name.length * SIZE * 0.54;
        const wordEnd =
          callout.side === 'left' ? callout.x + width : callout.x - width;
        const gap = callout.side === 'left' ? px - wordEnd : wordEnd - px;
        expect(gap, `${kind} ${term.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('grows the frame to the stage about the same middle', () => {
    const view = { x: 0, y: 0, width: 10, height: 10 };
    expect(frameFor(view, { width: 200, height: 100 })).toEqual({
      x: -5,
      y: 0,
      width: 20,
      height: 10,
    });
    expect(frameFor(view, { width: 0, height: 0 })).toBe(view);
  });

  it('shrinks the guitar only as far as the words need', () => {
    const view = { x: 0, y: 0, width: 40, height: 30 };
    const terms = [{ name: 'Tuning Pegs' }];
    expect(labelsScale(view, { ...view, width: 80 }, terms, 0.8)).toBe(1);
    expect(labelsScale(view, view, terms, 0.8)).toBeLessThan(1);
  });
});
