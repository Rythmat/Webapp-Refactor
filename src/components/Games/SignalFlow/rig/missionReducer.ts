import { CABLE_NAME, gearDef, portOf } from './gearDefs';
import type {
  Cable,
  CableKind,
  ControlValue,
  GearInstance,
  PortRef,
  RigEnv,
  RigState,
} from './rigTypes';
import { traceSignal, wouldLoop, type RigTrace } from './traceSignal';

// ── A mission, being played ────────────────────────────────────────────────
// Pure, so every mission's solution can be played in a test. A mission is a
// list of steps; each has a goal, checked after every action, or on request
// where the student should decide when it sounds right.

export interface CheckContext {
  rig: RigState;
  trace: RigTrace;
  /** The cable the student is listening to, if any. */
  probe: string | null;
  /** Every cable they've listened to in this step. */
  probed: ReadonlySet<string>;
  /** A thump since the rig was last fully off. */
  thumped: boolean;
}

export interface RigPatch {
  controls?: Readonly<Record<string, Readonly<Record<string, ControlValue>>>>;
  env?: Partial<RigEnv>;
  /** Cables to add. */
  cables?: readonly Cable[];
  /** Cables to pull, by id. */
  remove?: readonly string[];
  /** Gear to bring onto the bench. */
  place?: readonly string[];
}

export interface MissionStep {
  prompt: string;
  /** What changes on the bench as this step begins. */
  setup?: RigPatch;
  /** Which controls the panel offers. */
  controls?: readonly { gear: string; ids: readonly string[] }[];
  /** Gear on the shelf to choose from, if choosing is this step's job. */
  choose?: { needed: readonly string[] };
  /** Pedals can trade places in this step. */
  swappable?: readonly string[];
  /** The student can walk between front of house and the stage. */
  walkable?: boolean;
  /** On-screen keys to play. */
  keys?: boolean;
  /** Cables on the rack, if different from the mission's. */
  rack?: readonly CableKind[];
  check: (context: CheckContext) => boolean;
  /** Checked only when pressed, with this label. */
  confirm?: string;
  /** Why not yet, when a confirm is pressed too early. */
  nudge?: (context: CheckContext) => string;
  /** The next thing to try. */
  hint: string;
  /** What it taught, shown as the step clears. */
  learned?: string;
}

export interface Mission {
  id: string;
  chapter: number;
  activity: 'build' | 'probe' | 'dial' | 'order' | 'fix';
  title: string;
  brief: string;
  rig: () => RigState;
  rack: readonly CableKind[];
  steps: readonly MissionStep[];
  /** After the last step: why it sounded the way it did. */
  why: string;
  /** Where each piece of gear sits on the bench. */
  layout: Readonly<Record<string, { x: number; y: number; scale?: number }>>;
  /** The keys wait for the student's hands, rather than playing the loop. */
  handKeys?: boolean;
  /** The channel list a stage works from. */
  inputList?: readonly string[];
}

export interface MissionState {
  mission: Mission;
  rig: RigState;
  trace: RigTrace;
  step: number;
  won: boolean;
  /** Earlier rigs, for Undo. */
  history: readonly RigState[];
  /** The cable in hand. */
  cable: CableKind | null;
  /** The first end, plugged, waiting for the second. */
  pending: PortRef | null;
  probe: string | null;
  probed: ReadonlySet<string>;
  mistakes: number;
  hints: number;
  /** A swap in progress: the first pedal. */
  swapping: string | null;
  thumped: boolean;
  /** Bumps per thump, for the audio. */
  thumpNonce: number;
  /** A jack or gear refusing a plug, with why. */
  refusal: { target: string; reason: string; nonce: number } | null;
  /** The last thing learned, shown until the next. */
  note: string | null;
  showHint: boolean;
  nextCableId: number;
}

export type MissionAction =
  | { type: 'pickCable'; cable: CableKind | null }
  | { type: 'pressPort'; port: PortRef }
  | { type: 'unplug'; cable: string }
  | { type: 'setControl'; gear: string; control: string; value: ControlValue }
  | { type: 'placeGear'; gear: string }
  | { type: 'probe'; cable: string | null }
  | { type: 'pressGear'; gear: string }
  | { type: 'walk'; to: 'foh' | 'stage' }
  | { type: 'confirm' }
  | { type: 'hint' }
  | { type: 'undo' };

