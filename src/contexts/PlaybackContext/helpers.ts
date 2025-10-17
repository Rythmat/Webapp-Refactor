import { Midi } from '@tonejs/midi';
import { v4 as uuidv4 } from 'uuid';
import { PhraseMap, NoteSequence } from '@/hooks/data';

export const isNoteSequence = (input: unknown): input is NoteSequence => {
  return typeof input === 'object' && input !== null && 'Notes' in input;
};

export const isPhraseMap = (input: unknown): input is PhraseMap => {
  return typeof input === 'object' && input !== null && 'PhraseBars' in input;
};

export const isMidiTrack = (
  input: unknown,
): input is Midi['tracks'][number] => {
  return typeof input === 'object' && input !== null && 'notes' in input;
};

export type InputType =
  | NoteSequence
  | PhraseMap
  | Midi['tracks'][number]
  | null
  | undefined;

export type PlaybackEvent = {
  id: string;
  type: 'note' | 'rest';
  midi: number;
  time: number;
  duration: number;
  velocity: number;
  color?: string | null;
};

/**
 * @param ticks - The number of ticks to convert to seconds
 * @param tempoBPM - The tempo of the music in beats per minute
 * @param ticksPerBeat - The number of ticks per beat
 * @returns The number of seconds equivalent to the input ticks
 * @description This function converts musical ticks to seconds for audio playback
The Math Behind Musical Time Conversion:
1. First we convert tempo (beats per minute) to beats per second
   - If tempo = 120 BPM, then beatsPerSecond = 120/60 = 2 beats/second

2. Then we get seconds per beat (inverse of beats per second)
   - If beatsPerSecond = 2, then secondsPerBeat = 1/2 = 0.5 seconds/beat

3. Then we get seconds per tick by dividing secondsPerBeat by ticks per beat
   - If ticksPerBeat = 480 and secondsPerBeat = 0.5
   - Then secondsPerTick = 0.5/480 ≈ 0.001042 seconds/tick

4. Finally multiply input ticks by secondsPerTick to get total seconds
   - If ticks = 960 (half note) and secondsPerTick = 0.001042
   - Then duration = 960 * 0.001042 = 1 second

Common Note Lengths (at 120 BPM, 480 ticks/beat):
- Whole note   = 1920 ticks = 2 seconds
- Half note    = 960 ticks  = 1 second
- Quarter note = 480 ticks  = 0.5 seconds
- Eighth note  = 240 ticks  = 0.25 seconds
The conversion from ticks to seconds is needed because:

1. Musical notation (MIDI) uses "ticks" as a time unit
   - Ticks are a musical unit that represents divisions of a beat
   - This makes it easy to represent musical timing independent of tempo

2. Audio playback (Tone.js) requires time in seconds
   - Audio engines work with absolute time values
   - They need to know exactly when to trigger sounds

3. Converting between systems
   - To play MIDI data through an audio engine, we must convert
     from the musical tick system to real-world seconds
   - This ensures notes play at the correct musical timing
   - The conversion depends on both tempo and ticks-per-beat

Example: At 120 BPM with 480 ticks/beat
   A quarter note (480 ticks) should play for 0.5 seconds
   A half note (960 ticks) should play for 1.0 seconds
 */
export const ticksToSeconds = (
  ticks: number,
  tempo: number,
  ticksPerBeat: number,
) => {
  const beatsPerSecond = tempo / 60; // Step 1: BPM to beats/second
  const secondsPerBeat = 1 / beatsPerSecond; // Step 2: Get seconds/beat
  const secondsPerTick = secondsPerBeat / ticksPerBeat; // Step 3: Get seconds/tick
  return ticks * secondsPerTick; // Step 4: Convert to total seconds
};

export const parseNoteSequence = (input: NoteSequence): PlaybackEvent[] => {
  return input.Notes.map((note) => ({
    id: note.id,
    type: 'note',
    midi: note.noteNumber,
    time: ticksToSeconds(
      note.startTimeInTicks,
      input.tempo,
      input.ticksPerBeat,
    ),
    duration: ticksToSeconds(
      note.durationInTicks,
      input.tempo,
      input.ticksPerBeat,
    ),
    velocity: note.velocity / 127,
    color: note.color,
  }));
};

