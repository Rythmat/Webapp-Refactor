// ── A rig, as data ─────────────────────────────────────────────────────────
// Gear with typed jacks, and the cables between them. Each piece of gear says
// how signal moves through it as a table of routes (gearDefs.ts). The trace
// (traceSignal.ts) reads that table for the rules and the audio graph
// (audio/rigAudio.ts) reads the same table for the sound, so the two can't
// disagree.

export type CableKind =
  | 'xlr'
  | 'ts'
  | 'trs'
  | 'usb'
  | 'midi'
  | 'speakon'
  | 'iec'
  | 'multicore';

export type SignalDomain =
  | 'mic'
  | 'instrument'
  | 'line'
  | 'midi'
  | 'digital'
  | 'power';

export type GearKind =
  | 'dynamicMic'
  | 'condenserMic'
  | 'guitar'
  | 'bass'
  | 'drumKit'
  | 'midiKeyboard'
  | 'speaker'
  | 'wedge'
  | 'monitor'
  | 'headphones'
  | 'amp'
  | 'compressor'
  | 'overdrive'
  | 'delay'
  | 'interface'
  | 'laptop'
  | 'mixer'
  | 'stageBox'
  | 'di'
  | 'powerStrip';

export type PortDirection = 'in' | 'out' | 'duplex';

export interface PortDef {
  id: string;
  /** "Channel 1 input", as read aloud and on the jack's label. */
  label: string;
  dir: PortDirection;
  accepts: readonly CableKind[];
  domain: SignalDomain;
  /** A multicore's channels; `${id}#${lane}` are its endpoints, from 1. */
  lanes?: number;
}

export type ControlValue = number | string;

export interface KnobDef {
  type: 'knob';
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  initial: number;
}

export interface SwitchDef {
  type: 'switch';
  id: string;
  label: string;
  options: readonly { value: string; label: string }[];
  initial: string;
}

export type ControlDef = KnobDef | SwitchDef;

/** What a route does beyond a gain. Real processors, in audio/fx.ts. */
export type FxKind =
  | 'compressor'
  | 'overdrive'
  | 'delay'
  | 'ampDrive'
  | 'cabinet'
  | 'tinySpeaker'
  | 'latency';

/** A stretch of signal path inside a piece of gear. */
export interface Route {
  id: string;
  from: string;
  to: string;
  /** −Infinity is silence. */
  gainDb: number;
  /** Past full scale, this stage clips. */
  clips?: boolean;
  /** The stage's own hiss, joining after this route's gain. */
  noiseDb?: number;
  /** Mains hum joining here (a ground loop). */
  humDb?: number;
  fx?: FxKind;
  /** A processor out of the path: its bypass switch. */
  fxBypassed?: boolean;
  /** The fx's settings. */
  fxParams?: Readonly<Record<string, number>>;
  /** Carries note data rather than sound. */
  midi?: boolean;
}

export type SourceName =
  | 'vox'
  | 'guitar'
  | 'bass'
  | 'kick'
  | 'snare'
  | 'hat'
  | 'tom'
  | 'overhead'
  | 'keys';

/** Sound, or note data, starting at an endpoint of the gear. */
export interface GearSource {
  at: string;
  source: SourceName | 'notes';
  levelDb: number;
  /** A condenser: silent unless its input sends 48V. */
  needsPhantom?: { port: string };
  /** A software instrument: silent unless notes reach this endpoint. */
  needsNotesAt?: string;
}

/** Where the signal becomes air. */
export interface GearSink {
  id: string;
  at: string;
  /** What's heard from front of house, and from the stage. */
  foh: number;
  stage: number;
}

export interface GearDef {
  kind: GearKind;
  name: string;
  /** One line on what it does, shown when it is chosen or inspected. */
  blurb: string;
  ports: readonly PortDef[];
  controls: readonly ControlDef[];
  routes: (gear: GearInstance, env: RigEnv) => readonly Route[];
  sources?: (gear: GearInstance) => readonly GearSource[];
  sinks?: (gear: GearInstance) => readonly GearSink[];
  /** The port that sends phantom power to a mic plugged into it. */
  phantom?: (gear: GearInstance, port: string) => boolean;
  /** Does it have a mains cord, in a rig where power is part of the job? */
  hasPower?: boolean;
}

export interface GearInstance {
  id: string;
  kind: GearKind;
  /** Its own name, where a rig has two of a kind. */
  name?: string;
  /** Mixer channels. */
  channels?: number;
  /** On the bench; else on the shelf, not yet chosen. */
  placed: boolean;
  controls: Readonly<Record<string, ControlValue>>;
}

export interface PortRef {
  gear: string;
  port: string;
}

export interface Cable {
  id: string;
  kind: CableKind;
  a: PortRef;
  b: PortRef;
}

/** The room the rig is in. */
export interface RigEnv {
  /** Gear far from the rest: any cable from these to the others is a long run. */
  farGear?: readonly string[];
  /** Two power circuits: the DI hums unless its ground is lifted. */
  groundLoop?: boolean;
  /** Mains cords and power switches are part of this job. */
  managedPower?: boolean;
  /** The hiss a preamp adds, in dBFS; low for most jobs, so it isn't a nag. */
  noiseFloorDb?: number;
  /** Where the student is standing. */
  listen?: 'foh' | 'stage';
}

export interface RigState {
  gear: Readonly<Record<string, GearInstance>>;
  cables: readonly Cable[];
  env: RigEnv;
}

/** A cable's one-way connection between two endpoints. */
export interface CableEdge {
  cable: string;
  fromGear: string;
  from: string;
  toGear: string;
  to: string;
  midi: boolean;
}

export const dbToGain = (db: number) =>
  db === -Infinity ? 0 : Math.pow(10, db / 20);

export const gainToDb = (gain: number) =>
  gain <= 0 ? -Infinity : 20 * Math.log10(gain);
