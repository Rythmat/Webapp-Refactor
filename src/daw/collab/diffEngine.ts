// ── Diff Engine ──────────────────────────────────────────────────────────
// Computes minimal diffs from Zustand state changes and applies them as
// targeted Yjs operations. This avoids replacing entire Y.Arrays/Y.Maps on
// every store change.

import * as Y from 'yjs';
import type { AllSlices } from '@/daw/store/index';
import type { Track, MidiClip, AudioClip } from '@/daw/store/tracksSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Marker } from '@/daw/store/markersSlice';
import {
  getYProject,
  getYTransport,
  getYTracks,
  getYChordRegions,
  getYPrism,
  getYMarkers,
  getYMastering,
  getYLeadSheet,
  trackToYMap,
  midiClipToYMap,
  audioClipToYMap,
  midiEventToYMap,
  chordRegionToYMap,
  markerToYMap,
} from './YjsDocManager';
// ── Helpers ─────────────────────────────────────────────────────────────

/** Find a Y.Map inside a Y.Array by matching a field value. */
function findYMapIndex(
  arr: Y.Array<Y.Map<unknown>>,
  field: string,
  value: unknown,
): number {
  for (let i = 0; i < arr.length; i++) {
    if ((arr.get(i) as Y.Map<unknown>).get(field) === value) return i;
  }
  return -1;
}

function findYMap(
  arr: Y.Array<Y.Map<unknown>>,
  field: string,
  value: unknown,
): Y.Map<unknown> | null {
  const idx = findYMapIndex(arr, field, value);
  return idx >= 0 ? (arr.get(idx) as Y.Map<unknown>) : null;
}

// ── Track scalar keys that should be diffed individually ────────────────
const TRACK_SCALAR_KEYS: (keyof Track)[] = [
  'name',
  'type',
  'instrument',
  'gmProgram',
  'color',
  'mute',
  'solo',
  'volume',
  'pan',
  'recordArmed',
  'monitoring',
  'trackRole',
];

// ── Main diff function ──────────────────────────────────────────────────

/**
 * Compare two Zustand states and write the minimal delta to the Yjs doc.
 * Must be called inside a `doc.transact(() => ..., ORIGIN_LOCAL)`.
 */
export function diffAndApply(
  doc: Y.Doc,
  prev: AllSlices,
  next: AllSlices,
): void {
  // ── Project metadata ──
  if (prev.projectName !== next.projectName) {
    getYProject(doc).set('name', next.projectName);
  }
  if (prev.composerName !== next.composerName) {
    getYProject(doc).set('composerName', next.composerName);
  }

  // ── Transport settings ──
  diffTransport(doc, prev, next);

  // ── Tracks ──
  if (prev.tracks !== next.tracks) {
    diffTracks(doc, prev.tracks, next.tracks);
  }

  // ── Chord regions ──
  if (prev.chordRegions !== next.chordRegions) {
    diffChordRegions(doc, prev.chordRegions, next.chordRegions);
  }

  // ── Prism ──
  diffPrism(doc, prev, next);

  // ── Markers ──
  if (prev.markers !== next.markers) {
    diffMarkers(doc, prev.markers, next.markers);
  }

  // ── Mastering ──
  diffMastering(doc, prev, next);

  // ── Lead sheet ──
  diffLeadSheet(doc, prev, next);
}

// ── Transport diff ──────────────────────────────────────────────────────

function diffTransport(doc: Y.Doc, prev: AllSlices, next: AllSlices): void {
  const yT = getYTransport(doc);
  if (prev.bpm !== next.bpm) yT.set('bpm', next.bpm);
  if (prev.timeSignatureNumerator !== next.timeSignatureNumerator)
    yT.set('timeSignatureNumerator', next.timeSignatureNumerator);
  if (prev.timeSignatureDenominator !== next.timeSignatureDenominator)
    yT.set('timeSignatureDenominator', next.timeSignatureDenominator);
  if (prev.metronomeEnabled !== next.metronomeEnabled)
    yT.set('metronomeEnabled', next.metronomeEnabled);
  if (prev.loopEnabled !== next.loopEnabled)
    yT.set('loopEnabled', next.loopEnabled);
  if (prev.loopStart !== next.loopStart) yT.set('loopStart', next.loopStart);
  if (prev.loopEnd !== next.loopEnd) yT.set('loopEnd', next.loopEnd);
}

