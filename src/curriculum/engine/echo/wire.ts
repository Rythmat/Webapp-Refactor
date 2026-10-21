/**
 * A call as wire data: what the teacher's computer sends every device in
 * class, so each plays and grades exactly the same call
 * (docs/echo-classroom.md, Messages §1).
 *
 * WHY DATA, NOT A SEED
 * A seed would also work, but every device would then have to be on the
 * same app version, with the same contour and rhythm libraries. The call
 * itself is small enough to send whole: a few hundred bytes.
 *
 * WHAT IT CARRIES
 *   melody   its notes (pitch, ticks, degree, label, scale position), its
 *            contour and its rhythm, as the call has them
 *   chords   its chords by bar, its strikes (bar, ticks, which voicing),
 *            and the voicings once each; the roll's notes are made again
 *            from the strikes (literacy.ts `chordNotes`), as the call made
 *            them
 * A teacher's call (taught.ts) goes the same way. Ticks are from the
 * call's own downbeat, as in calls.ts.
 *
 * `fromEchoCallWire` reads what came over the socket: anything malformed is
 * null, never a call half made. Pure, no React.
 */

import {
  LITERACY_TONICS,
  type LiteracyMode,
  type LiteracyScaleDegree,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import type { VoicedChord } from '../musicLiteracy/chords';
import { chordNotes, type ChordAttack } from '../musicLiteracy/literacy';
import type { LiteracyKey } from '../musicLiteracy/pitch';
import type { ChordCall, EchoCall, EchoNote, MelodyCall } from './calls';
import type { EchoContour } from './contours';
import type { EchoLevelNumber, EchoZeroPoint } from './levels';
import type { ChordRhythm, MelodyRhythm } from './rhythm';

/** The wire format's version: bumped if a field changes meaning. */
export const ECHO_CALL_WIRE_VERSION = 1;

interface CallWireBase {
  wire: typeof ECHO_CALL_WIRE_VERSION;
  level: EchoLevelNumber;
  key: { tonic: LiteracyTonic; mode: LiteracyMode };
  boss: boolean;
  taught?: boolean;
  bars: number;
  barTicks: number;
  tonic: number;
  tempo: number;
}

/** A melody note on the wire: its place in the list is its index. */
export interface EchoNoteWire {
  midi: number;
  onset: number;
  duration: number;
  degree: EchoNote['degree'];
  label: string;
  position: number;
}

export interface MelodyCallWire extends CallWireBase {
  kind: 'melody';
  contour: EchoContour;
  zeroPoint: EchoZeroPoint;
  rhythm: MelodyRhythm;
  notes: EchoNoteWire[];
}

/** A chord strike on the wire: its bar, its ticks, and its voicing. */
export interface ChordStrikeWire {
  bar: number;
  onset: number;
  duration: number;
  /** Index into the call's `voicings`. */
  voicing: number;
}

export interface ChordCallWire extends CallWireBase {
  kind: 'chords';
  degrees: LiteracyScaleDegree[];
  labels: string[];
  /** Every chord the call voices, once. */
  voicings: VoicedChord[];
  /** Each bar's chord, as an index into `voicings`. */
  chords: number[];
  rhythm: ChordRhythm;
  strikes: ChordStrikeWire[];
}

/** An Echo call as it travels: everything a device needs to play and grade it. */
export type EchoCallWire = MelodyCallWire | ChordCallWire;

const keyOf = (key: LiteracyKey) => ({ tonic: key.tonic, mode: key.mode });

function base(call: EchoCall): CallWireBase {
  return {
    wire: ECHO_CALL_WIRE_VERSION,
    level: call.level,
    key: keyOf(call.key),
    boss: call.boss,
    ...(call.taught ? { taught: true } : {}),
    bars: call.bars,
    barTicks: call.barTicks,
    tonic: call.tonic,
    tempo: call.tempo,
  };
}

/** The same voicing: the same chord on the same keys. */
const sameVoicing = (a: VoicedChord, b: VoicedChord) =>
  a.degree === b.degree &&
  a.label === b.label &&
  a.midis.length === b.midis.length &&
  a.midis.every((m, i) => m === b.midis[i]);

/** A call as wire data (above). */
export function toEchoCallWire(call: EchoCall): EchoCallWire {
  if (call.kind === 'melody') {
    return {
      ...base(call),
      kind: 'melody',
      contour: call.contour,
      zeroPoint: call.zeroPoint,
      rhythm: call.rhythm,
      notes: call.notes.map((n) => ({
        midi: n.midi,
        onset: n.onset,
        duration: n.duration,
        degree: n.degree,
        label: n.label,
        position: n.position,
      })),
    };
  }
  const voicings: VoicedChord[] = [];
  const indexOf = (chord: VoicedChord) => {
    const at = voicings.findIndex((v) => sameVoicing(v, chord));
    if (at !== -1) return at;
    voicings.push(chord);
    return voicings.length - 1;
  };
  const chords = call.chords.map(indexOf);
  const strikes = call.attacks.map((a) => ({
    bar: a.bar,
    onset: a.onset,
    duration: a.duration,
    voicing: indexOf(a.chord),
  }));
  return {
    ...base(call),
    kind: 'chords',
    degrees: [...call.degrees],
    labels: [...call.labels],
    voicings,
    chords,
    rhythm: call.rhythm,
    strikes,
  };
}

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

/** The fields every call has, read; null if any is wrong. */
function readBase(wire: Record<string, unknown>): CallWireBase | null {
  const key = wire.key;
  if (
    wire.wire !== ECHO_CALL_WIRE_VERSION ||
    ![1, 2, 3].includes(wire.level as number) ||
    !isObject(key) ||
    !(LITERACY_TONICS as readonly unknown[]).includes(key.tonic) ||
    (key.mode !== 'major' && key.mode !== 'minor') ||
    !isNumber(wire.bars) ||
    !isNumber(wire.barTicks) ||
    !isNumber(wire.tonic) ||
    !isNumber(wire.tempo)
  ) {
    return null;
  }
  return wire as unknown as CallWireBase;
}

function callBase(wire: CallWireBase) {
  return {
    level: wire.level,
    key: { tonic: wire.key.tonic, mode: wire.key.mode },
    boss: !!wire.boss,
    ...(wire.taught ? { taught: true } : {}),
    bars: wire.bars,
    barTicks: wire.barTicks,
    tonic: wire.tonic,
    tempo: wire.tempo,
  };
}

const isNoteWire = (n: unknown): n is EchoNoteWire =>
  isObject(n) &&
  isNumber(n.midi) &&
  isNumber(n.onset) &&
  isNumber(n.duration) &&
  isNumber(n.position) &&
  typeof n.degree === 'string' &&
  typeof n.label === 'string';

function readMelody(
  wire: Record<string, unknown>,
  head: CallWireBase,
): MelodyCall | null {
  const { notes, contour, rhythm } = wire;
  if (
    !Array.isArray(notes) ||
    !notes.every(isNoteWire) ||
    !isObject(contour) ||
    !isObject(rhythm) ||
    ![1, 3, 5].includes(wire.zeroPoint as number)
  ) {
    return null;
  }
  return {
    ...callBase(head),
    kind: 'melody',
    contour: contour as unknown as EchoContour,
    zeroPoint: wire.zeroPoint as EchoZeroPoint,
    rhythm: rhythm as unknown as MelodyRhythm,
    notes: notes.map(
      (n, index): EchoNote => ({
        midi: n.midi,
        onset: n.onset,
        duration: n.duration,
        degree: n.degree,
        label: n.label,
        position: n.position,
        index,
      }),
    ),
  };
}

const isVoicing = (v: unknown): v is VoicedChord =>
  isObject(v) &&
  Array.isArray(v.midis) &&
  v.midis.every(isNumber) &&
  Array.isArray(v.pitchClasses) &&
  typeof v.label === 'string';

function readChords(
  wire: Record<string, unknown>,
  head: CallWireBase,
): ChordCall | null {
  const { voicings, chords, strikes, degrees, labels, rhythm } = wire;
  if (
    !Array.isArray(voicings) ||
    !voicings.every(isVoicing) ||
    !Array.isArray(chords) ||
    !Array.isArray(strikes) ||
    !Array.isArray(degrees) ||
    !Array.isArray(labels) ||
    !isObject(rhythm)
  ) {
    return null;
  }
  const voicing = (i: unknown) =>
    isNumber(i) && i >= 0 && i < voicings.length ? voicings[i] : null;
  const bars = chords.map(voicing);
  if (bars.some((c) => c === null)) return null;
  const attacks: ChordAttack[] = [];
  for (const [index, s] of strikes.entries()) {
    const chord = isObject(s) ? voicing(s.voicing) : null;
    if (
      !chord ||
      !isObject(s) ||
      !isNumber(s.bar) ||
      !isNumber(s.onset) ||
      !isNumber(s.duration)
    ) {
      return null;
    }
    attacks.push({
      index,
      bar: s.bar,
      onset: s.onset,
      duration: s.duration,
      chord,
    });
  }
  return {
    ...callBase(head),
    kind: 'chords',
    degrees: degrees as LiteracyScaleDegree[],
    labels: labels as string[],
    chords: bars as VoicedChord[],
    rhythm: rhythm as unknown as ChordRhythm,
    attacks,
    notes: chordNotes(attacks, head.tonic),
  };
}

/** A call read off the wire; null if it isn't one this version can play. */
export function fromEchoCallWire(wire: unknown): EchoCall | null {
  if (!isObject(wire)) return null;
  const head = readBase(wire);
  if (!head) return null;
  if (wire.kind === 'melody') return readMelody(wire, head);
  if (wire.kind === 'chords') return readChords(wire, head);
  return null;
}
