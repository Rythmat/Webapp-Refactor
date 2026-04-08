import type { GenreStyleDnaV2 } from './types.v2';

const funkStyleDna: GenreStyleDnaV2 = {
  genre: 'funk',
  subProfiles: [
    {
      id: 'l1a',
      label: 'James Brown / Parliament Funkadelic',
      feel: 'Raw, locked, mono-timbral. Everything serves the pocket.',
      instruments: {
        melody: 'Electric Piano 1',
        chords: 'Drawbar Organ',
        bass: 'Electric Bass (finger)',
      },
      swing: 'heavy_16th',
      tempoRange: [84, 96],
    },
    // l1b, l2a, l2b, l3a, l3b — add after L1a is confirmed working
  ],
  stabRules: {
    duration: 120,
    eOf1Rule: true,
    groupingAlternation: true,
    maxIntraBarGap: 1200,
    humanizationRange: [26, 102],
  },
  melodyRules: {
    phraseShape: 'cluster_resolve',
    longNotePosition: 'phrase_end',
    motivicStructure: 'ABABAB_prime',
    dualFunctionality: {
      p3Weight: 0.05,
      blueNotePosition: 'final_phrase_only',
    },
    dorianCharacterNote: true,
  },
  dualFunctionality: {
    commonTone: 0.95,
    parentMode: 0.90,
    borrowedTone: 0.05,
    chromatic: 0.02,
    defaultBehavior: 'parent_mode',
  },
};

export default funkStyleDna;