const HISTORY_LIMIT = 40;

function applyPatch(rig: RigState, patch: RigPatch | undefined): RigState {
  if (!patch) return rig;
  const gear: Record<string, GearInstance> = { ...rig.gear };
  for (const id of patch.place ?? []) {
    gear[id] = { ...gear[id], placed: true };
  }
  for (const [id, controls] of Object.entries(patch.controls ?? {})) {
    gear[id] = { ...gear[id], controls: { ...gear[id].controls, ...controls } };
  }
  const removed = new Set(patch.remove ?? []);
  return {
    gear,
    env: { ...rig.env, ...patch.env },
    cables: [
      ...rig.cables.filter((cable) => !removed.has(cable.id)),
      ...(patch.cables ?? []),
    ],
  };
}

export function startMission(mission: Mission): MissionState {
  const rig = applyPatch(mission.rig(), mission.steps[0]?.setup);
  return {
    mission,
    rig,
    trace: traceSignal(rig),
    step: 0,
    won: false,
    history: [],
    cable: null,
    pending: null,
    probe: null,
    probed: new Set(),
    mistakes: 0,
    hints: 0,
    swapping: null,
    thumped: false,
    thumpNonce: 0,
    refusal: null,
    note: null,
    showHint: false,
    nextCableId: 1,
  };
}

const contextOf = (state: MissionState): CheckContext => ({
  rig: state.rig,
  trace: state.trace,
  probe: state.probe,
  probed: state.probed,
  thumped: state.thumped,
});

/** The step's goal is met: on to the next step, or the end. */
function advance(state: MissionState): MissionState {
  const current = state.mission.steps[state.step];
  const next = state.step + 1;
  const note = current.learned ?? state.note;
  if (next >= state.mission.steps.length) {
    return {
      ...state,
      won: true,
      note,
      cable: null,
      pending: null,
      refusal: null,
    };
  }
  const rig = applyPatch(state.rig, state.mission.steps[next].setup);
  return {
    ...state,
    rig,
    trace: traceSignal(rig),
    step: next,
    probed: new Set(),
    swapping: null,
    note,
    showHint: false,
    refusal: null,
  };
}

/** After any change, auto-checked goals may have been met, perhaps more than
 *  one if the next step's goal already stands. */
function settle(state: MissionState): MissionState {
  let at = state;
  let guard = at.mission.steps.length;
  while (!at.won && guard-- > 0) {
    const step = at.mission.steps[at.step];
    if (step.confirm || !step.check(contextOf(at))) break;
    at = advance(at);
  }
  return at;
}

const withRig = (state: MissionState, rig: RigState): MissionState => ({
  ...state,
  rig,
  trace: traceSignal(rig),
  history: [...state.history, state.rig].slice(-HISTORY_LIMIT),
});

const refuse = (
  state: MissionState,
  target: string,
  reason: string,
  counts = true,
): MissionState => ({
  ...state,
  mistakes: counts ? state.mistakes + 1 : state.mistakes,
  refusal: {
    target,
    reason,
    nonce: (state.refusal?.nonce ?? 0) + 1,
  },
});

/** Does this plug physically go in this jack? Why not, if not. */
export function fitProblem(
  rig: RigState,
  kind: CableKind,
  ref: PortRef,
  other: PortRef | null,
): string | null {
  const gear = rig.gear[ref.gear];
  const port = gear && portOf(gear, ref.port);
  if (!gear || !port) return 'There is no jack there.';
  const cableName = CABLE_NAME[kind];
  if (!port.accepts.includes(kind)) {
    if (kind === 'speakon') {
      return `speakON is for passive speakers, driven by a power amp. Nothing here takes one: this ${gearDef(gear).name.toLowerCase()} needs ${port.accepts.map((k) => CABLE_NAME[k]).join(' or ')}.`;
    }
    return `A ${cableName} plug won't fit the ${port.label.toLowerCase()}. It takes ${port.accepts
      .map((k) => CABLE_NAME[k])
      .join(' or ')}.`;
  }
  const taken = rig.cables.some(
    (c) =>
      (c.a.gear === ref.gear && c.a.port === ref.port) ||
      (c.b.gear === ref.gear && c.b.port === ref.port),
  );
  if (taken) {
    return 'That jack is already in use. Put the cable down, then tap the plug to pull it out.';
  }
  if (other) {
    if (other.gear === ref.gear && other.port === ref.port) {
      return 'Both ends of one cable can’t go in the same jack.';
    }
    const otherGear = rig.gear[other.gear];
    const otherPort = otherGear && portOf(otherGear, other.port);
    if (kind === 'xlr' && otherPort && port.dir === otherPort.dir) {
      // An XLR's ends differ, so this is the plug itself refusing.
      return port.dir === 'in'
        ? 'An XLR cable has one male end and one female end. Inputs are female, so it can’t join two inputs.'
        : 'An XLR cable has one male end and one female end. Outputs are male, so it can’t join two outputs.';
    }
    if (otherPort && wouldLoop(rig, other, ref)) {
      return 'That would send the signal back into itself.';
    }
  }
  return null;
}

