// ── Jam Audio Engine ──────────────────────────────────────────────────────
// Subscribes to incoming remote note messages and plays audio locally
// via SoundFont (melodic) or DrumEngine (drums).

import { useEffect, useRef } from 'react';
import { DrumEngine } from '@/components/Games/GrooveLab/DrumEngine';
import { useJamRoom } from './JamRoomProvider';
import {
  jamNoteOn,
  jamNoteOff,
  jamProgramChange,
  allocateChannel,
} from './jamSoundFont';
import { MIDI_TO_DRUM } from './types';

// Track the last-set GM program per remote channel to avoid redundant changes
const remotePrograms = new Map<number, number>();

/**
 * Hook that listens for remote note messages and triggers audio playback.
 * Must be used within a JamRoomProvider.
 */
export function useJamAudio() {
  const { onNoteMessage } = useJamRoom();
  const drumRef = useRef<DrumEngine | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      drumRef.current = new DrumEngine();
      initialized.current = true;
    }

    const unsub = onNoteMessage((msg) => {
      if (msg.instrument === 'piano') {
        // Allocate a SoundFont channel for this remote player
        const ch = allocateChannel(msg.userId);

        // Set the correct program if it changed
        const program = msg.gmProgram ?? 0;
        if (remotePrograms.get(ch) !== program) {
          jamProgramChange(ch, program);
          remotePrograms.set(ch, program);
        }

        if (msg.action === 'on') {
          jamNoteOn(ch, msg.midi, msg.velocity ?? 100);
        } else {
          jamNoteOff(ch, msg.midi);
        }
      } else if (msg.instrument === 'drums' && msg.action === 'on') {
        const drum = drumRef.current;
        if (!drum) return;
        const sound = MIDI_TO_DRUM[msg.midi];
        if (sound) {
          drum.resume();
          drum.playSound(sound, drum.currentTime);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [onNoteMessage]);

  // Cleanup drum engine on unmount
  useEffect(() => {
    return () => {
      drumRef.current?.close();
      drumRef.current = null;
      initialized.current = false;
      remotePrograms.clear();
    };
  }, []);
}
