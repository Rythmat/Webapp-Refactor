import {
  CHECK_FIELDS,
  type CheckField,
  type CheckName,
  type CheckOp,
} from '@/content/studioLessons/checkCatalog';
import type { AllSlices } from '@/daw/store';
import type { DoneMoment } from '@/daw/store/doneMomentsSlice';
import { playedThenStopped } from './studioBasics/loopAndRepeatChecks';
import { doneMomentMoved } from './studioBasics/saveAndExportChecks';
import {
  instrumentChanged,
  selectedAnotherTrack,
  switchedOff,
  switchedOn,
  trackAdded,
  type TrackSwitch,
} from './studioBasics/trackChecks';
import type { StepCheck, SynthStepCheck } from './tutorials';

// ── The ready-made checks ──────────────────────────────────────────────────
// What a lesson written in the console checks with: each name in
// content/studioLessons/checkCatalog.ts (the console's list, with its
// parameters) built here into a check over the Studio's store, the same
// shape a code lesson's `check` has. Most are what the genre pack's lessons
// check inline; the rest are Studio Basics' own helpers, by name.

type Params = Readonly<Record<string, string | number | boolean | undefined>>;

/** A built check: over the main store, or over the Oracle Synth's. */
export type BuiltCheck =
  | { check: StepCheck; synthCheck?: undefined }
  | { check?: undefined; synthCheck: SynthStepCheck };

const str = (p: Params, key: string, fallback = ''): string =>
  p[key] === undefined ? fallback : String(p[key]);

const num = (p: Params, key: string, fallback = 0): number => {
  const n = Number(p[key]);
  return Number.isFinite(n) ? n : fallback;
};

const selectedTrack = (s: AllSlices) =>
  s.tracks.find((t) => t.id === s.selectedTrackId);

const armedSelectedTrack = (s: AllSlices, armed: AllSlices) =>
  armed.tracks.find((t) => t.id === s.selectedTrackId);

const isMelodicSelected = (s: AllSlices): boolean => {
  const t = selectedTrack(s);
  return !!t && t.type === 'midi' && t.instrument !== 'drum-machine';
};

const firstClipEvents = (s: AllSlices, armed?: AllSlices): number => {
  const track = armed ? armedSelectedTrack(s, armed) : selectedTrack(s);
  return track?.midiClips[0]?.events.length ?? 0;
};

/** A field's value as the value check compares it, typed by CHECK_FIELDS. */
const fieldValue = (s: AllSlices, field: CheckField): unknown =>
  (s as unknown as Record<string, unknown>)[field];

/** The text a value check was given, as its field's kind. */
function coerce(field: CheckField, raw: string): unknown {
  const kind = CHECK_FIELDS[field];
  if (kind === 'number') return Number(raw);
  if (kind === 'boolean') return raw.trim().toLowerCase() === 'true';
  return raw;
}

function compare(a: unknown, op: CheckOp, b: unknown): boolean {
  switch (op) {
    case '=':
      return a === b;
    case '≠':
      return a !== b;
    case '>':
      return (a as number) > (b as number);
    case '≥':
      return (a as number) >= (b as number);
    case '<':
      return (a as number) < (b as number);
    case '≤':
      return (a as number) <= (b as number);
  }
}

const isField = (field: string): field is CheckField =>
  Object.prototype.hasOwnProperty.call(CHECK_FIELDS, field);

type Builder = (p: Params) => BuiltCheck | null;

const check = (fn: StepCheck): BuiltCheck => ({ check: fn });

