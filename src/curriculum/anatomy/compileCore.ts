import { colorForKeyMode } from '@/lib/modeColorShift';
import type {
  BuildStep,
  ModelKind,
  InstrumentModel,
  PartDef,
  TermDef,
  TermFamily,
} from './anatomyTypes';
import {
  compileDrawing,
  projectOffset,
  type CompiledDrawing,
  type Solid,
  type V2,
  type V3,
} from './iso';

// ── A guitar, ready to draw ────────────────────────────────────────────────
// The model's outlines as page paths, once per guitar and hand. A left-handed
// guitar is the right-handed one mirrored across its long axis: its parts
// really are on the other side, so it is rebuilt, not flipped on the page.

export interface CompiledPart {
  id: string;
  /** One per solid if they overlap, else one for the whole part. */
  layers: readonly CompiledDrawing[];
  features: Readonly<Record<string, string>>;
  explode: V3;
  /** Its reach on the page, assembled. */
  box: Box;
  hitPad: number;
  lineWeight: number;
  tone?: 'light';
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CompiledModel {
  kind: ModelKind;
  label: string;
  noun: string;
  maxZoom?: number;
  familyOrder?: readonly TermFamily[];
  accent: string;
  parts: readonly CompiledPart[];
  partById: Readonly<Record<string, CompiledPart>>;
  terms: readonly TermDef[];
  termById: Readonly<Record<string, TermDef>>;
  /** The word for each part, when it is pressed: its smallest term. */
  termOfPart: Readonly<Record<string, string>>;
  buildOrder: readonly BuildStep[];
  /** The page's frame: holds every pose the lesson can reach. */
  view: { x: number; y: number; width: number; height: number };
}

const flipV3 = ([u, v, z]: V3): V3 => [u, -v, z];
const flipV2 = ([u, v]: V2): V2 => [u, -v];

const flipSolid = (solid: Solid): Solid => ({
  ...solid,
  outer: solid.outer.map(flipV2),
  holes: solid.holes?.map((hole) => hole.map(flipV2)),
});

const flipRecord = (record: Readonly<Record<string, V3>> | undefined) =>
  record &&
  Object.fromEntries(
    Object.entries(record).map(([id, offset]) => [id, flipV3(offset)]),
  );

const flipModel = (model: InstrumentModel): InstrumentModel => ({
  ...model,
  parts: model.parts.map(
    (part): PartDef => ({
      ...part,
      solids: part.solids.map(flipSolid),
      marks: part.marks?.map((line) => line.map(flipV3)),
      features:
        part.features &&
        Object.fromEntries(
          Object.entries(part.features).map(([name, lines]) => [
            name,
            lines.map((line) => line.map(flipV3)),
          ]),
        ),
      // The strings float clear on the same side for either hand: mirrored,
      // they would land on the neck's parts.
      explode: part.id === 'strings' ? part.explode : flipV3(part.explode),
    }),
  ),
  terms: model.terms.map(
    (term): TermDef => ({
      ...term,
      lift: flipV3(term.lift),
      liftOf: flipRecord(term.liftOf),
      reveal: flipRecord(term.reveal),
      anchor: term.anchor && flipV3(term.anchor),
    }),
  ),
});

/** A model's geometry at its drawn size; its moves are in drawn units already. */
const drawnModel = (model: InstrumentModel): InstrumentModel => {
  const k = model.drawScale ?? 1;
  if (k === 1) return model;
  const v2 = ([u, v]: V2): V2 => [u * k, v * k];
  const v3 = ([u, v, z]: V3): V3 => [u * k, v * k, z * k];
  return {
    ...model,
    parts: model.parts.map(
      (part): PartDef => ({
        ...part,
        solids: part.solids.map(
          (solid): Solid => ({
            ...solid,
            outer: solid.outer.map(v2),
            holes: solid.holes?.map((hole) => hole.map(v2)),
            z0: solid.z0 * k,
            z1: solid.z1 * k,
            hatchGap: solid.hatchGap,
            face: solid.face?.map(v3),
            lathe: solid.lathe && {
              ...solid.lathe,
              origin: v3(solid.lathe.origin),
              profile: solid.lathe.profile.map(
                ([t, r, seam]): readonly [number, number, 'seam'?] =>
                  seam ? [t * k, r * k, seam] : [t * k, r * k],
              ),
              bore: solid.lathe.bore && solid.lathe.bore * k,
              from: solid.lathe.from && solid.lathe.from * k,
              to: solid.lathe.to && solid.lathe.to * k,
            },
            tilt: solid.tilt && {
              ...solid.tilt,
              axisV: solid.tilt.axisV * k,
              axisZ: solid.tilt.axisZ * k,
            },
          }),
        ),
        marks: part.marks?.map((line) => line.map(v3)),
        features:
          part.features &&
          Object.fromEntries(
            Object.entries(part.features).map(([name, lines]) => [
              name,
              lines.map((line) => line.map(v3)),
            ]),
          ),
      }),
    ),
    terms: model.terms.map(
      (term): TermDef => ({
        ...term,
        anchor: term.anchor && v3(term.anchor),
      }),
    ),
  };
};

const boxOf = (points: readonly V2[]): Box => {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    x0: Math.min(...xs),
    y0: Math.min(...ys),
    x1: Math.max(...xs),
    y1: Math.max(...ys),
  };
};

