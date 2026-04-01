import { useEffect, useRef } from 'react';
import { SynthEngine } from '../audio/SynthEngine';

// QWERTY keyboard to MIDI note mapping
// Bottom row: ZXCVBNM = C3-B3 white keys
// Middle row: ASDFGHJKL = C4-E5 white keys
// Top row: QWERTYUIOP = C5-E6 white keys
// Black keys interspersed on rows above

const KEY_MAP: Record<string, number> = {
  // C4 octave (middle row)
  a: 60, // C4
  w: 61, // C#4
  s: 62, // D4
  e: 63, // D#4
  d: 64, // E4
  f: 65, // F4
  t: 66, // F#4
  g: 67, // G4
  y: 68, // G#4
  h: 69, // A4
  u: 70, // A#4
  j: 71, // B4
  k: 72, // C5
  o: 73, // C#5
  l: 74, // D5
  p: 75, // D#5
  ';': 76, // E5

  // C3 octave (bottom row)
  z: 48, // C3
  x: 50, // D3
  c: 52, // E3
  v: 53, // F3
  b: 55, // G3
  n: 57, // A3
  m: 59, // B3
};

export function useKeyboardShortcuts(
  engine: React.RefObject<SynthEngine | null>,
  onNoteOn?: (note: number) => void,
  onNoteOff?: (note: number) => void,
) {
  const activeKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const key = e.key.toLowerCase();
      const note = KEY_MAP[key];
      if (note === undefined) return;

      if (activeKeys.current.has(key)) return;
      activeKeys.current.add(key);

      engine.current?.noteOn(note, 0.8);
      onNoteOn?.(note);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const note = KEY_MAP[key];
      if (note === undefined) return;

      activeKeys.current.delete(key);
      engine.current?.noteOff(note);
      onNoteOff?.(note);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, onNoteOn, onNoteOff]);
}
