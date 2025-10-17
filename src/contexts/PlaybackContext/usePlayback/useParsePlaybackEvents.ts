import { useMemo } from 'react';
import {
  InputType,
  isNoteSequence,
  parseNoteSequence,
  isPhraseMap,
  parsePhraseMap,
  isMidiTrack,
  parseMidi,
  PlaybackEvent,
} from '../helpers';

export const useParsePlaybackEvents = (input: InputType): PlaybackEvent[] => {
  const events = useMemo(() => {
    if (!input) {
      return [];
    }

    if (isNoteSequence(input)) {
      // Input is a NoteSequence
      return parseNoteSequence(input);
    }

    if (isPhraseMap(input)) {
      // Input is a PhraseMap
      return parsePhraseMap(input);
    }

    if (isMidiTrack(input)) {
      // Input is a MidiTrack
      return parseMidi(input);
    }

    return [];
  }, [input]);

  return useMemo(() => [...events].sort((a, b) => a.time - b.time), [events]);
};

export const useParseBPM = (
  input: InputType,
): {
  bpm: number;
  beatUnit: number;
  beatsPerBar: number;
} => {
  return useMemo(() => {
    if (!input) {
      return {
        bpm: 120,
        beatsPerBar: 4,
        beatUnit: 4,
      };
    }

    if (isNoteSequence(input)) {
      return {
        bpm: input.tempo,
        beatsPerBar: 4,
        beatUnit: 4,
      };
    }

    if (isPhraseMap(input)) {
      return {
        bpm: input.beatsPerMinute,
        beatUnit: 1,
        beatsPerBar: input.beatsPerBar,
      };
    }

    if (isMidiTrack(input)) {
      return {
        bpm: 120,
        beatsPerBar: 4,
        beatUnit: 4,
      };
    }

    return {
      bpm: 120,
      beatsPerBar: 4,
      beatUnit: 4,
    };
  }, [input]);
};
