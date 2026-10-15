// ── YjsDocManager ────────────────────────────────────────────────────────
// Creates and manages the Y.Doc structure that mirrors the Zustand DAW store.
// Each synced slice maps to a top-level Y.Map or Y.Array on the document.

import * as Y from 'yjs';
import { ensureSamplerSampleId } from '@/daw/instruments/samplerChops';
import {
  isNoteId,
  mintNoteId,
  noteIdFromCid,
  type NoteId,
} from '@/daw/model/noteIds';
import { trackFieldDefault } from '@/daw/persistence/projectDocument/fields';
import type { AllSlices } from '@/daw/store/index';
import type { Track, MidiClip, AudioClip } from '@/daw/store/tracksSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Marker } from '@/daw/store/markersSlice';
import type { MidiNoteEvent, MidiCCEvent } from '@prism/engine';
import type { ChatMessage } from './types';

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

// Chat messages are stored as plain JSON objects (they're small and never
// mutated in place — only appended).
export function getYChat(doc: Y.Doc): Y.Array<ChatMessage> {
  return doc.getArray('chat');
}

export function getYAssets(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap('assets');
}

// ── Conversion helpers: Zustand → Yjs ───────────────────────────────────

/**
 * Convert a plain MidiNoteEvent to a Y.Map.
 *
 * The note's id rides in `_cid`, the key every version of the doc has given
 * a note's identity, so the doc keeps its shape and older peers keep working:
 * they read `_cid` onto their notes and write it back unchanged. A note that
 * reaches here without an id (a store path that hasn't given it one yet) gets
 * a fresh one in the doc only, as every note did before ids were stored.
 */
export function midiEventToYMap(ev: MidiNoteEvent): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('_cid', isNoteId(ev.id) ? ev.id : mintNoteId());
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
  // assetId is required for peers to download & decode the audio bytes for
  // playback (without it they only get a placeholder waveform). offsetSeconds
  // and gain affect how the clip is rendered/played, so sync them too.
  m.set('assetId', clip.assetId ?? null);
  m.set('offsetSeconds', clip.offsetSeconds ?? 0);
  m.set('gain', clip.gain ?? 1);
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
  // NOTE: `mute`/`solo`/`recordArmed`/`monitoring` are intentionally NOT
  // written — they are per-user-local (personal monitoring/recording) and must
  // never sync to peers.
  m.set('volume', track.volume);
  m.set('pan', track.pan);
  m.set('trackRole', track.trackRole);
  m.set('drumKit', track.drumKit ?? null);
  m.set('bassVoice', track.bassVoice ?? null);
  m.set('presetName', track.presetName ?? null);

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
  if (track.samplerSample)
    m.set('samplerSample', JSON.stringify(track.samplerSample));
  if (track.organState) m.set('organState', JSON.stringify(track.organState));
  if (track.sends) m.set('sends', JSON.stringify(track.sends));
  if (track.automation) m.set('automation', JSON.stringify(track.automation));

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

/**
 * The note's id from its `_cid`. An older peer wrote a UUID there, which
 * reads as the id derived from it, so it holds still for as long as that
 * `_cid` does. A note with none comes back without an id: the reader settles
 * those, and repeats, project-wide (ensureProjectNoteIds).
 */
function noteIdFromDoc(cid: unknown): NoteId | undefined {
  if (isNoteId(cid)) return cid;
  return typeof cid === 'string' && cid !== '' ? noteIdFromCid(cid) : undefined;
}

export function yMapToMidiEvent(m: Y.Map<unknown>): MidiNoteEvent {
  const event: MidiNoteEvent = {
    note: m.get('note') as number,
    velocity: m.get('velocity') as number,
    startTick: m.get('startTick') as number,
    durationTicks: m.get('durationTicks') as number,
    channel: m.get('channel') as number,
  };
  const id = noteIdFromDoc(m.get('_cid'));
  if (id !== undefined) event.id = id;
  return event;
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
    assetId: (m.get('assetId') as string | null) ?? null,
    offsetSeconds: (m.get('offsetSeconds') as number | undefined) ?? 0,
    gain: (m.get('gain') as number | undefined) ?? 1,
  };
}

