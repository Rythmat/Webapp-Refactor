import { describe, expect, it } from 'vitest';
import { GM_CATEGORIES, GM_PROGRAMS } from '@/daw/instruments/gmPrograms';
import { trackSound } from '@/daw/instruments/trackSound';
import type { Track } from '@/daw/store/tracksSlice';
import {
  autoHint,
  autoLabel,
  autoStaff,
  GM_FAMILY_STAFF,
  INSTRUMENT_STAFF,
  instrumentChanges,
  isKit,
  isStaffSetting,
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
// Bass guitars, the double bass and synth basses read the bass clef with an
// 8 under it, the other low instruments the plain bass clef, the viola the
// alto clef, keyboards a grand staff, drums a drum staff, the rest mostly
// treble; a part's own setting beats all of it but a kit's drum staff.

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
  it('writes a drum machine on a drum staff', () => {
    expect(staffOf({ instrument: 'drum-machine' })).toBe('percussion');
  });

  it('writes an Instruments track by its program', () => {
    expect(INSTRUMENT_STAFF.soundfont).toBe('program');
    // The programs that replaced the keyboard, organ, bass, guitar and
    // cello tracks (trackSound.ts).
    expect(program(0)).toBe('grand');
    expect(program(4)).toBe('grand');
    expect(program(16)).toBe('grand');
    expect(program(33)).toBe('bass8vb');
    expect(program(25)).toBe('treble');
    expect(program(42)).toBe('bass');
  });

  it('writes an Audio track by what it records (audioSource)', () => {
    const amp = (namModelId: string) => [
      { type: 'nam-amp', enabled: true, params: {}, namModelId },
    ];
    const audio = (guitarChain: Track['guitarChain']) =>
      staffOf({ instrument: 'audio-input', guitarChain });
    expect(audio(amp('nam-clean-twin'))).toBe('treble');
    expect(audio(amp('nam-ampeg-svt'))).toBe('bass8vb');
    expect(
      audio([{ type: 'pitch-correction', enabled: true, params: {} }]),
    ).toBe('treble');
  });

  it('leaves a synth and no instrument to the role, else treble', () => {
    for (const instrument of ['oracle-synth', 'none'] as const) {
      expect(INSTRUMENT_STAFF[instrument]).toBeNull();
      expect(staffOf({ instrument })).toBe('treble');
      // A synth playing the bass line is a synth bass.
      expect(staffOf({ instrument, name: 'Bass' })).toBe('bass8vb');
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
    ['Acoustic Bass', 32, 'bass8vb'],
    ['Electric Bass (finger)', 33, 'bass8vb'],
    ['Electric Bass (pick)', 34, 'bass8vb'],
    ['Fretless Bass', 35, 'bass8vb'],
    ['Slap Bass 1', 36, 'bass8vb'],
    ['Slap Bass 2', 37, 'bass8vb'],
    ['Synth Bass 1', 38, 'bass8vb'],
    ['Synth Bass 2', 39, 'bass8vb'],
    ['Violin', 40, 'treble'],
    ['Viola', 41, 'alto'],
    ['Cello', 42, 'bass'],
    ['Contrabass', 43, 'bass8vb'],
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
    ['BASS', 'bass8vb'],
    ['WOBBLE', 'bass8vb'],
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
    ['Deep Sub Bass', 'bass8vb'],
    ['808 Boom', 'bass8vb'],
    ['808 Trap Kit', null],
    ['Analog Lead', 'treble'],
    ['Choir Pad', 'grand'],
    ['Studio Grand', null],
  ])('%s → %s', (name, staff) => {
    expect(patchStaff(name)).toBe(staff);
  });

  it("reads an Oracle Synth track's patch before its role", () => {
    expect(staffOf({ presetName: 'BASS' })).toBe('bass8vb');
    expect(staffOf({ presetName: 'PAD', name: 'Lead' })).toBe('grand');
    // A patch that says nothing leaves it to the track's name.
    expect(staffOf({ presetName: 'DRIFT', name: 'Lead' })).toBe('treble');
    expect(staffOf({ presetName: 'DRIFT', name: 'Bass' })).toBe('bass8vb');
  });

  it('ignores a preset name on a General MIDI track: its program decides', () => {
    expect(
      staffOf({
        instrument: 'soundfont',
        gmProgram: 32,
        presetName: 'Upright Bass',
      }),
    ).toBe('bass8vb');
    expect(
      staffOf({ instrument: 'soundfont', gmProgram: 25, presetName: 'Bass' }),
    ).toBe('treble');
  });
});

describe('the role', () => {
  it('decides when the instrument says nothing: set, else from the name', () => {
    expect(staffOf({ trackRole: 'bass' })).toBe('bass8vb');
    expect(staffOf({ trackRole: 'chords' })).toBe('grand');
    expect(staffOf({ trackRole: 'melody' })).toBe('treble');
    expect(staffOf({ name: 'Bass' })).toBe('bass8vb');
    expect(staffOf({ name: 'Pad' })).toBe('grand');
    expect(staffOf({ name: 'Lead' })).toBe('treble');
    expect(staffOf({ name: 'Track 3' })).toBe('treble');
    expect(autoStaff(track({ name: 'Bass' })).because).toBe(
      'for the Bass role',
    );
  });

  it('comes after the instrument', () => {
    expect(
      staffOf({ instrument: 'soundfont', gmProgram: 0, trackRole: 'bass' }),
    ).toBe('grand');
    expect(
      staffOf({ instrument: 'soundfont', gmProgram: 42, trackRole: 'melody' }),
    ).toBe('bass');
  });
});

