/**
 * Convert raw MIDI file data (MidiSequence[]) into a UnisonDocument.
 *
 * Bridges the gap between standalone .mid file import and the UNISON
 * analysis pipeline. Reuses sessionToUnison() for all analysis logic.
 */

import { importMidiFile } from '@/daw/midi/MidiFileIO';
import type { MidiSequence } from '@/daw/prism-engine/types';
import { deriveChordRegionsFromNotes } from '@/daw/store/prismSlice';
import type { UnisonDocument } from '../types/schema';
import { sessionToUnison, type SessionSnapshot } from './sessionToUnison';

const TARGET_PPQ = 480;

export interface MidiToUnisonOptions {
  bpm?: number;
  title?: string;
  filename?: string;
}

/**
 * Convert parsed MIDI sequences into a UnisonDocument.
 *
 * @param sequences - Parsed MIDI tracks (from importMidiFile or similar)
 * @param options   - Optional BPM, title, filename overrides
 */
export function midiToUnison(
  sequences: MidiSequence[],
  options?: MidiToUnisonOptions,
): UnisonDocument {
  if (sequences.length === 0) {
    return emptyDocument(options);
  }

  const bpm = options?.bpm ?? 120;
  const ppqRatio =
    TARGET_PPQ / (sequences[0].ticksPerQuarterNote || TARGET_PPQ);

  // Convert MidiSequence[] → SessionSnapshot tracks
  const tracks: SessionSnapshot['tracks'] = sequences.map((seq, i) => ({
    id: `midi-track-${i}`,
    name: seq.trackName || `Track ${i + 1}`,
    type: 'midi' as const,
    instrument: '',
    midiClips: [
      {
        events: seq.events.map((e) => ({
          ...e,
          startTick: Math.round(e.startTick * ppqRatio),
          durationTicks: Math.round(e.durationTicks * ppqRatio),
        })),
        ccEvents: (seq.ccEvents ?? []).map((cc) => ({
          ...cc,
          tick: Math.round(cc.tick * ppqRatio),
        })),
      },
    ],
  }));

  // Derive chord regions from all events (reuses Phases 1-9 melody separation)
  const allEvents = tracks.flatMap((t) => t.midiClips.flatMap((c) => c.events));
  const chordRegions = deriveChordRegionsFromNotes(allEvents, 60, 'ionian');

  const snapshot: SessionSnapshot = {
    tracks,
    chordRegions,
    bpm,
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    rootNote: null, // auto-detect
    mode: 'ionian', // auto-detect will override
    title: options?.title ?? options?.filename ?? 'MIDI Import',
  };

  const doc = sessionToUnison(snapshot);
  doc.metadata.source = 'midi-import';
  if (options?.filename) {
    doc.metadata.sourceFilename = options.filename;
  }
  return doc;
}

/**
 * Convenience: parse a raw .mid file buffer and produce a UnisonDocument.
 */
export function importMidiFileAsUnison(
  arrayBuffer: ArrayBuffer,
  options?: MidiToUnisonOptions,
): UnisonDocument {
  const sequences = importMidiFile(arrayBuffer);
  return midiToUnison(sequences, options);
}

/** Empty document for edge case of no sequences */
function emptyDocument(options?: MidiToUnisonOptions): UnisonDocument {
  return {
    version: '1.0.0',
    metadata: {
      title: options?.title ?? 'Empty MIDI Import',
      source: 'midi-import',
      createdAt: new Date().toISOString(),
      durationTicks: 0,
      ticksPerQuarterNote: TARGET_PPQ,
      sourceFilename: options?.filename,
    },
    tracks: [],
    analysis: {
      key: {
        rootPc: 0,
        rootName: 'C',
        mode: 'ionian',
        modeDisplay: 'Ionian',
        confidence: 0,
        alternateKeys: [],
      },
      chordTimeline: [],
      progressionMatches: [],
      vibes: [],
      styles: [],
    },
    rhythm: {
      bpm: options?.bpm ?? 120,
      bpmConfidence: 0,
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
      subdivision: 'straight',
      swingAmount: 0,
    },
    melody: null,
    form: null,
    timbre: null,
    mix: null,
  };
}
