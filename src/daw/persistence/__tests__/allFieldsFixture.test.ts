// @vitest-environment jsdom
/**
 * Writes fixtures/v3-all-fields/all-fields.json: a v3 draft holding a value
 * other than its default for every local registry field, which codecV3.test
 * and v3Shape.test read (see there for what it must hold).
 *
 * Skipped unless WRITE_FIXTURES=1. The fixture is the format, so rewrite it
 * only for a new registry field that needs a value in it, or with a
 * SESSION_SCHEMA_VERSION bump (keeping a copy of the old one for the
 * migration from it).
 *
 * Run: WRITE_FIXTURES=1 npx vitest run src/daw/persistence/__tests__/allFieldsFixture.test.ts
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { StrumMode, VelocityTilt } from '@prism/engine';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { captureSynthState } from '@/daw/oracle-synth/synthTrackState';
import { defaultReturns } from '@/daw/store/returnsSlice';
import type { Track } from '@/daw/store/tracksSlice';
import {
  decodeSession,
  encodeSession,
  type ProjectSnapshot,
} from '../projectDocument/codec';
import { migrateSession } from '../projectDocument/migrations';

const FILE = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures/v3-all-fields/all-fields.json',
);

const effects = (patch: Record<string, unknown> = {}) =>
  ({ ...structuredClone(DEFAULT_EFFECTS), ...patch }) as Track['effects'];

/** A track at its plain defaults, with `fields` over them. */
function track(
  fields: Partial<Track> & Pick<Track, 'id' | 'name' | 'instrument'>,
): Track {
  return {
    type: 'midi',
    color: '#d2404a',
    mute: false,
    solo: false,
    volume: 0.8,
    pan: 0,
    recordArmed: false,
    monitoring: false,
    midiInputId: null,
    audioInputId: null,
    audioInputChannel: null,
    effects: effects(),
    activeEffects: [],
    midiClips: [],
    audioClips: [],
    trackRole: 'auto',
    ...fields,
  };
}

