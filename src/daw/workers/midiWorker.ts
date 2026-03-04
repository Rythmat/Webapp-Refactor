import {
  StrumMode,
  VelocityTilt,
  InstrumentChannel,
  generateChordMidi,
  CHORD_RHYTHMS,
} from '@prism/engine';
import type { MidiNoteEvent } from '@prism/engine';

export interface MidiWorkerRequest {
  chordSeq: number[][];
  stringSeq: string[];
  rhythmName: string;
  swing: number;
  strum: StrumMode;
  strumAmount: number;
  tilt: VelocityTilt;
  tiltAmount: number;
}

export interface MidiWorkerResponse {
  events: MidiNoteEvent[];
}

self.onmessage = (e: MessageEvent<MidiWorkerRequest>) => {
  const { chordSeq, stringSeq, rhythmName, swing, strum, strumAmount, tilt, tiltAmount } = e.data;

  const chordPattern = CHORD_RHYTHMS[rhythmName] ?? CHORD_RHYTHMS['Quarters'];

  const sequence = generateChordMidi({
    chordSeq,
    stringSeq,
    rhythmPattern: chordPattern,
    swing,
    strum,
    strumAmount,
    tilt,
    tiltAmount,
    channel: InstrumentChannel.Chords,
  });

  const response: MidiWorkerResponse = { events: sequence.events };
  self.postMessage(response);
};
