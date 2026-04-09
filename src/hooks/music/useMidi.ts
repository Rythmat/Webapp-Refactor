import { Midi } from '@tonejs/midi';
import { useEffect, useMemo, useState } from 'react';

export const useMidi = (file: File | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [midiData, setMidiData] = useState<Midi | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Resets the error state.
    setError(null);

    /**
     * Parses the MIDI file and sets the midiData state.
     * @returns void
     */
    const parseMidiFile = async () => {
      try {
        if (!file) {
          return;
        }

        setIsLoading(true);

        // Read the file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Parse the MIDI data
        const midi = new Midi(arrayBuffer);
        setMidiData(midi);
      } catch (err) {
        setError(
          `Failed to parse MIDI file: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    // Parses the MIDI file if a file is provided.
    if (file) {
      parseMidiFile();
    }
  }, [file]);

  return useMemo(
    () => ({ data: midiData, isLoading, error }),
    [midiData, isLoading, error],
  );
};
