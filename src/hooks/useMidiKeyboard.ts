import { useEffect, useCallback, useRef } from 'react';

const KEY_MAP: Record<string, string> = {
  'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4',
  't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4',
  'k': 'C5', 'o': 'C#5', 'l': 'D5', 'p': 'D#5', ';': 'E5',
};

type UseMidiKeyboardProps = {
  onNoteOn: (note: string) => void;
  onNoteOff: (note: string) => void;
};

export const useMidiKeyboard = ({ onNoteOn, onNoteOff }: UseMidiKeyboardProps) => {
  const pressedKeys = useRef(new Set<string>());

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore key presses in input fields
    if ((event.target as HTMLElement).tagName === 'INPUT') return;
    
    const key = event.key.toLowerCase();
    if (pressedKeys.current.has(key) || event.metaKey || event.ctrlKey || event.altKey) return;

    const note = KEY_MAP[key];
    if (note) {
      event.preventDefault();
      pressedKeys.current.add(key);
      onNoteOn(note);
    }
  }, [onNoteOn]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if ((event.target as HTMLElement).tagName === 'INPUT') return;

    const key = event.key.toLowerCase();
    const note = KEY_MAP[key];
    if (note) {
      event.preventDefault();
      pressedKeys.current.delete(key);
      onNoteOff(note);
    }
  }, [onNoteOff]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
};