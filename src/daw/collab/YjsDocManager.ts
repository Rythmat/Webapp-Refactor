// ── YjsDocManager ────────────────────────────────────────────────────────
// Creates and manages the Y.Doc structure that mirrors the Zustand DAW store.
// Each synced slice maps to a top-level Y.Map or Y.Array on the document.

import * as Y from 'yjs';
import type { AllSlices } from '@/daw/store/index';
import type { Track, MidiClip, AudioClip } from '@/daw/store/tracksSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Marker } from '@/daw/store/markersSlice';
import type { MidiNoteEvent, MidiCCEvent } from '@prism/engine';

// ── Document singleton ──────────────────────────────────────────────────

let _doc: Y.Doc | null = null;

export function getOrCreateDoc(): Y.Doc {
  if (!_doc) {
    _doc = new Y.Doc();
  }
  return _doc;
}

export function destroyDoc(): void {
  _doc?.destroy();
  _doc = null;
}

// ── Shared-type accessors ───────────────────────────────────────────────
// Thin wrappers so callers don't scatter magic strings.

export function getYProject(doc: Y.Doc): Y.Map<string> {
  return doc.getMap('project');
}

export function getYTransport(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('transport');
}

export function getYTracks(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray('tracks');
}

export function getYChordRegions(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray('chordRegions');
}

export function getYPrism(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('prism');
}

export function getYMarkers(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray('markers');
}

export function getYMastering(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('mastering');
}

export function getYLeadSheet(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap('leadSheet');
}

export function getYChat(doc: Y.Doc): Y.Array<Y.Map<unknown>> {
  return doc.getArray('chat');
}

export function getYAssets(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap('assets');
}

// ── Conversion helpers: Zustand → Yjs ───────────────────────────────────

/**
 * Convert a plain MidiNoteEvent to a Y.Map.
 * Assigns a `_cid` (CRDT-stable identity) if the event doesn't already have one.
 */
export function midiEventToYMap(
  ev: MidiNoteEvent & { _cid?: string },
): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('_cid', ev._cid ?? crypto.randomUUID());
  m.set('note', ev.note);
  m.set('velocity', ev.velocity);
  m.set('startTick', ev.startTick);
  m.set('durationTicks', ev.durationTicks);
  m.set('channel', ev.channel);
  return m;
}

export function ccEventToYMap(ev: MidiCCEvent): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('tick', ev.tick);
  m.set('controller', ev.controller);
  m.set('value', ev.value);
  m.set('channel', ev.channel);
  return m;
}

export function midiClipToYMap(clip: MidiClip): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', clip.id);
  m.set('name', clip.name ?? '');
  m.set('startTick', clip.startTick);
  m.set('durationTicks', clip.durationTicks ?? 0);

  const events = new Y.Array<Y.Map<unknown>>();
  events.push(clip.events.map(midiEventToYMap));
  m.set('events', events);

  if (clip.ccEvents?.length) {
    const ccArr = new Y.Array<Y.Map<unknown>>();
    ccArr.push(clip.ccEvents.map(ccEventToYMap));
    m.set('ccEvents', ccArr);
  }
  return m;
}

export function audioClipToYMap(clip: AudioClip): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', clip.id);
  m.set('startTick', clip.startTick);
  m.set('duration', clip.duration);
  m.set('fadeInTicks', clip.fadeInTicks);
  m.set('fadeOutTicks', clip.fadeOutTicks);
  return m;
}

export function trackToYMap(track: Track): Y.Map<unknown> {
  const m = new Y.Map<unknown>();

  // Scalar fields
  m.set('id', track.id);
  m.set('name', track.name);
  m.set('type', track.type);
  m.set('instrument', track.instrument);
  m.set('gmProgram', track.gmProgram ?? null);
  m.set('color', track.color);
  m.set('mute', track.mute);
  m.set('solo', track.solo);
  m.set('volume', track.volume);
  m.set('pan', track.pan);
  m.set('recordArmed', track.recordArmed);
  m.set('monitoring', track.monitoring);
  m.set('trackRole', track.trackRole);

  // Effects — store as a JSON string for simplicity (deeply nested params).
  // Individual effect toggling is via activeEffects array.
  m.set('effects', JSON.stringify(track.effects));
  m.set('activeEffects', JSON.stringify(track.activeEffects));

  // MIDI clips
  const midiClips = new Y.Array<Y.Map<unknown>>();
  midiClips.push(track.midiClips.map(midiClipToYMap));
  m.set('midiClips', midiClips);

  // Audio clips
  const audioClips = new Y.Array<Y.Map<unknown>>();
  audioClips.push(track.audioClips.map(audioClipToYMap));
  m.set('audioClips', audioClips);

  // Optional chains — JSON-stringify for nested configs
  if (track.vocalChain) m.set('vocalChain', JSON.stringify(track.vocalChain));
  if (track.guitarChain)
    m.set('guitarChain', JSON.stringify(track.guitarChain));
  if (track.drumPads) m.set('drumPads', JSON.stringify(track.drumPads));

  return m;
}

