import { GM_PROGRAMS, type GMCategory } from '@/daw/instruments/gmPrograms';
import type {
  InstrumentType,
  NotationStaffSetting,
  Track,
} from '@/daw/store/tracksSlice';
import { guessTrackRole, type DawTrackRole } from '@/daw/utils/trackRole';

// ── Which staff each part is written on ────────────────────────────────────
// A part's staff comes from what plays it, never from its notes, so writing
// notes can't flip a staff from treble to bass or into a grand staff halfway
// through. Keyboards read a grand staff, drums a drum staff, the viola the
// alto clef, and most of the rest treble clef. Bass guitars, the double bass
// and synth basses read the bass clef with a small 8 under it ('bass8vb'):
// written an octave above where they sound, as players read them, so a bass
// line sits in the staff instead of under it on ledger lines. The other
// low instruments — cello, trombone, tuba, bassoon, timpani, baritone sax —
// sound where they are written, on the plain bass clef. A part written far
// off its staff takes ledger lines; a grand staff shares its notes between
// its two staves by the usual split (staffSplit.ts).
//
// Each part may also be set by hand (the track's `notationStaff`), from the
// Score's parts panel or by clicking a part's name on the page. A setting
// made by hand goes when the track changes instrument (instrumentChanges),
// so the new one starts on its own staff, as in MuseScore. In order:
//
//   1. A drum kit: a drum-machine track, or a track whose role is set to
//      Drums (as an imported MIDI drum part's is, from its name). Its notes
//      name drums, not pitches, so it is always the drum staff.
//   2. The part's own setting, when it isn't Auto.
//   3. The instrument: INSTRUMENT_STAFF, with a General MIDI track's program
//      (GM_FAMILY_STAFF, GM_PROGRAM_STAFF) and a synth or keyboard patch
//      whose name says what it plays (FACTORY_PATCH_STAFF, PATCH_WORDS).
//   4. The track's role (ROLE_STAFF): the one set in its header, else the one
//      its name suggests — an Oracle Synth track called "Bass" reads bass.
//   5. Treble clef.
//
// The tables below are the rule: adjust them, not the code. Only the Studio's
// Score and Lead Sheet read them; Learn's staves have rules of their own.

/**
 * A staff a part may be set to by hand. 'bass8vb': the bass clef with a
 * small 8 under it, written an octave above the pitch it sounds.
 */
export type PitchedStaff = 'treble' | 'alto' | 'bass' | 'bass8vb' | 'grand';
/** The staff a part is written on. */
export type PartStaff = PitchedStaff | 'percussion';

/**
 * Each Studio instrument's staff. 'program': a General MIDI track, read by
 * its program (below). null: the instrument says nothing by itself — a synth
 * or a sampler can be anything — so its patch's name or the track's role
 * decides.
 *
 * A sampled instrument (a sound named 'sample:<id>', sampleInstruments.ts)
 * is not a track instrument: a track made from one plays its family's
 * stand-in (trackSound.ts), so a sampled bass reads bass clef, a guitar
 * treble, strings and keys a grand staff and horns treble.
 */
export const INSTRUMENT_STAFF: Readonly<
  Record<InstrumentType, PartStaff | 'program' | null>
> = {
  'piano-sampler': 'grand',
  'electric-piano': 'grand',
  organ: 'grand',
  'tonewheel-organ': 'grand',
  'bass-electric': 'bass8vb',
  cello: 'bass',
  'guitar-acoustic': 'treble',
  'drum-machine': 'percussion',
  soundfont: 'program',
  'oracle-synth': null,
  sampler: null, // Chops: a one-shot sample played across the keys
  'guitar-fx': 'treble',
  'bass-fx': 'bass8vb',
  'vocal-fx': 'treble',
  none: null,
};

/** What each instrument is called, for saying why Auto chose its staff. */
const INSTRUMENT_NAME: Readonly<Partial<Record<InstrumentType, string>>> = {
  'piano-sampler': 'Piano',
  'electric-piano': 'Electric piano',
  organ: 'Organ',
  'tonewheel-organ': 'Organ',
  'bass-electric': 'Bass guitar',
  cello: 'Cello',
  'guitar-acoustic': 'Acoustic guitar',
  'drum-machine': 'Drum kit',
  'guitar-fx': 'Guitar',
  'bass-fx': 'Bass',
  'vocal-fx': 'Voice',
};

