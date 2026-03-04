import { MODE_NAMES, MODE_INTERVAL_LABELS } from './modeHelpers';

export interface RelativeKeyEntry {
  colorName: string;
  keyRoot: string;
  urlParam: string;
  scaleNotes: string[];
}

export const RELATIVE_MODES_CONTENT: RelativeKeyEntry[] = [
  { colorName: 'Red',        keyRoot: 'C',  urlParam: 'c',      scaleNotes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'] },
  { colorName: 'Vermillion', keyRoot: 'G',  urlParam: 'g',      scaleNotes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] },
  { colorName: 'Orange',     keyRoot: 'D',  urlParam: 'd',      scaleNotes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] },
  { colorName: 'Amber',      keyRoot: 'A',  urlParam: 'a',      scaleNotes: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'] },
  { colorName: 'Green',      keyRoot: 'E',  urlParam: 'e',      scaleNotes: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'] },
  { colorName: 'Sage',       keyRoot: 'B',  urlParam: 'b',      scaleNotes: ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'] },
  { colorName: 'Teal',       keyRoot: 'F#', urlParam: 'fsharp',  scaleNotes: ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'] },
  { colorName: 'Blue',       keyRoot: 'Db', urlParam: 'dflat',   scaleNotes: ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'] },
  { colorName: 'Indigo',     keyRoot: 'Ab', urlParam: 'aflat',   scaleNotes: ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'] },
  { colorName: 'Purple',     keyRoot: 'Eb', urlParam: 'eflat',   scaleNotes: ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'] },
  { colorName: 'Magenta',    keyRoot: 'Bb', urlParam: 'bflat',   scaleNotes: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'] },
  { colorName: 'Pink',       keyRoot: 'F',  urlParam: 'f',       scaleNotes: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'] },
];

export const getRelativeMode = (scaleNotes: string[], modeIndex: number) => {
  const rotated = [...scaleNotes.slice(modeIndex), ...scaleNotes.slice(0, modeIndex)];
  return {
    root: rotated[0],
    modeName: MODE_NAMES[modeIndex],
    fullName: `${rotated[0]} ${MODE_NAMES[modeIndex]}`,
    notes: rotated,
    intervals: MODE_INTERVAL_LABELS[modeIndex],
  };
};

export const findByUrlParam = (param: string): RelativeKeyEntry | undefined =>
  RELATIVE_MODES_CONTENT.find((e) => e.urlParam === param);
