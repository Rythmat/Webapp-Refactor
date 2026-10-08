// @vitest-environment jsdom
/**
 * Persistence matrix: which parts of a Studio project survive a reload today.
 *
 * Each probe writes one non-default value into the editor store, reloads, and
 * checks that the value is back. Two reloads are measured:
 *
 * - Browser refresh (the local autosave): `serializeSession` → JSON, as
 *   localStorage holds it → `deserializeSession` in a new page.
 * - Cloud reopen (File ▸ Save, then open from the dashboard):
 *   `serializeSessionForCloud` → JSON, as the request body →
 *   `deserializeCloudProject` in a new page. The stand-in server echoes the
 *   body back with ids added, so only the client codec is measured. The
 *   editor's real save and open code against a mock API is the browser
 *   round-trip suite's job (scripts/studio-perf/roundtrip.mjs).
 *
 * A new page re-evaluates every module (vi.resetModules), so the store, the
 * per-track synth patch cache and the chord-id counter all start from scratch,
 * as they do after a real reload. Restoring into the same store instead would
 * make any field the codec never touches look as if it had survived.
 *
 * This file is a ratchet. A case that the audit (branch studio/audit-archive,
 * docs/studio-audit-2026-10) found lost today is `it.fails`, and the comment
 * above it names the finding. When a milestone makes that field survive,
 * vitest fails the case ("Expect test to fail"): flip it to `it`. Cases that
 * pass today are plain `it`, so the file also records what survives, and a
 * codec rewrite (milestone 1.3) that drops one of them fails here. A separate
 * block checks that each probe reads back its own write without a reload, so
 * an `it.fails` case can only fail because of the reload.
 *
 * Not probed: view and lesson context (current view, practice session,
 * tutorial step), which milestone 1.15 moves into the draft rather than this
 * codec; melodyOverrides (nothing reads it); leadSheetMelodyTrackId (nothing
 * writes it); the mastering macros such as masteringStyle and masteringEq
 * (nothing outside their slice sets them); audioMidiSource (session-only by
 * design); and UI state such as the selected track.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/persistenceMatrix.test.ts
 */
import { describe, expect, it, vi } from 'vitest';
import {
  StrumMode,
  VelocityTilt,
  type MidiCCEvent,
  type MidiNoteEvent,
} from '@prism/engine';
import type { PitchSegment } from '@/daw/audio/pitch-analysis/PitchAnalyzer';
import type { OrganState } from '@/daw/instruments/TonewheelOrganEngine';
import type { SamplerSampleRef } from '@/daw/instruments/samplerChops';
import type * as SynthStoreModule from '@/daw/oracle-synth/store';
import type * as SynthPatchModule from '@/daw/oracle-synth/synthTrackState';
import type * as StoreModule from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { AudioClip, MidiClip, Track } from '@/daw/store/tracksSlice';
import type * as Codec from '../SessionSerializer';

// ── Pages ────────────────────────────────────────────────────────────────

/** One browser page: its own store, codec, synth patch cache and synth store. */
interface Page {
  store: typeof StoreModule.useStore;
  codec: typeof Codec;
  patches: typeof SynthPatchModule;
  synth: typeof SynthStoreModule.useSynthStore;
}

/** Load the editor's modules afresh, as a page load does. */
async function loadPage(): Promise<Page> {
  vi.resetModules();
  const { useStore } = await import('@/daw/store');
  const codec = await import('../SessionSerializer');
  const patches = await import('@/daw/oracle-synth/synthTrackState');
  const { useSynthStore } = await import('@/daw/oracle-synth/store');
  return { store: useStore, codec, patches, synth: useSynthStore };
}

const st = (p: Page) => p.store.getState();

type Reload = (page: Page) => Promise<Page>;

/** Browser refresh: the autosave goes through localStorage as JSON. */
const refresh: Reload = async (page) => {
  const saved = JSON.parse(
    JSON.stringify(page.codec.serializeSession()),
  ) as Codec.SessionData;
  const next = await loadPage();
  next.codec.deserializeSession(saved);
  return next;
};

/** File ▸ Save, then open the project from the dashboard in a later session. */
const reopenFromCloud: Reload = async (page) => {
  const body = JSON.parse(
    JSON.stringify(page.codec.serializeSessionForCloud()),
  ) as Codec.CloudProjectInput;
  const next = await loadPage();
  next.codec.deserializeCloudProject({
    ...body,
    id: 'saved-project',
    createdAt: new Date(),
    updatedAt: new Date(),
    tracks: body.tracks.map((t, i) => ({ ...t, id: `row-${i}`, ordinal: i })),
  });
  return next;
};

// ── The project every probe starts from ──────────────────────────────────

const KEYS_CLIP = 'clip-keys';
const KEYS_NOTES: MidiNoteEvent[] = [
  { note: 60, velocity: 90, startTick: 0, durationTicks: 480, channel: 0 },
  { note: 64, velocity: 80, startTick: 480, durationTicks: 480, channel: 0 },
  { note: 67, velocity: 70, startTick: 960, durationTicks: 960, channel: 0 },
];

/**
 * The four tracks of every project, then the ones a single probe adds for
 * an instrument with settings of its own.
 */
type TrackName =
  | 'Keys'
  | 'Lead'
  | 'Drums'
  | 'Guitar'
  | 'Vocal'
  | 'Bass'
  | 'Chops'
  | 'Organ';

/** Keys with one clip, an Oracle lead, drums and a live guitar. */
function buildProject(p: Page): void {
  const keys = st(p).addTrack('midi', 'piano-sampler', 'Keys');
  st(p).addMidiClip(keys, {
    id: KEYS_CLIP,
    name: 'Verse',
    startTick: 0,
    events: KEYS_NOTES,
  });
  st(p).addTrack('midi', 'oracle-synth', 'Lead');
  st(p).addTrack('midi', 'drum-machine', 'Drums');
  st(p).addTrack('audio', 'guitar-fx', 'Guitar');
}

