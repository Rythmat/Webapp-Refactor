/**
 * Convert MusicXML data into a UnisonDocument.
 *
 * Parses MusicXML (score-partwise format) into a SessionSnapshot,
 * then runs the full UNISON analysis pipeline via sessionToUnison().
 *
 * Supports: notes, rests, chords (simultaneous notes), ties, dots,
 * key signatures, time signatures, tempo, harmony elements, multi-part scores.
 */

import type { MidiNoteEvent } from '@/daw/prism-engine/types';
import {
  deriveChordRegionsFromNotes,
  type ChordRegion,
} from '@/daw/store/prismSlice';
import type { UnisonDocument } from '../types/schema';
import { sessionToUnison, type SessionSnapshot } from './sessionToUnison';

const TARGET_PPQ = 480;

// ── Types ────────────────────────────────────────────────────────────────────

export interface MusicXmlToUnisonOptions {
  title?: string;
  filename?: string;
  bpm?: number;
}

// ── MusicXML fifths → pitch class ────────────────────────────────────────────

const FIFTHS_TO_ROOT_PC: Record<number, number> = {
  '-7': 11, // Cb
  '-6': 6, // Gb
  '-5': 1, // Db
  '-4': 8, // Ab
  '-3': 3, // Eb
  '-2': 10, // Bb
  '-1': 5, // F
  '0': 0, // C
  '1': 7, // G
  '2': 2, // D
  '3': 9, // A
  '4': 4, // E
  '5': 11, // B
  '6': 6, // F#
  '7': 1, // C#
};

// ── MusicXML mode → internal mode ────────────────────────────────────────────

const MUSICXML_MODE_MAP: Record<string, string> = {
  major: 'ionian',
  minor: 'aeolian',
  dorian: 'dorian',
  phrygian: 'phrygian',
  lydian: 'lydian',
  mixolydian: 'mixolydian',
  locrian: 'locrian',
};

// ── MusicXML kind → internal quality ─────────────────────────────────────────

const KIND_TO_QUALITY: Record<string, string> = {
  major: 'maj',
  minor: 'min',
  augmented: 'aug',
  diminished: 'dim',
  'suspended-second': 'sus2',
  'suspended-fourth': 'sus4',
  power: '5',
  'major-sixth': 'maj6',
  'minor-sixth': 'min6',
  dominant: 'dom7',
  'major-seventh': 'maj7',
  'minor-seventh': 'min7',
  'diminished-seventh': 'dim7',
  'half-diminished': 'min7b5',
  'major-minor': 'minmaj7',
  'dominant-ninth': 'dom9',
  'major-ninth': 'maj9',
  'minor-ninth': 'min9',
  none: 'maj',
  other: 'maj',
};

// ── Note type → tick duration ────────────────────────────────────────────────

const TYPE_TO_TICKS: Record<string, number> = {
  maxima: TARGET_PPQ * 32,
  long: TARGET_PPQ * 16,
  breve: TARGET_PPQ * 8,
  whole: TARGET_PPQ * 4,
  half: TARGET_PPQ * 2,
  quarter: TARGET_PPQ,
  eighth: TARGET_PPQ / 2,
  '16th': TARGET_PPQ / 4,
  '32nd': TARGET_PPQ / 8,
  '64th': TARGET_PPQ / 16,
  '128th': TARGET_PPQ / 32,
};

// ── Step → pitch class ───────────────────────────────────────────────────────

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// ── XML Helpers ──────────────────────────────────────────────────────────────

function getTag(el: Element, tag: string): Element | null {
  return el.getElementsByTagName(tag)[0] ?? null;
}

function getTagText(el: Element, tag: string): string {
  return getTag(el, tag)?.textContent?.trim() ?? '';
}

function getTagNum(el: Element, tag: string, fallback = 0): number {
  const text = getTagText(el, tag);
  const num = Number(text);
  return isNaN(num) ? fallback : num;
}

function getAllTags(el: Element, tag: string): Element[] {
  return Array.from(el.getElementsByTagName(tag));
}

// ── Pitch parsing ────────────────────────────────────────────────────────────

function parsePitch(noteEl: Element): number | null {
  const pitchEl = getTag(noteEl, 'pitch');
  if (!pitchEl) return null;

  const step = getTagText(pitchEl, 'step');
  const octave = getTagNum(pitchEl, 'octave', 4);
  const alter = getTagNum(pitchEl, 'alter', 0);

  const pc = STEP_TO_PC[step];
  if (pc === undefined) return null;

  return (octave + 1) * 12 + pc + alter;
}

// ── Duration parsing ─────────────────────────────────────────────────────────

function parseDuration(noteEl: Element, divisions: number): number {
  // Prefer <type> element for accurate tick calculation
  const typeText = getTagText(noteEl, 'type');
  if (typeText && TYPE_TO_TICKS[typeText] !== undefined) {
    let ticks = TYPE_TO_TICKS[typeText];
    // Count dots
    const dots = getAllTags(noteEl, 'dot').length;
    let dotValue = ticks;
    for (let d = 0; d < dots; d++) {
      dotValue /= 2;
      ticks += dotValue;
    }
    return Math.round(ticks);
  }

  // Fallback: use <duration> with divisions
  const rawDuration = getTagNum(noteEl, 'duration', 1);
  return Math.round((rawDuration / divisions) * TARGET_PPQ);
}

