import type { Solid, V3 } from './iso';

export type ModelKind =
  | 'electric'
  | 'acoustic'
  | 'electricBass'
  | 'acousticBass'
  | 'ukulele'
  | 'grandPiano'
  | 'uprightPiano'
  | 'keyboard'
  | 'synth';

export type AnatomyInstrument =
  | 'guitar'
  | 'bass'
  | 'ukulele'
  | 'piano'
  | 'keyboard'
  | 'synth';
export type TermFamily =
  | 'neck'
  | 'body'
  | 'hardware'
  | 'electronics'
  | 'case'
  | 'keyboard'
  | 'action'
  | 'strings'
  | 'pedals'
  | 'engine'
  | 'controls';

export const FAMILY_LABEL: Readonly<Record<TermFamily, string>> = {
  neck: 'Neck',
  body: 'Body',
  hardware: 'Hardware',
  electronics: 'Electronics',
  case: 'Case',
  keyboard: 'Keyboard',
  action: 'Action',
  strings: 'Strings & Soundboard',
  pedals: 'Pedals',
  engine: 'Sound Path',
  controls: 'Controls',
};

/** One piece of the guitar that moves: drawn, in paint order, as a unit. */
export interface PartDef {
  id: string;
  solids: readonly Solid[];
  /** Lines on its surfaces (u, v, z), drawn with its edges. */
  marks?: readonly (readonly V3[])[];
  /** Lines on its surfaces only some terms light (a sound hole's rim). */
  features?: Readonly<Record<string, readonly (readonly V3[])[]>>;
  /** Solids that overlap on the page (a knob's skirt and cap): each paints
   *  over the one before. */
  stacked?: boolean;
  /** Where it goes when the guitar comes apart. */
  explode: V3;
  /** Extra reach for a press, in inches, for the small parts. */
  hitPad?: number;
  /** How heavy its lines on surfaces are: a bass's thick strings. */
  lineWeight?: number;
  /** A light face with dark lines, not the other way round: a white key. */
  tone?: 'light';
}

/** A word in the lesson: a part, a group of parts, or a feature of one. */
export interface TermDef {
  id: string;
  name: string;
  family: TermFamily;
  /** What lights. */
  parts: readonly string[];
  /** How far they all rise when it is chosen. */
  lift: V3;
  /** A lit part's own lift, when they rise apart (a bridge a little, its
   *  saddle more). */
  liftOf?: Readonly<Record<string, V3>>;
  /** Parts that move out of the way to show it, unlit. */
  reveal?: Readonly<Record<string, V3>>;
  /** Parts drawn see-through to show it: what lifting can't clear. */
  seeThrough?: readonly string[];
  /** The feature of its parts that lights (see PartDef.features). */
  feature?: string;
  /** Where its callout points, in the guitar's space; else its parts' middle. */
  anchor?: V3;
}

/** One step of Build it: the word asked for, and the parts that go home. */
export interface BuildStep {
  term: string;
  /** Its name when it is only part of the term (Back, of Back & Sides). */
  name?: string;
  parts: readonly string[];
}

export interface InstrumentModel {
  kind: ModelKind;
  label: string;
  /** What it is, in a sentence: "an acoustic bass". */
  noun: string;
  /** Its geometry is in real inches; drawn at this size, so a small instrument
   *  fills the page and its hatching and explode distances (in drawn units)
   *  match the others'. */
  drawScale?: number;
  /** How far the camera may move in; small parts on a big instrument need
   *  more than the default. */
  maxZoom?: number;
  /** Nobody builds it mirrored, so left-handed doesn't apply. */
  fixedHand?: boolean;
  /** The key whose colour lights its parts. */
  accentKey: string;
  /** In paint order, back to front. */
  parts: readonly PartDef[];
  terms: readonly TermDef[];
  /** Build it, in the order the guitar goes together. The steps hold every
   *  part exactly once. */
  buildOrder: readonly BuildStep[];
}

/** A lesson's two instruments, and how the URL names them. */
export interface AnatomyOption {
  value: ModelKind;
  label: string;
  /** How the URL names it; else its label in lower case. */
  param?: string;
}

/** How a part is placed and drawn right now. */
export interface PartPose {
  offset: V3;
  state: 'idle' | 'lit' | 'dim' | 'seated';
  /** The feature of it that is lit. */
  feature?: string;
  /** Its faces are clear, so what's under it shows. */
  seeThrough?: boolean;
}

export type ScenePose = Readonly<Record<string, PartPose>>;

export interface SceneCamera {
  x: number;
  y: number;
  scale: number;
}