// Look tracks up by name: a cloud load mints new track ids, so anything keyed
// by a track id is checked against the id the track has on that page.
function track(p: Page, name: TrackName): Track {
  const found = st(p).tracks.find((t) => t.name === name);
  if (!found) throw new Error(`No ${name} track`);
  return found;
}

function keysClip(p: Page): MidiClip {
  const found = track(p, 'Keys').midiClips.find((c) => c.id === KEYS_CLIP);
  if (!found) throw new Error('No Keys clip');
  return found;
}

/** Score note ids are `trackId:clipId:startTick:pitch` (scoreParts.ts). */
function noteId(p: Page, index: number): string {
  const n = KEYS_NOTES[index];
  return `${track(p, 'Keys').id}:${KEYS_CLIP}:${n.startTick}:${n.note}`;
}

const CHORDS: ChordRegion[] = [
  {
    id: 'chord-1',
    startTick: 0,
    endTick: 1920,
    name: '2 minor',
    noteName: 'Dm7',
    color: [90, 120, 200],
    degreeKey: '2 minor',
  },
  {
    id: 'chord-2',
    startTick: 1920,
    endTick: 3840,
    name: '5 major',
    noteName: 'G7',
    color: [200, 90, 90],
    degreeKey: '5 major',
  },
];

function chordAt(p: Page, tick: number): ChordRegion {
  const found = st(p).chordRegions.find((r) => r.startTick === tick);
  if (!found) throw new Error(`No chord at tick ${tick}`);
  return found;
}

/** Drop the id, for records a fixed codec could legitimately re-mint. */
function withoutId<T extends { id: string }>(record: T): Omit<T, 'id'> {
  const copy: Partial<T> = { ...record };
  delete copy.id;
  return copy as Omit<T, 'id'>;
}

const TAKE: AudioClip = {
  id: 'take-1',
  startTick: 3840,
  duration: 7680,
  fadeInTicks: 120,
  fadeOutTicks: 240,
  assetId: 'asset-take-1',
  offsetSeconds: 0.5,
  gain: 0.7,
};

const SEGMENT: PitchSegment = {
  id: 'segment-1',
  startTimeMs: 0,
  endTimeMs: 400,
  medianFreqHz: 311.1,
  midiNote: 63,
  centsOffset: -12,
  pitchContour: [310, 311, 312],
};

const SUSTAIN_PEDAL: MidiCCEvent[] = [
  { tick: 0, controller: 64, value: 127, channel: 0 },
  { tick: 1800, controller: 64, value: 0, channel: 0 },
];

const EDITED_NOTES: MidiNoteEvent[] = [
  { note: 62, velocity: 100, startTick: 0, durationTicks: 240, channel: 0 },
  { note: 65, velocity: 64, startTick: 240, durationTicks: 720, channel: 0 },
];

const VOCAL_CHAIN: NonNullable<Track['vocalChain']> = [
  {
    type: 'pitch-correction',
    enabled: true,
    params: { rootNote: 2, scaleType: 1, correction: 95, speed: 20 },
  },
  { type: 'reverb', enabled: false, params: { size: 0.7, mix: 0.25 } },
];

/** A Chops sample as saves written before samples had an id hold it. */
const LEGACY_CHOP: Omit<SamplerSampleRef, 'sampleId'> = {
  assetId: 'asset-chop-1',
  rootNote: 'D4',
  attack: 0.02,
  release: 0.6,
  name: 'vox-chop.wav',
  durationSeconds: 1.8,
  mode: 'one-shot',
  gain: 1.4,
  startPct: 10,
  lengthPct: 50,
  filterOn: true,
  filterHz: 8000,
  filterRes: 20,
};

const CHOP: SamplerSampleRef = { sampleId: 'smp-chop-1', ...LEGACY_CHOP };

const ORGAN: OrganState = {
  drawbars: [8, 8, 6, 4, 3, 2, 0, 0, 0],
  clickLevel: 0.3,
  percEnabled: true,
  percHarmonic: '3rd',
  percVolume: 'soft',
  percDecay: 'fast',
  vibratoMode: 'C3',
  overdrive: 0.4,
  leslieSpeed: 'fast',
  leslieEnabled: true,
  swellLevel: 0.9,
};

// ── Probes ───────────────────────────────────────────────────────────────

interface Probe {
  /** Put a non-default value into the store. */
  write: (p: Page) => void;
  /** Expect that value in the store. */
  check: (p: Page) => void;
}

const writeStereoInput = (p: Page) =>
  st(p).updateTrack(track(p, 'Guitar').id, {
    audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
  });

