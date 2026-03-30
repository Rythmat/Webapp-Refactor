import { createContext, useState, useContext } from 'react';
import * as Tone from 'tone';
import {
  startEpSampler,
  triggerEpAttackRelease,
} from '@/audio/epSampler';
import { PlaybackEvent } from '@/contexts/PlaybackContext';

type PianoContextType = {
  notes: PlaybackEvent[];
  playNote: (note: number) => void;
};

const PianoContext = createContext<PianoContextType>({
  notes: [],
  playNote: () => {},
});

const PianoProvider = ({ children }: { children: React.ReactNode }) => {
  const [notes, setNotes] = useState<PlaybackEvent[]>([]);

  const playNote = async (note: number) => {
    try {
      await startEpSampler();

      // Convert MIDI note number to note name
      const noteName = Tone.Frequency(note, 'midi').toNote();

      // Generate a unique ID for this note instance
      const noteId = `note-${note}-${Date.now()}`;
      const duration = 0.3;

      // Add note to state
      setNotes((prevNotes) => [
        ...prevNotes,
        {
          duration,
          id: noteId,
          midi: note,
          note: noteName,
          time: Date.now(),
          type: 'note',
          velocity: 1,
        },
      ]);

      // Play the note with a duration of 1 second
      await triggerEpAttackRelease(noteName, duration, 0.8);

      // Remove the note from state after it finishes playing
      setTimeout(() => {
        setNotes((prevNotes) => prevNotes.filter((n) => n.id !== noteId));
      }, duration * 1000);
    } catch (err) {
      console.error('Failed to play note:', err);
    }
  };

  return (
    <PianoContext.Provider value={{ notes, playNote }}>
      {children}
    </PianoContext.Provider>
  );
};

const usePlayNote = () => {
  return useContext(PianoContext).playNote;
};

const usePlayingNotes = () => {
  return useContext(PianoContext).notes;
};

export { PianoContext, PianoProvider, usePlayNote, usePlayingNotes };