/**
 * The 16 General MIDI families of eight programs each, and the staff each
 * is written on. A program written otherwise is in GM_PROGRAM_STAFF.
 */
export const GM_FAMILY_STAFF: Readonly<Record<GMCategory, PartStaff>> = {
  Piano: 'grand', // 0–7, harpsichord and clavinet too
  'Chromatic Perc': 'treble', // 8–15: glockenspiel, vibraphone, xylophone…
  Organ: 'grand', // 16–23, accordions too
  Guitar: 'treble', // 24–31
  Bass: 'bass8vb', // 32–39, synth basses too: written an octave up
  Strings: 'treble', // 40–47: the violin; the rest below
  Ensemble: 'grand', // 48–55: string sections, synth strings, choirs
  Brass: 'treble', // 56–63: trumpet, horn, sections; trombone and tuba below
  Reed: 'treble', // 64–71: saxes, oboe, clarinet; bassoon below
  Pipe: 'treble', // 72–79
  'Synth Lead': 'treble', // 80–87
  'Synth Pad': 'grand', // 88–95: chords held on a keyboard
  'Synth FX': 'treble', // 96–103
  Ethnic: 'treble', // 104–111
  Percussive: 'percussion', // 112–119: agogo, woodblock, taiko, toms…
  'Sound FX': 'treble', // 120–127
};

/** General MIDI programs written on another staff than their family's. */
export const GM_PROGRAM_STAFF: Readonly<Partial<Record<number, PartStaff>>> = {
  8: 'grand', // Celesta
  12: 'grand', // Marimba
  22: 'treble', // Harmonica
  41: 'alto', // Viola
  42: 'bass', // Cello: written where it sounds
  43: 'bass8vb', // Contrabass: written an octave up, like a bass guitar
  44: 'grand', // Tremolo Strings: a section
  45: 'grand', // Pizzicato Strings: a section
  46: 'grand', // Orchestral Harp
  47: 'bass', // Timpani
  55: 'treble', // Orchestra Hit
  57: 'bass', // Trombone
  58: 'bass', // Tuba
  67: 'bass', // Baritone Sax: written at pitch, it sits in bass clef
  70: 'bass', // Bassoon
  87: 'bass', // Lead 8 (bass + lead): a lead, written where it sounds
  112: 'treble', // Tinkle Bell: pitched
  114: 'treble', // Steel Drums: pitched
};

/**
 * Instruments a patch name can say more about: a synth, which is whatever
 * its patch is, and the keyboards, whose preset may name a bass or a lead
 * ('808 Sub Bass', 'Analog Lead').
 */
const PATCH_NAMED: ReadonlySet<InstrumentType> = new Set<InstrumentType>([
  'oracle-synth',
  'piano-sampler',
  'electric-piano',
  'organ',
  'tonewheel-organ',
]);

/**
 * The Oracle Synth's factory patches (factoryPresets.ts), by what they play.
 * INITIALIZE, DRIFT (an ambient texture) and STAB say nothing, so the
 * track's role decides.
 */
export const FACTORY_PATCH_STAFF: Readonly<Record<string, PitchedStaff>> = {
  BASS: 'bass8vb', // a synth bass, read as a bass guitar is
  WOBBLE: 'bass8vb',
  PAD: 'grand',
  CHORDS: 'grand',
  TRANCE: 'grand', // a gated pad
  LEAD: 'treble',
  PLUCK: 'treble',
  SEQUENCE: 'treble',
};

/**
 * Words in any other patch name (a Music Atlas patch, a keyboard preset)
 * that say what it plays; the first that matches wins. A kit's name says
 * nothing about pitch, so it leaves the choice to the instrument or role.
 */
export const PATCH_WORDS: ReadonlyArray<
  readonly [words: RegExp, staff: PitchedStaff | null]
> = [
  [/\b(kit|drums?|percussion|bongos|congas|shaker|tambourine)\b/i, null],
  [/\b(bass|sub|808|wobble)\b/i, 'bass8vb'],
  [/\b(lead|pluck|arp|sequence)\b/i, 'treble'],
  [
    /\b(pads?|chords?|keys|piano|rhodes|wurlitzer|organ|strings|choir)\b/i,
    'grand',
  ],
];