const probes = {
  identity: {
    write: (p) => {
      st(p).setProjectName('Blue Hour');
      st(p).setComposerName('Ana Ruiz');
    },
    check: (p) => {
      expect(st(p).projectName).toBe('Blue Hour');
      expect(st(p).composerName).toBe('Ana Ruiz');
    },
  },
  // The cloud project the autosave belongs to, so the next Save updates it.
  projectId: {
    write: (p) => st(p).setProjectId('project-42'),
    check: (p) => expect(st(p).projectId).toBe('project-42'),
  },
  tempo: {
    write: (p) => st(p).setBpm(96),
    check: (p) => expect(st(p).bpm).toBe(96),
  },
  loop: {
    write: (p) => {
      st(p).setLoopRange(1920, 9600);
      st(p).setLoopEnabled(true);
    },
    check: (p) =>
      expect([st(p).loopEnabled, st(p).loopStart, st(p).loopEnd]).toEqual([
        true,
        1920,
        9600,
      ]),
  },
  // Cloud only. The 1.3 field registry makes the loop range project data but
  // loop on/off per-user and draft-only, so a fixed cloud codec carries the
  // range alone and a check that included the switch could never pass.
  loopRange: {
    write: (p) => st(p).setLoopRange(1920, 9600),
    check: (p) =>
      expect([st(p).loopStart, st(p).loopEnd]).toEqual([1920, 9600]),
  },
  metronome: {
    write: (p) => st(p).toggleMetronome(),
    check: (p) => expect(st(p).metronomeEnabled).toBe(true),
  },
  playhead: {
    write: (p) => st(p).setPosition(2880),
    check: (p) => expect(st(p).position).toBe(2880),
  },
  timeSignature: {
    write: (p) => st(p).setTimeSignature(6, 8),
    check: (p) =>
      expect([
        st(p).timeSignatureNumerator,
        st(p).timeSignatureDenominator,
      ]).toEqual([6, 8]),
  },
  keyAndFeel: {
    write: (p) => {
      st(p).setRootNote(2);
      st(p).setRhythm('Eighths');
      // Not selectGenre: it also picks a random rhythm and rewrites the
      // swing and strum, which this probe and strumAndTilt set themselves.
      p.store.setState({ genre: 'Jazz' });
      st(p).setSwing(30);
    },
    check: (p) =>
      expect({
        rootNote: st(p).rootNote,
        rhythmName: st(p).rhythmName,
        genre: st(p).genre,
        swing: st(p).swing,
      }).toEqual({
        rootNote: 2,
        rhythmName: 'Eighths',
        genre: 'Jazz',
        swing: 30,
      }),
  },
  mode: {
    write: (p) => st(p).setMode('dorian'),
    check: (p) => expect(st(p).mode).toBe('dorian'),
  },
  strumAndTilt: {
    write: (p) => {
      st(p).setStrumMode(StrumMode.Down);
      st(p).setStrumAmount(25);
      st(p).setTiltMode(VelocityTilt.BassLeading);
      st(p).setTiltAmount(40);
    },
    check: (p) =>
      expect({
        strumMode: st(p).strumMode,
        strumAmount: st(p).strumAmount,
        tiltMode: st(p).tiltMode,
        tiltAmount: st(p).tiltAmount,
      }).toEqual({
        strumMode: StrumMode.Down,
        strumAmount: 25,
        tiltMode: VelocityTilt.BassLeading,
        tiltAmount: 40,
      }),
  },
  // The chords picked in Prism before they are written to tracks. Only the
  // names are checked: the voicings (chordSeq) can be rebuilt from them.
  prismProgression: {
    write: (p) => {
      st(p).addChord('2 minor');
      st(p).addChord('5 major');
    },
    check: (p) => expect(st(p).stringSeq).toEqual(['2 minor', '5 major']),
  },
  // setState, not setChordRegions: that also turns on harmony clip colouring,
  // which the clipColorMode probe covers on its own.
  chordLane: {
    write: (p) => p.store.setState({ chordRegions: CHORDS }),
    check: (p) =>
      expect(st(p).chordRegions.map(withoutId)).toEqual(CHORDS.map(withoutId)),
  },
  clipColorMode: {
    write: (p) => st(p).setClipColorMode('prism'),
    check: (p) => expect(st(p).clipColorMode).toBe('prism'),
  },
  leadSheetSections: {
    write: (p) =>
      st(p).setLeadSheetSections([
        { measureIdx: 0, label: 'A' },
        { measureIdx: 8, label: 'B' },
      ]),
    check: (p) =>
      expect(st(p).leadSheetSections).toEqual([
        { measureIdx: 0, label: 'A' },
        { measureIdx: 8, label: 'B' },
      ]),
  },
  leadSheetRepeats: {
    write: (p) =>
      st(p).setLeadSheetRepeats([{ startMeasure: 0, endMeasure: 7 }]),
    check: (p) =>
      expect(st(p).leadSheetRepeats).toEqual([
        { startMeasure: 0, endMeasure: 7 },
      ]),
  },
  measureRowSizes: {
    write: (p) => st(p).setMeasureRowSizes([4, 5, 4]),
    check: (p) => expect(st(p).measureRowSizes).toEqual([4, 5, 4]),
  },
  multiBarRests: {
    write: (p) => st(p).setMeasureRestMap({ 12: 2 }),
    check: (p) => expect(st(p).measureRestMap).toEqual({ 12: 2 }),
  },
  fermatas: {
    write: (p) => st(p).setMeasureFermatas([15]),
    check: (p) => expect(st(p).measureFermatas).toEqual([15]),
  },
  chordFormat: {
    write: (p) => st(p).setLeadSheetChordFormat('jazz'),
    check: (p) => expect(st(p).leadSheetChordFormat).toBe('jazz'),
  },
  leadSheetMelody: {
    write: (p) => st(p).setLeadSheetShowMelody(true),
    check: (p) => expect(st(p).leadSheetShowMelody).toBe(true),
  },
  articulations: {
    write: (p) =>
      st(p).setScoreArticulations([
        `${noteId(p, 0)}|staccato`,
        `${noteId(p, 2)}|fermata`,
      ]),
    check: (p) =>
      expect(st(p).scoreArticulations).toEqual([
        `${noteId(p, 0)}|staccato`,
        `${noteId(p, 2)}|fermata`,
      ]),
  },
  slurs: {
    write: (p) => st(p).setScoreSlurs([`${noteId(p, 0)}|${noteId(p, 1)}`]),
    check: (p) =>
      expect(st(p).scoreSlurs).toEqual([`${noteId(p, 0)}|${noteId(p, 1)}`]),
  },
  pinnedSpellings: {
    write: (p) => st(p).setScoreSpellings([`${noteId(p, 1)}|F♭`]),
    check: (p) => expect(st(p).scoreSpellings).toEqual([`${noteId(p, 1)}|F♭`]),
  },
  slashNotes: {
    write: (p) => st(p).setScoreSlashNotes([noteId(p, 2)]),
    check: (p) => expect(st(p).scoreSlashNotes).toEqual([noteId(p, 2)]),
  },
  scoreLayout: {
    write: (p) => {
      st(p).setScoreSystemBreaks([4]);
      st(p).setScorePageBreaks([16]);
      st(p).setScoreSystemRuns([[8, 3]]);
    },
    check: (p) => {
      expect(st(p).scoreSystemBreaks).toEqual([4]);
      expect(st(p).scorePageBreaks).toEqual([16]);
      expect(st(p).scoreSystemRuns).toEqual([[8, 3]]);
    },
  },
  textMarks: {
    write: (p) =>
      st(p).setScoreTextMarks([
        { id: 'mark-segno', measureIdx: 0, kind: 'segno' },
        { id: 'mark-text', measureIdx: 4, kind: 'text', text: 'Swing feel' },
      ]),
    check: (p) =>
      expect(st(p).scoreTextMarks.map(withoutId)).toEqual([
        { measureIdx: 0, kind: 'segno' },
        { measureIdx: 4, kind: 'text', text: 'Swing feel' },
      ]),
  },
  chordSymbolsOnPart: {
    write: (p) => st(p).toggleScoreChordTrack(track(p, 'Keys').id),
    check: (p) => expect(st(p).scoreChordTracks).toEqual([track(p, 'Keys').id]),
  },
  // Keys are `trackId:regionId`, so both ids are taken from the page. The mark
  // names a chord, so it can only survive together with the chord lane.
  chordHiddenOnPart: {
    write: (p) => {
      p.store.setState({ chordRegions: CHORDS });
      st(p).setScoreChordHidden([
        `${track(p, 'Keys').id}:${chordAt(p, 1920).id}`,
      ]);
    },
    check: (p) => {
      // Not chordAt: when a load drops the chord lane as well, this should
      // fail on the mark, not throw while looking up the chord.
      const chord = st(p).chordRegions.find((r) => r.startTick === 1920);
      expect(st(p).scoreChordHidden).toEqual([
        `${track(p, 'Keys').id}:${chord?.id ?? 'no chord at tick 1920'}`,
      ]);
    },
  },
  markers: {
    write: (p) => {
      st(p).addMarker(1920, 'Verse', '#8fd3ff');
      st(p).addMarker(5760, 'Chorus', '#ff8a3d');
    },
    check: (p) =>
      expect(st(p).markers.map(withoutId)).toEqual([
        { tick: 1920, name: 'Verse', color: '#8fd3ff' },
        { tick: 5760, name: 'Chorus', color: '#ff8a3d' },
      ]),
  },
  masteringChain: {
    write: (p) => {
      st(p).addMasteringFx('compressor');
      st(p).updateMasteringEffects({
        compressor: { ...st(p).masteringEffects.compressor, threshold: -18 },
      });
    },
    check: (p) => {
      expect(st(p).masteringFxChain).toEqual(['compressor']);
      expect(st(p).masteringEffects.compressor).toMatchObject({
        enabled: true,
        threshold: -18,
      });
    },
  },
  masteringBypass: {
    write: (p) => st(p).toggleMasteringBypass(),
    check: (p) => expect(st(p).masteringBypass).toBe(true),
  },
  masterVolume: {
    write: (p) => st(p).setMasterVolume(0.55),
    check: (p) => expect(st(p).masterVolume).toBe(0.55),
  },
  masterAutomation: {
    write: (p) =>
      st(p).upsertMasterAutomationPoint('volume', { tick: 960, value: 0.4 }),
    check: (p) =>
      expect(st(p).masterAutomation).toEqual({
        volume: [{ tick: 960, value: 0.4 }],
      }),
  },
  returnBuses: {
    write: (p) => {
      const reverb = st(p).returns.find((r) => r.id === 'A')?.effects.reverb;
      if (!reverb) throw new Error('No return A');
      st(p).updateReturnEffects('A', { reverb: { ...reverb, decay: 4.2 } });
    },
    check: (p) =>
      expect(
        st(p).returns.find((r) => r.id === 'A')?.effects.reverb.decay,
      ).toBe(4.2),
  },
  // The track list itself: order, type and instrument.
  trackList: {
    write: (p) => st(p).reorderTrack(track(p, 'Guitar').id, 0),
    check: (p) =>
      expect(st(p).tracks.map((t) => [t.name, t.type, t.instrument])).toEqual([
        ['Guitar', 'audio', 'guitar-fx'],
        ['Keys', 'midi', 'piano-sampler'],
        ['Lead', 'midi', 'oracle-synth'],
        ['Drums', 'midi', 'drum-machine'],
      ]),
  },
  trackMix: {
    write: (p) => {
      const keys = track(p, 'Keys').id;
      st(p).updateTrack(keys, { volume: 0.42, pan: -0.3, color: '#3d8bff' });
      st(p).toggleMute(keys);
      st(p).toggleSolo(track(p, 'Drums').id);
    },
    check: (p) => {
      expect(track(p, 'Keys')).toMatchObject({
        volume: 0.42,
        pan: -0.3,
        color: '#3d8bff',
        mute: true,
      });
      expect(track(p, 'Drums').solo).toBe(true);
    },
  },
  trackEffects: {
    write: (p) => {
      const keys = track(p, 'Keys').id;
      st(p).addActiveEffect(keys, 'reverb');
      st(p).updateTrackEffects(keys, {
        reverb: { ...track(p, 'Keys').effects.reverb, decay: 3.3 },
      });
    },
    check: (p) => {
      expect(track(p, 'Keys').activeEffects).toEqual(['reverb']);
      expect(track(p, 'Keys').effects.reverb).toMatchObject({
        enabled: true,
        decay: 3.3,
      });
    },
  },
  // The ducker keys from another track by id. A cloud load mints new track
  // ids and remaps the key through settings.sourceTrackId, so the check
  // compares it with the Drums id on the new page.
  duckerKey: {
    write: (p) => {
      const keys = track(p, 'Keys').id;
      st(p).addActiveEffect(keys, 'ducker');
      st(p).updateTrackEffects(keys, {
        ducker: {
          ...track(p, 'Keys').effects.ducker,
          keyTrackId: track(p, 'Drums').id,
          amount: 0.6,
        },
      });
    },
    check: (p) =>
      expect(track(p, 'Keys').effects.ducker).toMatchObject({
        enabled: true,
        keyTrackId: track(p, 'Drums').id,
        amount: 0.6,
      }),
  },
  sends: {
    write: (p) => {
      st(p).setSend(track(p, 'Keys').id, 'A', 0.5);
      st(p).setSend(track(p, 'Keys').id, 'B', 0.2);
    },
    check: (p) => expect(track(p, 'Keys').sends).toEqual({ A: 0.5, B: 0.2 }),
  },
  trackAutomation: {
    write: (p) => {
      const keys = track(p, 'Keys').id;
      st(p).upsertAutomationPoint(keys, 'volume', { tick: 0, value: 1 });
      st(p).upsertAutomationPoint(keys, 'volume', { tick: 480, value: 0.2 });
    },
    check: (p) =>
      expect(track(p, 'Keys').automation).toEqual({
        volume: [
          { tick: 0, value: 1 },
          { tick: 480, value: 0.2 },
        ],
      }),
  },
  drumKitAndPads: {
    write: (p) => {
      const drums = track(p, 'Drums').id;
      st(p).setDrumKit(drums, '808');
      st(p).updateDrumPad(drums, 36, { volume: 0.5, pan: -0.25 });
    },
    check: (p) => {
      expect(track(p, 'Drums').drumKit).toBe('808');
      expect(track(p, 'Drums').drumPads).toEqual({
        36: { volume: 0.5, pan: -0.25 },
      });
    },
  },
  instrumentPreset: {
    write: (p) =>
      st(p).updateTrack(track(p, 'Keys').id, {
        gmProgram: 4,
        presetName: 'Rhodes',
      }),
    check: (p) =>
      expect(track(p, 'Keys')).toMatchObject({
        gmProgram: 4,
        presetName: 'Rhodes',
      }),
  },
  // The lesson bass a Practice Track hands the Studio
  // (seedStudioFromGenrePracticeTrack); unset means the sampled electric.
  bassVoice: {
    write: (p) => {
      const bass = st(p).addTrack('midi', 'bass-electric', 'Bass');
      st(p).updateTrack(bass, { bassVoice: 'upright' });
    },
    check: (p) => expect(track(p, 'Bass').bassVoice).toBe('upright'),
  },
  samplerSample: {
    write: (p) => {
      const chops = st(p).addTrack('midi', 'sampler', 'Chops');
      st(p).setSamplerSample(chops, { ...CHOP });
    },
    check: (p) => expect(track(p, 'Chops').samplerSample).toEqual(CHOP),
  },
  // What OrganView saves on the track after each drawbar or switch change.
  organState: {
    write: (p) => {
      const organ = st(p).addTrack('midi', 'tonewheel-organ', 'Organ');
      st(p).updateTrack(organ, { organState: structuredClone(ORGAN) });
    },
    check: (p) => expect(track(p, 'Organ').organState).toEqual(ORGAN),
  },
  pedalChain: {
    write: (p) =>
      st(p).setGuitarChain(track(p, 'Guitar').id, [
        {
          type: 'overdrive',
          enabled: true,
          params: { drive: 0.6, tone: 0.4 },
          namModelId: null,
        },
      ]),
    check: (p) =>
      expect(track(p, 'Guitar').guitarChain).toEqual([
        {
          type: 'overdrive',
          enabled: true,
          params: { drive: 0.6, tone: 0.4 },
          namModelId: null,
        },
      ]),
  },
  vocalChain: {
    write: (p) => {
      const vocal = st(p).addTrack('audio', 'vocal-fx', 'Vocal');
      st(p).setVocalChain(vocal, structuredClone(VOCAL_CHAIN));
    },
    check: (p) => expect(track(p, 'Vocal').vocalChain).toEqual(VOCAL_CHAIN),
  },
  // The patch lives in the synth module's per-track cache, not on the Track.
  oracleSynthPatch: {
    write: (p) => {
      p.synth.getState().loadPreset('BASS');
      p.patches.setTrackSynthState(
        track(p, 'Lead').id,
        p.patches.captureSynthState(),
      );
      // The shared synth store moves on to another sound.
      p.synth.getState().loadPreset('INITIALIZE');
    },
    check: (p) => {
      const patch = p.patches.getTrackSynthState(track(p, 'Lead').id);
      p.synth.getState().loadPreset('BASS');
      const bass: unknown = JSON.parse(
        JSON.stringify(p.patches.captureSynthState()),
      );
      expect(patch).toEqual(bass);
    },
  },
  trackRole: {
    // 'Keys' on a piano guesses 'auto', so a re-guess can't pass for a save.
    write: (p) =>
      st(p).updateTrack(track(p, 'Keys').id, { trackRole: 'melody' }),
    check: (p) => expect(track(p, 'Keys').trackRole).toBe('melody'),
  },
  inputChannel: {
    write: writeStereoInput,
    check: (p) =>
      expect(track(p, 'Guitar').audioInputChannel).toEqual({
        mode: 'stereo',
        left: 2,
        right: 3,
      }),
  },
  // Cloud only. The 1.3 field registry makes audioInputChannel per-user and
  // draft-only, so the cloud is not expected to carry the stereo 2/3 choice.
  // This checks only that the guitar still has a channel, because with none
  // the views disconnect its input (live-input-02). A freshly added guitar
  // already has mono input 1, so a pass cannot tell a carried choice from a
  // default. If live-input-02 is fixed in the views instead (a null channel
  // read as mono 1), this row never flips: delete it then.
  inputChannelPresent: {
    write: writeStereoInput,
    check: (p) =>
      expect(['mono', 'stereo']).toContain(
        track(p, 'Guitar').audioInputChannel?.mode,
      ),
  },
  // Local only: the cloud re-defaults these per-device fields by design. Lead
  // stays monitored so the restore's "monitor the first MIDI track" fallback
  // does not apply.
  inputRouting: {
    write: (p) => {
      st(p).updateTrack(track(p, 'Lead').id, {
        monitoring: true,
        recordArmed: true,
        midiInputId: 'keyboard-1',
      });
      st(p).updateTrack(track(p, 'Guitar').id, { audioInputId: 'interface-1' });
    },
    check: (p) => {
      expect(track(p, 'Lead')).toMatchObject({
        monitoring: true,
        recordArmed: true,
        midiInputId: 'keyboard-1',
      });
      expect(track(p, 'Keys')).toMatchObject({
        monitoring: false,
        recordArmed: false,
      });
      expect(track(p, 'Guitar').audioInputId).toBe('interface-1');
    },
  },
  midiNotes: {
    write: (p) => {
      const keys = track(p, 'Keys').id;
      st(p).updateMidiClip(keys, KEYS_CLIP, {
        name: 'Chorus',
        startTick: 1920,
      });
      st(p).updateMidiClipEvents(keys, KEYS_CLIP, EDITED_NOTES);
    },
    check: (p) =>
      expect(keysClip(p)).toMatchObject({
        name: 'Chorus',
        startTick: 1920,
        events: EDITED_NOTES,
      }),
  },
  midiClipLength: {
    write: (p) =>
      st(p).updateMidiClip(track(p, 'Keys').id, KEYS_CLIP, {
        durationTicks: 7680,
      }),
    check: (p) => expect(keysClip(p).durationTicks).toBe(7680),
  },
  sustainPedal: {
    write: (p) =>
      st(p).updateMidiClip(track(p, 'Keys').id, KEYS_CLIP, {
        ccEvents: SUSTAIN_PEDAL,
      }),
    check: (p) => expect(keysClip(p).ccEvents).toEqual(SUSTAIN_PEDAL),
  },
  // An uploaded take (assetId set); the cloud drops takes that aren't.
  audioTake: {
    write: (p) => st(p).addAudioClip(track(p, 'Guitar').id, { ...TAKE }),
    check: (p) =>
      expect(track(p, 'Guitar').audioClips.map(withoutId)).toEqual([
        withoutId(TAKE),
      ]),
  },
  // Decision 10 deletes the vocal pitch editor; drop this row with it rather
  // than flipping it.
  pitchEdits: {
    write: (p) => {
      st(p).addAudioClip(track(p, 'Guitar').id, { ...TAKE });
      st(p).setPitchSegments(TAKE.id, [SEGMENT]);
      st(p).addPitchEdit(TAKE.id, SEGMENT.id, 64);
    },
    check: (p) => {
      const take = track(p, 'Guitar').audioClips.find(
        (c) => c.startTick === TAKE.startTick,
      );
      expect(st(p).pitchData[take?.id ?? '']?.edits).toEqual([
        { segmentId: SEGMENT.id, targetMidiNote: 64 },
      ]);
    },
  },
} satisfies Record<string, Probe>;