// ── Track diff ──────────────────────────────────────────────────────────

function diffTracks(
  doc: Y.Doc,
  prevTracks: Track[],
  nextTracks: Track[],
): void {
  const yTracks = getYTracks(doc);
  const prevIds = new Set(prevTracks.map((t) => t.id));
  const nextIds = new Set(nextTracks.map((t) => t.id));

  // Removed tracks
  for (let i = yTracks.length - 1; i >= 0; i--) {
    const yTrack = yTracks.get(i) as Y.Map<unknown>;
    if (!nextIds.has(yTrack.get('id') as string)) {
      yTracks.delete(i, 1);
    }
  }

  // Added tracks
  for (const track of nextTracks) {
    if (!prevIds.has(track.id)) {
      yTracks.push([trackToYMap(track)]);
    }
  }

  // Modified tracks
  for (const nextTrack of nextTracks) {
    const prevTrack = prevTracks.find((t) => t.id === nextTrack.id);
    if (!prevTrack || prevTrack === nextTrack) continue; // same reference = no change

    const yTrack = findYMap(yTracks, 'id', nextTrack.id);
    if (!yTrack) continue;

    // Diff scalar fields
    for (const key of TRACK_SCALAR_KEYS) {
      if (prevTrack[key] !== nextTrack[key]) {
        yTrack.set(key, nextTrack[key] ?? null);
      }
    }

    // Effects (JSON-serialized for deeply nested params)
    if (prevTrack.effects !== nextTrack.effects) {
      yTrack.set('effects', JSON.stringify(nextTrack.effects));
    }
    if (prevTrack.activeEffects !== nextTrack.activeEffects) {
      yTrack.set('activeEffects', JSON.stringify(nextTrack.activeEffects));
    }

    // MIDI clips
    if (prevTrack.midiClips !== nextTrack.midiClips) {
      diffMidiClips(yTrack, prevTrack.midiClips, nextTrack.midiClips);
    }

    // Audio clips
    if (prevTrack.audioClips !== nextTrack.audioClips) {
      diffAudioClips(yTrack, prevTrack.audioClips, nextTrack.audioClips);
    }

    // Optional chains
    if (prevTrack.vocalChain !== nextTrack.vocalChain) {
      yTrack.set(
        'vocalChain',
        nextTrack.vocalChain ? JSON.stringify(nextTrack.vocalChain) : null,
      );
    }
    if (prevTrack.guitarChain !== nextTrack.guitarChain) {
      yTrack.set(
        'guitarChain',
        nextTrack.guitarChain ? JSON.stringify(nextTrack.guitarChain) : null,
      );
    }
    if (prevTrack.drumPads !== nextTrack.drumPads) {
      yTrack.set(
        'drumPads',
        nextTrack.drumPads ? JSON.stringify(nextTrack.drumPads) : null,
      );
    }
  }
}

// ── MIDI clip diff ──────────────────────────────────────────────────────

function diffMidiClips(
  yTrack: Y.Map<unknown>,
  prevClips: MidiClip[],
  nextClips: MidiClip[],
): void {
  const yClips = yTrack.get('midiClips') as Y.Array<Y.Map<unknown>>;
  if (!yClips) return;

  const prevIds = new Set(prevClips.map((c) => c.id));
  const nextIds = new Set(nextClips.map((c) => c.id));

  // Remove deleted clips
  for (let i = yClips.length - 1; i >= 0; i--) {
    const yClip = yClips.get(i) as Y.Map<unknown>;
    if (!nextIds.has(yClip.get('id') as string)) {
      yClips.delete(i, 1);
    }
  }

  // Add new clips
  for (const clip of nextClips) {
    if (!prevIds.has(clip.id)) {
      yClips.push([midiClipToYMap(clip)]);
    }
  }

  // Update modified clips
  for (const nextClip of nextClips) {
    const prevClip = prevClips.find((c) => c.id === nextClip.id);
    if (!prevClip || prevClip === nextClip) continue;

    const yClip = findYMap(yClips, 'id', nextClip.id);
    if (!yClip) continue;

    if (prevClip.name !== nextClip.name) yClip.set('name', nextClip.name ?? '');
    if (prevClip.startTick !== nextClip.startTick)
      yClip.set('startTick', nextClip.startTick);
    if (prevClip.durationTicks !== nextClip.durationTicks)
      yClip.set('durationTicks', nextClip.durationTicks ?? 0);

    // MIDI events — replace the entire events array when changed.
    // Per-note diffing by _cid is possible but adds complexity; this is
    // sufficient for the initial implementation since MIDI edits typically
    // replace the full clip events array in Zustand.
    if (prevClip.events !== nextClip.events) {
      const yEvents = yClip.get('events') as Y.Array<Y.Map<unknown>>;
      if (yEvents) {
        yEvents.delete(0, yEvents.length);
        yEvents.push(nextClip.events.map(midiEventToYMap));
      }
    }
  }
}