const BUILDERS: Record<CheckName, Builder> = {
  'store.value': (p) => {
    const field = str(p, 'field');
    if (!isField(field)) return null;
    const op = str(p, 'op', '=') as CheckOp;
    const value = coerce(field, str(p, 'value'));
    const changed = p.changed === true;
    return check(
      (s, armed) =>
        compare(fieldValue(s, field), op, value) &&
        (!changed || fieldValue(s, field) !== fieldValue(armed, field)),
    );
  },
  'store.changed': (p) => {
    const field = str(p, 'field');
    if (!isField(field)) return null;
    return check(
      (s, armed) => fieldValue(s, field) !== fieldValue(armed, field),
    );
  },
  'done.moment': (p) =>
    check(doneMomentMoved(str(p, 'moment', 'save') as DoneMoment)),
  'automation.open': () => check((s) => s.automationOpenTrackId !== null),
  'automation.points': (p) => {
    const param = str(p, 'param', 'volume');
    const atLeast = num(p, 'atLeast', 2);
    return check((s) => {
      const t = s.tracks.find((tr) => tr.id === s.automationOpenTrackId);
      return (t?.automation?.[param]?.length ?? 0) >= atLeast;
    });
  },

  'prism.trackSelected': () => check(isMelodicSelected),
  'prism.chords': (p) => {
    const atLeast = num(p, 'atLeast', 3);
    return check((s) => s.chordSeq.length >= atLeast);
  },
  'prism.seventhAdded': () =>
    check(
      (s, armed) =>
        s.stringSeq.length > armed.stringSeq.length &&
        /7/.test(s.stringSeq[s.stringSeq.length - 1] ?? ''),
    ),
  // Create replaces chordRegions with a fresh array: a new, non-empty one.
  'prism.created': () =>
    check(
      (s, armed) =>
        s.chordRegions.length > 0 && s.chordRegions !== armed.chordRegions,
    ),

  'track.selectedInstrument': (p) => {
    const instrument = str(p, 'instrument');
    return check((s) => selectedTrack(s)?.instrument === instrument);
  },
  'track.anyInstrument': (p) => {
    const instrument = str(p, 'instrument');
    return check((s) => s.tracks.some((t) => t.instrument === instrument));
  },
  'track.added': () => check(trackAdded),
  'track.selectedAnother': () => check(selectedAnotherTrack),
  'track.instrumentChanged': () => check(instrumentChanged),
  'track.drumKit': (p) => {
    const kit = str(p, 'kit');
    return check((s) => (selectedTrack(s)?.drumKit ?? 'natural') === kit);
  },
  'track.notesAdded': (p) => {
    const atLeast = num(p, 'atLeast', 1);
    return check(
      (s, armed) => firstClipEvents(s) >= firstClipEvents(s, armed) + atLeast,
    );
  },
  'track.newClip': () =>
    check((s, armed) => {
      const before = new Set(
        armedSelectedTrack(s, armed)?.midiClips.map((c) => c.id) ?? [],
      );
      return (
        selectedTrack(s)?.midiClips.some((c) => !before.has(c.id)) ?? false
      );
    }),
  'track.switchedOn': (p) =>
    check(switchedOn(str(p, 'switch', 'mute') as TrackSwitch)),
  'track.switchedOff': (p) =>
    check(switchedOff(str(p, 'switch', 'mute') as TrackSwitch)),

  'effect.added': (p) => {
    const effect = str(p, 'effect');
    return check(
      (s) =>
        selectedTrack(s)?.activeEffects.includes(
          effect as (typeof s.tracks)[number]['activeEffects'][number],
        ) ?? false,
    );
  },
  'effect.changed': (p) => {
    const effect = str(p, 'effect');
    return check((s, armed) => {
      const now = selectedTrack(s)?.effects as
        | Record<string, unknown>
        | undefined;
      const before = armedSelectedTrack(s, armed)?.effects as
        | Record<string, unknown>
        | undefined;
      return !!now && !!before && now[effect] !== before[effect];
    });
  },
  'effect.paramAbove': (p) => {
    const effect = str(p, 'effect');
    const param = str(p, 'param');
    const value = num(p, 'value');
    const knob = (track: AllSlices['tracks'][number] | undefined): number => {
      const params = (track?.effects as Record<string, unknown> | undefined)?.[
        effect
      ] as Record<string, unknown> | undefined;
      const n = Number(params?.[param]);
      return Number.isFinite(n) ? n : 0;
    };
    return check((s, armed) => {
      const now = knob(selectedTrack(s));
      return now > value && now > knob(armedSelectedTrack(s, armed));
    });
  },

  'mix.volumeChanged': () =>
    check((s, armed) =>
      s.tracks.some((t) => {
        const at = armed.tracks.find((a) => a.id === t.id);
        return !!at && t.volume !== at.volume;
      }),
    ),
  'mix.sendAbove': (p) => {
    const ret = str(p, 'return', 'A');
    const value = num(p, 'value', 0.25);
    return check((s, armed) =>
      s.tracks.some((t) => {
        const before = armed.tracks.find((a) => a.id === t.id);
        const now = t.sends?.[ret] ?? 0;
        return now > value && now !== (before?.sends?.[ret] ?? 0);
      }),
    );
  },
  'mix.returnChanged': (p) => {
    const ret = str(p, 'return', 'A');
    return check((s, armed) => {
      const now = s.returns.find((r) => r.id === ret);
      const before = armed.returns.find((r) => r.id === ret);
      return !!now && !!before && now.effects !== before.effects;
    });
  },
  'mix.masterFxAdded': () =>
    check(
      (s, armed) => s.masteringFxChain.length > armed.masteringFxChain.length,
    ),

  'transport.playedThenStopped': () => check(playedThenStopped),

  'synth.preset': (p) => {
    const name = str(p, 'name');
    return { synthCheck: (synth) => synth.presetName === name };
  },
};

/** The names built here: checkRegistry.test.ts holds them to the catalog's. */
export const BUILT_CHECK_NAMES = Object.keys(BUILDERS) as CheckName[];

/**
 * A ready-made check by name, built with its parameters, or null when the
 * name is unknown or a parameter can't be used (the step then advances on
 * Next, and the console's editor flags it).
 */
export function buildNamedCheck(
  name: string,
  params: Params,
): BuiltCheck | null {
  if (!Object.prototype.hasOwnProperty.call(BUILDERS, name)) return null;
  return BUILDERS[name as CheckName](params);
}
