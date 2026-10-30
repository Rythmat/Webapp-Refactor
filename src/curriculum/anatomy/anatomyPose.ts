import type { PartPose, SceneCamera, ScenePose, TermDef } from './anatomyTypes';
import { reachOf, type CompiledModel } from './compileModel';
import type { V3 } from './iso';

// ── Where every part goes ──────────────────────────────────────────────────
// The lesson's one source of truth: the drawing springs to these, the tests
// read them. With nothing chosen the guitar is `explode` of the way apart. With
// a term chosen everything else goes home and dims while its parts rise clear,
// along with whatever has to move to show them.

const HOME: V3 = [0, 0, 0];

// The + 0 keeps a part at home from sitting at -0.
const scaled = (offset: V3, k: number): V3 => [
  offset[0] * k + 0,
  offset[1] * k + 0,
  offset[2] * k + 0,
];

export function poseFor(
  model: CompiledModel,
  explode: number,
  termId: string | null,
): ScenePose {
  const term = termId ? model.termById[termId] : undefined;
  const pose: Record<string, PartPose> = {};
  for (const part of model.parts) {
    if (!term) {
      pose[part.id] = {
        offset: scaled(part.explode, explode),
        state: 'idle',
      };
    } else if (term.parts.includes(part.id)) {
      pose[part.id] = {
        offset: term.liftOf?.[part.id] ?? term.lift,
        // A term that is a feature of a part lights only that feature.
        state: term.feature ? 'dim' : 'lit',
        feature: term.feature,
      };
    } else {
      pose[part.id] = {
        offset: term.reveal?.[part.id] ?? HOME,
        state: 'dim',
        seeThrough: term.seeThrough?.includes(part.id),
      };
    }
  }
  return pose;
}

/** Build it: placed parts home, the rest apart; `justPlaced` still lit. */
export function buildPose(
  model: CompiledModel,
  placed: ReadonlySet<string>,
  justPlaced: readonly string[] = [],
): ScenePose {
  const pose: Record<string, PartPose> = {};
  for (const part of model.parts) {
    pose[part.id] = placed.has(part.id)
      ? {
          offset: HOME,
          state: justPlaced.includes(part.id) ? 'lit' : 'seated',
        }
      : { offset: part.explode, state: 'idle' };
  }
  return pose;
}

const moved = ({ offset: [u, v, z] }: PartPose) =>
  u !== 0 || v !== 0 || z !== 0;

/** Back to front. A part that rises paints over everything still at home (a
 *  lifted knob over the pickups), and under what moved aside above it (a truss
 *  rod under its fretboard). Nothing risen, it is the model's own order. */
export function paintOrder(
  model: CompiledModel,
  pose: ScenePose,
): readonly string[] {
  const ids = model.parts.map((part) => part.id);
  const risen = ids.filter((id) => {
    const part = pose[id];
    return (part.state === 'lit' || part.feature) && moved(part);
  });
  if (!risen.length) return ids;
  const level = Math.min(...risen.map((id) => pose[id].offset[2]));
  const isRisen = new Set(risen);
  const above = ids.filter(
    (id) => !isRisen.has(id) && moved(pose[id]) && pose[id].offset[2] >= level,
  );
  const isAbove = new Set(above);
  return [
    ...ids.filter((id) => !isRisen.has(id) && !isAbove.has(id)),
    ...risen,
    ...above,
  ];
}

const MAX_ZOOM = 2.6;
/** How much of the frame a chosen part may fill. */
const FILL = 0.62;
const WHOLE: SceneCamera = { x: 0, y: 0, scale: 1 };

/** Scale about the frame's middle. */
function shrunk(model: CompiledModel, scale: number): SceneCamera {
  const { x, y, width, height } = model.view;
  return {
    x: (x + width / 2) * (1 - scale),
    y: (y + height / 2) * (1 - scale),
    scale,
  };
}

/** The camera for a term: in on a small part, the whole guitar for a big one.
 *  It stays inside the frame, so it never shows past the drawing's edge. */
export function cameraFor(
  model: CompiledModel,
  term: TermDef | null,
  pose: ScenePose,
  /** With labels on, how far the guitar shrinks to leave them room. */
  labels: number | null = null,
): SceneCamera {
  if (labels !== null) return shrunk(model, labels);
  if (!term) return WHOLE;
  const { x, y, width, height } = model.view;
  const box = reachOf(
    term.parts.map((id) => model.partById[id]),
    (id) => pose[id].offset,
  );
  const scale = Math.min(
    model.maxZoom ?? MAX_ZOOM,
    (width * FILL) / Math.max(box.x1 - box.x0, 0.01),
    (height * FILL) / Math.max(box.y1 - box.y0, 0.01),
  );
  if (scale <= 1) return WHOLE;
  const tx = x + width / 2 - scale * ((box.x0 + box.x1) / 2);
  const ty = y + height / 2 - scale * ((box.y0 + box.y1) / 2);
  const clamp = (value: number, a: number, b: number) =>
    Math.min(Math.max(a, b), Math.max(Math.min(a, b), value));
  return {
    x: clamp(tx, x * (1 - scale), (x + width) * (1 - scale)),
    y: clamp(ty, y * (1 - scale), (y + height) * (1 - scale)),
    scale,
  };
}