// ── Harmony parsing ──────────────────────────────────────────────────────────

interface ParsedHarmony {
  rootPc: number;
  quality: string;
  noteName: string;
  tick: number;
}

function parseHarmony(
  harmonyEl: Element,
  currentTick: number,
): ParsedHarmony | null {
  const rootEl = getTag(harmonyEl, 'root');
  if (!rootEl) return null;

  const step = getTagText(rootEl, 'root-step');
  const alter = getTagNum(rootEl, 'root-alter', 0);

  const pc = STEP_TO_PC[step];
  if (pc === undefined) return null;

  const rootPc = (pc + alter + 12) % 12;

  const kindEl = getTag(harmonyEl, 'kind');
  const kindValue = kindEl?.textContent?.trim() ?? 'major';
  const kindText = kindEl?.getAttribute('text') ?? '';

  // Use the text attribute if available (more specific), fall back to kind value
  const quality = kindText
    ? (KIND_TO_QUALITY[kindValue] ?? kindText)
    : (KIND_TO_QUALITY[kindValue] ?? 'maj');

  const alterStr = alter === 1 ? '#' : alter === -1 ? 'b' : '';
  const noteName = `${step}${alterStr}`;

  return { rootPc, quality, noteName, tick: currentTick };
}

// ── Main Converter ───────────────────────────────────────────────────────────

/**
 * Parse a MusicXML string and convert to UnisonDocument.
 */