/** Every local key away from its default; every Track field on some track. */
function allFieldsProject(): ProjectSnapshot {
  const base = structuredClone(DEFAULT_EFFECTS);
  const tracks: Track[] = [
    track({
      id: 'trk-keys',
      name: 'Keys',
      instrument: 'piano-sampler',
      gmProgram: 4,
      color: '#3d8bff',
      mute: true,
      volume: 0.42,
      pan: -0.3,
      effects: effects({
        reverb: { ...base.reverb, enabled: true, decay: 3.3 },
        ducker: {
          ...base.ducker,
          enabled: true,
          keyTrackId: 'trk-drums',
          amount: 0.6,
        },
      }),
      activeEffects: ['reverb', 'ducker'],
      presetName: 'Rhodes',
      sends: { A: 0.5, B: 0.2 },
      automation: {
        volume: [
          { tick: 0, value: 1 },
          { tick: 480, value: 0.2 },
        ],
      },
      trackRole: 'melody',
      midiClips: [
        {
          id: 'clip-keys',
          name: 'Verse',
          startTick: 1920,
          durationTicks: 7680,
          events: [
            {
              id: 'KeysNote0001',
              note: 60,
              velocity: 90,
              startTick: 0,
              durationTicks: 480,
              channel: 0,
            },
            {
              id: 'KeysNote0002',
              note: 64,
              velocity: 80,
              startTick: 480,
              durationTicks: 480,
              channel: 0,
            },
            {
              id: 'KeysNote0003',
              note: 67,
              velocity: 70,
              startTick: 960,
              durationTicks: 960,
              channel: 0,
            },
          ],
          ccEvents: [
            { tick: 0, controller: 64, value: 127, channel: 0 },
            { tick: 960, controller: 1, value: 64, channel: 1 },
            { tick: 1800, controller: 64, value: 0, channel: 0 },
          ],
        },
      ],
    }),
    track({
      id: 'trk-lead',
      name: 'Lead',
      instrument: 'oracle-synth',
      color: '#ff7348',
      recordArmed: true,
      monitoring: true,
      midiInputId: 'keyboard-1',
      midiClips: [
        {
          id: 'clip-lead',
          startTick: 0,
          events: [
            {
              id: 'LeadNote0001',
              note: 72,
              velocity: 100,
              startTick: 0,
              durationTicks: 240,
              channel: 1,
            },
            {
              id: 'LeadNote0002',
              note: 74,
              velocity: 100,
              startTick: 240,
              durationTicks: 240,
              channel: 1,
            },
          ],
        },
      ],
    }),
    track({
      id: 'trk-drums',
      name: 'Drums',
      instrument: 'drum-machine',
      color: '#28a69a',
      solo: true,
      drumKit: '808',
      drumPads: { 36: { volume: 0.5, pan: -0.25 } },
      effects: effects({
        compressor: { ...base.compressor, enabled: true },
      }),
      activeEffects: ['compressor'],
      trackRole: 'drums',
      midiClips: [
        {
          id: 'clip-beat',
          name: 'Beat',
          startTick: 0,
          events: [
            {
              id: 'DrumNote0001',
              note: 36,
              velocity: 110,
              startTick: 0,
              durationTicks: 120,
              channel: 9,
            },
            {
              id: 'DrumNote0002',
              note: 38,
              velocity: 100,
              startTick: 960,
              durationTicks: 120,
              channel: 9,
            },
          ],
        },
      ],
    }),
    track({
      id: 'trk-guitar',
      name: 'Guitar',
      type: 'audio',
      instrument: 'guitar-fx',
      color: '#fea92a',
      audioInputId: 'interface-1',
      audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
      guitarChain: [
        {
          type: 'overdrive',
          enabled: true,
          params: { drive: 0.6, tone: 0.4 },
          namModelId: null,
        },
      ],
      audioClips: [
        {
          id: 'take-1',
          startTick: 3840,
          duration: 7680,
          fadeInTicks: 120,
          fadeOutTicks: 240,
          assetId: 'asset-take-1',
          offsetSeconds: 0.5,
          gain: 0.7,
        },
      ],
    }),
    track({
      id: 'trk-vocal',
      name: 'Vocal',
      type: 'audio',
      instrument: 'vocal-fx',
      color: '#c785d3',
      audioInputChannel: { mode: 'mono', channel: 1 },
      vocalChain: [
        {
          type: 'pitch-correction',
          enabled: true,
          params: { rootNote: 2, scaleType: 1, correction: 95, speed: 20 },
        },
      ],
    }),
    track({
      id: 'trk-bass',
      name: 'Bass',
      instrument: 'bass-electric',
      color: '#7fc783',
      bassVoice: 'upright',
      trackRole: 'bass',
    }),
    track({
      id: 'trk-chops',
      name: 'Chops',
      instrument: 'sampler',
      color: '#62b4f7',
      samplerSample: {
        sampleId: 'smp-chop-1',
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
      },
    }),
    track({
      id: 'trk-organ',
      name: 'Organ',
      instrument: 'tonewheel-organ',
      color: '#7885cb',
      trackRole: 'chords',
      organState: {
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
      },
    }),
  ];

  const returns = defaultReturns();
  returns[0] = {
    ...returns[0],
    volume: 0.7,
    effects: {
      ...returns[0].effects,
      reverb: { ...returns[0].effects.reverb, decay: 4.2 },
    },
  };
  returns[1] = { ...returns[1], label: 'Echo', volume: 0.65 };

  return {
    projectId: 'project-all-fields',
    projectName: 'All Fields',
    composerName: 'Ana Ruiz',
    bpm: 96,
    timeSignatureNumerator: 6,
    timeSignatureDenominator: 8,
    loopStart: 1920,
    loopEnd: 9600,
    position: 2880,
    loopEnabled: true,
    tracks,
    rootNote: 2,
    mode: 'dorian',
    rhythmName: 'Eighths',
    genre: 'Jazz',
    swing: 30,
    rootLocked: true,
    chordRegions: [
      {
        id: 'chord-1',
        startTick: 0,
        endTick: 1920,
        rawStartTick: 12,
        name: '2 minor',
        noteName: 'D min7',
        color: [90, 120, 200],
        degreeKey: '2 minor7',
        midis: [50, 53, 57, 60],
        confidence: 0.9,
        identity: {
          rootPc: 2,
          quality: 'minor7',
          bassPc: 2,
          source: 'given',
          label: '2 minor',
        },
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
    ],
    chordSeq: [
      [62, 65, 69],
      [67, 71, 74],
    ],
    stringSeq: ['2 minor', '5 major'],
    strumMode: StrumMode.Down,
    strumAmount: 25,
    tiltMode: VelocityTilt.BassLeading,
    tiltAmount: 40,
    filterPercent: 0.5,
    chordRecordMode: 'merge',
    measuresPerLine: 5,
    measureRowSizes: [4, 5, 4],
    measureRestMap: { 12: 2 },
    measureFermatas: [15],
    leadSheetChordFormat: 'jazz',
    leadSheetSections: [
      { measureIdx: 0, label: 'A' },
      { measureIdx: 8, label: 'B' },
    ],
    leadSheetRepeats: [{ startMeasure: 0, endMeasure: 7 }],
    leadSheetShowRepeats: true,
    leadSheetShowMelody: true,
    leadSheetMelodyTrackId: 'trk-lead',
    scoreChordTracks: ['trk-keys'],
    scoreChordHidden: ['trk-keys:chord-2'],
    scoreArticulations: [
      'trk-keys:clip-keys:0:60|staccato',
      'trk-keys:clip-keys:960:67|fermata',
    ],
    scoreSlurs: ['trk-keys:clip-keys:0:60|trk-keys:clip-keys:480:64'],
    scoreSpellings: ['trk-keys:clip-keys:480:64|F♭'],
    scoreSlashNotes: ['trk-keys:clip-keys:960:67'],
    scoreSystemBreaks: [4],
    scorePageBreaks: [16],
    scoreSystemRuns: [[8, 3]],
    scoreTextMarks: [
      { id: 'mark-segno', measureIdx: 0, kind: 'segno' },
      { id: 'mark-text', measureIdx: 4, kind: 'text', text: 'Swing feel' },
    ],
    markers: [
      { id: 'marker-verse01', tick: 1920, name: 'Verse', color: '#8fd3ff' },
      { id: 'marker-chorus1', tick: 5760, name: 'Chorus', color: '#ff8a3d' },
    ],
    masterVolume: 0.55,
    masteringFxChain: ['compressor'],
    masteringEffects: effects({
      compressor: { ...base.compressor, enabled: true, threshold: -18 },
    }),
    masterAutomation: { volume: [{ tick: 960, value: 0.4 }] },
    returns,
    masteringBypass: true,
    clipColorMode: 'prism',
    currentView: 'score',
    libraryOpen: false,
    channelStripTab: 'fx',
    timelineZoom: 2.5,
    timelineScrollLeft: 300,
    selectedTrackId: 'trk-drums',
    automationOpenTrackId: 'trk-keys',
    automationParamId: 'pan',
  };
}

it.runIf(process.env.WRITE_FIXTURES === '1')(
  'writes the all-fields draft',
  () => {
    // The Lead's Oracle patch: the BASS preset.
    useSynthStore.getState().loadPreset('BASS');
    const leadPatch = JSON.parse(JSON.stringify(captureSynthState()));
    const session = encodeSession(
      allFieldsProject(),
      (id) => (id === 'trk-lead' ? leadPatch : undefined),
      1760000000000,
    );
    // Written only once it reads back as itself.
    const migrated = migrateSession(JSON.parse(JSON.stringify(session)));
    if (!migrated.ok) throw new Error(migrated.detail);
    expect(decodeSession(migrated.session).repaired).toBe(0);

    writeFileSync(FILE, JSON.stringify(session, null, 2) + '\n');
    execFileSync(
      resolve(process.cwd(), 'node_modules/.bin/prettier'),
      ['--write', FILE],
      { stdio: 'ignore' },
    );
  },
);
