// ── General MIDI drums → drumset staff ─────────────────────────────────────
// Standard drumset notation (Percussive Arts Society / Hal Leonard): one
// 5-line staff read in the neutral percussion clef, where a note's vertical
// position names the instrument rather than a pitch, and cymbals take an X
// notehead. Positions are written as the treble-clef pitch that sits on that
// line or space, which is how VexFlow addresses them.
//
//        ─────────────────────  crash a/5 (above), hi-hat g/5 (above)
//   F5 ──────────────────────── ride
//   E5           high tom
//   D5 ──────────────────────── mid tom
//   C5           snare
//   A4 ──────────────────────── floor tom
//   F4           bass drum
//        ─────────────────────  hi-hat pedal d/4 (below)
//
// Hands (cymbals, snare, toms) are one voice with stems up; feet (bass drum,
// hi-hat pedal) are a second voice with stems down. That split is what makes a
// drum chart readable, and it is why every entry declares its voice.

/** Which limb plays it: hands take stems up, feet stems down. */
export type DrumVoice = 'hands' | 'feet';

/** VexFlow notehead codes: normal, cross (cymbals), circled cross. */
export type DrumNotehead = 'normal' | 'x2' | 'x3';

export interface DrumStaffPosition {
  /** Instrument name, as the drum control labels it. */
  label: string;
  /** Staff position as a treble-clef letter ('c' … 'b'). */
  letter: string;
  /** Octave of that letter. */
  octave: number;
  notehead: DrumNotehead;
  voice: DrumVoice;
  /** Printed above the note: 'open' is the o of an open hi-hat. */
  articulation?: 'open';
}

const KICK: DrumStaffPosition = {
  label: 'Kick',
  letter: 'f',
  octave: 4,
  notehead: 'normal',
  voice: 'feet',
};
const SNARE: DrumStaffPosition = {
  label: 'Snare',
  letter: 'c',
  octave: 5,
  notehead: 'normal',
  voice: 'hands',
};
const SIDESTICK: DrumStaffPosition = {
  label: 'Sidestick',
  letter: 'c',
  octave: 5,
  notehead: 'x2',
  voice: 'hands',
};
const HH_CLOSED: DrumStaffPosition = {
  label: 'Hi-Hat Closed',
  letter: 'g',
  octave: 5,
  notehead: 'x2',
  voice: 'hands',
};
const HH_OPEN: DrumStaffPosition = {
  label: 'Hi-Hat Open',
  letter: 'g',
  octave: 5,
  notehead: 'x2',
  voice: 'hands',
  articulation: 'open',
};
const HH_PEDAL: DrumStaffPosition = {
  label: 'Hi-Hat Pedal',
  letter: 'd',
  octave: 4,
  notehead: 'x2',
  voice: 'feet',
};
const FLOOR_TOM: DrumStaffPosition = {
  label: 'Floor Tom',
  letter: 'a',
  octave: 4,
  notehead: 'normal',
  voice: 'hands',
};
const MID_TOM: DrumStaffPosition = {
  label: 'Rack Tom 2',
  letter: 'd',
  octave: 5,
  notehead: 'normal',
  voice: 'hands',
};
const HIGH_TOM: DrumStaffPosition = {
  label: 'Rack Tom 1',
  letter: 'e',
  octave: 5,
  notehead: 'normal',
  voice: 'hands',
};
const CRASH: DrumStaffPosition = {
  label: 'Crash',
  letter: 'a',
  octave: 5,
  notehead: 'x2',
  voice: 'hands',
};
const RIDE: DrumStaffPosition = {
  label: 'Ride',
  letter: 'f',
  octave: 5,
  notehead: 'x2',
  voice: 'hands',
};
const RIDE_BELL: DrumStaffPosition = {
  label: 'Ride Bell',
  letter: 'f',
  octave: 5,
  notehead: 'x3',
  voice: 'hands',
};
const CLAP: DrumStaffPosition = {
  label: 'Hand Clap',
  letter: 'c',
  octave: 5,
  notehead: 'x2',
  voice: 'hands',
};

/**
 * GM percussion note → where it is written. Sounds the kit does not have a
 * separate position for fold onto the nearest one that reads the same way —
 * the same folding the drum control uses for its pads.
 */
const DRUM_STAFF_MAP: Record<number, DrumStaffPosition> = {
  35: KICK, // Acoustic Bass Drum
  36: KICK, // Bass Drum 1
  37: SIDESTICK, // Side Stick
  38: SNARE, // Acoustic Snare
  39: CLAP, // Hand Clap
  40: SIDESTICK, // Electric Snare — the kit's sidestick pad
  41: FLOOR_TOM, // Low Floor Tom
  42: HH_CLOSED, // Closed Hi-Hat
  43: FLOOR_TOM, // High Floor Tom
  44: HH_PEDAL, // Pedal Hi-Hat
  45: MID_TOM, // Low Tom
  46: HH_OPEN, // Open Hi-Hat
  47: MID_TOM, // Low-Mid Tom
  48: HIGH_TOM, // Hi-Mid Tom
  49: CRASH, // Crash Cymbal 1
  50: HIGH_TOM, // High Tom
  51: RIDE, // Ride Cymbal 1
  52: CRASH, // Chinese Cymbal
  53: RIDE_BELL, // Ride Bell
  54: HH_CLOSED, // Tambourine
  55: CRASH, // Splash Cymbal
  56: HH_CLOSED, // Cowbell
  57: CRASH, // Crash Cymbal 2
  59: RIDE, // Ride Cymbal 2
};

/** Everything unmapped reads as a kick, matching the drum control's fallback. */
export function drumStaffPosition(midi: number): DrumStaffPosition {
  return DRUM_STAFF_MAP[midi] ?? KICK;
}

/** True when this note is written in the feet voice (stems down). */
export function isFootDrum(midi: number): boolean {
  return drumStaffPosition(midi).voice === 'feet';
}