/** The mission's own cable between these two jacks, if it's off the bench. */
function originalCable(
  state: MissionState,
  kind: CableKind,
  a: PortRef,
  b: PortRef,
): string | undefined {
  const same = (x: PortRef, y: PortRef) =>
    x.gear === y.gear && x.port === y.port;
  return state.mission
    .rig()
    .cables.find(
      (cable) =>
        cable.kind === kind &&
        ((same(cable.a, a) && same(cable.b, b)) ||
          (same(cable.a, b) && same(cable.b, a))) &&
        !state.rig.cables.some((on) => on.id === cable.id),
    )?.id;
}

function pressPort(state: MissionState, port: PortRef): MissionState {
  if (!state.cable) {
    return refuse(
      state,
      `${port.gear}/${port.port}`,
      'Pick a cable from the rack first.',
      false,
    );
  }
  const target = `${port.gear}/${port.port}`;
  const problem = fitProblem(state.rig, state.cable, port, state.pending);
  if (problem) return refuse(state, target, problem);
  if (!state.pending) {
    return { ...state, pending: port, refusal: null };
  }
  // Put back where it came from, it's the same cable, so a question about that
  // cable can still be answered.
  const returning = originalCable(state, state.cable, state.pending, port);
  const cable: Cable = {
    id: returning ?? `c${state.nextCableId}`,
    kind: state.cable,
    a: state.pending,
    b: port,
  };
  const next = withRig(state, {
    ...state.rig,
    cables: [...state.rig.cables, cable],
  });
  return settle({
    ...next,
    pending: null,
    refusal: null,
    nextCableId: returning ? state.nextCableId : state.nextCableId + 1,
  });
}

/** Trades two pedals' places in the chain, cables and all. */
function swapGear(rig: RigState, a: string, b: string): RigState {
  const trade = (ref: PortRef): PortRef => {
    if (ref.gear === a) return { ...ref, gear: b };
    if (ref.gear === b) return { ...ref, gear: a };
    return ref;
  };
  return {
    ...rig,
    cables: rig.cables.map((cable) => ({
      ...cable,
      a: trade(cable.a),
      b: trade(cable.b),
    })),
  };
}

function pressPower(
  state: MissionState,
  gear: string,
  value: ControlValue,
): { thumped: boolean; nonce: number } {
  const rig = state.rig;
  const instance = rig.gear[gear];
  const speakerLive = Object.values(rig.gear).some(
    (g) =>
      g.placed &&
      (g.kind === 'speaker' || g.kind === 'wedge' || g.kind === 'monitor') &&
      g.controls.power === 'on' &&
      g.id !== gear,
  );
  // Switching what feeds a live speaker: the transient goes straight through.
  const thump = instance.kind === 'mixer' && speakerLive;
  const after = {
    ...rig.gear,
    [gear]: { ...instance, controls: { ...instance.controls, power: value } },
  };
  const allOff = Object.values(after).every(
    (g) => !g.placed || !gearDef(g).hasPower || g.controls.power !== 'on',
  );
  return {
    thumped: allOff ? false : state.thumped || thump,
    nonce: thump ? state.thumpNonce + 1 : state.thumpNonce,
  };
}