// ── Audio clip diff ─────────────────────────────────────────────────────

function diffAudioClips(
  yTrack: Y.Map<unknown>,
  prevClips: AudioClip[],
  nextClips: AudioClip[],
): void {
  const yClips = yTrack.get('audioClips') as Y.Array<Y.Map<unknown>>;
  if (!yClips) return;

  const prevIds = new Set(prevClips.map((c) => c.id));
  const nextIds = new Set(nextClips.map((c) => c.id));

  // Remove deleted clips
  for (let i = yClips.length - 1; i >= 0; i--) {
    const yClip = yClips.get(i) as Y.Map<unknown>;
    if (!nextIds.has(yClip.get('id') as string)) {
      yClips.delete(i, 1);
    }
  }

  // Add new clips
  for (const clip of nextClips) {
    if (!prevIds.has(clip.id)) {
      yClips.push([audioClipToYMap(clip)]);
    }
  }

  // Update modified clips
  for (const nextClip of nextClips) {
    const prevClip = prevClips.find((c) => c.id === nextClip.id);
    if (!prevClip || prevClip === nextClip) continue;

    const yClip = findYMap(yClips, 'id', nextClip.id);
    if (!yClip) continue;

    if (prevClip.startTick !== nextClip.startTick)
      yClip.set('startTick', nextClip.startTick);
    if (prevClip.duration !== nextClip.duration)
      yClip.set('duration', nextClip.duration);
    if (prevClip.fadeInTicks !== nextClip.fadeInTicks)
      yClip.set('fadeInTicks', nextClip.fadeInTicks);
    if (prevClip.fadeOutTicks !== nextClip.fadeOutTicks)
      yClip.set('fadeOutTicks', nextClip.fadeOutTicks);
  }
}

// ── Chord region diff ───────────────────────────────────────────────────

function diffChordRegions(
  doc: Y.Doc,
  prevRegions: ChordRegion[],
  nextRegions: ChordRegion[],
): void {
  const yRegions = getYChordRegions(doc);
  const prevIds = new Set(prevRegions.map((r) => r.id));
  const nextIds = new Set(nextRegions.map((r) => r.id));

  // Remove deleted
  for (let i = yRegions.length - 1; i >= 0; i--) {
    const yr = yRegions.get(i) as Y.Map<unknown>;
    if (!nextIds.has(yr.get('id') as string)) {
      yRegions.delete(i, 1);
    }
  }

  // Add new
  for (const region of nextRegions) {
    if (!prevIds.has(region.id)) {
      yRegions.push([chordRegionToYMap(region)]);
    }
  }

  // Update modified
  for (const nextRegion of nextRegions) {
    const prevRegion = prevRegions.find((r) => r.id === nextRegion.id);
    if (!prevRegion || prevRegion === nextRegion) continue;

    const yr = findYMap(yRegions, 'id', nextRegion.id);
    if (!yr) continue;

    if (prevRegion.startTick !== nextRegion.startTick)
      yr.set('startTick', nextRegion.startTick);
    if (prevRegion.endTick !== nextRegion.endTick)
      yr.set('endTick', nextRegion.endTick);
    if (prevRegion.name !== nextRegion.name) yr.set('name', nextRegion.name);
    if (prevRegion.noteName !== nextRegion.noteName)
      yr.set('noteName', nextRegion.noteName);
    if (prevRegion.color !== nextRegion.color)
      yr.set('color', JSON.stringify(nextRegion.color));
    if (prevRegion.confidence !== nextRegion.confidence)
      yr.set('confidence', nextRegion.confidence ?? null);
  }
}

// ── Prism diff ──────────────────────────────────────────────────────────

