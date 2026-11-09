import { CREST_DB, gearDef, portOf } from './gearDefs';
import {
  dbToGain,
  gainToDb,
  type Cable,
  type CableEdge,
  type GearInstance,
  type PortDef,
  type PortRef,
  type RigEnv,
  type RigState,
} from './rigTypes';

// ── Where the signal goes ──────────────────────────────────────────────────
// Pure: from a rig, the level of everything at every cable and every speaker.
// The audio graph is built from the same routes and cable edges, so this is
// what the rules read and what the speakers really do.

/** What is on a wire: each sound's level in dBFS, kept apart. */
export type Levels = Readonly<Record<string, number>>;

export const HUM = 'hum';
export const HISS = 'hiss';
const NOT_SOUND = new Set([HUM, HISS]);

/** The hum a long unbalanced run picks up, by the time it reaches the far end. */
export const LONG_RUN_HUM_DB = -40;

export interface CableTrace {
  /** Sound on it, by source. */
  levels: Levels;
  /** The musical sound on it, summed; −Infinity if none. */
  levelDb: number;
  /** Notes rather than sound. */
  notes: boolean;
  hum: boolean;
  /** No signal can get through: both ends are inputs, or both outputs. */
  dead: boolean;
  long: boolean;
}

export interface SinkTrace {
  gear: string;
  sink: string;
  levels: Levels;
  levelDb: number;
  /** With the listener's position applied. */
  heardDb: number;
  on: boolean;
}

export interface RigTrace {
  cables: Readonly<Record<string, CableTrace>>;
  sinks: readonly SinkTrace[];
  /** Stages over full scale, as `gear/route`. */
  clipped: readonly string[];
  /** Mics with their phantom power, and instruments with their notes. */
  sourcesLive: Readonly<Record<string, boolean>>;
  /** Mains-managed gear that is really on. */
  on: Readonly<Record<string, boolean>>;
}

const sum = (levels: Levels) => {
  let power = 0;
  for (const [name, db] of Object.entries(levels)) {
    if (NOT_SOUND.has(name)) continue;
    power += dbToGain(db) ** 2;
  }
  return power > 0 ? gainToDb(Math.sqrt(power)) : -Infinity;
};

const addTo = (into: Record<string, number>, name: string, db: number) => {
  if (db === -Infinity) return;
  const was = into[name];
  into[name] =
    was === undefined
      ? db
      : gainToDb(Math.sqrt(dbToGain(was) ** 2 + dbToGain(db) ** 2));
};

const placed = (rig: RigState) =>
  Object.values(rig.gear).filter((g) => g.placed);

/** Is this piece of gear running? Only in a mains job can it be otherwise. */
export function isOn(rig: RigState, gear: GearInstance): boolean {
  if (!rig.env.managedPower || !gearDef(gear).hasPower) return true;
  if (gear.controls.power !== 'on') return false;
  return rig.cables.some(
    (c) =>
      c.kind === 'iec' &&
      ((c.a.gear === gear.id && c.a.port === 'power') ||
        (c.b.gear === gear.id && c.b.port === 'power')),
  );
}

const portFor = (rig: RigState, ref: PortRef): PortDef | undefined => {
  const gear = rig.gear[ref.gear];
  return gear && portOf(gear, ref.port);
};

/** Does this cable run between the far gear and the rest? */
export function isLongRun(env: RigEnv, cable: Cable): boolean {
  const far = env.farGear ?? [];
  return far.includes(cable.a.gear) !== far.includes(cable.b.gear);
}

/** A cable's one-way connections. Two inputs, or two outputs, pass nothing. */
export function cableEdges(rig: RigState, cable: Cable): CableEdge[] {
  if (cable.kind === 'iec') return [];
  const a = portFor(rig, cable.a);
  const b = portFor(rig, cable.b);
  if (!a || !b) return [];
  const midi = a.domain === 'midi' || b.domain === 'midi';
  const edge = (
    fromRef: PortRef,
    from: string,
    toRef: PortRef,
    to: string,
  ): CableEdge => ({
    cable: cable.id,
    fromGear: fromRef.gear,
    from,
    toGear: toRef.gear,
    to,
    midi,
  });

  const sends = (port: PortDef) => port.dir === 'out' || port.dir === 'duplex';
  const takes = (port: PortDef) => port.dir === 'in' || port.dir === 'duplex';
  const outOf = (port: PortDef) =>
    port.dir === 'duplex' ? `${port.id}:out` : port.id;
  const inTo = (port: PortDef) =>
    port.dir === 'duplex' ? `${port.id}:in` : port.id;

  const edges: CableEdge[] = [];
  const connect = (
    fromRef: PortRef,
    fromPort: PortDef,
    toRef: PortRef,
    toPort: PortDef,
  ) => {
    if (!sends(fromPort) || !takes(toPort)) return;
    if (fromPort.lanes && toPort.lanes) {
      const lanes = Math.min(fromPort.lanes, toPort.lanes);
      for (let lane = 1; lane <= lanes; lane++) {
        edges.push(
          edge(
            fromRef,
            `${fromPort.id}#${lane}`,
            toRef,
            `${toPort.id}#${lane}`,
          ),
        );
      }
      return;
    }
    edges.push(edge(fromRef, outOf(fromPort), toRef, inTo(toPort)));
  };
  connect(cable.a, a, cable.b, b);
  connect(cable.b, b, cable.a, a);
  return edges;
}

