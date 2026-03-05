import {
  InstrumentChannel,
  type MidiSequence,
  type OrchestrateConfig,
} from '../types';
import { CHORD_RHYTHMS } from '../data/chordRhythms';
import { MELODY_RHYTHMS } from '../data/melodyRhythms';
import { generateChordMidi, generateMelodyMidi } from './midiExport';
import { generateDrumMidi } from './drumGenerator';
import { generateBassMidi } from './bassGenerator';
import { generatePadMidi } from './padGenerator';

export function orchestrate(
  config: OrchestrateConfig,
): Map<InstrumentChannel, MidiSequence> {
  const result = new Map<InstrumentChannel, MidiSequence>();

  const chordPattern =
    CHORD_RHYTHMS[config.rhythmName] ?? CHORD_RHYTHMS['Quarters'];
  const melodyPattern =
    MELODY_RHYTHMS[config.rhythmName] ?? MELODY_RHYTHMS['Quarters'];

  if (config.enableDrums) {
    result.set(
      InstrumentChannel.Drums,
      generateDrumMidi({
        rhythmName: config.rhythmName,
        swing: config.swing,
      }),
    );
  }

  if (config.enableBass) {
    result.set(
      InstrumentChannel.Bass,
      generateBassMidi({
        chordSeq: config.chordSeq,
        stringSeq: config.stringSeq,
        root: config.root,
        rhythmName: config.rhythmName,
        swing: config.swing,
      }),
    );
  }

  if (config.enablePad) {
    result.set(
      InstrumentChannel.Pad,
      generatePadMidi({
        chordSeq: config.chordSeq,
        stringSeq: config.stringSeq,
        rhythmName: config.rhythmName,
        swing: config.swing,
      }),
    );
  }

  if (config.enableChords) {
    result.set(
      InstrumentChannel.Chords,
      generateChordMidi({
        chordSeq: config.chordSeq,
        stringSeq: config.stringSeq,
        rhythmPattern: chordPattern,
        swing: config.swing,
        strum: config.strum,
        strumAmount: config.strumAmount,
        tilt: config.tilt,
        tiltAmount: config.tiltAmount,
        channel: InstrumentChannel.Chords,
      }),
    );
  }

  if (config.enableMelody) {
    result.set(
      InstrumentChannel.Melody,
      generateMelodyMidi({
        chordSeq: config.chordSeq,
        stringSeq: config.stringSeq,
        root: config.root,
        rhythmPattern: melodyPattern,
        swing: config.swing,
        contourFilter: config.contourFilter,
        channel: InstrumentChannel.Melody,
      }),
    );
  }

  return result;
}