const RHYTHM_MAP_NOTE_DURATIONS = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
};

export const parsePhraseMap = (input: PhraseMap): PlaybackEvent[] => {
  const events: PlaybackEvent[] = [];

  let currentTime = 0;
  const beatsPerBar = input.beatsPerBar;
  const secondsPerBeat = 60 / input.beatsPerMinute;
  const secondsPerBar = beatsPerBar * secondsPerBeat;

  // Process each bar
  input.PhraseBars.forEach((bar) => {
    let barTime = 0;

    // Process each note in the bar
    bar.PhraseBarNotes.forEach((note) => {
      const duration = RHYTHM_MAP_NOTE_DURATIONS[note.noteDuration];

      if (note.noteType === 'note') {
        note.noteNumbers.forEach((noteNumber, index) => {
          events.push({
            id: `${bar.id}-${note.id}-${index}`,
            type: 'note',
            time: currentTime + barTime,
            duration: duration * secondsPerBeat,
            midi: noteNumber,
            color: note.color || bar.color || input.color,
            velocity: 1,
          });
        });
      } else if (note.noteType === 'rest') {
        // Add a rest event to represent the silence with a placeholder midi value
        events.push({
          id: `${bar.id}-${note.id}-rest`,
          type: 'rest',
          time: currentTime + barTime,
          duration: duration * secondsPerBeat,
          midi: 0, // Placeholder value for rests
          color: note.color || bar.color || input.color,
          velocity: 0,
        });
      }

      barTime += duration * secondsPerBeat;
    });

    // Check if the bar is incomplete (doesn't use all available time)
    const barRemainingTime = secondsPerBar - barTime;
    if (barRemainingTime > 0.001) {
      // Add a small epsilon to account for floating point errors
      // Add an implicit rest for the remaining time in the bar
      events.push({
        id: `${bar.id}-implicit-rest`,
        type: 'rest',
        time: currentTime + barTime,
        duration: barRemainingTime,
        midi: 0,
        color: bar.color || input.color,
        velocity: 0,
      });
    }

    currentTime += secondsPerBar;
  });

  return events;
};

export const getPositionCountFromStartByActiveEvents = (
  phraseMap: PhraseMap,
  activeEvents: PlaybackEvent[],
): number => {
  if (!phraseMap || activeEvents.length === 0) {
    return 0;
  }

  // Sort active events by time to find the most recently triggered event
  const sortedActiveEvents = [...activeEvents].sort((a, b) => b.time - a.time);
  const latestEvent = sortedActiveEvents[0];

  const beatsPerBar = phraseMap.beatsPerBar;
  const secondsPerBeat = 60 / phraseMap.beatsPerMinute;
  const secondsPerBar = beatsPerBar * secondsPerBeat;

  // Calculate the current bar index based on the latest event time
  const currentBarIndex = Math.floor(latestEvent.time / secondsPerBar);

  // Calculate the relative time within the current bar
  const barStartTime = currentBarIndex * secondsPerBar;
  const relativeTime = latestEvent.time - barStartTime;

  // Calculate position within the bar (0-15 grid as in usePhrasePlayback)
  const totalPositions = 16; // 16 positions per bar as in usePhrasePlayback
  const positionLength = secondsPerBar / totalPositions;
  const currentPosition = Math.min(
    Math.floor(relativeTime / positionLength),
    totalPositions - 1,
  );

  // Convert to ticks - we need to calculate ticks per position
  // In a standard MIDI file with 480 ticks per beat:
  const ticksPerBeat = 480; // Standard MIDI ticks per beat
  const ticksPerBar = ticksPerBeat * beatsPerBar;
  const ticksPerPosition = ticksPerBar / totalPositions;

  // Calculate ticks based on bar and position
  const currentTicks =
    currentBarIndex * ticksPerBar + currentPosition * ticksPerPosition;

  return Math.floor(currentTicks);
};

export const parseMidi = (input: Midi['tracks'][number]): PlaybackEvent[] => {
  return input.notes.map((note) => ({
    id: uuidv4(),
    type: 'note',
    time: note.time,
    duration: note.duration,
    midi: note.midi,
    velocity: note.velocity,
  }));
};