export function musicXmlToUnison(
  xmlString: string,
  options?: MusicXmlToUnisonOptions,
): UnisonDocument {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`Invalid MusicXML: ${parseError.textContent}`);
  }

  const root = doc.documentElement;

  // Extract title
  const title =
    options?.title ??
    (getTagText(root, 'work-title') ||
      getTagText(root, 'movement-title') ||
      options?.filename) ??
    'MusicXML Import';

  // Extract parts
  const parts = getAllTags(root, 'part');
  if (parts.length === 0) {
    return emptyDocument(options);
  }

  // Extract part names from part-list
  const partNames = new Map<string, string>();
  const scoreParts = getAllTags(root, 'score-part');
  for (const sp of scoreParts) {
    const id = sp.getAttribute('id') ?? '';
    const name = getTagText(sp, 'part-name');
    if (id && name) partNames.set(id, name);
  }

  // Global state from first measure's attributes
  let globalDivisions = 1;
  let globalFifths = 0;
  let globalMode = 'major';
  let globalBeats = 4;
  let globalBeatType = 4;
  let globalBpm = options?.bpm ?? 120;

  // Parse each part into tracks
  const tracks: SessionSnapshot['tracks'] = [];
  const harmonies: ParsedHarmony[] = [];

  for (let partIdx = 0; partIdx < parts.length; partIdx++) {
    const part = parts[partIdx];
    const partId = part.getAttribute('id') ?? `P${partIdx + 1}`;
    const partName = partNames.get(partId) ?? `Part ${partIdx + 1}`;

    const events: MidiNoteEvent[] = [];
    let currentTick = 0;
    let lastOnsetTick = 0; // onset of the last non-chord note (for <chord/> elements)
    let divisions = globalDivisions;

    // Track tied notes: key = MIDI pitch, value = event index in events[]
    const tiedNotes = new Map<number, number>();

    const measures = Array.from(part.children).filter(
      (el) => el.tagName === 'measure',
    );

    for (const measure of measures) {
      for (const child of Array.from(measure.children)) {
        switch (child.tagName) {
          case 'attributes': {
            const div = getTagNum(child, 'divisions', 0);
            if (div > 0) {
              divisions = div;
              if (partIdx === 0) globalDivisions = div;
            }
            const keyEl = getTag(child, 'key');
            if (keyEl && partIdx === 0) {
              globalFifths = getTagNum(keyEl, 'fifths', 0);
              globalMode = getTagText(keyEl, 'mode') || 'major';
            }
            const timeEl = getTag(child, 'time');
            if (timeEl && partIdx === 0) {
              globalBeats = getTagNum(timeEl, 'beats', 4);
              globalBeatType = getTagNum(timeEl, 'beat-type', 4);
            }
            break;
          }

          case 'direction': {
            if (partIdx === 0) {
              const soundEl = getTag(child, 'sound');
              if (soundEl) {
                const tempo = Number(soundEl.getAttribute('tempo'));
                if (tempo > 0 && !options?.bpm) {
                  globalBpm = tempo;
                }
              }
            }
            break;
          }

          case 'harmony': {
            if (partIdx === 0) {
              const h = parseHarmony(child, currentTick);
              if (h) harmonies.push(h);
            }
            break;
          }

          case 'forward': {
            const dur = getTagNum(child, 'duration', 0);
            currentTick += Math.round((dur / divisions) * TARGET_PPQ);
            break;
          }

          case 'backup': {
            const dur = getTagNum(child, 'duration', 0);
            currentTick -= Math.round((dur / divisions) * TARGET_PPQ);
            if (currentTick < 0) currentTick = 0;
            break;
          }

          case 'note': {
            const isRest = getTag(child, 'rest') !== null;
            const isChord = getTag(child, 'chord') !== null;
            const durationTicks = parseDuration(child, divisions);

            // <chord> means same onset as previous note
            if (!isChord && !isRest) {
              // Advance tick only for non-chord, non-rest sequential notes
              // (tick advancement happens after note processing)
            }

            if (isRest) {
              currentTick += durationTicks;
              break;
            }

            const pitch = parsePitch(child);
            if (pitch === null) {
              if (!isChord) currentTick += durationTicks;
              break;
            }

            // Handle ties
            const tieEls = getAllTags(child, 'tie');
            const tieTypes = tieEls.map((t) => t.getAttribute('type'));
            const isTieStart = tieTypes.includes('start');
            const isTieContinue =
              tieTypes.includes('stop') && tieTypes.includes('start');
            const isTieEnd =
              tieTypes.includes('stop') && !tieTypes.includes('start');

            if (isTieEnd || isTieContinue) {
              // Extend the existing tied note
              const existingIdx = tiedNotes.get(pitch);
              if (existingIdx !== undefined) {
                events[existingIdx].durationTicks += durationTicks;
                if (isTieContinue) {
                  // Keep tracking for further extensions
                } else {
                  tiedNotes.delete(pitch);
                }
              }
            } else {
              // New note
              const onsetTick = isChord ? lastOnsetTick : currentTick;
              const event: MidiNoteEvent = {
                note: pitch,
                velocity: 80,
                startTick: onsetTick,
                durationTicks,
                channel: partIdx + 1,
              };
              events.push(event);

              if (isTieStart) {
                tiedNotes.set(pitch, events.length - 1);
              }
            }

            // Advance tick only for the first note in a chord group
            if (!isChord) {
              lastOnsetTick = currentTick;
              currentTick += durationTicks;
            }
            break;
          }
        }
      }
    }

    tracks.push({
      id: `xml-part-${partIdx}`,
      name: partName,
      type: 'midi',
      instrument: '',
      midiClips: [{ events }],
    });
  }

  // Derive chord regions from harmony elements or from notes
  const rootPc = FIFTHS_TO_ROOT_PC[globalFifths] ?? 0;
  const mode = MUSICXML_MODE_MAP[globalMode] ?? 'ionian';
  let chordRegions: ChordRegion[];

  if (harmonies.length > 0) {
    chordRegions = harmoniesToChordRegions(harmonies, rootPc);
  } else {
    const allEvents = tracks.flatMap((t) =>
      t.midiClips.flatMap((c) => c.events),
    );
    chordRegions = deriveChordRegionsFromNotes(allEvents, rootPc + 60, mode);
  }

  const snapshot: SessionSnapshot = {
    tracks,
    chordRegions,
    bpm: globalBpm,
    timeSignatureNumerator: globalBeats,
    timeSignatureDenominator: globalBeatType,
    rootNote: rootPc,
    mode,
    title,
  };

  const unisonDoc = sessionToUnison(snapshot);
  unisonDoc.metadata.source = 'sheet-music';
  if (options?.filename) {
    unisonDoc.metadata.sourceFilename = options.filename;
  }

  return unisonDoc;
}

/**
 * Convenience: import a MusicXML file from an ArrayBuffer or string.
 */
export function importMusicXmlFileAsUnison(
  input: ArrayBuffer | string,
  options?: MusicXmlToUnisonOptions,
): UnisonDocument {
  const xmlString =
    typeof input === 'string' ? input : new TextDecoder().decode(input);
  return musicXmlToUnison(xmlString, options);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert parsed harmony elements into ChordRegion[].
 */
function harmoniesToChordRegions(
  harmonies: ParsedHarmony[],
  _keyRootPc: number,
): ChordRegion[] {
  return harmonies.map((h, i) => {
    const endTick =
      i < harmonies.length - 1
        ? harmonies[i + 1].tick
        : h.tick + TARGET_PPQ * 4; // default 1 measure

    const displayName = `${h.noteName} ${h.quality}`;
    return {
      id: `xml-chord-${i}`,
      startTick: h.tick,
      endTick,
      rootPc: h.rootPc,
      name: displayName,
      noteName: displayName,
      color: [0, 0, 0] as [number, number, number],
      quality: h.quality,
      midis: [],
      confidence: 1.0,
    };
  });
}

/** Empty document for edge case of no parts */
function emptyDocument(options?: MusicXmlToUnisonOptions): UnisonDocument {
  return {
    version: '1.0.0',
    metadata: {
      title: options?.title ?? 'Empty MusicXML Import',
      source: 'sheet-music',
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
