export interface ChordScaleEntry {
  degree: string;     // "1", "♭2", "#4", etc.
  quality: string;    // "maj", "min7", "dom7(#5)", etc.
}

export interface ModeChordScales {
  modeSlug: string;
  modeName: string;
  intervals: string;
  triads: ChordScaleEntry[];
  sevenths: ChordScaleEntry[];
  ninths: ChordScaleEntry[];
  extraTriads?: ChordScaleEntry[];
  extraSevenths?: ChordScaleEntry[];
  extraNinths?: ChordScaleEntry[];
}

// ─────────────────────────────────────────────
// DIATONIC MODES (1–7)
// ─────────────────────────────────────────────

const lydian: ModeChordScales = {
  modeSlug: 'lydian',
  modeName: 'Lydian',
  intervals: '1, 2, 3, #4, 5, 6, 7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '2', quality: 'maj' },
    { degree: '3', quality: 'min' },
    { degree: '#4', quality: 'dim' },
    { degree: '5', quality: 'maj' },
    { degree: '6', quality: 'min' },
    { degree: '7', quality: 'min' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7' },
    { degree: '2', quality: 'dom7' },
    { degree: '3', quality: 'min7' },
    { degree: '#4', quality: 'min7(♭5)' },
    { degree: '5', quality: 'maj7' },
    { degree: '6', quality: 'min7' },
    { degree: '7', quality: 'min7' },
  ],
  ninths: [
    { degree: '1', quality: 'maj9' },
    { degree: '2', quality: 'dom9' },
    { degree: '3', quality: 'min9' },
    { degree: '#4', quality: 'min7(♭5♭9)' },
    { degree: '5', quality: 'maj9' },
    { degree: '6', quality: 'min9' },
    { degree: '7', quality: 'min7(♭9)' },
  ],
};

const ionian: ModeChordScales = {
  modeSlug: 'ionian',
  modeName: 'Ionian',
  intervals: '1, 2, 3, 4, 5, 6, 7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '2', quality: 'min' },
    { degree: '3', quality: 'min' },
    { degree: '4', quality: 'maj' },
    { degree: '5', quality: 'maj' },
    { degree: '6', quality: 'min' },
    { degree: '7', quality: 'dim' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7' },
    { degree: '2', quality: 'min7' },
    { degree: '3', quality: 'min7' },
    { degree: '4', quality: 'maj7' },
    { degree: '5', quality: 'dom7' },
    { degree: '6', quality: 'min7' },
    { degree: '7', quality: 'min7(♭5)' },
  ],
  ninths: [
    { degree: '1', quality: 'maj9' },
    { degree: '2', quality: 'min9' },
    { degree: '3', quality: 'min7(♭9)' },
    { degree: '4', quality: 'maj9' },
    { degree: '5', quality: 'dom9' },
    { degree: '6', quality: 'min9' },
    { degree: '7', quality: 'min7(♭5♭9)' },
  ],
};

const mixolydian: ModeChordScales = {
  modeSlug: 'mixolydian',
  modeName: 'Mixolydian',
  intervals: '1, 2, 3, 4, 5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '2', quality: 'min' },
    { degree: '3', quality: 'dim' },
    { degree: '4', quality: 'maj' },
    { degree: '5', quality: 'min' },
    { degree: '6', quality: 'min' },
    { degree: '♭7', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'dom7' },
    { degree: '2', quality: 'min7' },
    { degree: '3', quality: 'min7(♭5)' },
    { degree: '4', quality: 'maj7' },
    { degree: '5', quality: 'min7' },
    { degree: '6', quality: 'min7' },
    { degree: '♭7', quality: 'maj7' },
  ],
  ninths: [
    { degree: '1', quality: 'dom9' },
    { degree: '2', quality: 'min9' },
    { degree: '3', quality: 'min7(♭5♭9)' },
    { degree: '4', quality: 'maj9' },
    { degree: '5', quality: 'min9' },
    { degree: '6', quality: 'min7(♭9)' },
    { degree: '♭7', quality: 'maj9' },
  ],
};

const dorian: ModeChordScales = {
  modeSlug: 'dorian',
  modeName: 'Dorian',
  intervals: '1, 2, ♭3, 4, 5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '2', quality: 'min' },
    { degree: '♭3', quality: 'maj' },
    { degree: '4', quality: 'maj' },
    { degree: '5', quality: 'min' },
    { degree: '6', quality: 'dim' },
    { degree: '♭7', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7' },
    { degree: '2', quality: 'min7' },
    { degree: '♭3', quality: 'maj7' },
    { degree: '4', quality: 'dom7' },
    { degree: '5', quality: 'min7' },
    { degree: '6', quality: 'min7(♭5)' },
    { degree: '♭7', quality: 'maj7' },
  ],
  ninths: [
    { degree: '1', quality: 'min9' },
    { degree: '2', quality: 'min7(♭9)' },
    { degree: '♭3', quality: 'maj9' },
    { degree: '4', quality: 'dom9' },
    { degree: '5', quality: 'min9' },
    { degree: '6', quality: 'min7(♭5♭9)' },
    { degree: '♭7', quality: 'maj9' },
  ],
};

const aeolian: ModeChordScales = {
  modeSlug: 'aeolian',
  modeName: 'Aeolian',
  intervals: '1, 2, ♭3, 4, 5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '2', quality: 'dim' },
    { degree: '♭3', quality: 'maj' },
    { degree: '4', quality: 'min' },
    { degree: '5', quality: 'min' },
    { degree: '♭6', quality: 'maj' },
    { degree: '♭7', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7' },
    { degree: '2', quality: 'min7(♭5)' },
    { degree: '♭3', quality: 'maj7' },
    { degree: '4', quality: 'min7' },
    { degree: '5', quality: 'min7' },
    { degree: '♭6', quality: 'maj7' },
    { degree: '♭7', quality: 'dom7' },
  ],
  ninths: [
    { degree: '1', quality: 'min9' },
    { degree: '2', quality: 'min7(♭5♭9)' },
    { degree: '♭3', quality: 'maj9' },
    { degree: '4', quality: 'min9' },
    { degree: '5', quality: 'min7(♭9)' },
    { degree: '♭6', quality: 'maj9' },
    { degree: '♭7', quality: 'dom9' },
  ],
};