export function chordRegionToYMap(r: ChordRegion): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', r.id);
  m.set('startTick', r.startTick);
  m.set('endTick', r.endTick);
  m.set('rawStartTick', r.rawStartTick ?? null);
  m.set('name', r.name);
  m.set('noteName', r.noteName);
  m.set('color', JSON.stringify(r.color));
  m.set('degreeKey', r.degreeKey ?? null);
  m.set('midis', r.midis ? JSON.stringify(r.midis) : null);
  m.set('confidence', r.confidence ?? null);
  return m;
}

export function markerToYMap(marker: Marker): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', marker.id);
  m.set('tick', marker.tick);
  m.set('name', marker.name);
  m.set('color', marker.color);
  return m;
}

// ── Conversion helpers: Yjs → Zustand ───────────────────────────────────

export function yMapToMidiEvent(
  m: Y.Map<unknown>,
): MidiNoteEvent & { _cid: string } {
  return {
    _cid: m.get('_cid') as string,
    note: m.get('note') as number,
    velocity: m.get('velocity') as number,
    startTick: m.get('startTick') as number,
    durationTicks: m.get('durationTicks') as number,
    channel: m.get('channel') as number,
  };
}

export function yMapToCCEvent(m: Y.Map<unknown>): MidiCCEvent {
  return {
    tick: m.get('tick') as number,
    controller: m.get('controller') as number,
    value: m.get('value') as number,
    channel: m.get('channel') as number,
  };
}

export function yMapToMidiClip(m: Y.Map<unknown>): MidiClip {
  const eventsArr = m.get('events') as Y.Array<Y.Map<unknown>> | undefined;
  const ccArr = m.get('ccEvents') as Y.Array<Y.Map<unknown>> | undefined;

  return {
    id: m.get('id') as string,
    name: (m.get('name') as string) || undefined,
    startTick: m.get('startTick') as number,
    durationTicks: (m.get('durationTicks') as number) || undefined,
    events: eventsArr ? eventsArr.toArray().map(yMapToMidiEvent) : [],
    ccEvents: ccArr ? ccArr.toArray().map(yMapToCCEvent) : undefined,
  };
}

export function yMapToAudioClip(m: Y.Map<unknown>): AudioClip {
  return {
    id: m.get('id') as string,
    startTick: m.get('startTick') as number,
    duration: m.get('duration') as number,
    fadeInTicks: m.get('fadeInTicks') as number,
    fadeOutTicks: m.get('fadeOutTicks') as number,
  };
}

export function yMapToTrack(m: Y.Map<unknown>): Track {
  const midiClipsArr = m.get('midiClips') as
    | Y.Array<Y.Map<unknown>>
    | undefined;
  const audioClipsArr = m.get('audioClips') as
    | Y.Array<Y.Map<unknown>>
    | undefined;

  const effectsStr = m.get('effects') as string | undefined;
  const activeEffectsStr = m.get('activeEffects') as string | undefined;

  return {
    id: m.get('id') as string,
    name: m.get('name') as string,
    type: m.get('type') as Track['type'],
    instrument: m.get('instrument') as Track['instrument'],
    gmProgram: (m.get('gmProgram') as number | null) ?? undefined,
    color: m.get('color') as string,
    mute: m.get('mute') as boolean,
    solo: m.get('solo') as boolean,
    volume: m.get('volume') as number,
    pan: m.get('pan') as number,
    recordArmed: m.get('recordArmed') as boolean,
    monitoring: m.get('monitoring') as boolean,
    trackRole: m.get('trackRole') as Track['trackRole'],
    midiInputId: null,
    audioInputId: null,
    audioInputChannel: null,
    effects: effectsStr ? JSON.parse(effectsStr) : {},
    activeEffects: activeEffectsStr ? JSON.parse(activeEffectsStr) : [],
    midiClips: midiClipsArr ? midiClipsArr.toArray().map(yMapToMidiClip) : [],
    audioClips: audioClipsArr
      ? audioClipsArr.toArray().map(yMapToAudioClip)
      : [],
    vocalChain: m.has('vocalChain')
      ? JSON.parse(m.get('vocalChain') as string)
      : undefined,
    guitarChain: m.has('guitarChain')
      ? JSON.parse(m.get('guitarChain') as string)
      : undefined,
    drumPads: m.has('drumPads')
      ? JSON.parse(m.get('drumPads') as string)
      : undefined,
  };
}

