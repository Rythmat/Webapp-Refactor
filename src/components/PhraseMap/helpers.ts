import { PhraseBarNote } from '@/hooks/data';

export function getNoteDuration(note: PhraseBarNote, beatsPerBar: number) {
  switch (note.noteDuration) {
    case 'whole':
      return 1 * beatsPerBar;
    case 'half':
      return 0.5 * beatsPerBar;
    case 'quarter':
      return 0.25 * beatsPerBar;
    case 'eighth':
      return 0.125 * beatsPerBar;
    case 'sixteenth':
      return 0.0625 * beatsPerBar;
    default:
      return 0;
  }
}
