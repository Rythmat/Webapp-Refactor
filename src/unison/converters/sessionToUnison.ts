/**
 * Convert current DAW session state into a UnisonDocument.
 *
 * Reads directly from the Zustand store to gather:
 *   - Tracks + MIDI events
 *   - Existing chord regions (enriched, not re-detected)
 *   - Transport state (BPM, time sig)
 *   - Key/mode (detected or user-set)
 */

import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { analyzeHarmony } from '../engine/harmonicAnalyzer';
import { detectKey } from '../engine/keyDetector';
import { analyzeMelody } from '../engine/melodyAnalyzer';
import { matchProgressions } from '../engine/progressionMatcher';
import { analyzeRhythm } from '../engine/rhythmAnalyzer';
import { detectTonalRegions } from '../engine/tonalRegionDetector';
import { analyzeVoiceLeading } from '../engine/voiceLeadingAnalyzer';
import type {
  UnisonDocument,
  UnisonTrack,
  UnisonNoteEvent,
  UnisonCCEvent,
  KeyDetection,
  MelodyAnalysis,
  ModalInterchangeSummary,
  TrackRole,
} from '../types/schema';

// ── Input interface (decoupled from store for testability) ────────────────────

export interface SessionSnapshot {
  tracks: Array<{
    id: string;
    name: string;
    type: 'midi' | 'audio';
    instrument: string;
    midiClips: Array<{
      events: MidiNoteEvent[];
      ccEvents?: Array<{
        tick: number;
        controller: number;
        value: number;
        channel: number;
      }>;
    }>;
  }>;
  chordRegions: ChordRegion[];
  bpm: number;
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
  rootNote: number | null;
  mode: string;
  title?: string;
}

// ── Core ──────────────────────────────────────────────────────────────────────

const PPQ = 480;