/** Build the project, write the probe's value, reload, expect the value back. */
async function survives(probe: Probe, reload: Reload): Promise<void> {
  const page = await loadPage();
  buildProject(page);
  probe.write(page);
  probe.check(await reload(page));
}

// ── The matrix ───────────────────────────────────────────────────────────

describe('each probe reads back its own write on the same page', () => {
  it.each(Object.entries(probes))('%s', async (_name, probe: Probe) => {
    const page = await loadPage();
    buildProject(page);
    probe.write(page);
    probe.check(page);
  });
});

describe('a browser refresh (local autosave) keeps', () => {
  const kept = (probe: Probe) => () => survives(probe, refresh);

  it('the project name and composer', kept(probes.identity));
  it('the cloud project id', kept(probes.projectId));
  it('the tempo', kept(probes.tempo));
  it('the loop', kept(probes.loop));
  it('the metronome', kept(probes.metronome));
  // The 1.3 field registry makes the playhead session state: if codec v3
  // stops saving it, delete this row.
  it('the playhead', kept(probes.playhead));
  // state-reload-09: SessionData.transport has no time signature.
  it.fails('the time signature', kept(probes.timeSignature));
  it('the key, rhythm, genre and swing', kept(probes.keyAndFeel));
  it('the mode', kept(probes.mode));
  // prism-engine-03: strum and tilt are in no save path.
  it.fails('Prism strum and tilt', kept(probes.strumAndTilt));
  // prism-engine-03: freshProjectHarmony() empties the progression on load.
  it.fails('the Prism progression being built', kept(probes.prismProgression));
  it('the chord lane', kept(probes.chordLane));
  // design-system-11: clipColorMode is never saved.
  it.fails('clip colouring by harmony', kept(probes.clipColorMode));
  // state-reload-01: no lead-sheet layout field is in SessionData.
  it.fails('lead-sheet sections', kept(probes.leadSheetSections));
  // state-reload-01
  it.fails('lead-sheet repeats', kept(probes.leadSheetRepeats));
  // state-reload-01
  it.fails('lead-sheet row sizes', kept(probes.measureRowSizes));
  // state-reload-01
  it.fails('multi-bar rests', kept(probes.multiBarRests));
  // state-reload-01
  it.fails('fermatas', kept(probes.fermatas));
  // leadsheet-03: the chord format is not saved.
  it.fails('the lead-sheet chord format', kept(probes.chordFormat));
  // state-reload-01
  it.fails('the lead-sheet melody toggle', kept(probes.leadSheetMelody));
  // state-reload-01: no Score mark is in SessionData.
  it.fails('Score articulations', kept(probes.articulations));
  // state-reload-01
  it.fails('Score slurs', kept(probes.slurs));
  // state-reload-01
  it.fails('pinned Score spellings', kept(probes.pinnedSpellings));
  // state-reload-01
  it.fails('Score slash notes', kept(probes.slashNotes));
  // state-reload-01
  it.fails('Score system and page breaks', kept(probes.scoreLayout));
  // state-reload-01
  it.fails('Score text, segno and coda marks', kept(probes.textMarks));
  // state-reload-01
  it.fails('chord symbols shown on a part', kept(probes.chordSymbolsOnPart));
  // state-reload-01
  it.fails('chords hidden on a part', kept(probes.chordHiddenOnPart));
  // timeline-02: markers are in neither serializer.
  it.fails('timeline markers', kept(probes.markers));
  // fx-mixer-01: no mastering field is in SessionData.
  it.fails('the mastering FX chain', kept(probes.masteringChain));
  // fx-mixer-01
  it.fails('the mastering bypass', kept(probes.masteringBypass));
  // fx-mixer-01
  it.fails('the master volume', kept(probes.masterVolume));
  it('master automation', kept(probes.masterAutomation));
  it('the return buses', kept(probes.returnBuses));
  it('the track order, types and instruments', kept(probes.trackList));
  it('track volume, pan, colour, mute and solo', kept(probes.trackMix));
  it('track effects', kept(probes.trackEffects));
  it('the ducker key track', kept(probes.duckerKey));
  it('aux sends', kept(probes.sends));
  it('track automation', kept(probes.trackAutomation));
  it('the drum kit and pad mix', kept(probes.drumKitAndPads));
  it('the instrument program and preset name', kept(probes.instrumentPreset));
  it('the bass voice', kept(probes.bassVoice));
  it('the Chops sample', kept(probes.samplerSample));
  it('the organ drawbars and switches', kept(probes.organState));
  it('the guitar pedal chain', kept(probes.pedalChain));
  it('the vocal pedal chain', kept(probes.vocalChain));
  it('the Oracle synth patch', kept(probes.oracleSynthPatch));
  // state-reload-10: fixed in 1.1 (the track map carries trackRole).
  it('the track role', kept(probes.trackRole));
  // live-input-02: fixed in 1.1 (the track map carries audioInputChannel).
  it('the live input channel', kept(probes.inputChannel));
  it('record arm, monitoring and input devices', kept(probes.inputRouting));
  it('MIDI clip notes, name and position', kept(probes.midiNotes));
  // state-reload-13: clips are written as {id, name, startTick, events} only.
  it.fails('MIDI clip length', kept(probes.midiClipLength));
  // state-reload-13
  it.fails('MIDI controller data (sustain pedal)', kept(probes.sustainPedal));
  it('an uploaded audio take', kept(probes.audioTake));
  // state-reload-14: pitchData is never saved.
  it.fails('vocal pitch edits', kept(probes.pitchEdits));
});

