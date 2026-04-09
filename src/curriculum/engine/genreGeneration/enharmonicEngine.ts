/**
 * enharmonicEngine.ts — Single source of truth for note spelling in the genre curriculum.
 * Re-exports the canonical KEY_NOTE_NAMES table and midiToPitchName function.
 */

export {
  KEY_NOTE_NAMES,
  MIDI_ROOT_TO_KEY,
  midiToPitchName,
} from './resolveStepContent';