export function missionReducer(
  state: MissionState,
  action: MissionAction,
): MissionState {
  // A finished rig can still be listened to and played with.
  if (
    state.won &&
    action.type !== 'probe' &&
    action.type !== 'setControl' &&
    action.type !== 'walk'
  ) {
    return state;
  }
  switch (action.type) {
    case 'pickCable': {
      return { ...state, cable: action.cable, pending: null, refusal: null };
    }
    case 'pressPort':
      return pressPort(state, action.port);
    case 'unplug': {
      const next = withRig(state, {
        ...state.rig,
        cables: state.rig.cables.filter((c) => c.id !== action.cable),
      });
      return settle({
        ...next,
        probe: state.probe === action.cable ? null : state.probe,
        pending: null,
        refusal: null,
      });
    }
    case 'setControl': {
      const instance = state.rig.gear[action.gear];
      if (!instance) return state;
      const rig = {
        ...state.rig,
        gear: {
          ...state.rig.gear,
          [action.gear]: {
            ...instance,
            controls: { ...instance.controls, [action.control]: action.value },
          },
        },
      };
      let thump = { thumped: state.thumped, nonce: state.thumpNonce };
      if (action.control === 'power' && rig.env.managedPower) {
        thump = pressPower(state, action.gear, action.value);
      }
      return settle({
        ...state,
        rig,
        trace: traceSignal(rig),
        thumped: thump.thumped,
        thumpNonce: thump.nonce,
        mistakes:
          thump.nonce > state.thumpNonce ? state.mistakes + 1 : state.mistakes,
      });
    }
    case 'placeGear': {
      const step = state.mission.steps[state.step];
      const instance = state.rig.gear[action.gear];
      if (!step.choose || !instance || instance.placed) return state;
      if (!step.choose.needed.includes(action.gear)) {
        return refuse(
          state,
          action.gear,
          `This job doesn’t call for the ${gearDef(instance).name.toLowerCase()}. ${gearDef(instance).blurb}`,
        );
      }
      const next = withRig(state, {
        ...state.rig,
        gear: {
          ...state.rig.gear,
          [action.gear]: { ...instance, placed: true },
        },
      });
      return settle({ ...next, refusal: null });
    }
    case 'probe': {
      if (action.cable === null) return { ...state, probe: null };
      const probed = new Set(state.probed);
      probed.add(action.cable);
      return settle({ ...state, probe: action.cable, probed, refusal: null });
    }
    case 'pressGear': {
      const step = state.mission.steps[state.step];
      if (!step.swappable?.includes(action.gear)) return state;
      if (!state.swapping) return { ...state, swapping: action.gear };
      if (state.swapping === action.gear) return { ...state, swapping: null };
      const next = withRig(
        state,
        swapGear(state.rig, state.swapping, action.gear),
      );
      return settle({ ...next, swapping: null });
    }
    case 'confirm': {
      const step = state.mission.steps[state.step];
      if (!step.confirm) return state;
      if (step.check(contextOf(state))) return settle(advance(state));
      return refuse(
        state,
        'confirm',
        step.nudge?.(contextOf(state)) ?? 'Not yet. Listen again.',
      );
    }
    case 'walk': {
      const rig = {
        ...state.rig,
        env: { ...state.rig.env, listen: action.to },
      };
      return settle({ ...state, rig, trace: traceSignal(rig) });
    }
    case 'hint':
      return state.showHint
        ? state
        : { ...state, showHint: true, hints: state.hints + 1 };
    case 'undo': {
      const previous = state.history[state.history.length - 1];
      if (!previous) return state;
      return {
        ...state,
        rig: previous,
        trace: traceSignal(previous),
        history: state.history.slice(0, -1),
        pending: null,
        refusal: null,
        swapping: null,
      };
    }
  }
}

/** What's on the rack: what the job asks for, and every kind of cable on the
 *  bench, because any plug can be pulled and must be able to go back. */
export const rackFor = (state: MissionState): CableKind[] => [
  ...new Set<CableKind>([
    ...(state.mission.steps[state.step].rack ?? state.mission.rack),
    ...state.mission.rig().cables.map((cable) => cable.kind),
    ...state.rig.cables.map((cable) => cable.kind),
  ]),
];

/** Two mistakes are part of learning; a hint or a third means try it again. */
export const clearedCleanly = (state: MissionState) =>
  state.mistakes <= 2 && state.hints === 0;
