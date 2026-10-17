import { describe, expect, it } from 'vitest';
import { GM_CATEGORIES, GM_PROGRAMS } from '@/daw/instruments/gmPrograms';
import { trackSound } from '@/daw/instruments/trackSound';
import type { InstrumentType, Track } from '@/daw/store/tracksSlice';
import {
  autoHint,
  autoLabel,
  autoStaff,
  GM_FAMILY_STAFF,
  INSTRUMENT_STAFF,
  isKit,
  partStaff,
  partStaffState,
  patchStaff,
  staffOptions,
  staffSummary,
  storedSetting,
  type PartStaff,
  type StaffTrack,
} from './partStaff';

// ── The instrument → staff rule ────────────────────────────────────────────
// Bass instruments read bass clef, keyboards a grand staff, drums a drum
// staff, the rest mostly treble; a part's own setting beats all of it but a
// kit's drum staff.

const track = (over: Partial<Track> = {}): StaffTrack => ({
  name: 'Track 3',
  instrument: 'oracle-synth',
  trackRole: 'auto',
  ...over,
});

const staffOf = (over: Partial<Track>) => partStaff(track(over)).staff;
const program = (gmProgram: number) =>
  staffOf({ instrument: 'soundfont', gmProgram });

describe('the Studio instruments', () => {
  it.each<[InstrumentType, PartStaff]>([
    ['piano-sampler', 'grand'],
    ['electric-piano', 'grand'],
    ['organ', 'grand'],
    ['tonewheel-organ', 'grand'],
    ['bass-electric', 'bass'],
    ['cello', 'bass'],
    ['drum-machine', 'percussion'],
    ['guitar-fx', 'treble'],
    ['bass-fx', 'bass'],
    ['vocal-fx', 'treble'],
  ])('%s → %s', (instrument, staff) => {
    expect(staffOf({ instrument })).toBe(staff);
  });

  it('leaves a synth, a sampler and no instrument to the role, else treble', () => {
    for (const instrument of ['oracle-synth', 'sampler', 'none'] as const) {
      expect(INSTRUMENT_STAFF[instrument]).toBeNull();
      expect(staffOf({ instrument })).toBe('treble');
      expect(staffOf({ instrument, name: 'Bass' })).toBe('bass');
    }
  });
});

describe('General MIDI programs', () => {
  it('gives every family a staff', () => {
    expect(Object.keys(GM_FAMILY_STAFF).sort()).toEqual(
      [...GM_CATEGORIES].sort(),
    );
  });

  it.each<[string, number, PartStaff]>([
    ['Acoustic Grand Piano', 0, 'grand'],
    ['Electric Piano 1', 4, 'grand'],
    ['Harpsichord', 6, 'grand'],
    ['Celesta', 8, 'grand'],
    ['Vibraphone', 11, 'treble'],
    ['Marimba', 12, 'grand'],
    ['Drawbar Organ', 16, 'grand'],
    ['Church Organ', 19, 'grand'],
    ['Accordion', 21, 'grand'],
    ['Harmonica', 22, 'treble'],
    ['Nylon guitar', 24, 'treble'],
    ['Distortion Guitar', 30, 'treble'],
    ['Acoustic Bass', 32, 'bass'],
    ['Electric Bass (finger)', 33, 'bass'],
    ['Synth Bass 1', 38, 'bass'],
    ['Violin', 40, 'treble'],
    ['Viola', 41, 'treble'],
    ['Cello', 42, 'bass'],
    ['Contrabass', 43, 'bass'],
    ['Pizzicato Strings', 45, 'grand'],
    ['Orchestral Harp', 46, 'grand'],
    ['Timpani', 47, 'bass'],
    ['String Ensemble 1', 48, 'grand'],
    ['Synth Strings 1', 50, 'grand'],
    ['Choir Aahs', 52, 'grand'],
    ['Orchestra Hit', 55, 'treble'],
    ['Trumpet', 56, 'treble'],
    ['Trombone', 57, 'bass'],
    ['Tuba', 58, 'bass'],
    ['French Horn', 60, 'treble'],
    ['Brass Section', 61, 'treble'],
    ['Alto Sax', 65, 'treble'],
    ['Baritone Sax', 67, 'bass'],
    ['Bassoon', 70, 'bass'],
    ['Clarinet', 71, 'treble'],
    ['Flute', 73, 'treble'],
    ['Lead 1 (square)', 80, 'treble'],
    ['Lead 8 (bass + lead)', 87, 'bass'],
    ['Pad 2 (warm)', 89, 'grand'],
    ['FX 4 (atmosphere)', 99, 'treble'],
    ['Sitar', 104, 'treble'],
    ['Tinkle Bell', 112, 'treble'],
    ['Steel Drums', 114, 'treble'],
    ['Woodblock', 115, 'percussion'],
    ['Taiko Drum', 116, 'percussion'],
    ['Applause', 126, 'treble'],
  ])('%s (%i) → %s', (_name, gm, staff) => {
    expect(program(gm)).toBe(staff);
  });

  it('reads a track without a program as program 0, a piano', () => {
    expect(staffOf({ instrument: 'soundfont' })).toBe('grand');
  });

  it('says which program decided', () => {
    expect(
      autoStaff(track({ instrument: 'soundfont', gmProgram: 42 })),
    ).toEqual({ staff: 'bass', because: 'for Cello' });
    expect(GM_PROGRAMS[42].name).toBe('Cello');
  });

  it('lets the program, not the track name, decide', () => {
    // A guessed Drums role from the name doesn't make steel drums a kit.
    expect(
      staffOf({ instrument: 'soundfont', gmProgram: 114, name: 'Steel Drums' }),
    ).toBe('treble');
    expect(
      staffOf({ instrument: 'soundfont', gmProgram: 0, name: 'Bass' }),
    ).toBe('grand');
  });
});