export function yMapToChordRegion(m: Y.Map<unknown>): ChordRegion {
  return {
    id: m.get('id') as string,
    startTick: m.get('startTick') as number,
    endTick: m.get('endTick') as number,
    rawStartTick: (m.get('rawStartTick') as number | null) ?? undefined,
    name: m.get('name') as string,
    noteName: m.get('noteName') as string,
    color: JSON.parse(m.get('color') as string),
    degreeKey: (m.get('degreeKey') as string | null) ?? undefined,
    midis: m.get('midis') ? JSON.parse(m.get('midis') as string) : undefined,
    confidence: (m.get('confidence') as number | null) ?? undefined,
  };
}

export function yMapToMarker(m: Y.Map<unknown>): Marker {
  return {
    id: m.get('id') as string,
    tick: m.get('tick') as number,
    name: m.get('name') as string,
    color: m.get('color') as string,
  };
}

// ── Hydrate: populate Y.Doc from Zustand state ─────────────────────────

/**
 * Write the current Zustand state into the Yjs doc.
 * Called once when a collaborative session is first created from a local project.
 */
export function hydrateDocFromStore(doc: Y.Doc, state: AllSlices): void {
  doc.transact(() => {
    // Project
    const project = getYProject(doc);
    project.set('name', state.projectName);
    project.set('composerName', state.composerName);
    project.set('version', 1);

    // Transport (persistent settings only)
    const transport = getYTransport(doc);
    transport.set('bpm', state.bpm);
    transport.set('timeSignatureNumerator', state.timeSignatureNumerator);
    transport.set('timeSignatureDenominator', state.timeSignatureDenominator);
    transport.set('metronomeEnabled', state.metronomeEnabled);
    transport.set('loopEnabled', state.loopEnabled);
    transport.set('loopStart', state.loopStart);
    transport.set('loopEnd', state.loopEnd);

    // Tracks
    const yTracks = getYTracks(doc);
    yTracks.delete(0, yTracks.length); // clear
    yTracks.push(state.tracks.map(trackToYMap));

    // Chord regions
    const yChords = getYChordRegions(doc);
    yChords.delete(0, yChords.length);
    yChords.push(state.chordRegions.map(chordRegionToYMap));

    // Prism
    const prism = getYPrism(doc);
    prism.set('rootNote', state.rootNote);
    prism.set('mode', state.mode);
    prism.set('genre', state.genre);
    prism.set('rhythmName', state.rhythmName);
    prism.set('swing', state.swing);

    // Markers
    const yMarkers = getYMarkers(doc);
    yMarkers.delete(0, yMarkers.length);
    yMarkers.push(state.markers.map(markerToYMap));

    // Mastering
    const mastering = getYMastering(doc);
    mastering.set('style', state.masteringStyle);
    mastering.set('eq', JSON.stringify(state.masteringEq));
    mastering.set('dynamics', JSON.stringify(state.masteringDynamics));
    mastering.set('loudness', state.masteringLoudness);
    mastering.set('stereoField', state.masteringStereoField);
    mastering.set('bypass', state.masteringBypass);
    mastering.set('amount', state.masteringAmount);
    mastering.set('presence', state.masteringPresence);
    mastering.set('deEsser', JSON.stringify(state.masteringDeEsser));
    mastering.set('fxChain', JSON.stringify(state.masteringFxChain));
    mastering.set('effects', JSON.stringify(state.masteringEffects));

    // Lead sheet
    const leadSheet = getYLeadSheet(doc);
    leadSheet.set('sections', JSON.stringify(state.leadSheetSections));
    leadSheet.set('repeats', JSON.stringify(state.leadSheetRepeats));
    leadSheet.set('chordFormat', state.leadSheetChordFormat);
    leadSheet.set('showRepeats', state.leadSheetShowRepeats);
  });
}