function diffPrism(doc: Y.Doc, prev: AllSlices, next: AllSlices): void {
  const yP = getYPrism(doc);
  if (prev.rootNote !== next.rootNote) yP.set('rootNote', next.rootNote);
  if (prev.mode !== next.mode) yP.set('mode', next.mode);
  if (prev.genre !== next.genre) yP.set('genre', next.genre);
  if (prev.rhythmName !== next.rhythmName)
    yP.set('rhythmName', next.rhythmName);
  if (prev.swing !== next.swing) yP.set('swing', next.swing);
}

// ── Markers diff ────────────────────────────────────────────────────────

function diffMarkers(
  doc: Y.Doc,
  prevMarkers: Marker[],
  nextMarkers: Marker[],
): void {
  const yMarkers = getYMarkers(doc);
  const prevIds = new Set(prevMarkers.map((m) => m.id));
  const nextIds = new Set(nextMarkers.map((m) => m.id));

  // Remove
  for (let i = yMarkers.length - 1; i >= 0; i--) {
    const ym = yMarkers.get(i) as Y.Map<unknown>;
    if (!nextIds.has(ym.get('id') as string)) {
      yMarkers.delete(i, 1);
    }
  }

  // Add
  for (const marker of nextMarkers) {
    if (!prevIds.has(marker.id)) {
      yMarkers.push([markerToYMap(marker)]);
    }
  }

  // Update
  for (const nextMarker of nextMarkers) {
    const prevMarker = prevMarkers.find((m) => m.id === nextMarker.id);
    if (!prevMarker || prevMarker === nextMarker) continue;

    const ym = findYMap(yMarkers, 'id', nextMarker.id);
    if (!ym) continue;

    if (prevMarker.tick !== nextMarker.tick) ym.set('tick', nextMarker.tick);
    if (prevMarker.name !== nextMarker.name) ym.set('name', nextMarker.name);
    if (prevMarker.color !== nextMarker.color)
      ym.set('color', nextMarker.color);
  }
}

// ── Mastering diff ──────────────────────────────────────────────────────

function diffMastering(doc: Y.Doc, prev: AllSlices, next: AllSlices): void {
  const yM = getYMastering(doc);
  if (prev.masteringStyle !== next.masteringStyle)
    yM.set('style', next.masteringStyle);
  if (prev.masteringEq !== next.masteringEq)
    yM.set('eq', JSON.stringify(next.masteringEq));
  if (prev.masteringDynamics !== next.masteringDynamics)
    yM.set('dynamics', JSON.stringify(next.masteringDynamics));
  if (prev.masteringLoudness !== next.masteringLoudness)
    yM.set('loudness', next.masteringLoudness);
  if (prev.masteringStereoField !== next.masteringStereoField)
    yM.set('stereoField', next.masteringStereoField);
  if (prev.masteringBypass !== next.masteringBypass)
    yM.set('bypass', next.masteringBypass);
  if (prev.masteringAmount !== next.masteringAmount)
    yM.set('amount', next.masteringAmount);
  if (prev.masteringPresence !== next.masteringPresence)
    yM.set('presence', next.masteringPresence);
  if (prev.masteringDeEsser !== next.masteringDeEsser)
    yM.set('deEsser', JSON.stringify(next.masteringDeEsser));
  if (prev.masteringFxChain !== next.masteringFxChain)
    yM.set('fxChain', JSON.stringify(next.masteringFxChain));
  if (prev.masteringEffects !== next.masteringEffects)
    yM.set('effects', JSON.stringify(next.masteringEffects));
}

// ── Lead sheet diff ─────────────────────────────────────────────────────

function diffLeadSheet(doc: Y.Doc, prev: AllSlices, next: AllSlices): void {
  const yLS = getYLeadSheet(doc);
  if (prev.leadSheetSections !== next.leadSheetSections)
    yLS.set('sections', JSON.stringify(next.leadSheetSections));
  if (prev.leadSheetRepeats !== next.leadSheetRepeats)
    yLS.set('repeats', JSON.stringify(next.leadSheetRepeats));
  if (prev.leadSheetChordFormat !== next.leadSheetChordFormat)
    yLS.set('chordFormat', next.leadSheetChordFormat);
  if (prev.leadSheetShowRepeats !== next.leadSheetShowRepeats)
    yLS.set('showRepeats', next.leadSheetShowRepeats);
}
