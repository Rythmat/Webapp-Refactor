// ── The player's MIDI keyboard ──────────────────────────────────────────────
// Asked for once the game opens, so the level map knows whether Expert and
// Maestro (MIDI keyboard only) can be played, and kept up to date as a
// keyboard is plugged in or out. Every input's notes go to the game.

import { useEffect, useRef, useState } from 'react';
import type { MIDIAccess, MIDIInput, NavigatorWithMIDI } from './types';

export interface MidiKeyboard {
  /** A keyboard is connected. */
  connected: boolean;
  /** What the toolbar says. */
  status: string;
}

export function useMidiKeyboard(
  onNoteOn: (midi: number) => void,
  onNoteOff: (midi: number) => void,
): MidiKeyboard {
  const [state, setState] = useState<MidiKeyboard>({
    connected: false,
    status: 'MIDI: Standby',
  });
  const onRef = useRef(onNoteOn);
  const offRef = useRef(onNoteOff);
  onRef.current = onNoteOn;
  offRef.current = onNoteOff;

  useEffect(() => {
    const nav = navigator as unknown as NavigatorWithMIDI;
    if (!nav.requestMIDIAccess) {
      setState({ connected: false, status: 'Use keys A–L' });
      return;
    }
    let access: MIDIAccess | null = null;
    let gone = false;
    const listen = (input: MIDIInput) => {
      input.onmidimessage = (msg) => {
        const [cmd, note, vel] = msg.data;
        if (cmd >= 144 && cmd <= 159 && vel > 0) onRef.current(note);
        else if (
          (cmd >= 128 && cmd <= 143) ||
          (cmd >= 144 && cmd <= 159 && vel === 0)
        )
          offRef.current(note);
      };
    };
    const refresh = () => {
      if (!access || gone) return;
      let name: string | null = null;
      access.inputs.forEach((input) => {
        listen(input);
        if (input.state === 'connected') name ??= input.name ?? 'MIDI keyboard';
      });
      setState(
        name
          ? { connected: true, status: `MIDI Active · ${name}` }
          : { connected: false, status: 'No MIDI keyboard' },
      );
    };
    nav
      .requestMIDIAccess()
      .then((granted) => {
        access = granted;
        access.onstatechange = refresh;
        refresh();
      })
      .catch(() => {
        if (!gone) setState({ connected: false, status: 'Use keys A–L' });
      });
    return () => {
      gone = true;
      if (access) {
        access.onstatechange = null;
        access.inputs.forEach((input) => {
          input.onmidimessage = null;
        });
      }
    };
  }, []);

  return state;
}