describe('patch names', () => {
  it.each<[string, PartStaff | null]>([
    ['BASS', 'bass'],
    ['WOBBLE', 'bass'],
    ['PAD', 'grand'],
    ['CHORDS', 'grand'],
    ['TRANCE', 'grand'],
    ['LEAD', 'treble'],
    ['PLUCK', 'treble'],
    ['SEQUENCE', 'treble'],
    ['DRIFT', null],
    ['STAB', null],
    ['INITIALIZE', null],
    ['WARM KEYS', 'grand'],
    ['Deep Sub Bass', 'bass'],
    ['808 Boom', 'bass'],
    ['808 Trap Kit', null],
    ['Analog Lead', 'treble'],
    ['Choir Pad', 'grand'],
    ['Studio Grand', null],
  ])('%s → %s', (name, staff) => {
    expect(patchStaff(name)).toBe(staff);
  });

  it("reads an Oracle Synth track's patch before its role", () => {
    expect(staffOf({ presetName: 'BASS' })).toBe('bass');
    expect(staffOf({ presetName: 'PAD', name: 'Lead' })).toBe('grand');
    // A patch that says nothing leaves it to the track's name.
    expect(staffOf({ presetName: 'DRIFT', name: 'Lead' })).toBe('treble');
    expect(staffOf({ presetName: 'DRIFT', name: 'Bass' })).toBe('bass');
  });

  it('lets a keyboard preset that names a bass or a lead say so', () => {
    expect(
      staffOf({ instrument: 'piano-sampler', presetName: '808 Sub Bass' }),
    ).toBe('bass');
    expect(
      staffOf({ instrument: 'electric-piano', presetName: 'Analog Lead' }),
    ).toBe('treble');
    expect(
      staffOf({ instrument: 'electric-piano', presetName: 'Mellow EP' }),
    ).toBe('grand');
    expect(
      staffOf({ instrument: 'piano-sampler', presetName: '808 Trap Kit' }),
    ).toBe('grand');
  });

  it('ignores a preset name on a General MIDI track: its program decides', () => {
    expect(
      staffOf({
        instrument: 'soundfont',
        gmProgram: 32,
        presetName: 'Upright Bass',
      }),
    ).toBe('bass');
    expect(
      staffOf({ instrument: 'soundfont', gmProgram: 25, presetName: 'Bass' }),
    ).toBe('treble');
  });
});

describe('the role', () => {
  it('decides when the instrument says nothing: set, else from the name', () => {
    expect(staffOf({ trackRole: 'bass' })).toBe('bass');
    expect(staffOf({ trackRole: 'chords' })).toBe('grand');
    expect(staffOf({ trackRole: 'melody' })).toBe('treble');
    expect(staffOf({ name: 'Bass' })).toBe('bass');
    expect(staffOf({ name: 'Pad' })).toBe('grand');
    expect(staffOf({ name: 'Lead' })).toBe('treble');
    expect(staffOf({ name: 'Track 3' })).toBe('treble');
    expect(autoStaff(track({ name: 'Bass' })).because).toBe(
      'for the Bass role',
    );
  });

  it('comes after the instrument', () => {
    expect(staffOf({ instrument: 'piano-sampler', trackRole: 'bass' })).toBe(
      'grand',
    );
    expect(staffOf({ instrument: 'cello', trackRole: 'melody' })).toBe('bass');
  });
});