/**
 * The staff a track's role reads in, when its instrument says nothing: a
 * synth or a sampler playing the bass line is a synth bass.
 */
export const ROLE_STAFF: Readonly<Record<DawTrackRole, PartStaff>> = {
  bass: 'bass8vb',
  drums: 'percussion',
  chords: 'grand',
  melody: 'treble',
  auto: 'treble',
};

/** How each staff is named in the Score's controls: 'Auto (Alto clef)'. */
export const STAFF_LABEL: Readonly<Record<PartStaff, string>> = {
  treble: 'Treble clef',
  alto: 'Alto clef',
  bass: 'Bass clef',
  bass8vb: 'Bass clef 8vb',
  grand: 'Grand staff',
  percussion: 'Drum staff',
};

/**
 * A staff as a choice, and in the tooltips, said in full where the name
 * alone leaves a teacher guessing: what the 8 under the clef does.
 */
export const STAFF_CHOICE: Readonly<Record<PartStaff, string>> = {
  ...STAFF_LABEL,
  bass8vb: 'Bass clef 8vb (sounds an octave lower)',
};

/** The staves a part may be set to by hand, in menu order: high to low. */
export const PITCHED_STAVES: readonly PitchedStaff[] = [
  'treble',
  'alto',
  'bass',
  'bass8vb',
  'grand',
];

// ── The rule ───────────────────────────────────────────────────────────────

/** What of a track the rule reads. */
export type StaffTrack = Pick<
  Track,
  'name' | 'instrument' | 'gmProgram' | 'presetName' | 'trackRole'
> &
  Partial<Pick<Track, 'notationStaff'>>;

export interface StaffChoice {
  staff: PartStaff;
  /**
   * What decided it, to finish 'Auto: Bass clef, …': 'for Cello', 'for the
   * BASS patch', 'for the Bass role'.
   */
  because: string;
}

/**
 * A drum kit: a drum-machine track, or a track given the Drums role (an
 * imported MIDI drum part plays on a synth). Its notes name drums, not
 * pitches, so it is always written on a drum staff and can't be set to
 * another.
 */
export function isKit(track: StaffTrack): boolean {
  return track.instrument === 'drum-machine' || track.trackRole === 'drums';
}

/** What a patch's name says it plays, or null when it says nothing. */
export function patchStaff(name: string | undefined): PitchedStaff | null {
  if (!name) return null;
  const factory = FACTORY_PATCH_STAFF[name.trim().toUpperCase()];
  if (factory) return factory;
  for (const [words, staff] of PATCH_WORDS) {
    if (words.test(name)) return staff;
  }
  return null;
}

/** A General MIDI program's staff, and its name. */
function programStaff(program: number | undefined): StaffChoice {
  const gm = GM_PROGRAMS[program ?? 0] ?? GM_PROGRAMS[0];
  return {
    staff:
      GM_PROGRAM_STAFF[gm.number] ??
      GM_FAMILY_STAFF[gm.category as GMCategory] ??
      'treble',
    because: `for ${gm.name}`,
  };
}

/** The staff the instrument alone says, or null when it says nothing. */
function instrumentStaff(track: StaffTrack): StaffChoice | null {
  if (PATCH_NAMED.has(track.instrument)) {
    const staff = patchStaff(track.presetName);
    if (staff) return { staff, because: `for the ${track.presetName} patch` };
  }
  const rule = INSTRUMENT_STAFF[track.instrument] ?? null;
  if (rule === 'program') return programStaff(track.gmProgram);
  if (rule === null) return null;
  return {
    staff: rule,
    because: `for ${INSTRUMENT_NAME[track.instrument] ?? track.instrument}`,
  };
}

const ROLE_NAME: Readonly<Record<DawTrackRole, string>> = {
  bass: 'Bass',
  drums: 'Drums',
  chords: 'Chords',
  melody: 'Melody',
  auto: 'Auto',
};

/**
 * The staff Auto writes a part on: the kit's, the instrument's, the role's,
 * else treble clef (steps 1 and 3–5 at the top).
 */