describe('a cloud save and reopen (client codec, echo server) keeps', () => {
  const kept = (probe: Probe) => () => survives(probe, reopenFromCloud);

  // Client codec only. The stand-in server echoes the request body, but the
  // typed API client (src/lib/studio-projects/api.ts) declares neither
  // `returns` nor the track `settings` blob, which carries the track FX,
  // sends, automation, drum pads, pedal chains, instrument settings, the
  // Oracle patch and the Master automation. So a passing row here means the
  // client sends and reads the field, not that music-atlas-api stores it.
  //
  // Left out by design: the project id (the server owns it, and a reopened
  // project takes its row's id), the playhead (session state), and the fields
  // the 1.3 field registry makes per-user and draft-only: the metronome, loop
  // on/off, record arm, monitoring, input devices and the exact input channel.
  // (That classification is milestone 1.3's "Field registry" step in
  // docs/studio-audit-2026-10/design.json on branch studio/audit-archive.)

  it('the project name and composer', kept(probes.identity));
  it('the tempo', kept(probes.tempo));
  // state-reload-04: the cloud payload carries no loop.
  it.fails('the loop range', kept(probes.loopRange));
  // shell-03: the cloud payload carries no time signature.
  it.fails('the time signature', kept(probes.timeSignature));
  it('the key, rhythm, genre and swing', kept(probes.keyAndFeel));
  // insight-01: the cloud prism block has no mode; it reopens as Ionian.
  it.fails('the mode', kept(probes.mode));
  // prism-engine-03
  it.fails('Prism strum and tilt', kept(probes.strumAndTilt));
  // prism-engine-03
  it.fails('the Prism progression being built', kept(probes.prismProgression));
  // insight-01: deserializeCloudProject opens with no chord symbols.
  it.fails('the chord lane', kept(probes.chordLane));
  // design-system-11
  it.fails('clip colouring by harmony', kept(probes.clipColorMode));
  // leadsheet-01: the cloud payload carries no lead sheet.
  it.fails('lead-sheet sections', kept(probes.leadSheetSections));
  // leadsheet-01
  it.fails('lead-sheet repeats', kept(probes.leadSheetRepeats));
  // leadsheet-01
  it.fails('lead-sheet row sizes', kept(probes.measureRowSizes));
  // leadsheet-01
  it.fails('multi-bar rests', kept(probes.multiBarRests));
  // leadsheet-01
  it.fails('fermatas', kept(probes.fermatas));
  // leadsheet-01
  it.fails('the lead-sheet chord format', kept(probes.chordFormat));
  // leadsheet-01
  it.fails('the lead-sheet melody toggle', kept(probes.leadSheetMelody));
  // shell-03: the cloud copy drops Score marks and layout.
  it.fails('Score articulations', kept(probes.articulations));
  // shell-03
  it.fails('Score slurs', kept(probes.slurs));
  // shell-03
  it.fails('pinned Score spellings', kept(probes.pinnedSpellings));
  // shell-03
  it.fails('Score slash notes', kept(probes.slashNotes));
  // shell-03
  it.fails('Score system and page breaks', kept(probes.scoreLayout));
  // shell-03
  it.fails('Score text, segno and coda marks', kept(probes.textMarks));
  // shell-03
  it.fails('chord symbols shown on a part', kept(probes.chordSymbolsOnPart));
  // shell-03 + insight-01: the mark names a chord, so it also needs the chord
  // lane, which the cloud drops too. It flips only once both are fixed.
  it.fails('chords hidden on a part', kept(probes.chordHiddenOnPart));
  // timeline-02
  it.fails('timeline markers', kept(probes.markers));
  // fx-mixer-01: the cloud payload carries no mastering.
  it.fails('the mastering FX chain', kept(probes.masteringChain));
  // fx-mixer-01
  it.fails('the mastering bypass', kept(probes.masteringBypass));
  // fx-mixer-01
  it.fails('the master volume', kept(probes.masterVolume));
  it('master automation', kept(probes.masterAutomation));
  it('the return buses', kept(probes.returnBuses));
  it('the track order, types and instruments', kept(probes.trackList));
  it('track volume, pan, colour, mute and solo', kept(probes.trackMix));
  it('track effects', kept(probes.trackEffects));
  it('the ducker key track', kept(probes.duckerKey));
  it('aux sends', kept(probes.sends));
  it('track automation', kept(probes.trackAutomation));
  it('the drum kit and pad mix', kept(probes.drumKitAndPads));
  it('the instrument program and preset name', kept(probes.instrumentPreset));
  it('the bass voice', kept(probes.bassVoice));
  it('the Chops sample', kept(probes.samplerSample));
  it('the organ drawbars and switches', kept(probes.organState));
  it('the guitar pedal chain', kept(probes.pedalChain));
  it('the vocal pedal chain', kept(probes.vocalChain));
  it('the Oracle synth patch', kept(probes.oracleSynthPatch));
  // state-reload-10: fixed in 1.1 (the role rides in the track settings blob;
  // only a save without it re-guesses from the name).
  it('the track role', kept(probes.trackRole));
  // live-input-02: deserializeCloudProject sets audioInputChannel to null.
  // Kept null on purpose in 1.1 (the channel is per-device, never cloud);
  // the input views read null as mono input 1 instead (see the probe).
  it.fails('a live input channel', kept(probes.inputChannelPresent));
  it('MIDI clip notes, name and position', kept(probes.midiNotes));
  // state-reload-13
  it.fails('MIDI clip length', kept(probes.midiClipLength));
  // state-reload-13
  it.fails('MIDI controller data (sustain pedal)', kept(probes.sustainPedal));
  it('an uploaded audio take', kept(probes.audioTake));
  // state-reload-14
  it.fails('vocal pitch edits', kept(probes.pitchEdits));
});

