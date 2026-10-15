/**
 * Play a part in from a MIDI keyboard. While armed and the loop is running,
 * every key becomes a note at the transport's position in the part, wrapping
 * with the loop so a phrase can be built up pass by pass (overdub). Notes are
 * heard as they're played, on the part's own sound.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { splitPlayed, type PartNote } from '@/curriculum/engine/parts/part';

export type CaptureQuantize = 0 | 60 | 80 | 120 | 160 | 240;

export const QUANTIZE_OPTIONS: { value: CaptureQuantize; label: string }[] = [
  { value: 0, label: 'As played' },
  { value: 120, label: '16ths' },
  { value: 240, label: '8ths' },
  { value: 80, label: '16th triplets' },
  { value: 160, label: '8th triplets' },
  { value: 60, label: '32nds' },
];

interface Options {
  /** Recording: armed and the transport is running. */
  active: boolean;
  /** Part length in ticks — captured notes wrap at it. */
  length: number;
  quantize: CaptureQuantize;
  /** Transport position in part ticks. */
  currentTick: () => number;
  onNote: (note: PartNote) => void;
  monitorOn: (midi: number, velocity: number) => void;
  monitorOff: (midi: number) => void;
}

export function useLiveCapture({
  active,
  length,
  quantize,
  currentTick,
  onNote,
  monitorOn,
  monitorOff,
}: Options) {
  const [inputs, setInputs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const held = useRef(new Map<number, { tick: number; velocity: number }>());
  // Latest options for the MIDI handler, which is bound once.
  const opts = useRef({
    active,
    length,
    quantize,
    currentTick,
    onNote,
    monitorOn,
    monitorOff,
  });
  opts.current = {
    active,
    length,
    quantize,
    currentTick,
    onNote,
    monitorOn,
    monitorOff,
  };

  const onMessage = useCallback((e: MIDIMessageEvent) => {
    const data = e.data;
    if (!data || data.length < 3) return;
    const [status, midi, vel] = data;
    const kind = status & 0xf0;
    const o = opts.current;
    const isOn = kind === 0x90 && vel > 0;
    const isOff = kind === 0x80 || (kind === 0x90 && vel === 0);
    if (isOn) {
      o.monitorOn(midi, vel);
      if (o.active)
        held.current.set(midi, { tick: o.currentTick(), velocity: vel });
    } else if (isOff) {
      o.monitorOff(midi);
      const start = held.current.get(midi);
      held.current.delete(midi);
      if (!start || !o.active || o.length <= 0) return;
      const wrap = (t: number) => ((t % o.length) + o.length) % o.length;
      const played = wrap(start.tick);
      // Quantize writes the note on the grid and keeps how it was played as
      // its feel — never thrown away.
      const { tick, offset } = o.quantize
        ? splitPlayed(played, o.quantize)
        : { tick: Math.round(played), offset: undefined };
      let duration = wrap(o.currentTick() - start.tick) || o.length;
      if (o.quantize)
        duration = Math.max(
          o.quantize,
          Math.round(duration / o.quantize) * o.quantize,
        );
      o.onNote({
        tick: wrap(tick),
        ...(offset ? { offset } : {}),
        duration: Math.max(30, Math.round(duration)),
        midi,
        velocity: start.velocity,
      });
    }
  }, []);

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setError(
        'This browser has no Web MIDI — use Chrome or Edge to capture live.',
      );
      return;
    }
    let access: MIDIAccess | null = null;
    const bind = () => {
      if (!access) return;
      const names: string[] = [];
      access.inputs.forEach((input) => {
        input.onmidimessage = onMessage;
        names.push(input.name ?? 'MIDI input');
      });
      setInputs(names);
    };
    navigator
      .requestMIDIAccess()
      .then((a) => {
        access = a;
        bind();
        a.onstatechange = bind;
      })
      .catch(() => setError('MIDI access was refused.'));
    return () => {
      access?.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      if (access) access.onstatechange = null;
    };
  }, [onMessage]);

  return { inputs, error };
}