export function autoStaff(track: StaffTrack): StaffChoice {
  if (isKit(track)) {
    return {
      staff: 'percussion',
      because:
        track.instrument === 'drum-machine'
          ? 'for a drum kit'
          : 'for the Drums role',
    };
  }
  const fromInstrument = instrumentStaff(track);
  if (fromInstrument) return fromInstrument;
  const role =
    !track.trackRole || track.trackRole === 'auto'
      ? guessTrackRole(track.name, track.instrument)
      : track.trackRole;
  if (role !== 'auto') {
    return {
      staff: ROLE_STAFF[role],
      because: `for the ${ROLE_NAME[role]} role`,
    };
  }
  return { staff: 'treble', because: 'with nothing else to go by' };
}

/** The staff a part is written on: its own setting, else Auto's. */
export function partStaff(track: StaffTrack): StaffChoice {
  const setting = track.notationStaff;
  if (!isKit(track) && setting && setting !== 'auto') {
    return { staff: setting, because: 'as set by hand' };
  }
  return autoStaff(track);
}

// ── The part's control ─────────────────────────────────────────────────────

/** What a part's staff control shows. */
export interface PartStaffState {
  /** Its setting: Auto unless set by hand. */
  setting: NotationStaffSetting;
  /** The staff Auto writes it on, and why. */
  auto: StaffChoice;
  /** A drum kit: always the drum staff, with nothing to choose. */
  kit: boolean;
}

export function partStaffState(track: StaffTrack): PartStaffState {
  const kit = isKit(track);
  return {
    setting: kit ? 'auto' : (track.notationStaff ?? 'auto'),
    auto: autoStaff(track),
    kit,
  };
}

/** What Auto is called in the control: 'Auto (Grand staff)'. */
export function autoLabel(state: PartStaffState): string {
  return `Auto (${STAFF_LABEL[state.auto.staff]})`;
}

/** The choices a part's control offers, Auto first. */
export function staffOptions(
  state: PartStaffState,
): Array<{ value: NotationStaffSetting; label: string }> {
  return [
    { value: 'auto', label: autoLabel(state) },
    ...PITCHED_STAVES.map((staff) => ({
      value: staff,
      label: STAFF_CHOICE[staff],
    })),
  ];
}

/** Whether a choice from a control is a setting a part can have. */
export function isStaffSetting(value: string): value is NotationStaffSetting {
  return value === 'auto' || (PITCHED_STAVES as string[]).includes(value);
}

/**
 * What the control says Auto does and why, for its tooltip: 'Auto: Bass
 * clef, for Cello'.
 */
export function autoHint(state: PartStaffState): string {
  return state.kit
    ? 'A drum kit is always written on a drum staff'
    : `Auto: ${STAFF_CHOICE[state.auto.staff]}, ${state.auto.because}`;
}

/**
 * The part's staff and why, for the tooltip on its name: 'Auto: Bass clef,
 * for Cello' or 'Treble clef, set by hand'.
 */
export function staffSummary(state: PartStaffState): string {
  if (state.kit || state.setting === 'auto') return autoHint(state);
  return `${STAFF_CHOICE[state.setting]}, set by hand`;
}

/**
 * The setting as a track keeps it: Auto is no setting at all, so a part set
 * back to Auto saves exactly as one never set.
 */
export function storedSetting(
  setting: NotationStaffSetting,
): PitchedStaff | undefined {
  return setting === 'auto' ? undefined : setting;
}

// ── A new instrument ───────────────────────────────────────────────────────

/**
 * Whether an edit to a track changes what plays it, so a staff set by hand
 * goes back to Auto and the part reads the new instrument's (MuseScore does
 * the same on a change of instrument): another Studio instrument, another
 * General MIDI program, or another patch that plays something else — a bass
 * patch for a pad. A patch of the same kind (one lead for another), or an
 * edit that sets the staff itself, keeps it. The store applies it in
 * updateTrack, in the same write, so one undo puts back both.
 */
export function instrumentChanges(
  track: StaffTrack,
  updates: Partial<Track>,
): boolean {
  if ('notationStaff' in updates) return false;
  const differs = <K extends 'instrument' | 'gmProgram' | 'presetName'>(
    key: K,
  ) => key in updates && updates[key] !== track[key];
  if (differs('instrument') || differs('gmProgram')) return true;
  return (
    differs('presetName') &&
    patchStaff(updates.presetName) !== patchStaff(track.presetName)
  );
}