describe('a Chops sample saved before samples had ids', () => {
  // The sample id keys the decoded buffer and the engine's rebuild check, so
  // a load backfills one (ensureSamplerSampleId). Every load of the same save
  // must agree on it, or each reload would look like a new sample.
  it.each([
    ['browser refresh', refresh],
    ['cloud reopen', reopenFromCloud],
  ])('gets the same id on every %s', async (_how, reload: Reload) => {
    const page = await loadPage();
    buildProject(page);
    const chops = st(page).addTrack('midi', 'sampler', 'Chops');
    // The store type requires the id, which older saves don't have.
    st(page).setSamplerSample(chops, { ...LEGACY_CHOP } as SamplerSampleRef);

    const first = track(await reload(page), 'Chops').samplerSample;
    const second = track(await reload(page), 'Chops').samplerSample;
    expect(first?.sampleId).toEqual(expect.stringMatching(/\S/));
    expect(second?.sampleId).toBe(first?.sampleId);
    expect(first).toEqual({ ...LEGACY_CHOP, sampleId: first?.sampleId });
  });
});

describe('chord ids after a refresh', () => {
  // state-reload-05: fixed in 1.1. The chord-id counter was module state, so
  // the new page minted cr-1 again, the id of the first restored chord, and
  // deleting the new chord deleted that one instead. Chord ids are now random
  // (prismSlice nextChordId), and a load gives repeated ids fresh ones.
  it('a chord added after a refresh can be deleted on its own', async () => {
    const before = await loadPage();
    st(before).insertChordRegion(0, '1 major', 'C');
    st(before).insertChordRegion(1920, '5 major', 'G');

    const after = await refresh(before);
    st(after).insertChordRegion(3840, '4 major', 'F');
    st(after).deleteChordRegion(chordAt(after, 3840).id);

    expect(st(after).chordRegions.map((r) => r.name)).toEqual([
      '1 major',
      '5 major',
    ]);
  });

  // state-reload-05: a save from before random ids can hold two chords with
  // one id (cr-1 on two pages). The restore gives the repeat a fresh id, so
  // each chord can be deleted on its own.
  it('a save holding one id twice restores two chords that can be told apart', async () => {
    const before = await loadPage();
    const twice = [
      { ...CHORDS[0], id: 'cr-1' },
      { ...CHORDS[1], id: 'cr-1' },
    ];
    before.store.setState({ chordRegions: twice });

    const after = await refresh(before);
    const ids = st(after).chordRegions.map((r) => r.id);
    expect(ids[0]).toBe('cr-1');
    expect(new Set(ids).size).toBe(2);

    st(after).deleteChordRegion(chordAt(after, 1920).id);
    expect(st(after).chordRegions.map((r) => r.noteName)).toEqual(['Dm7']);
  });
});