const phrygian: ModeChordScales = {
  modeSlug: 'phrygian',
  modeName: 'Phrygian',
  intervals: '1, ♭2, ♭3, 4, 5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '♭2', quality: 'maj' },
    { degree: '♭3', quality: 'maj' },
    { degree: '4', quality: 'min' },
    { degree: '5', quality: 'dim' },
    { degree: '♭6', quality: 'maj' },
    { degree: '♭7', quality: 'min' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7' },
    { degree: '♭2', quality: 'maj7' },
    { degree: '♭3', quality: 'dom7' },
    { degree: '4', quality: 'min7' },
    { degree: '5', quality: 'min7(♭5)' },
    { degree: '♭6', quality: 'maj7' },
    { degree: '♭7', quality: 'min7' },
  ],
  ninths: [
    { degree: '1', quality: 'min7(♭9)' },
    { degree: '♭2', quality: 'maj9' },
    { degree: '♭3', quality: 'dom9' },
    { degree: '4', quality: 'min9' },
    { degree: '5', quality: 'min7(♭5♭9)' },
    { degree: '♭6', quality: 'maj9' },
    { degree: '♭7', quality: 'min9' },
  ],
};

const locrian: ModeChordScales = {
  modeSlug: 'locrian',
  modeName: 'Locrian',
  intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '♭2', quality: 'maj' },
    { degree: '♭3', quality: 'min' },
    { degree: '4', quality: 'min' },
    { degree: '♭5', quality: 'maj' },
    { degree: '♭6', quality: 'maj' },
    { degree: '♭7', quality: 'min' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7(♭5)' },
    { degree: '♭2', quality: 'maj7' },
    { degree: '♭3', quality: 'min7' },
    { degree: '4', quality: 'min7' },
    { degree: '♭5', quality: 'maj7' },
    { degree: '♭6', quality: 'dom7' },
    { degree: '♭7', quality: 'min7' },
  ],
  ninths: [
    { degree: '1', quality: 'min7(♭5♭9)' },
    { degree: '♭2', quality: 'maj9' },
    { degree: '♭3', quality: 'min9' },
    { degree: '4', quality: 'min7(♭9)' },
    { degree: '♭5', quality: 'maj9' },
    { degree: '♭6', quality: 'dom9' },
    { degree: '♭7', quality: 'min9' },
  ],
};

// ─────────────────────────────────────────────
// HARMONIC MINOR MODES (8–14)
// ─────────────────────────────────────────────

