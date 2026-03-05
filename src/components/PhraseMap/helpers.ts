import { PhraseBarNote } from '@/hooks/data';

export function getNoteDuration(note: PhraseBarNote, beatsPerBar: number) {
  switch (note.noteDuration) {
    case 'whole':
      return 1 * beatsPerBar;
    case 'dotted_whole':
      return 1.5 * beatsPerBar;
    case 'half':
      return 0.5 * beatsPerBar;
    case 'dotted_half':
      return 0.75 * beatsPerBar;
    case 'quarter':
      return 0.25 * beatsPerBar;
    case 'dotted_quarter':
      return 0.375 * beatsPerBar;
    case 'eighth':
      return 0.125 * beatsPerBar;
    case 'dotted_eighth':
      return 0.1875;
    case 'sixteenth':
      return 0.0625 * beatsPerBar;
    case 'dotted_sixteenth':
      return 0.09375 * beatsPerBar;
    case 'thirtysecond':
      return 0.03125 * beatsPerBar;
    default:
      return 0;
  }
}