/** The lit parts' reach on the page, with an offset for each. */
export function reachOf(
  parts: readonly CompiledPart[],
  offsetOf: (id: string) => V3,
): Box {
  const box: Box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const part of parts) {
    const [dx, dy] = projectOffset(offsetOf(part.id));
    box.x0 = Math.min(box.x0, part.box.x0 + dx);
    box.y0 = Math.min(box.y0, part.box.y0 + dy);
    box.x1 = Math.max(box.x1, part.box.x1 + dx);
    box.y1 = Math.max(box.y1, part.box.y1 + dy);
  }
  return box;
}

const PADDING = 1.6;

/** One model, compiled. Takes the model itself, so a caller that wants only
 *  a few drawings doesn't load them all. */
export function compile(
  source: InstrumentModel,
  leftHanded: boolean,
): CompiledModel {
  const drawn = drawnModel(source);
  const model = leftHanded && !source.fixedHand ? flipModel(drawn) : drawn;
  const parts = model.parts.map((part): CompiledPart => {
    const whole = compileDrawing(part.solids, part.marks);
    return {
      id: part.id,
      layers: part.stacked
        ? part.solids.map((solid, i) =>
            compileDrawing(
              [solid],
              // A stacked part's marks go on its last layer, on top.
              i === part.solids.length - 1 ? part.marks : [],
            ),
          )
        : [whole],
      features: Object.fromEntries(
        Object.entries(part.features ?? {}).map(([name, lines]) => [
          name,
          compileDrawing([], lines).marks,
        ]),
      ),
      explode: part.explode,
      box: boxOf(whole.points),
      hitPad: part.hitPad ?? 0,
      lineWeight: part.lineWeight ?? 1,
      tone: part.tone,
    };
  });
  const partById = Object.fromEntries(parts.map((p) => [p.id, p]));

  const termOfPart: Record<string, string> = {};
  for (const part of parts) {
    const holders = model.terms
      .filter((term) => term.parts.includes(part.id) && !term.feature)
      .sort((a, b) => a.parts.length - b.parts.length);
    if (holders[0]) termOfPart[part.id] = holders[0].id;
  }

  // Every pose the lesson reaches: assembled, apart, and each term's.
  const reaches: Box[] = [
    reachOf(parts, () => [0, 0, 0]),
    reachOf(parts, (id) => partById[id].explode),
  ];
  for (const term of model.terms) {
    reaches.push(
      reachOf(parts, (id) => {
        if (term.parts.includes(id)) return term.liftOf?.[id] ?? term.lift;
        return term.reveal?.[id] ?? [0, 0, 0];
      }),
    );
  }
  const x0 = Math.min(...reaches.map((b) => b.x0)) - PADDING;
  const y0 = Math.min(...reaches.map((b) => b.y0)) - PADDING;
  const x1 = Math.max(...reaches.map((b) => b.x1)) + PADDING;
  const y1 = Math.max(...reaches.map((b) => b.y1)) + PADDING;

  return {
    kind: model.kind,
    label: model.label,
    noun: model.noun,
    maxZoom: model.maxZoom,
    familyOrder: model.familyOrder,
    accent: colorForKeyMode(model.accentKey),
    parts,
    partById,
    terms: model.terms,
    termById: Object.fromEntries(model.terms.map((t) => [t.id, t])),
    termOfPart,
    buildOrder: model.buildOrder,
    view: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
  };
}