/**
 * A track as the doc holds it. What the doc doesn't carry (this person's own
 * state, below, and anything an older peer didn't write) takes the
 * registry's plain track defaults: trackFieldDefault without a new-track
 * context, as for any decoder (see TrackFieldSpec in fields.ts).
 */
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
    // mute/solo/recordArmed/monitoring are per-user-local; never read from the
    // shared doc. The Yjs→Zustand observer preserves the local user's values on
    // remote updates.
    mute: trackFieldDefault('mute'),
    solo: trackFieldDefault('solo'),
    recordArmed: trackFieldDefault('recordArmed'),
    monitoring: trackFieldDefault('monitoring'),
    volume: m.get('volume') as number,
    pan: m.get('pan') as number,
    // A peer from before roles were shared writes none: 'auto' follows the
    // track's name.
    trackRole:
      (m.get('trackRole') as Track['trackRole'] | null | undefined) ||
      trackFieldDefault('trackRole'),
    drumKit: (m.get('drumKit') as string | null) ?? undefined,
    bassVoice: (m.get('bassVoice') as Track['bassVoice'] | null) ?? undefined,
    presetName: (m.get('presetName') as string | null) ?? undefined,
    midiInputId: trackFieldDefault('midiInputId'),
    audioInputId: trackFieldDefault('audioInputId'),
    audioInputChannel: trackFieldDefault('audioInputChannel'),
    // Merge over defaults so an older peer's doc (missing newer effect slots
    // like multiband) still yields a complete TrackEffectState.
    effects: {
      ...trackFieldDefault('effects'),
      ...(effectsStr ? JSON.parse(effectsStr) : {}),
    },
    activeEffects: activeEffectsStr
      ? JSON.parse(activeEffectsStr)
      : trackFieldDefault('activeEffects'),
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
    // ensureSamplerSampleId: docs written before sampleId existed get a
    // deterministic identity (never random — repeated remote reads must not
    // churn the track object).
    samplerSample:
      m.has('samplerSample') && m.get('samplerSample') !== null
        ? ensureSamplerSampleId(JSON.parse(m.get('samplerSample') as string))
        : undefined,
    organState:
      m.has('organState') && m.get('organState') !== null
        ? JSON.parse(m.get('organState') as string)
        : undefined,
    sends:
      m.has('sends') && m.get('sends') !== null
        ? JSON.parse(m.get('sends') as string)
        : undefined,
    automation:
      m.has('automation') && m.get('automation') !== null
        ? JSON.parse(m.get('automation') as string)
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
 * The eight mastering macros (style, EQ, presence, de-esser, loudness,
 * stereo field, dynamics, amount) as every build that had them wrote them.
 * No control ever changed them, and milestone 1.3 removed them from the
 * store, but older peers still read these keys when they join a room, so a
 * doc made here keeps them, at the values those peers would have shared. No
 * diff writes them and no observer reads them back (decision D5); they can
 * go when the collab doc schema next moves on (milestone 1.14).
 */
const LEGACY_MASTERING_MACROS: Readonly<Record<string, string | number>> = {
  style: 'balanced',
  eq: JSON.stringify({ low: 0, mid: 0, high: 0 }),
  dynamics: JSON.stringify({ compression: 50, character: 50, saturation: 0 }),
  loudness: -2,
  stereoField: '100%',
  amount: 100,
  presence: 50,
  deEsser: JSON.stringify({ amount: 0, frequency: 6000 }),
};

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
    project.set('version', String(1));

    // Transport — only tempo + time signature are shared. Loop region and
    // metronome are per-user-local, and play/position state is never synced.
    const transport = getYTransport(doc);
    transport.set('bpm', state.bpm);
    transport.set('timeSignatureNumerator', state.timeSignatureNumerator);
    transport.set('timeSignatureDenominator', state.timeSignatureDenominator);

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
    for (const [key, value] of Object.entries(LEGACY_MASTERING_MACROS)) {
      mastering.set(key, value);
    }
    mastering.set('bypass', state.masteringBypass);
    mastering.set('fxChain', JSON.stringify(state.masteringFxChain));
    mastering.set('effects', JSON.stringify(state.masteringEffects));
    mastering.set('masterVolume', state.masterVolume);
    mastering.set('masterAutomation', JSON.stringify(state.masterAutomation));
    mastering.set('returns', JSON.stringify(state.returns));

    // Lead sheet
    const leadSheet = getYLeadSheet(doc);
    leadSheet.set('sections', JSON.stringify(state.leadSheetSections));
    leadSheet.set('repeats', JSON.stringify(state.leadSheetRepeats));
    leadSheet.set('chordFormat', state.leadSheetChordFormat);
    leadSheet.set('showRepeats', state.leadSheetShowRepeats);
    leadSheet.set('scoreChordTracks', JSON.stringify(state.scoreChordTracks));
    leadSheet.set('scoreChordHidden', JSON.stringify(state.scoreChordHidden));
    leadSheet.set(
      'scoreArticulations',
      JSON.stringify(state.scoreArticulations),
    );
    leadSheet.set('scoreSlurs', JSON.stringify(state.scoreSlurs));
    leadSheet.set('scoreSlashNotes', JSON.stringify(state.scoreSlashNotes));
  });
}