describe('drum kits', () => {
  it('are a drum machine, or a track given the Drums role', () => {
    expect(isKit(track({ instrument: 'drum-machine' }))).toBe(true);
    // An imported MIDI drum part plays on a synth.
    expect(isKit(track({ trackRole: 'drums' }))).toBe(true);
    expect(isKit(track({ instrument: 'soundfont' }))).toBe(false);
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
      staffOf({
        instrument: 'soundfont',
        gmProgram: 0,
        notationStaff: 'treble',
      }),
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
    const cello = { instrument: 'soundfont', gmProgram: 42 } as const;
    expect(staffOf({ ...cello, notationStaff: 'auto' })).toBe('bass');
    expect(staffOf({ ...cello, notationStaff: undefined })).toBe('bass');
  });

  it('is kept as nothing when set back to Auto', () => {
    expect(storedSetting('auto')).toBeUndefined();
    expect(storedSetting('bass')).toBe('bass');
  });
});

describe('the control', () => {
  it('names what Auto writes, then the staves, high to low', () => {
    const state = partStaffState(
      track({ instrument: 'soundfont', gmProgram: 4 }),
    );
    expect(state).toMatchObject({ setting: 'auto', kit: false });
    expect(autoLabel(state)).toBe('Auto (Grand staff)');
    expect(staffOptions(state)).toEqual([
      { value: 'auto', label: 'Auto (Grand staff)' },
      { value: 'treble', label: 'Treble clef' },
      { value: 'alto', label: 'Alto clef' },
      { value: 'bass', label: 'Bass clef' },
      { value: 'bass8vb', label: 'Bass clef 8vb (sounds an octave lower)' },
      { value: 'grand', label: 'Grand staff' },
    ]);
    expect(autoHint(state)).toBe('Auto: Grand staff, for Electric Piano 1');
    expect(staffSummary(state)).toBe('Auto: Grand staff, for Electric Piano 1');
  });

  it('shows the setting, and Auto still names the instrument’s staff', () => {
    const state = partStaffState(
      track({
        instrument: 'soundfont',
        gmProgram: 33,
        notationStaff: 'treble',
      }),
    );
    expect(state.setting).toBe('treble');
    expect(autoLabel(state)).toBe('Auto (Bass clef 8vb)');
    expect(staffSummary(state)).toBe('Treble clef, set by hand');
  });

  it('says what the 8 does, and names the viola’s clef', () => {
    const bass = partStaffState(
      track({ instrument: 'soundfont', gmProgram: 33 }),
    );
    expect(autoHint(bass)).toBe(
      'Auto: Bass clef 8vb (sounds an octave lower), for Electric Bass (finger)',
    );
    const viola = partStaffState(
      track({ instrument: 'soundfont', gmProgram: 41 }),
    );
    expect(autoLabel(viola)).toBe('Auto (Alto clef)');
    expect(autoHint(viola)).toBe('Auto: Alto clef, for Viola');
    const set = partStaffState(
      track({
        instrument: 'soundfont',
        gmProgram: 42,
        notationStaff: 'bass8vb',
      }),
    );
    expect(staffSummary(set)).toBe(
      'Bass clef 8vb (sounds an octave lower), set by hand',
    );
  });

  it('takes only the settings a part can have', () => {
    for (const value of [
      'auto',
      'treble',
      'alto',
      'bass',
      'bass8vb',
      'grand',
    ]) {
      expect(isStaffSetting(value)).toBe(true);
    }
    expect(isStaffSetting('percussion')).toBe(false);
    expect(isStaffSetting('tenor')).toBe(false);
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
    expect(fromSound('bass-electric')).toBe('bass8vb'); // a sampled bass
    expect(fromSound('soundfont:27')).toBe('treble'); // a guitar
    expect(fromSound('soundfont:48')).toBe('grand'); // strings
    expect(fromSound('soundfont:61')).toBe('treble'); // horns
    expect(fromSound('electric-piano')).toBe('grand'); // keys, or no family
  });
});

describe('the low instruments that sound where they are written', () => {
  it('keep the plain bass clef', () => {
    for (const gm of [42, 47, 57, 58, 67, 70]) expect(program(gm)).toBe('bass');
  });
});

describe('a new instrument', () => {
  const bass = track({
    instrument: 'soundfont',
    gmProgram: 33,
    presetName: 'Electric Bass',
    notationStaff: 'treble',
  });

  it('is another instrument, program, or a patch that plays something else', () => {
    expect(instrumentChanges(bass, { instrument: 'oracle-synth' })).toBe(true);
    expect(instrumentChanges(bass, { gmProgram: 41 })).toBe(true);
    expect(
      instrumentChanges(track({ presetName: 'BASS' }), { presetName: 'PAD' }),
    ).toBe(true);
  });

  it('is not the same sound again, a patch of the same kind, or another edit', () => {
    expect(instrumentChanges(bass, { instrument: 'soundfont' })).toBe(false);
    expect(
      instrumentChanges(bass, { instrument: 'soundfont', gmProgram: 33 }),
    ).toBe(false);
    expect(
      instrumentChanges(track({ presetName: 'BASS' }), {
        presetName: 'WOBBLE',
      }),
    ).toBe(false);
    expect(instrumentChanges(bass, { name: 'Bass 2', volume: 0.5 })).toBe(
      false,
    );
  });

  it('is not one that sets the staff as well', () => {
    expect(
      instrumentChanges(bass, {
        instrument: 'oracle-synth',
        notationStaff: 'alto',
      }),
    ).toBe(false);
  });
});