const harmonicMinor: ModeChordScales = {
  modeSlug: 'harmonicminor',
  modeName: 'Harmonic Minor',
  intervals: '1, 2, ♭3, 4, 5, ♭6, 7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '2', quality: 'dim' },
    { degree: '♭3', quality: 'aug' },
    { degree: '4', quality: 'min' },
    { degree: '5', quality: 'maj' },
    { degree: '♭6', quality: 'maj' },
    { degree: '7', quality: 'dim' },
  ],
  extraTriads: [
    { degree: '5', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min(maj7)' },
    { degree: '2', quality: 'min7(♭5)' },
    { degree: '♭3', quality: 'maj7(#5)' },
    { degree: '4', quality: 'min7' },
    { degree: '5', quality: 'dom7' },
    { degree: '♭6', quality: 'maj7' },
    { degree: '7', quality: 'dim7' },
  ],
  extraSevenths: [
    { degree: '5', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min(maj9)' },
    { degree: '2', quality: 'min7(♭5♭9)' },
    { degree: '♭3', quality: 'maj9(#5)' },
    { degree: '4', quality: 'min9' },
    { degree: '5', quality: 'dom7(♭9)' },
    { degree: '♭6', quality: 'maj7(#9)' },
    { degree: '7', quality: 'dim7(♭9)' },
  ],
  extraNinths: [
    { degree: '2', quality: 'dim7(♭9)' },
    { degree: '4', quality: 'dim7(add9)' },
    { degree: '4', quality: 'min69' },
    { degree: '5', quality: 'dom7(#5♭9)' },
  ],
};

const locrianNat6: ModeChordScales = {
  modeSlug: 'locriannat6',
  modeName: 'Locrian ♮6',
  intervals: '1, ♭2, ♭3, 4, ♭5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '♭2', quality: 'aug' },
    { degree: '♭3', quality: 'min' },
    { degree: '4', quality: 'maj' },
    { degree: '♭5', quality: 'maj' },
    { degree: '6', quality: 'dim' },
    { degree: '♭7', quality: 'min' },
  ],
  extraTriads: [
    { degree: '4', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7(♭5)' },
    { degree: '♭2', quality: 'maj7(#5)' },
    { degree: '♭3', quality: 'min7' },
    { degree: '4', quality: 'dom7' },
    { degree: '♭5', quality: 'maj7' },
    { degree: '6', quality: 'dim7' },
    { degree: '♭7', quality: 'min(maj7)' },
  ],
  extraSevenths: [
    { degree: '4', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min7(♭5♭9)' },
    { degree: '♭2', quality: 'maj9(#5)' },
    { degree: '♭3', quality: 'min9' },
    { degree: '4', quality: 'dom7(♭9)' },
    { degree: '♭5', quality: 'maj7(#9)' },
    { degree: '6', quality: 'dim7(♭9)' },
    { degree: '♭7', quality: 'min(maj9)' },
  ],
  extraNinths: [
    { degree: '4', quality: 'dom7(#5♭9)' },
  ],
};

const ionianSharp5: ModeChordScales = {
  modeSlug: 'ionian#5',
  modeName: 'Ionian #5',
  intervals: '1, 2, 3, 4, #5, 6, 7',
  triads: [
    { degree: '1', quality: 'aug' },
    { degree: '2', quality: 'min' },
    { degree: '3', quality: 'maj' },
    { degree: '4', quality: 'maj' },
    { degree: '#5', quality: 'dim' },
    { degree: '6', quality: 'min' },
    { degree: '7', quality: 'dim' },
  ],
  extraTriads: [
    { degree: '3', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7(#5)' },
    { degree: '2', quality: 'min7' },
    { degree: '3', quality: 'dom7' },
    { degree: '4', quality: 'maj7' },
    { degree: '#5', quality: 'dim7' },
    { degree: '6', quality: 'min(maj7)' },
    { degree: '7', quality: 'min7(♭5)' },
  ],
  extraSevenths: [
    { degree: '3', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'maj9(#5)' },
    { degree: '2', quality: 'min9' },
    { degree: '3', quality: 'dom7(♭9)' },
    { degree: '4', quality: 'maj7(#9)' },
    { degree: '#5', quality: 'dim7(♭9)' },
    { degree: '6', quality: 'min(maj9)' },
    { degree: '7', quality: 'min7(♭5♭9)' },
  ],
  extraNinths: [
    { degree: '3', quality: 'dom7(#5♭9)' },
  ],
};

const dorianSharp4: ModeChordScales = {
  modeSlug: 'dorian#4',
  modeName: 'Dorian #4',
  intervals: '1, 2, ♭3, ♯4, 5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '2', quality: 'maj' },
    { degree: '♭3', quality: 'maj' },
    { degree: '#4', quality: 'dim' },
    { degree: '5', quality: 'min' },
    { degree: '6', quality: 'dim' },
    { degree: '♭7', quality: 'aug' },
  ],
  extraTriads: [
    { degree: '2', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7' },
    { degree: '2', quality: 'dom7' },
    { degree: '♭3', quality: 'maj7' },
    { degree: '#4', quality: 'dim7' },
    { degree: '5', quality: 'min(maj7)' },
    { degree: '6', quality: 'min7(♭5)' },
    { degree: '♭7', quality: 'maj7(#5)' },
  ],
  extraSevenths: [
    { degree: '2', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min9' },
    { degree: '2', quality: 'dom7(♭9)' },
    { degree: '♭3', quality: 'maj7(#9)' },
    { degree: '#4', quality: 'dim7(♭9)' },
    { degree: '5', quality: 'min(maj9)' },
    { degree: '6', quality: 'min7(♭5♭9)' },
    { degree: '♭7', quality: 'maj9(#5)' },
  ],
  extraNinths: [
    { degree: '2', quality: 'dom7(#5♭9)' },
  ],
};

const phrygianDominant: ModeChordScales = {
  modeSlug: 'phrygiandominant',
  modeName: 'Phrygian Dominant',
  intervals: '1, ♭2, 3, 4, 5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '♭2', quality: 'maj' },
    { degree: '3', quality: 'dim' },
    { degree: '4', quality: 'min' },
    { degree: '5', quality: 'dim' },
    { degree: '♭6', quality: 'aug' },
    { degree: '♭7', quality: 'min' },
  ],
  extraTriads: [
    { degree: '1', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'dom7' },
    { degree: '♭2', quality: 'maj7' },
    { degree: '3', quality: 'dim7' },
    { degree: '4', quality: 'min(maj7)' },
    { degree: '5', quality: 'min7(♭5)' },
    { degree: '♭6', quality: 'maj7(#5)' },
    { degree: '♭7', quality: 'min7' },
  ],
  extraSevenths: [
    { degree: '1', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'dom7(♭9)' },
    { degree: '♭2', quality: 'maj7(#9)' },
    { degree: '3', quality: 'dim7(♭9)' },
    { degree: '4', quality: 'min(maj9)' },
    { degree: '5', quality: 'min7(♭5♭9)' },
    { degree: '♭6', quality: 'maj9(#5)' },
    { degree: '♭7', quality: 'min9' },
  ],
  extraNinths: [
    { degree: '1', quality: 'dom7(#5♭9)' },
  ],
};

const lydianSharp2: ModeChordScales = {
  modeSlug: 'lydian#2',
  modeName: 'Lydian #2',
  intervals: '1, ♯2, 3, ♯4, 5, 6, 7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '#2', quality: 'dim' },
    { degree: '3', quality: 'min' },
    { degree: '#4', quality: 'dim' },
    { degree: '5', quality: 'aug' },
    { degree: '6', quality: 'min' },
    { degree: '7', quality: 'maj' },
  ],
  extraTriads: [
    { degree: '7', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7' },
    { degree: '#2', quality: 'dim7' },
    { degree: '3', quality: 'min(maj7)' },
    { degree: '#4', quality: 'min7(♭5)' },
    { degree: '5', quality: 'maj7(#5)' },
    { degree: '6', quality: 'min7' },
    { degree: '7', quality: 'dom7' },
  ],
  extraSevenths: [
    { degree: '7', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'maj7(#9)' },
    { degree: '#2', quality: 'dim7(♭9)' },
    { degree: '3', quality: 'min(maj9)' },
    { degree: '#4', quality: 'min7(♭5♭9)' },
    { degree: '5', quality: 'maj9(#5)' },
    { degree: '6', quality: 'min9' },
    { degree: '7', quality: 'dom7(♭9)' },
  ],
  extraNinths: [
    { degree: '7', quality: 'dom7(#5♭9)' },
  ],
};

const alteredDiminished: ModeChordScales = {
  modeSlug: 'altereddiminished',
  modeName: 'Altered Diminished',
  intervals: '1, ♭2, ♭3, ♭4, ♭5, ♭6, 𝄫7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '♭2', quality: 'min' },
    { degree: '♭3', quality: 'dim' },
    { degree: '♭4', quality: 'aug' },
    { degree: '♭5', quality: 'min' },
    { degree: '♭6', quality: 'maj' },
    { degree: '𝄫7', quality: 'maj' },
  ],
  extraTriads: [
    { degree: '♭6', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'dim7' },
    { degree: '♭2', quality: 'min(maj7)' },
    { degree: '♭3', quality: 'min7(♭5)' },
    { degree: '♭4', quality: 'maj7(#5)' },
    { degree: '♭5', quality: 'min7' },
    { degree: '♭6', quality: 'dom7' },
    { degree: '𝄫7', quality: 'maj7' },
  ],
  extraSevenths: [
    { degree: '♭6', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'dim7(♭9)' },
    { degree: '♭2', quality: 'min(maj9)' },
    { degree: '♭3', quality: 'min7(♭5♭9)' },
    { degree: '♭4', quality: 'maj9(#5)' },
    { degree: '♭5', quality: 'min9' },
    { degree: '♭6', quality: 'dom7(♭9)' },
    { degree: '𝄫7', quality: 'maj7(#9)' },
  ],
  extraNinths: [
    { degree: '♭6', quality: 'dom7(#5♭9)' },
  ],
};

// ─────────────────────────────────────────────
// MELODIC MINOR MODES (15–21)
// ─────────────────────────────────────────────

const melodicMinor: ModeChordScales = {
  modeSlug: 'melodicminor',
  modeName: 'Melodic Minor',
  intervals: '1, 2, ♭3, 4, 5, 6, 7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '2', quality: 'min' },
    { degree: '♭3', quality: 'aug' },
    { degree: '4', quality: 'maj' },
    { degree: '5', quality: 'maj' },
    { degree: '6', quality: 'dim' },
    { degree: '7', quality: 'dim' },
  ],
  extraTriads: [
    { degree: '5', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min(maj7)' },
    { degree: '2', quality: 'min7' },
    { degree: '♭3', quality: 'maj7(#5)' },
    { degree: '4', quality: 'dom7' },
    { degree: '5', quality: 'dom7' },
    { degree: '6', quality: 'min7(♭5)' },
    { degree: '7', quality: 'min7(♭5)' },
  ],
  extraSevenths: [
    { degree: '5', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min(maj9)' },
    { degree: '2', quality: 'min7(♭9)' },
    { degree: '♭3', quality: 'maj9(#5)' },
    { degree: '4', quality: 'dom9' },
    { degree: '5', quality: 'dom9' },
    { degree: '6', quality: 'min9(♭5)' },
    { degree: '7', quality: 'min7(♭5♭9)' },
  ],
  extraNinths: [
    { degree: '5', quality: 'dom9(#5)' },
  ],
};

const dorianFlat2: ModeChordScales = {
  modeSlug: 'dorian♭2',
  modeName: 'Dorian ♭2',
  intervals: '1, ♭2, ♭3, 4, 5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '♭2', quality: 'aug' },
    { degree: '♭3', quality: 'maj' },
    { degree: '4', quality: 'maj' },
    { degree: '5', quality: 'dim' },
    { degree: '6', quality: 'dim' },
    { degree: '♭7', quality: 'min' },
  ],
  extraTriads: [
    { degree: '4', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7' },
    { degree: '♭2', quality: 'maj7(#5)' },
    { degree: '♭3', quality: 'dom7' },
    { degree: '4', quality: 'dom7' },
    { degree: '5', quality: 'min7(♭5)' },
    { degree: '6', quality: 'min7(♭5)' },
    { degree: '♭7', quality: 'min(maj7)' },
  ],
  extraSevenths: [
    { degree: '4', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min7(♭9)' },
    { degree: '♭2', quality: 'maj9(#5)' },
    { degree: '♭3', quality: 'dom9' },
    { degree: '4', quality: 'dom9' },
    { degree: '5', quality: 'min9(♭5)' },
    { degree: '6', quality: 'min7(♭5♭9)' },
    { degree: '♭7', quality: 'min(maj9)' },
  ],
  extraNinths: [
    { degree: '4', quality: 'dom9(#5)' },
  ],
};

const lydianAugmented: ModeChordScales = {
  modeSlug: 'lydianaugmented',
  modeName: 'Lydian Augmented',
  intervals: '1, 2, 3, #4, #5, 6, 7',
  triads: [
    { degree: '1', quality: 'aug' },
    { degree: '2', quality: 'maj' },
    { degree: '3', quality: 'maj' },
    { degree: '#4', quality: 'dim' },
    { degree: '#5', quality: 'dim' },
    { degree: '6', quality: 'min' },
    { degree: '7', quality: 'min' },
  ],
  extraTriads: [
    { degree: '3', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7(#5)' },
    { degree: '2', quality: 'dom7' },
    { degree: '3', quality: 'dom7' },
    { degree: '#4', quality: 'min7(♭5)' },
    { degree: '#5', quality: 'min7(♭5)' },
    { degree: '6', quality: 'min(maj7)' },
    { degree: '7', quality: 'min7' },
  ],
  extraSevenths: [
    { degree: '3', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'maj9(#5)' },
    { degree: '2', quality: 'dom9' },
    { degree: '3', quality: 'dom9' },
    { degree: '#4', quality: 'min9(♭5)' },
    { degree: '#5', quality: 'min7(♭5♭9)' },
    { degree: '6', quality: 'min(maj9)' },
    { degree: '7', quality: 'min7(♭9)' },
  ],
  extraNinths: [
    { degree: '3', quality: 'dom9(#5)' },
  ],
};

const lydianDominant: ModeChordScales = {
  modeSlug: 'lydiandominant',
  modeName: 'Lydian Dominant',
  intervals: '1, 2, 3, #4, 5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '2', quality: 'maj' },
    { degree: '3', quality: 'dim' },
    { degree: '#4', quality: 'dim' },
    { degree: '5', quality: 'min' },
    { degree: '6', quality: 'min' },
    { degree: '♭7', quality: 'aug' },
  ],
  extraTriads: [
    { degree: '2', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'dom7' },
    { degree: '2', quality: 'dom7' },
    { degree: '3', quality: 'min7(♭5)' },
    { degree: '#4', quality: 'min7(♭5)' },
    { degree: '5', quality: 'min(maj7)' },
    { degree: '6', quality: 'min7' },
    { degree: '♭7', quality: 'maj7(#5)' },
  ],
  extraSevenths: [
    { degree: '2', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'dom9' },
    { degree: '2', quality: 'dom9' },
    { degree: '3', quality: 'min9(♭5)' },
    { degree: '#4', quality: 'min7(♭5♭9)' },
    { degree: '5', quality: 'min(maj9)' },
    { degree: '6', quality: 'min7(♭9)' },
    { degree: '♭7', quality: 'maj9(#5)' },
  ],
  extraNinths: [
    { degree: '2', quality: 'dom9(#5)' },
  ],
};

const mixolydianFlat6: ModeChordScales = {
  modeSlug: 'mixolydiannat6',
  modeName: 'Mixolydian ♭6',
  intervals: '1, 2, 3, 4, 5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '2', quality: 'dim' },
    { degree: '3', quality: 'dim' },
    { degree: '4', quality: 'min' },
    { degree: '5', quality: 'min' },
    { degree: '♭6', quality: 'aug' },
    { degree: '♭7', quality: 'maj' },
  ],
  extraTriads: [
    { degree: '1', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'dom7' },
    { degree: '2', quality: 'min7(♭5)' },
    { degree: '3', quality: 'min7(♭5)' },
    { degree: '4', quality: 'min(maj7)' },
    { degree: '5', quality: 'min7' },
    { degree: '♭6', quality: 'maj7(#5)' },
    { degree: '♭7', quality: 'dom7' },
  ],
  extraSevenths: [
    { degree: '1', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'dom9' },
    { degree: '2', quality: 'min9(♭5)' },
    { degree: '3', quality: 'min7(♭5♭9)' },
    { degree: '4', quality: 'min(maj9)' },
    { degree: '5', quality: 'min7(♭9)' },
    { degree: '♭6', quality: 'maj9(#5)' },
    { degree: '♭7', quality: 'dom9' },
  ],
  extraNinths: [
    { degree: '1', quality: 'dom9(#5)' },
  ],
};

const locrianNat2: ModeChordScales = {
  modeSlug: 'locriannat2',
  modeName: 'Locrian ♮2',
  intervals: '1, 2, ♭3, 4, ♭5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '2', quality: 'dim' },
    { degree: '♭3', quality: 'min' },
    { degree: '4', quality: 'min' },
    { degree: '♭5', quality: 'aug' },
    { degree: '♭6', quality: 'maj' },
    { degree: '♭7', quality: 'maj' },
  ],
  extraTriads: [
    { degree: '♭7', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7(♭5)' },
    { degree: '2', quality: 'min7(♭5)' },
    { degree: '♭3', quality: 'min(maj7)' },
    { degree: '4', quality: 'min7' },
    { degree: '♭5', quality: 'maj7(#5)' },
    { degree: '♭6', quality: 'dom7' },
    { degree: '♭7', quality: 'dom7' },
  ],
  extraSevenths: [
    { degree: '♭7', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min9(♭5)' },
    { degree: '2', quality: 'min7(♭5♭9)' },
    { degree: '♭3', quality: 'min(maj9)' },
    { degree: '4', quality: 'min7(♭9)' },
    { degree: '♭5', quality: 'maj9(#5)' },
    { degree: '♭6', quality: 'dom9' },
    { degree: '♭7', quality: 'dom9' },
  ],
  extraNinths: [
    { degree: '♭7', quality: 'dom9(#5)' },
  ],
};

const alteredDominant: ModeChordScales = {
  modeSlug: 'altereddominant',
  modeName: 'Altered Dominant',
  intervals: '1, ♭2, ♭3, ♭4, ♭5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '♭2', quality: 'min' },
    { degree: '♭3', quality: 'min' },
    { degree: '♭4', quality: 'aug' },
    { degree: '♭5', quality: 'maj' },
    { degree: '♭6', quality: 'maj' },
    { degree: '♭7', quality: 'dim' },
  ],
  extraTriads: [
    { degree: '♭6', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7(♭5)' },
    { degree: '♭2', quality: 'min(maj7)' },
    { degree: '♭3', quality: 'min7' },
    { degree: '♭4', quality: 'maj7(#5)' },
    { degree: '♭5', quality: 'dom7' },
    { degree: '♭6', quality: 'dom7' },
    { degree: '♭7', quality: 'min7(♭5)' },
  ],
  extraSevenths: [
    { degree: '♭6', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min7(♭5♭9)' },
    { degree: '♭2', quality: 'min(maj9)' },
    { degree: '♭3', quality: 'min7(♭9)' },
    { degree: '♭4', quality: 'maj9(#5)' },
    { degree: '♭5', quality: 'dom9' },
    { degree: '♭6', quality: 'dom9' },
    { degree: '♭7', quality: 'min9(♭5)' },
  ],
  extraNinths: [
    { degree: '♭6', quality: 'dom9(#5)' },
  ],
};

// ─────────────────────────────────────────────
// HARMONIC MAJOR MODES (22–28)
// ─────────────────────────────────────────────

const harmonicMajor: ModeChordScales = {
  modeSlug: 'harmonicmajor',
  modeName: 'Harmonic Major',
  intervals: '1, 2, 3, 4, 5, ♭6, 7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '2', quality: 'dim' },
    { degree: '3', quality: 'min' },
    { degree: '4', quality: 'min' },
    { degree: '5', quality: 'maj' },
    { degree: '♭6', quality: 'aug' },
    { degree: '7', quality: 'dim' },
  ],
  extraTriads: [
    { degree: '1', quality: 'aug' },
    { degree: '3', quality: 'maj' },
    { degree: '4', quality: 'dim' },
    { degree: '♭6', quality: 'dim' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7' },
    { degree: '2', quality: 'min7(♭5)' },
    { degree: '3', quality: 'min7' },
    { degree: '4', quality: 'min(maj7)' },
    { degree: '5', quality: 'dom7' },
    { degree: '♭6', quality: 'maj7(#5)' },
    { degree: '7', quality: 'dim7' },
  ],
  extraSevenths: [
    { degree: '1', quality: 'maj7(#5)' },
    { degree: '3', quality: 'dom7' },
    { degree: '3', quality: 'dom7(#5)' },
    { degree: '4', quality: 'dim(maj7)' },
    { degree: '4', quality: 'min6' },
    { degree: '♭6', quality: 'dim(maj7)' },
    { degree: '♭6', quality: 'dim7' },
  ],
  ninths: [
    { degree: '1', quality: 'maj9' },
    { degree: '2', quality: 'min9(♭5)' },
    { degree: '3', quality: 'min7(♭9)' },
    { degree: '4', quality: 'min(maj9)' },
    { degree: '5', quality: 'dom7(♭9)' },
    { degree: '♭6', quality: 'maj7(#5#9)' },
    { degree: '7', quality: 'dim7(♭9)' },
  ],
  extraNinths: [
    { degree: '1', quality: 'maj9(#5)' },
    { degree: '2', quality: 'min6/9' },
    { degree: '3', quality: 'dom7(#9)' },
    { degree: '3', quality: 'dom7(♭9)' },
    { degree: '3', quality: 'dom7(#5♭9)' },
    { degree: '3', quality: 'dom7(#5#9)' },
    { degree: '4', quality: 'dim(maj9)' },
    { degree: '4', quality: 'min6/9' },
  ],
};

const dorianFlat5: ModeChordScales = {
  modeSlug: 'dorian♭5',
  modeName: 'Dorian ♭5',
  intervals: '1, 2, ♭3, 4, ♭5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '2', quality: 'min' },
    { degree: '♭3', quality: 'min' },
    { degree: '4', quality: 'maj' },
    { degree: '♭5', quality: 'aug' },
    { degree: '6', quality: 'dim' },
    { degree: '♭7', quality: 'maj' },
  ],
  extraTriads: [
    { degree: '2', quality: 'maj' },
    { degree: '♭5', quality: 'dim' },
    { degree: '♭7', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7(♭5)' },
    { degree: '2', quality: 'min7' },
    { degree: '♭3', quality: 'min(maj7)' },
    { degree: '4', quality: 'dom7' },
    { degree: '♭5', quality: 'maj7(#5)' },
    { degree: '6', quality: 'dim7' },
    { degree: '♭7', quality: 'maj7' },
  ],
  extraSevenths: [
    { degree: '2', quality: 'dom7(#5)' },
    { degree: '♭5', quality: 'dim7' },
    { degree: '♭5', quality: 'dim(maj7)' },
    { degree: '♭7', quality: 'maj7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min9(♭5)' },
    { degree: '2', quality: 'min7(♭9)' },
    { degree: '♭3', quality: 'min(maj9)' },
    { degree: '4', quality: 'dom7(♭9)' },
    { degree: '♭5', quality: 'maj7(#5#9)' },
    { degree: '6', quality: 'dim7(♭9)' },
    { degree: '♭7', quality: 'maj9' },
  ],
  extraNinths: [
    { degree: '1', quality: 'min6/9' },
    { degree: '2', quality: 'dom7(#9)' },
    { degree: '2', quality: 'dom7(♭9)' },
    { degree: '2', quality: 'dom7(#5♭9)' },
    { degree: '2', quality: 'dom7(#5#9)' },
    { degree: '♭3', quality: 'min6/9' },
    { degree: '♭3', quality: 'dim(maj9)' },
    { degree: '♭7', quality: 'maj9(#5)' },
  ],
};

const alteredDominantNat5: ModeChordScales = {
  modeSlug: 'altereddominantnat5',
  modeName: 'Altered Dominant ♮5',
  intervals: '1, ♭2, ♭3, ♭4, 5, ♭6, ♭7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '♭2', quality: 'min' },
    { degree: '3', quality: 'maj' },
    { degree: '♭4', quality: 'aug' },
    { degree: '5', quality: 'dim' },
    { degree: '♭6', quality: 'maj' },
    { degree: '♭7', quality: 'dim' },
  ],
  extraTriads: [
    { degree: '1', quality: 'maj' },
    { degree: '♭4', quality: 'dim' },
    { degree: '♭6', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7' },
    { degree: '♭2', quality: 'min(maj7)' },
    { degree: '♭3', quality: 'dom7' },
    { degree: '♭4', quality: 'maj7(#5)' },
    { degree: '5', quality: 'dim7' },
    { degree: '♭6', quality: 'maj7' },
    { degree: '♭7', quality: 'min7(♭5)' },
  ],
  extraSevenths: [
    { degree: '1', quality: 'dom7(#5)' },
    { degree: '♭4', quality: 'dim7' },
    { degree: '♭4', quality: 'dim(maj7)' },
    { degree: '♭6', quality: 'maj7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min7(♭9)' },
    { degree: '♭2', quality: 'min(maj9)' },
    { degree: '♭3', quality: 'dom7(♭9)' },
    { degree: '♭4', quality: 'maj7(#5#9)' },
    { degree: '5', quality: 'dim7(♭9)' },
    { degree: '♭6', quality: 'maj9' },
    { degree: '♭7', quality: 'min9(♭5)' },
  ],
  extraNinths: [
    { degree: '1', quality: 'dom7(#9)' },
    { degree: '1', quality: 'dom7(♭9)' },
    { degree: '1', quality: 'dom7(#5♭9)' },
    { degree: '1', quality: 'dom7(#5#9)' },
    { degree: '♭6', quality: 'maj9(#5)' },
  ],
};

const melodicMinorSharp4: ModeChordScales = {
  modeSlug: 'melodicminor#4',
  modeName: 'Melodic Minor #4',
  intervals: '1, 2, ♭3, #4, 5, 6, 7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '2', quality: 'maj' },
    { degree: '♭3', quality: 'aug' },
    { degree: '#4', quality: 'dim' },
    { degree: '5', quality: 'maj' },
    { degree: '6', quality: 'dim' },
    { degree: '7', quality: 'min' },
  ],
  extraTriads: [
    { degree: '♭3', quality: 'dim' },
    { degree: '5', quality: 'aug' },
    { degree: '7', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'min(maj7)' },
    { degree: '2', quality: 'dom7' },
    { degree: '♭3', quality: 'maj7(#5)' },
    { degree: '#4', quality: 'dim7' },
    { degree: '5', quality: 'maj7' },
    { degree: '6', quality: 'min7(♭5)' },
    { degree: '7', quality: 'min7' },
  ],
  extraSevenths: [
    { degree: '♭3', quality: 'dim7' },
    { degree: '5', quality: 'maj7(#5)' },
    { degree: '7', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'min(maj9)' },
    { degree: '2', quality: 'dom7(♭9)' },
    { degree: '♭3', quality: 'maj7(#5#9)' },
    { degree: '#4', quality: 'dim7(♭9)' },
    { degree: '5', quality: 'maj9' },
    { degree: '6', quality: 'min9(♭5)' },
    { degree: '7', quality: 'min7(♭9)' },
  ],
  extraNinths: [
    { degree: '5', quality: 'maj9(#5)' },
    { degree: '7', quality: 'dom7(#5♭9)' },
  ],
};

const mixolydianFlat2: ModeChordScales = {
  modeSlug: 'mixolydian♭2',
  modeName: 'Mixolydian ♭2',
  intervals: '1, ♭2, 3, 4, 5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '♭2', quality: 'aug' },
    { degree: '3', quality: 'dim' },
    { degree: '4', quality: 'maj' },
    { degree: '5', quality: 'dim' },
    { degree: '6', quality: 'min' },
    { degree: '♭7', quality: 'min' },
  ],
  extraTriads: [
    { degree: '♭2', quality: 'dim' },
    { degree: '4', quality: 'aug' },
    { degree: '6', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'dom7' },
    { degree: '♭2', quality: 'maj7(#5)' },
    { degree: '3', quality: 'dim7' },
    { degree: '4', quality: 'maj7' },
    { degree: '5', quality: 'min7(♭5)' },
    { degree: '6', quality: 'min7' },
    { degree: '♭7', quality: 'min(maj7)' },
  ],
  extraSevenths: [
    { degree: '♭2', quality: 'dim7' },
    { degree: '4', quality: 'maj7(#5)' },
    { degree: '6', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'dom7(♭9)' },
    { degree: '♭2', quality: 'maj7(#5#9)' },
    { degree: '3', quality: 'dim7(♭9)' },
    { degree: '4', quality: 'maj9' },
    { degree: '5', quality: 'min9(♭5)' },
    { degree: '6', quality: 'min7(♭9)' },
    { degree: '♭7', quality: 'min(maj9)' },
  ],
  extraNinths: [
    { degree: '4', quality: 'maj9(#5)' },
    { degree: '6', quality: 'dom7(#5♭9)' },
  ],
};

const lydianAugmentedSharp2: ModeChordScales = {
  modeSlug: 'lydianaugmented#2',
  modeName: 'Lydian Augmented #2',
  intervals: '1, ♯2, 3, ♯4, ♯5, 6, 7',
  triads: [
    { degree: '1', quality: 'aug' },
    { degree: '#2', quality: 'dim' },
    { degree: '3', quality: 'maj' },
    { degree: '#4', quality: 'dim' },
    { degree: '#5', quality: 'min' },
    { degree: '6', quality: 'min' },
    { degree: '7', quality: 'maj' },
  ],
  extraTriads: [
    { degree: '1', quality: 'dim' },
    { degree: '3', quality: 'aug' },
    { degree: '#5', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7(#5)' },
    { degree: '#2', quality: 'dim7' },
    { degree: '3', quality: 'maj7' },
    { degree: '#4', quality: 'min7(♭5)' },
    { degree: '#5', quality: 'min7' },
    { degree: '6', quality: 'min(maj7)' },
    { degree: '7', quality: 'dom7' },
  ],
  extraSevenths: [
    { degree: '1', quality: 'dim7' },
    { degree: '3', quality: 'maj7(#5)' },
    { degree: '#5', quality: 'dom7(#5)' },
  ],
  ninths: [
    { degree: '1', quality: 'maj7(#5#9)' },
    { degree: '#2', quality: 'dim7(♭9)' },
    { degree: '3', quality: 'maj9' },
    { degree: '#4', quality: 'min9(♭5)' },
    { degree: '#5', quality: 'min7(♭9)' },
    { degree: '6', quality: 'min(maj9)' },
    { degree: '7', quality: 'dom7(♭9)' },
  ],
  extraNinths: [
    { degree: '3', quality: 'maj9(#5)' },
    { degree: '#5', quality: 'dom7(#5♭9)' },
  ],
};

const locrianDoubleFlat7: ModeChordScales = {
  modeSlug: 'locrian𝄫7',
  modeName: 'Locrian 𝄫7',
  intervals: '1, ♭2, ♭3, 4, ♭5, ♭6, 𝄫7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '♭2', quality: 'maj' },
    { degree: '♭3', quality: 'dim' },
    { degree: '4', quality: 'min' },
    { degree: '♭5', quality: 'min' },
    { degree: '♭6', quality: 'maj' },
    { degree: '𝄫7', quality: 'aug' },
  ],
  extraTriads: [
    { degree: '♭2', quality: 'aug' },
    { degree: '4', quality: 'maj' },
    { degree: '𝄫7', quality: 'dim' },
  ],
  sevenths: [
    { degree: '1', quality: 'dim7' },
    { degree: '♭2', quality: 'maj7' },
    { degree: '♭3', quality: 'min7(♭5)' },
    { degree: '4', quality: 'min7' },
    { degree: '♭5', quality: 'min(maj7)' },
    { degree: '♭6', quality: 'dom7' },
    { degree: '𝄫7', quality: 'maj7(#5)' },
  ],
  extraSevenths: [
    { degree: '♭2', quality: 'maj7(#5)' },
    { degree: '4', quality: 'dom7(#5)' },
    { degree: '𝄫7', quality: 'dim7' },
  ],
  ninths: [
    { degree: '1', quality: 'dim7(♭9)' },
    { degree: '♭2', quality: 'maj9' },
    { degree: '♭3', quality: 'min9(♭5)' },
    { degree: '4', quality: 'min7(♭9)' },
    { degree: '♭5', quality: 'min(maj9)' },
    { degree: '♭6', quality: 'dom7(♭9)' },
    { degree: '𝄫7', quality: 'maj7(#5#9)' },
  ],
  extraNinths: [
    { degree: '♭2', quality: 'maj9(#5)' },
    { degree: '4', quality: 'dom7(#5♭9)' },
  ],
};

// ─────────────────────────────────────────────
// DOUBLE HARMONIC MODES (29–35)
// ─────────────────────────────────────────────

const doubleHarmonicMajor: ModeChordScales = {
  modeSlug: 'doubleharmonicmajor',
  modeName: 'Double Harmonic Major',
  intervals: '1, ♭2, 3, 4, 5, ♭6, 7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '♭2', quality: 'maj' },
    { degree: '3', quality: 'min' },
    { degree: '4', quality: 'min' },
    { degree: '5', quality: 'maj(♭5)' },
    { degree: '♭6', quality: 'aug' },
    { degree: '7', quality: 'sus2(♭5)' },
  ],
  extraTriads: [
    { degree: '1', quality: 'aug' },
    { degree: '3', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7' },
    { degree: '♭2', quality: 'maj7' },
    { degree: '3', quality: 'min6' },
    { degree: '4', quality: 'min(maj7)' },
    { degree: '5', quality: 'dom7(♭5)' },
    { degree: '♭6', quality: 'maj7(#5)' },
    { degree: '7', quality: 'sus2(♭5)add6' },
  ],
  extraSevenths: [
    { degree: '1', quality: 'maj7(#5)' },
    { degree: '♭2', quality: 'min7(♭5)' },
    { degree: '♭2', quality: 'min7' },
    { degree: '♭2', quality: 'dom7' },
    { degree: '♭2', quality: 'dim(maj7)' },
    { degree: '♭2', quality: 'minmaj7' },
    { degree: '3', quality: 'maj6' },
  ],
  ninths: [
    { degree: '1', quality: 'maj7 ♭9' },
    { degree: '♭2', quality: 'maj7#9' },
    { degree: '3', quality: 'min6 Add ♭9' },
    { degree: '4', quality: 'min(maj9)' },
    { degree: '5', quality: 'dom7(♭5♭9)' },
    { degree: '♭6', quality: 'maj9#5' },
    { degree: '7', quality: 'sus2(♭5)Add6♭9' },
  ],
};

const lydianSharp2Sharp6: ModeChordScales = {
  modeSlug: 'lydian#2#6',
  modeName: 'Lydian #2 #6',
  intervals: '1, ♯2, 3, ♯4, 5, ♯6, 7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '2', quality: 'min' },
    { degree: '♭3', quality: 'min' },
    { degree: '4', quality: 'maj' },
    { degree: '♭5', quality: 'aug' },
    { degree: '6', quality: 'dim' },
    { degree: '♭7', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7(♭5)' },
    { degree: '2', quality: 'min7' },
    { degree: '♭3', quality: 'min(maj7)' },
    { degree: '4', quality: 'dom7' },
    { degree: '♭5', quality: 'maj7(#5)' },
    { degree: '6', quality: 'dim7' },
  ],
  ninths: [],
};

const ultraphrygian: ModeChordScales = {
  modeSlug: 'ultraphrygian',
  modeName: 'Ultraphrygian',
  intervals: '1, ♭2, ♭3, ♭4, 5, ♭6, 𝄫7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '♭2', quality: 'min' },
    { degree: '♭3', quality: 'maj' },
    { degree: '♭4', quality: 'aug' },
    { degree: '5', quality: 'dim' },
    { degree: '♭6', quality: 'maj' },
    { degree: '♭7', quality: 'dim' },
  ],
  sevenths: [
    { degree: '1', quality: 'min7' },
    { degree: '♭2', quality: 'min(maj7)' },
    { degree: '♭3', quality: 'dom7' },
    { degree: '♭4', quality: 'maj7(#5)' },
    { degree: '5', quality: 'dim7' },
    { degree: '♭6', quality: 'maj7' },
    { degree: '♭7', quality: 'min7(♭5)' },
  ],
  ninths: [],
};

const doubleHarmonicMinor: ModeChordScales = {
  modeSlug: 'doubleharmonicminor',
  modeName: 'Double Harmonic Minor',
  intervals: '1, 2, ♭3, #4, 5, ♭6, 7',
  triads: [
    { degree: '1', quality: 'min' },
    { degree: '2', quality: 'maj' },
    { degree: '♭3', quality: 'aug' },
    { degree: '#4', quality: 'dim' },
    { degree: '5', quality: 'maj' },
    { degree: '6', quality: 'dim' },
    { degree: '7', quality: 'min' },
  ],
  sevenths: [
    { degree: '1', quality: 'min(maj7)' },
    { degree: '2', quality: 'dom7' },
    { degree: '♭3', quality: 'maj7(#5)' },
    { degree: '#4', quality: 'dim7' },
    { degree: '5', quality: 'maj7' },
    { degree: '6', quality: 'min7(♭5)' },
    { degree: '7', quality: 'min7' },
  ],
  ninths: [],
};

const oriental: ModeChordScales = {
  modeSlug: 'oriental',
  modeName: 'Oriental',
  intervals: '1, ♭2, 3, 4, ♭5, 6, ♭7',
  triads: [
    { degree: '1', quality: 'maj' },
    { degree: '♭2', quality: 'aug' },
    { degree: '3', quality: 'dim' },
    { degree: '4', quality: 'maj' },
    { degree: '5', quality: 'dim' },
    { degree: '6', quality: 'min' },
    { degree: '♭7', quality: 'min' },
  ],
  sevenths: [
    { degree: '1', quality: 'dom7' },
    { degree: '♭2', quality: 'maj7(#5)' },
    { degree: '3', quality: 'dim7' },
    { degree: '4', quality: 'maj7' },
    { degree: '5', quality: 'min7(♭5)' },
    { degree: '6', quality: 'min7' },
    { degree: '♭7', quality: 'min(maj7)' },
  ],
  ninths: [],
};

const ionianSharp2Sharp5: ModeChordScales = {
  modeSlug: 'ionian#2#5',
  modeName: 'Ionian #2 #5',
  intervals: '1, ♯2, 3, 4, ♯5, 6, 7',
  triads: [
    { degree: '1', quality: 'aug' },
    { degree: '#2', quality: 'dim' },
    { degree: '3', quality: 'maj' },
    { degree: '#4', quality: 'dim' },
    { degree: '#5', quality: 'min' },
    { degree: '6', quality: 'min' },
    { degree: '7', quality: 'maj' },
  ],
  sevenths: [
    { degree: '1', quality: 'maj7(#5)' },
    { degree: '#2', quality: 'dim7' },
    { degree: '3', quality: 'maj7' },
    { degree: '#4', quality: 'min7(♭5)' },
    { degree: '#5', quality: 'min7' },
    { degree: '6', quality: 'min(maj7)' },
    { degree: '7', quality: 'dom7' },
  ],
  ninths: [],
};

const locrianDoubleFlat3DoubleFlat7: ModeChordScales = {
  modeSlug: 'locrian𝄫3𝄫7',
  modeName: 'Locrian 𝄫3 𝄫7',
  intervals: '1, ♭2, 𝄫3, 4, ♭5, ♭6, 𝄫7',
  triads: [
    { degree: '1', quality: 'dim' },
    { degree: '♭2', quality: 'maj' },
    { degree: '♭3', quality: 'dim' },
    { degree: '4', quality: 'min' },
    { degree: '♭5', quality: 'min' },
    { degree: '♭6', quality: 'maj' },
    { degree: '𝄫7', quality: 'aug' },
  ],
  sevenths: [
    { degree: '1', quality: 'dim7' },
    { degree: '♭2', quality: 'maj7' },
    { degree: '♭3', quality: 'min7(♭5)' },
    { degree: '4', quality: 'min7' },
    { degree: '♭5', quality: 'min(maj7)' },
    { degree: '♭6', quality: 'dom7' },
    { degree: '𝄫7', quality: 'maj7(#5)' },
  ],
  ninths: [],
};

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

export const CHORD_SCALE_DATA: ModeChordScales[] = [
  // Diatonic (1–7)
  lydian,
  ionian,
  mixolydian,
  dorian,
  aeolian,
  phrygian,
  locrian,
  // Harmonic Minor (8–14)
  harmonicMinor,
  locrianNat6,
  ionianSharp5,
  dorianSharp4,
  phrygianDominant,
  lydianSharp2,
  alteredDiminished,
  // Melodic Minor (15–21)
  melodicMinor,
  dorianFlat2,
  lydianAugmented,
  lydianDominant,
  mixolydianFlat6,
  locrianNat2,
  alteredDominant,
  // Harmonic Major (22–28)
  harmonicMajor,
  dorianFlat5,
  alteredDominantNat5,
  melodicMinorSharp4,
  mixolydianFlat2,
  lydianAugmentedSharp2,
  locrianDoubleFlat7,
  // Double Harmonic (29–35)
  doubleHarmonicMajor,
  lydianSharp2Sharp6,
  ultraphrygian,
  doubleHarmonicMinor,
  oriental,
  ionianSharp2Sharp5,
  locrianDoubleFlat3DoubleFlat7,
];

const chordScaleMap = new Map<string, ModeChordScales>();
CHORD_SCALE_DATA.forEach((m) => chordScaleMap.set(m.modeSlug, m));

export function getChordScales(modeSlug: string): ModeChordScales | undefined {
  return chordScaleMap.get(modeSlug);
}