export function sessionToUnison(snapshot: SessionSnapshot): UnisonDocument {
  // 1. Gather all MIDI events across tracks
  const allEvents = gatherAllEvents(snapshot.tracks);

  // 2. Detect key (or use existing if user has set one)
  const key = resolveKey(allEvents, snapshot.rootNote, snapshot.mode);

  // 3. Enrich existing chord regions with Hybrid Numbers + roman numerals
  const chordTimeline = analyzeHarmony(snapshot.chordRegions, key, allEvents);

  // 3.5 Voice leading analysis
  const voiceLeading = analyzeVoiceLeading(chordTimeline, allEvents);

  // 3.6 Detect tonal regions
  const tonalRegions = detectTonalRegions(allEvents, chordTimeline, key);

  // 3.7 Build modal interchange summary
  const modalInterchangeSummary = buildModalInterchangeSummary(
    chordTimeline,
    tonalRegions,
    key,
  );

  // 4. Match progressions against library
  const progressionMatches = matchProgressions(chordTimeline);

  // 5. Aggregate vibes and styles from top matches
  const vibes = aggregateTags(progressionMatches.map((m) => m.vibes));
  const styles = aggregateTags(progressionMatches.map((m) => m.styles));

  // 6. Rhythm analysis
  const rhythm = analyzeRhythm(
    allEvents,
    PPQ,
    snapshot.bpm,
    snapshot.timeSignatureNumerator,
    snapshot.timeSignatureDenominator,
  );

  // 7. Melody analysis (pick the most melodic track)
  const melody = findAndAnalyzeMelody(snapshot.tracks, key);

  // 8. Convert tracks to UNISON format
  const tracks = snapshot.tracks
    .filter((t) => t.type === 'midi')
    .map((t) => convertTrack(t));

  // 9. Compute duration from last event end
  const durationTicks = computeDuration(snapshot);

  return {
    version: '1.0.0',
    metadata: {
      title: snapshot.title ?? 'Untitled Session',
      source: 'daw-session',
      createdAt: new Date().toISOString(),
      durationTicks,
      ticksPerQuarterNote: PPQ,
    },
    tracks,
    analysis: {
      key,
      chordTimeline,
      progressionMatches,
      vibes,
      styles,
      tonalRegions,
      modalInterchangeSummary,
      voiceLeading: voiceLeading ?? undefined,
    },
    rhythm,
    melody,
    form: null,
    timbre: null,
    mix: null,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gatherAllEvents(tracks: SessionSnapshot['tracks']): MidiNoteEvent[] {
  const events: MidiNoteEvent[] = [];
  for (const track of tracks) {
    if (track.type !== 'midi') continue;
    for (const clip of track.midiClips) {
      events.push(...clip.events);
    }
  }
  return events;
}

function resolveKey(
  events: MidiNoteEvent[],
  rootNote: number | null,
  mode: string,
): KeyDetection {
  // Always run detection for confidence score
  const detected = detectKey(events);

  // If user has set a root note, prefer it but keep detection metadata
  if (rootNote !== null) {
    const NOTE_NAMES = [
      'C',
      'C#',
      'D',
      'Eb',
      'E',
      'F',
      'F#',
      'G',
      'Ab',
      'A',
      'Bb',
      'B',
    ];
    return {
      ...detected,
      rootPc: rootNote,
      rootName: NOTE_NAMES[rootNote],
      mode: mode || detected.mode,
      modeDisplay: detected.modeDisplay, // keep display from detection
    };
  }

  return detected;
}

function convertTrack(track: SessionSnapshot['tracks'][0]): UnisonTrack {
  const events: UnisonNoteEvent[] = [];
  const ccEvents: UnisonCCEvent[] = [];

  for (const clip of track.midiClips) {
    for (const ev of clip.events) {
      events.push({
        pitch: ev.note,
        velocity: ev.velocity,
        startTick: ev.startTick,
        durationTicks: ev.durationTicks,
        channel: ev.channel,
      });
    }
    if (clip.ccEvents) {
      for (const cc of clip.ccEvents) {
        ccEvents.push({
          tick: cc.tick,
          controller: cc.controller,
          value: cc.value,
          channel: cc.channel,
        });
      }
    }
  }

  return {
    id: track.id,
    name: track.name,
    channel: 1,
    role: guessTrackRole(track),
    events,
    ccEvents,
  };
}

function guessTrackRole(track: SessionSnapshot['tracks'][0]): TrackRole {
  const name = track.name.toLowerCase();
  const inst = track.instrument.toLowerCase();

  if (name.includes('drum') || inst.includes('drum')) return 'drums';
  if (name.includes('bass') || inst.includes('bass')) return 'bass';
  if (name.includes('pad') || inst.includes('pad')) return 'pad';
  if (name.includes('chord') || name.includes('harm')) return 'chords';
  if (name.includes('melody') || name.includes('lead')) return 'melody';
  return 'unknown';
}

function findAndAnalyzeMelody(
  tracks: SessionSnapshot['tracks'],
  key: KeyDetection,
): MelodyAnalysis | null {
  // Find best melody candidate: monophonic MIDI track with notes in vocal/lead range
  let bestTrack: SessionSnapshot['tracks'][0] | null = null;
  let bestScore = 0;

  for (const track of tracks) {
    if (track.type !== 'midi') continue;

    const events = track.midiClips.flatMap((c) => c.events);
    if (events.length === 0) continue;

    // Score: prefer tracks named "melody"/"lead", monophonic, mid-range
    let score = events.length; // more notes = more likely melodic
    const name = track.name.toLowerCase();
    if (name.includes('melody') || name.includes('lead')) score += 10000;
    if (name.includes('drum') || name.includes('bass')) score -= 10000;

    // Check if mostly monophonic (few simultaneous notes)
    const avgPitch = events.reduce((s, e) => s + e.note, 0) / events.length;
    if (avgPitch >= 48 && avgPitch <= 84) score += 1000; // melody range

    if (score > bestScore) {
      bestScore = score;
      bestTrack = track;
    }
  }

  if (!bestTrack) return null;

  const events = bestTrack.midiClips.flatMap((c) => c.events);
  return analyzeMelody(events, bestTrack.id, key);
}

function aggregateTags(tagArrays: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const tags of tagArrays) {
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  // Sort by frequency, return unique
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
}

function computeDuration(snapshot: SessionSnapshot): number {
  let maxTick = 0;

  // From chord regions
  for (const r of snapshot.chordRegions) {
    if (r.endTick > maxTick) maxTick = r.endTick;
  }

  // From MIDI events
  for (const track of snapshot.tracks) {
    for (const clip of track.midiClips) {
      for (const ev of clip.events) {
        const end = ev.startTick + ev.durationTicks;
        if (end > maxTick) maxTick = end;
      }
    }
  }

  return maxTick;
}

function buildModalInterchangeSummary(
  chordTimeline: import('../types/schema').UnisonChordRegion[],
  tonalRegions: import('../types/schema').TonalRegion[],
  primaryKey: KeyDetection,
): ModalInterchangeSummary {
  let borrowedCount = 0;
  let secDomCount = 0;
  const sourceModeSet = new Set<string>();

  for (const chord of chordTimeline) {
    if (!chord.modalInterchange) continue;
    if (chord.modalInterchange.type === 'borrowed') {
      borrowedCount++;
      if (chord.modalInterchange.sourceMode) {
        sourceModeSet.add(chord.modalInterchange.sourceMode);
      }
    } else if (
      chord.modalInterchange.type === 'secondary-dominant' ||
      chord.modalInterchange.type === 'secondary-leading-tone'
    ) {
      secDomCount++;
    }
  }

  const modulatesTo: string[] = [];
  for (const region of tonalRegions) {
    if (
      region.type !== 'primary' &&
      (region.key.rootPc !== primaryKey.rootPc ||
        region.key.mode !== primaryKey.mode)
    ) {
      const label = `${region.key.rootName} ${region.key.modeDisplay}`;
      if (!modulatesTo.includes(label)) {
        modulatesTo.push(label);
      }
    }
  }

  return {
    borrowedChordCount: borrowedCount,
    secondaryDominantCount: secDomCount,
    sourceModes: [...sourceModeSet],
    dominantTonalCenter: `${primaryKey.rootName} ${primaryKey.modeDisplay}`,
    modulatesTo,
  };
}