describe('drum kits', () => {
  it('are a drum machine, or a track given the Drums role', () => {
    expect(isKit(track({ instrument: 'drum-machine' }))).toBe(true);
    // An imported MIDI drum part plays on a synth.
    expect(isKit(track({ trackRole: 'drums' }))).toBe(true);
    expect(isKit(track({ instrument: 'piano-sampler' }))).toBe(false);
  });

  it('stay on the drum staff whatever their setting says', () => {
    for (const notationStaff of ['treble', 'bass', 'grand'] as const) {
      expect(staffOf({ instrument: 'drum-machine', notationStaff })).toBe(
        'percussion',
      );
      expect(staffOf({ trackRole: 'drums', notationStaff })).toBe('percussion');
    }
  });

  it('read Drums from the name, then let the setting say otherwise', () => {
    const guessed = track({ name: 'Drums', trackRole: 'auto' });
    expect(isKit(guessed)).toBe(false);
    expect(partStaff(guessed).staff).toBe('percussion');
    expect(partStaff({ ...guessed, notationStaff: 'treble' }).staff).toBe(
      'treble',
    );
  });
});

describe("a part's own setting", () => {
  it('wins over the instrument, the program, the patch and the role', () => {
    expect(
      staffOf({ instrument: 'piano-sampler', notationStaff: 'treble' }),
    ).toBe('treble');
    expect(
      staffOf({
        instrument: 'soundfont',
        gmProgram: 48,
        notationStaff: 'bass',
      }),
    ).toBe('bass');
    expect(staffOf({ presetName: 'BASS', notationStaff: 'grand' })).toBe(
      'grand',
    );
    expect(staffOf({ name: 'Bass', notationStaff: 'treble' })).toBe('treble');
  });

  it('is Auto when unset or set to Auto', () => {
    expect(staffOf({ instrument: 'cello', notationStaff: 'auto' })).toBe(
      'bass',
    );
    expect(staffOf({ instrument: 'cello', notationStaff: undefined })).toBe(
      'bass',
    );
  });

  it('is kept as nothing when set back to Auto', () => {
    expect(storedSetting('auto')).toBeUndefined();
    expect(storedSetting('bass')).toBe('bass');
  });
});

describe('the control', () => {
  it('names what Auto writes, then the three staves', () => {
    const state = partStaffState(track({ instrument: 'electric-piano' }));
    expect(state).toMatchObject({ setting: 'auto', kit: false });
    expect(autoLabel(state)).toBe('Auto (Grand staff)');
    expect(staffOptions(state)).toEqual([
      { value: 'auto', label: 'Auto (Grand staff)' },
      { value: 'treble', label: 'Treble clef' },
      { value: 'bass', label: 'Bass clef' },
      { value: 'grand', label: 'Grand staff' },
    ]);
    expect(autoHint(state)).toBe('Auto: Grand staff, for Electric piano');
    expect(staffSummary(state)).toBe('Auto: Grand staff, for Electric piano');
  });

  it('shows the setting, and Auto still names the instrument’s staff', () => {
    const state = partStaffState(
      track({ instrument: 'bass-electric', notationStaff: 'treble' }),
    );
    expect(state.setting).toBe('treble');
    expect(autoLabel(state)).toBe('Auto (Bass clef)');
    expect(staffSummary(state)).toBe('Treble clef, set by hand');
  });

  it('has nothing to choose on a kit', () => {
    const state = partStaffState(
      track({ instrument: 'drum-machine', notationStaff: 'bass' }),
    );
    expect(state).toMatchObject({ setting: 'auto', kit: true });
    expect(autoHint(state)).toMatch(/always written on a drum staff/);
  });
});

describe('sampled instruments', () => {
  // A 'sample:<id>' sound lands on a track as its family's stand-in
  // (trackSound.ts), which then reads as that instrument.
  const fromSound = (sound: string) =>
    staffOf(trackSound('t1', sound, 120).settings);

  it('read as the instrument their family stands in for', () => {
    expect(fromSound('sample:acoustic-guitar')).toBe('treble');
    expect(fromSound('bass-electric')).toBe('bass'); // a sampled bass
    expect(fromSound('soundfont:27')).toBe('treble'); // a guitar
    expect(fromSound('soundfont:48')).toBe('grand'); // strings
    expect(fromSound('soundfont:61')).toBe('treble'); // horns
    expect(fromSound('electric-piano')).toBe('grand'); // keys, or no family
  });
});
