// ── Jam Keyboard Input ───────────────────────────────────────────────────
// Maps QWERTY keyboard keys to MIDI note events for the Jam Room.
// Piano: two-row layout covering ~1.5 octaves (C4-F5).
// Drums: number keys 1-4 mapped to kick/snare/hihat/rim.
//
// Local audio always plays regardless of connection status.
// Network sending (`sendNote`) is gated by `enabled` (isConnected).

import { useEffect, useRef, useCallback } from 'react';
import { DrumEngine } from '@/components/Games/GrooveLab/DrumEngine';
import { useJamRoom } from './JamRoomProvider';
import { useJamRoomStore } from './jamRoomStore';
import { jamNoteOn, jamNoteOff, getLocalChannel } from './jamSoundFont';
import { DRUM_MIDI_MAP, type JamInstrument, type DrumSound } from './types';

// Piano key mapping: bottom row = white keys, top row = black keys
// C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71, C5=72, D5=74, E5=76, F5=77
const PIANO_KEY_MAP: Record<string, number> = {
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
  "'": 77, // F5
};

// Drum key mapping
const DRUM_KEY_MAP: Record<string, DrumSound> = {
  '1': 'kick',
  '2': 'snare',
  '3': 'hihat',
  '4': 'rim',
  // Also allow ASDF for drums
  a: 'kick',
  s: 'snare',
  d: 'hihat',
  f: 'rim',
};

/**
 * Hook that handles keyboard input for the Jam Room.
 * Plays audio locally always; sends note messages to network only when enabled.
 * @param onLocalNote Optional callback for waterfall visualization of local piano notes.
 */
export function useJamKeyboard(
  instrument: JamInstrument,
  enabled: boolean,
  onLocalNote?: (midi: number, action: 'on' | 'off') => void,
) {
  const { sendNote } = useJamRoom();
  const heldKeysRef = useRef<Set<string>>(new Set());
  const drumEngineRef = useRef<DrumEngine | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Initialize drum engine lazily
  const getDrumEngine = useCallback(() => {
    if (!drumEngineRef.current) {
      drumEngineRef.current = new DrumEngine();
    }
    return drumEngineRef.current;
  }, []);

  useEffect(() => {
    const isInputFocused = () => {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      return (
        tag === 'input' ||
        tag === 'textarea' ||
        (el as HTMLElement).isContentEditable
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || isInputFocused()) return;
      const key = e.key.toLowerCase();

      if (instrument === 'piano') {
        const midi = PIANO_KEY_MAP[key];
        if (midi === undefined || heldKeysRef.current.has(key)) return;
        heldKeysRef.current.add(key);

        // Play locally via SoundFont — always
        jamNoteOn(getLocalChannel(), midi, 100);

        // Feed waterfall — always
        onLocalNote?.(midi, 'on');

        // Send to network — only when connected
        if (enabledRef.current) {
          const gmProgram = useJamRoomStore.getState().localGmProgram;
          sendNote({
            type: 'jam:note',
            action: 'on',
            instrument: 'piano',
            midi,
            velocity: 100,
            gmProgram,
          });
        }
      } else {
        const drum = DRUM_KEY_MAP[key];
        if (!drum || heldKeysRef.current.has(key)) return;
        heldKeysRef.current.add(key);

        // Play locally — always
        const engine = getDrumEngine();
        engine.resume();
        engine.playSound(drum, engine.currentTime);

        // Send to network — only when connected
        if (enabledRef.current) {
          sendNote({
            type: 'jam:note',
            action: 'on',
            instrument: 'drums',
            midi: DRUM_MIDI_MAP[drum],
            velocity: 100,
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      heldKeysRef.current.delete(key);

      if (instrument === 'piano') {
        const midi = PIANO_KEY_MAP[key];
        if (midi === undefined) return;

        jamNoteOff(getLocalChannel(), midi);

        onLocalNote?.(midi, 'off');

        if (enabledRef.current) {
          sendNote({
            type: 'jam:note',
            action: 'off',
            instrument: 'piano',
            midi,
            velocity: 0,
          });
        }
      }
      // Drums don't need note-off
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      heldKeysRef.current.clear();
    };
  }, [instrument, sendNote, getDrumEngine, onLocalNote]);

  // Cleanup drum engine on unmount
  useEffect(() => {
    return () => {
      drumEngineRef.current?.close();
      drumEngineRef.current = null;
    };
  }, []);
}
