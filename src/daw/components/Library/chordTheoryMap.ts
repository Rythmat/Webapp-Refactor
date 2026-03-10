/** Maps chord qualities to their most relevant mode and a short description. */
export const CHORD_THEORY: Record<
  string,
  { mode: string; description: string }
> = {
  major: {
    mode: 'ionian',
    description: 'Built on the 1st degree of the major scale',
  },
  minor: {
    mode: 'aeolian',
    description: 'Built on the 6th degree of the major scale',
  },
  dominant7: {
    mode: 'mixolydian',
    description: 'The V chord — creates tension wanting to resolve',
  },
  minor7: {
    mode: 'dorian',
    description: 'A minor chord with a jazzy b7 extension',
  },
  major7: {
    mode: 'ionian',
    description: 'Dreamy and open — the tonic with a major 7th',
  },
  diminished: {
    mode: 'locrian',
    description: 'Unstable and tense — wants to resolve up a half step',
  },
  augmented: {
    mode: 'ionianSharp5',
    description: 'Raised 5th creates a symmetrical, floating sound',
  },
  sus2: {
    mode: 'ionian',
    description: 'Open and ambiguous — the 3rd is replaced by the 2nd',
  },
  sus4: {
    mode: 'mixolydian',
    description: 'Suspended — the 4th wants to resolve down to the 3rd',
  },
  minor7b5: {
    mode: 'locrian',
    description: 'Half-diminished — common in jazz ii-V-i progressions',
  },
  diminished7: {
    mode: 'alteredDiminished',
    description: 'Fully diminished — every note is a minor 3rd apart',
  },
  minormajor7: {
    mode: 'harmonicMinor',
    description: 'Dark and dramatic — minor with a natural 7th',
  },
  major6: {
    mode: 'ionian',
    description: 'Bright and warm — adds the 6th for color',
  },
  minor6: {
    mode: 'dorian',
    description: 'The Dorian minor — natural 6th gives it a jazzy lift',
  },
  dominant9: {
    mode: 'mixolydian',
    description: 'Rich dominant sound — adds the 9th for extra color',
  },
  'major7#5': {
    mode: 'ionianSharp5',
    description: 'Augmented with major 7th — lush harmonic minor color',
  },
  dominant7sus4: {
    mode: 'mixolydian',
    description: 'Suspended dominant — delays resolution of the 3rd',
  },
  dominant7b5: {
    mode: 'lydianDominant',
    description: 'Altered dominant — tritone substitution flavor',
  },
  'dominant7#5': {
    mode: 'phrygianDominant',
    description: 'Augmented dominant — heightened tension from harmonic minor',
  },
  Add2: {
    mode: 'ionian',
    description: 'Major triad with an added 2nd for shimmer',
  },
  Add4: {
    mode: 'ionian',
    description: 'Major triad with an added 4th — open and folk-like',
  },
  quartal: {
    mode: 'dorian',
    description: 'Built in 4ths — modern and ambiguous harmony',
  },
  // 9th chords
  major9: {
    mode: 'ionian',
    description: 'Major 7th with added 9th — lush, jazzy resolution',
  },
  minor9: {
    mode: 'dorian',
    description: 'Minor 7th with natural 9th — smooth, soulful',
  },
  minor7b9: {
    mode: 'phrygian',
    description: 'Dark minor with \u266D9 tension — Spanish, flamenco flavor',
  },
  minormajor9: {
    mode: 'melodicMinor',
    description: 'Minor with major 7th and 9th — dramatic jazz standard sound',
  },
  'major9#5': {
    mode: 'lydianAugmented',
    description: 'Augmented major 9th — bright, floating, impressionistic',
  },
  diminished7b9: {
    mode: 'alteredDiminished',
    description: 'Fully diminished with \u266D9 — maximum chromatic tension',
  },
  minor7b5b9: {
    mode: 'locrian',
    description: 'Half-diminished with \u266D9 — dark tension for jazz ii-V-i',
  },
  'major7#9': {
    mode: 'lydianSharp2',
    description: 'Major 7th with #9 — exotic harmonic minor color',
  },
  'dominant7#5b9': {
    mode: 'phrygianDominant',
    description:
      'Dominant with #5 and \u266D9 — intense harmonic minor tension',
  },
  'dominant9#5': {
    mode: 'mixolydianFlat6',
    description: 'Augmented dominant 9th — intense, wide harmonic color',
  },
  minor9b5: {
    mode: 'locrianNat2',
    description: 'Half-diminished 9th — expanded jazz minor ii chord',
  },
  'dominant7#9': {
    mode: 'alteredDominantNat5',
    description: 'The "Hendrix chord" — bluesy, psychedelic dominant',
  },
  'dominant7#5#9': {
    mode: 'altered',
    description: 'Fully altered dominant — all tensions raised, jazz fusion',
  },
  'major7#5#9': {
    mode: 'lydianAugmentedSharp2',
    description: 'Augmented major with #9 — exotic, rare extended harmony',
  },
  minor6add9: {
    mode: 'dorian',
    description: 'Minor 6/9 — warm Dorian color, common in soul and jazz',
  },
  major6add9: {
    mode: 'ionian',
    description:
      'Major 6/9 — bright, warm ending chord common in jazz and bossa nova',
  },
  diminishedmajor7: {
    mode: 'lydianSharp2',
    description:
      'Diminished triad with major 7th — dramatic harmonic minor tension',
  },
  // Additional 7th chords with theory context
  dominant7b9: {
    mode: 'phrygianDominant',
    description: 'Dominant with \u266D9 — strong V chord in harmonic minor',
  },
  'major7#11': {
    mode: 'lydian',
    description: 'Lydian sound — the #11 adds bright, floating tension',
  },
  'dominant7#11': {
    mode: 'lydianDominant',
    description: 'Lydian dominant — bright tension, jazz tritone sub flavor',
  },
  major7b5: {
    mode: 'lydian',
    description: 'Major 7th with \u266D5 — Lydian color with altered 5th',
  },
  'minor7#5': {
    mode: 'aeolian',
    description: 'Minor 7th with raised 5th — unusual, modal jazz voicing',
  },
  major7sus2: {
    mode: 'ionian',
    description: 'Major 7th with suspended 2nd — open and ethereal',
  },
  major7sus4: {
    mode: 'ionian',
    description: 'Major 7th with suspended 4th — open and unresolved',
  },
  dominant7sus2: {
    mode: 'mixolydian',
    description: 'Dominant sus2 — open, unresolved dominant tension',
  },
};

const DEFAULT_THEORY = {
  mode: 'ionian',
  description: 'A chord quality found across many musical contexts',
};

export function getChordTheory(quality: string): {
  mode: string;
  description: string;
} {
  return CHORD_THEORY[quality] ?? DEFAULT_THEORY;
}
