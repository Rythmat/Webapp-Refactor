import { KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import { usePlayNote } from '@/contexts/PianoContext';

type ChordProgression = number[][];
type Melody = number[];

interface MusicalFormConfig {
  typingMelody?: Melody;
  successProgression?: ChordProgression;
  failureProgression?: ChordProgression;
  autofillProgression?: ChordProgression;
}

interface MusicalInputProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}


export const useMusicalForm = (config: MusicalFormConfig = {}) => {
  const {
    typingMelody = [60,56,51,56,62,58,53,58,64,60,55,60,62,60,55,60,58,56,51,48,55,53,50,46,48,52,62,55,64,62,67], 
    successProgression = [
      [55, 50, 48, 44, 41, 36, 29],
      [53],
      [52],
      [50],
      [52, 48, 43, 23]
    ], // Default C major progression
    failureProgression = [
      [74, 67],
      [66, 73],
      [63, 70],
      [62, 69],
    ], // Default minor progression
    autofillProgression = [
      [65, 63, 58, 53, 49, 42],
      [63, 56, 53, 56, 41],
      [62, 60, 55, 50, 46, 39],
    ], // Default jazz progression
  } = config;

  const noteIndex = useRef<number | null>(null);
  const previousValue = useRef<string>('');
  const playNote = usePlayNote();
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const playAudioFile = useCallback((filePath: string) => {
    if (!filePath || typeof window === 'undefined') {
      return;
    }

    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const rawBasePath = import.meta.env.BASE_URL ?? '/';
    const basePath =
      rawBasePath === '/'
        ? ''
        : rawBasePath.endsWith('/')
          ? rawBasePath.slice(0, -1)
          : rawBasePath;
    const targetSrc = `${basePath}${normalizedPath}`;
    const absoluteSrc = new URL(targetSrc, window.location.origin).href;

    const audioElement = audioElementRef.current ?? new Audio();

    audioElement.pause();

    if (audioElement.src !== absoluteSrc) {
      audioElement.src = absoluteSrc;
    }

    audioElement.currentTime = 0;

    const playPromise = audioElement.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((error) => {
        console.warn(`Unable to play audio file: ${absoluteSrc}`, error);
      });
    }

    audioElementRef.current = audioElement;
  }, []);

  const playAcceptedAudio = useCallback(() => {
    playAudioFile('/accepted.wav');
  }, [playAudioFile]);

  const playWelcomeAudio = useCallback(() => {
    playAudioFile('/welcome.mp3');
  }, [playAudioFile]);

  const playCompletionAudio = useCallback(() => {
    playAudioFile('/completion.wav');
  }, [playAudioFile]);

  const playRejectedAudio = useCallback(() => {
    playAudioFile('/rejected.wav');
  }, [playAudioFile]);

  const playProgression = useCallback(
    (progression: number[][]) => {
      progression.forEach((chord, chordIndex) => {
        chord.forEach((note, noteIndex) => {
          setTimeout(() => playNote(note), chordIndex * 500 + noteIndex * 32);
        });
      });
    },
    [playNote],
  );

  const playSuccessChordProgression = useCallback(() => {
    playProgression(successProgression);
  }, [playProgression, successProgression]);

  const playFailureChordProgression = useCallback(() => {
    playProgression(failureProgression);
  }, [playProgression, failureProgression]);

  const playTypingNote = useCallback(() => {
    if (typingMelody.length === 0) return;

    const currentIndex = noteIndex.current ?? -1;
    const nextIndex = (currentIndex + 1) % typingMelody.length;
    const note = typingMelody[nextIndex];

    playNote(note);
    noteIndex.current = nextIndex;
  }, [playNote, typingMelody]);

  const checkAutofill = useCallback(
    (currentValue: string, prevValue: string) => {
      if (
        currentValue.length > prevValue.length &&
        currentValue.length - prevValue.length > 1
      ) {
        playAcceptedAudio();
      }
    },
    [playAcceptedAudio],
  );

  const createInputProps = useCallback(
    (
      fieldOnChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    ): MusicalInputProps => ({
      onChange: (e) => {
        fieldOnChange(e);
        checkAutofill(e.target.value, previousValue.current);
        previousValue.current = e.target.value;
      },
      onKeyDown: playTypingNote,
    }),
    [checkAutofill, playTypingNote],
  );

  useEffect(() => {
    return () => {
      if (!audioElementRef.current) {
        return;
      }

      audioElementRef.current.pause();
      audioElementRef.current.src = '';
      audioElementRef.current = null;
    };
  }, []);

  return {
    playAudioFile,
    playCompletionAudio,
    autofillProgression,
    playWelcomeAudio,
    playSuccessProgression: playWelcomeAudio,
    playFailureProgression: playRejectedAudio,
    playAutofillProgression: playAcceptedAudio,
    playSuccessChordProgression,
    playFailureChordProgression,
    createInputProps,
    playTypingNote,
  };
};