export function traceSignal(rig: RigState): RigTrace {
  const gear = placed(rig);
  const on = Object.fromEntries(gear.map((g) => [g.id, isOn(rig, g)]));

  // Incoming connections to each endpoint, inside gear and along cables.
  type Incoming =
    | {
        type: 'route';
        gear: string;
        route: ReturnType<typeof routesOf>[number];
      }
    | { type: 'cable'; edge: CableEdge; cable: Cable };
  const routesOf = (g: GearInstance) => gearDef(g).routes(g, rig.env);
  const incoming = new Map<string, Incoming[]>();
  const key = (g: string, endpoint: string) => `${g}/${endpoint}`;
  const push = (k: string, item: Incoming) => {
    const list = incoming.get(k);
    if (list) list.push(item);
    else incoming.set(k, [item]);
  };
  for (const g of gear) {
    for (const route of routesOf(g)) {
      push(key(g.id, route.to), { type: 'route', gear: g.id, route });
    }
  }
  const allEdges = rig.cables.map(
    (cable) => [cable, cableEdges(rig, cable)] as const,
  );
  for (const [cable, edges] of allEdges) {
    for (const edge of edges) {
      push(key(edge.toGear, edge.to), { type: 'cable', edge, cable });
    }
  }

  // Notes first: they decide which instruments are sounding.
  const notesMemo = new Map<string, boolean>();
  const hasNotes = (g: string, endpoint: string): boolean => {
    const k = key(g, endpoint);
    const known = notesMemo.get(k);
    if (known !== undefined) return known;
    notesMemo.set(k, false);
    const instance = rig.gear[g];
    let found =
      !!instance?.placed &&
      (gearDef(instance).sources?.(instance) ?? []).some(
        (s) => s.at === endpoint && s.source === 'notes',
      );
    for (const item of incoming.get(k) ?? []) {
      if (found) break;
      if (item.type === 'cable') {
        found = item.edge.midi && hasNotes(item.edge.fromGear, item.edge.from);
      } else if (item.route.midi) {
        found = hasNotes(item.gear, item.route.from);
      }
    }
    notesMemo.set(k, found);
    return found;
  };

  const phantomAt = (g: GearInstance, port: string) => {
    const cable = rig.cables.find(
      (c) =>
        (c.a.gear === g.id && c.a.port === port) ||
        (c.b.gear === g.id && c.b.port === port),
    );
    if (!cable) return false;
    const far = cable.a.gear === g.id ? cable.b : cable.a;
    const other = rig.gear[far.gear];
    return !!other && !!gearDef(other).phantom?.(other, far.port);
  };

  const sourcesLive: Record<string, boolean> = {};
  const sourceLevels = new Map<string, Record<string, number>>();
  for (const g of gear) {
    for (const source of gearDef(g).sources?.(g) ?? []) {
      if (source.source === 'notes') continue;
      const live =
        (!source.needsPhantom || phantomAt(g, source.needsPhantom.port)) &&
        (!source.needsNotesAt || hasNotes(g.id, source.needsNotesAt));
      sourcesLive[`${g.id}/${source.at}`] = live;
      if (!live) continue;
      const k = key(g.id, source.at);
      const levels = sourceLevels.get(k) ?? {};
      addTo(levels, `${g.id}:${source.source}`, source.levelDb);
      sourceLevels.set(k, levels);
    }
  }

  const clipped = new Set<string>();
  const memo = new Map<string, Levels>();
  const levelsAt = (g: string, endpoint: string): Levels => {
    const k = key(g, endpoint);
    const known = memo.get(k);
    if (known) return known;
    // A loop reads as nothing; patching one is refused anyway.
    memo.set(k, {});
    const levels: Record<string, number> = { ...sourceLevels.get(k) };
    for (const item of incoming.get(k) ?? []) {
      if (item.type === 'cable') {
        if (item.edge.midi) continue;
        const through = levelsAtCableEnd(item.edge, item.cable);
        for (const [name, db] of Object.entries(through)) {
          addTo(levels, name, db);
        }
      } else {
        const { route } = item;
        if (route.midi) continue;
        if (!on[item.gear]) continue;
        const incomingLevels = levelsAt(item.gear, route.from);
        for (const [name, db] of Object.entries(incomingLevels)) {
          addTo(levels, name, db + route.gainDb);
        }
        const sound = sum(incomingLevels);
        if (
          route.clips &&
          route.gainDb !== -Infinity &&
          sound + route.gainDb + CREST_DB > 0
        ) {
          clipped.add(`${item.gear}/${route.id}`);
        }
        const carriesAnything = Object.keys(incomingLevels).length > 0;
        if (route.gainDb !== -Infinity) {
          if (route.noiseDb !== undefined && carriesAnything) {
            addTo(levels, HISS, route.noiseDb);
          }
          if (route.humDb !== undefined) addTo(levels, HUM, route.humDb);
        }
      }
    }
    memo.set(k, levels);
    return levels;
  };
  const levelsAtCableEnd = (edge: CableEdge, cable: Cable): Levels => {
    const levels: Record<string, number> = {
      ...levelsAt(edge.fromGear, edge.from),
    };
    if (cable.kind === 'ts' && isLongRun(rig.env, cable)) {
      addTo(levels, HUM, LONG_RUN_HUM_DB);
    }
    return levels;
  };

  const cables: Record<string, CableTrace> = {};
  for (const [cable, edges] of allEdges) {
    const levels: Record<string, number> = {};
    let notes = false;
    for (const edge of edges) {
      if (edge.midi) {
        notes = notes || hasNotes(edge.fromGear, edge.from);
        continue;
      }
      for (const [name, db] of Object.entries(levelsAtCableEnd(edge, cable))) {
        addTo(levels, name, db);
      }
    }
    cables[cable.id] = {
      levels,
      levelDb: sum(levels),
      notes,
      hum: levels[HUM] !== undefined,
      dead: cable.kind !== 'iec' && edges.length === 0,
      long: isLongRun(rig.env, cable),
    };
  }

  const listen = rig.env.listen ?? 'foh';
  const sinks: SinkTrace[] = [];
  for (const g of gear) {
    for (const sink of gearDef(g).sinks?.(g) ?? []) {
      const levels = on[g.id] ? levelsAt(g.id, sink.at) : {};
      const levelDb = sum(levels);
      sinks.push({
        gear: g.id,
        sink: sink.id,
        levels,
        levelDb,
        heardDb: levelDb + sink[listen],
        on: on[g.id],
      });
    }
  }
  // Every stage's clip check runs, heard or not.
  for (const g of gear) {
    for (const route of routesOf(g)) levelsAt(g.id, route.to);
  }

  return {
    cables,
    sinks,
    clipped: [...clipped],
    sourcesLive,
    on,
  };
}

