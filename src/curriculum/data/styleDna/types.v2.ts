import type { StyleSubProfile } from '../../types/activity.v2';

export interface SubProfileConfig {
  id: StyleSubProfile;
  label: string; // e.g. 'James Brown / Parliament Funkadelic'
  feel: string; // human description
  instruments: {
    melody: string; // e.g. 'Electric Piano 1'
    chords: string;
    bass: string;
    texture?: string;
  };
  swing: 'straight' | 'subtle_16th' | 'heavy_16th' | 'variable';
  tempoRange: [number, number];
}

export interface StabRules {
  duration: 120; // hard rule — always 120t
  eOf1Rule: true; // tick 120 requires tick 0
  groupingAlternation: true; // 16ths and 8ths must alternate
  maxIntraBarGap: number; // max ticks between stabs in a bar
  humanizationRange: [number, number]; // [min, max] ticks late
}

export interface MelodyRules {
  phraseShape: 'cluster_resolve';
  longNotePosition: 'phrase_end';
  motivicStructure: string;
  dualFunctionality: {
    p3Weight: number; // 0-1, genre-specific
    blueNotePosition: 'final_phrase_only' | 'anywhere';
  };
  dorianCharacterNote: boolean;
}

export interface DualFunctionalityWeights {
  commonTone: number; // P1 ~0.95
  parentMode: number; // P2 ~0.90
  borrowedTone: number; // P3 genre-specific
  chromatic: number; // P4 ~0.02
  defaultBehavior: 'parent_mode' | 'chord_targeting';
}

export interface GenreStyleDnaV2 {
  genre: string;
  subProfiles: SubProfileConfig[];
  stabRules: StabRules;
  melodyRules: MelodyRules;
  dualFunctionality: DualFunctionalityWeights;
}
