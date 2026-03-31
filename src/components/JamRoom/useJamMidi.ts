// ── Jam MIDI Input ────────────────────────────────────────────────────────
// Routes MIDI controller input into the Jam Room: local audio + network.
//
// MIDI hardware is attached once on mount (not gated by `enabled`).
// Local audio always plays via SoundFont. Network sending is gated by
// `enabledRef` (which tracks `isConnected`).
//
// Uses the same MIDI API pattern proven to work in MajorArcanum:
// - NavigatorWithMIDI type cast
// - input.onmidimessage property assignment (not addEventListener)
// - access.inputs.forEach() iteration

import { useEffect, useRef } from 'react';
import { DrumEngine } from '@/components/Games/GrooveLab/DrumEngine';
import type {
  NavigatorWithMIDI,
  MIDIAccess,
  MIDIMessageEvent,
} from '@/components/Games/MajorArcanum/types';
import { useJamRoom } from './JamRoomProvider';
import { useJamRoomStore } from './jamRoomStore';
import { jamNoteOn, jamNoteOff, getLocalChannel } from './jamSoundFont';
import { DRUM_MIDI_MAP, MIDI_TO_DRUM, type JamInstrument } from './types';

export function useJamMidi(
  instrument: JamInstrument,
  enabled: boolean,
  onLocalNote?: (midi: number, action: 'on' | 'off') => void,
) {
  const { sendNote } = useJamRoom();
  const drumRef = useRef<DrumEngine | null>(null);

  // Refs — message handler always reads current values
  const sendNoteRef = useRef(sendNote);
  sendNoteRef.current = sendNote;
  const instrumentRef = useRef(instrument);
  instrumentRef.current = instrument;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onLocalNoteRef = useRef(onLocalNote);
  onLocalNoteRef.current = onLocalNote;

  const getDrumEngine = () => {
    if (!drumRef.current) drumRef.current = new DrumEngine();
    return drumRef.current;
  };

  // MIDI hardware — attach once on mount, gate only network sends inside handler
  useEffect(() => {
    const nav = navigator as NavigatorWithMIDI;
    if (!nav.requestMIDIAccess) return;

    let midiAccess: MIDIAccess | null = null;

    const onMessage = (e: MIDIMessageEvent) => {
      if (!e.data) return;
      const command = e.data[0] & 0xf0;
      const note = e.data[1];
      const velocity = e.data[2];
      const inst = instrumentRef.current;

      // Note ON
      if (command === 0x90 && velocity > 0) {
        if (inst === 'piano') {
          // Local audio via SoundFont — always
          jamNoteOn(getLocalChannel(), note, velocity);
          onLocalNoteRef.current?.(note, 'on');

          // Network — only when connected
          if (enabledRef.current) {
            const gmProgram = useJamRoomStore.getState().localGmProgram;
            sendNoteRef.current({
              type: 'jam:note',
              action: 'on',
              instrument: 'piano',
              midi: note,
              velocity,
              gmProgram,
            });
          }
        } else {
          const sound = MIDI_TO_DRUM[note];
          if (sound) {
            // Local audio — always
            const engine = getDrumEngine();
            engine.resume();
            engine.playSound(sound, engine.currentTime);

            // Network — only when connected
            if (enabledRef.current) {
              sendNoteRef.current({
                type: 'jam:note',
                action: 'on',
                instrument: 'drums',
                midi: DRUM_MIDI_MAP[sound],
                velocity,
              });
            }
          }
        }
      }

      // Note OFF
      if (command === 0x80 || (command === 0x90 && velocity === 0)) {
        if (inst === 'piano') {
          // Local audio — always
          jamNoteOff(getLocalChannel(), note);
          onLocalNoteRef.current?.(note, 'off');

          // Network — only when connected
          if (enabledRef.current) {
            sendNoteRef.current({
              type: 'jam:note',
              action: 'off',
              instrument: 'piano',
              midi: note,
              velocity: 0,
            });
          }
        }
      }
    };

    const attachAll = (access: MIDIAccess) => {
      access.inputs.forEach((input) => {
        input.onmidimessage = onMessage;
      });
    };

    nav
      .requestMIDIAccess()
      .then((access) => {
        midiAccess = access;
        attachAll(access);

        // Re-attach when devices are plugged/unplugged
        access.onstatechange = () => {
          attachAll(access);
        };
      })
      .catch((err) => {
        console.warn('[useJamMidi] MIDI access failed:', err);
      });

    return () => {
      if (midiAccess) {
        midiAccess.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
        midiAccess.onstatechange = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only — refs handle dynamic values, no race with cleanup

  // Cleanup drum engine on unmount
  useEffect(() => {
    return () => {
      drumRef.current?.close();
      drumRef.current = null;
    };
  }, []);
}