// ── What the rules ask of a trace ──────────────────────────────────────────

/** Is this sound reaching this gear's speaker? */
export function reaches(
  trace: RigTrace,
  gear: string,
  sound: string,
  minDb = -60,
): boolean {
  return trace.sinks.some(
    (sink) =>
      sink.gear === gear &&
      Object.entries(sink.levels).some(
        ([name, db]) => name.endsWith(`:${sound}`) && db >= minDb,
      ),
  );
}

export const sinkLevel = (trace: RigTrace, gear: string): number =>
  trace.sinks.find((sink) => sink.gear === gear)?.levelDb ?? -Infinity;

/** Hiss at this speaker, in dB. */
export const sinkHiss = (trace: RigTrace, gear: string): number =>
  trace.sinks.find((sink) => sink.gear === gear)?.levels[HISS] ?? -Infinity;

export const sinkHum = (trace: RigTrace, gear: string): number =>
  trace.sinks.find((sink) => sink.gear === gear)?.levels[HUM] ?? -Infinity;

/** The gear between `from` and `to`, following signal, in order. */
export function chainFrom(rig: RigState, from: string): string[] {
  const chain = [from];
  const seen = new Set([from]);
  let at = from;
  for (;;) {
    const next = rig.cables
      .flatMap((cable) => cableEdges(rig, cable))
      .find((edge) => edge.fromGear === at && !seen.has(edge.toGear));
    if (!next) return chain;
    chain.push(next.toGear);
    seen.add(next.toGear);
    at = next.toGear;
  }
}

/** Would joining these two ends send signal back into itself? */
export function wouldLoop(rig: RigState, a: PortRef, b: PortRef): boolean {
  if (a.gear === b.gear) return true;
  const trial: RigState = {
    ...rig,
    cables: [...rig.cables, { id: '__trial', kind: 'ts', a, b }],
  };
  const trialEdges = cableEdges(trial, trial.cables[trial.cables.length - 1]);
  // USB runs both ways by design, and the gear keeps its two directions apart.
  const duplex = (ref: PortRef) => portFor(rig, ref)?.dir === 'duplex';
  if (duplex(a) || duplex(b)) return false;
  const edgesFrom = (gear: string) =>
    trial.cables
      .filter((cable) => !duplex(cable.a) && !duplex(cable.b))
      .flatMap((cable) => cableEdges(trial, cable))
      .filter((edge) => edge.fromGear === gear);
  for (const start of trialEdges) {
    const seen = new Set<string>();
    const stack = [start.toGear];
    while (stack.length) {
      const gear = stack.pop() as string;
      if (gear === start.fromGear) return true;
      if (seen.has(gear)) continue;
      seen.add(gear);
      for (const edge of edgesFrom(gear)) stack.push(edge.toGear);
    }
  }
  return false;
}
