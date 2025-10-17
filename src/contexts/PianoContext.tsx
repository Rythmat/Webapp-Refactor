import {
  createContext,
  useState,
  useRef,
  useCallback,
  useContext,
  useEffect,
} from 'react';
import * as Tone from 'tone';
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
  const synth = useRef<Tone.PolySynth | null>(null);

  const initialize = useCallback(() => {
    // Create a polyphonic synth for playing multiple notes simultaneously
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();

    // Set a much lower volume (negative values in dB)
    synth.current.volume.value = -20; // Significantly lower volume

    return () => {
      if (synth.current) {
        synth.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    // Clean up when component unmounts
    const currentSynth = synth.current;

    return () => {
      if (currentSynth) {
        currentSynth.dispose();
      }
    };
  }, [initialize]);

  const playNote = async (note: number) => {
    if (!synth.current) {
      initialize();
    }

    try {
      // Start audio context if it's not started yet
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }

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
      synth.current?.triggerAttackRelease(noteName, duration);

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
