// @vitest-environment jsdom
/**
 * The shape of a v3 draft, held still: every key path an encoded all-fields
 * session holds (fixtures/v3-all-fields, re-encoded by today's codec), and
 * the keys of a draft track, clip and settings blob. A draft that gains,
 * loses or moves a field fails here, and the fix is never to update the
 * lists alone: bump SESSION_SCHEMA_VERSION, add a migration from v3 and new
 * fixtures (allFieldsFixture.test.ts writes the all-fields one), and raise
 * SESSION_COMPAT_VERSION too when a field changes what it means. Milestones
 * known to need it: 1.13b (the Oracle patch moves out of the track's
 * settings), 1.16 (the per-project chord-prompt flag), and 1.10 if measure
 * indices change meaning.
 *
 * An array's entries share one path (`[]`). The instrument and effect blobs
 * inside it are their owners' (each loads older versions of itself, and the
 * effects are backfilled from their defaults), so only where they sit is
 * held here.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/v3Shape.test.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decodeSession,
  encodeSession,
  type StoredSession,
} from '../projectDocument/codec';
import { migrateSession } from '../projectDocument/migrations';

const BUMP =
  'the v3 draft shape changed: bump SESSION_SCHEMA_VERSION, add a migration and fixtures';

/** Blobs whose insides are not the draft's format (see the top). */
const OPAQUE = new Set([
  'data.masterAutomation',
  'data.mixer.masteringEffects',
  'data.notation.measureRestMap',
  'data.returns[].effects',
  'data.tracks[].settings.automation',
  'data.tracks[].settings.drumPads',
  'data.tracks[].settings.effects',
  'data.tracks[].settings.guitarChain',
  'data.tracks[].settings.oracleSynth',
  'data.tracks[].settings.organState',
  'data.tracks[].settings.samplerSample',
  'data.tracks[].settings.sends',
  'data.tracks[].settings.vocalChain',
]);

/** The all-fields draft as this build writes it. */
function encodedAllFields(): StoredSession {
  const file = resolve(
    process.cwd(),
    'src/daw/persistence/__tests__/fixtures/v3-all-fields/all-fields.json',
  );
  const migrated = migrateSession(readFileSync(file, 'utf8'));
  if (!migrated.ok) throw new Error(`unreadable: ${migrated.detail}`);
  const { project, synthPatches } = decodeSession(migrated.session);
  const patches = new Map(synthPatches);
  return JSON.parse(
    JSON.stringify(
      encodeSession(
        project,
        (id) => patches.get(id),
        migrated.session.timestamp,
      ),
    ),
  ) as StoredSession;
}

/** Every key path under `value`, into `out`. */
function collectPaths(value: unknown, path: string, out: Set<string>): void {
  if (path) out.add(path);
  if (OPAQUE.has(path) || typeof value !== 'object' || value === null) return;
  if (Array.isArray(value)) {
    for (const entry of value) collectPaths(entry, `${path}[]`, out);
    return;
  }
  for (const [key, inner] of Object.entries(value)) {
    collectPaths(inner, path ? `${path}.${key}` : key, out);
  }
}

const keysOf = (records: readonly object[]) =>
  [...new Set(records.flatMap((record) => Object.keys(record)))].sort();

describe('the v3 draft shape', () => {
  const draft = encodedAllFields();

  it('holds exactly these key paths', () => {
    const paths = new Set<string>();
    collectPaths(draft, '', paths);
    expect([...paths].sort(), BUMP).toEqual(V3_PATHS);
  });

  it('writes a track, a clip and the settings blob with exactly these keys', () => {
    const tracks = draft.data.tracks;
    expect(
      {
        track: keysOf(tracks),
        midiClip: keysOf(tracks.flatMap((t) => t.midiClips)),
        audioClip: keysOf(tracks.flatMap((t) => t.audioClips)),
        settings: keysOf(tracks.map((t) => t.settings ?? {})),
      },
      BUMP,
    ).toEqual(V3_RECORDS);
  });
});

// ── The snapshot ────────────────────────────────────────────────────────────

const V3_PATHS = [
  'compat',
  'data',
  'data.chordRegions',
  'data.chordRegions[]',
  'data.chordRegions[].color',
  'data.chordRegions[].color[]',
  'data.chordRegions[].confidence',
  'data.chordRegions[].degreeKey',
  'data.chordRegions[].endTick',
  'data.chordRegions[].id',
  'data.chordRegions[].identity',
  'data.chordRegions[].identity.bassPc',
  'data.chordRegions[].identity.label',
  'data.chordRegions[].identity.quality',
  'data.chordRegions[].identity.rootPc',
  'data.chordRegions[].identity.source',
  'data.chordRegions[].midis',
  'data.chordRegions[].midis[]',
  'data.chordRegions[].name',
  'data.chordRegions[].noteName',
  'data.chordRegions[].rawStartTick',
  'data.chordRegions[].startTick',
  'data.clipColorMode',
  'data.composerName',
  'data.markers',
  'data.markers[]',
  'data.markers[].color',
  'data.markers[].id',
  'data.markers[].name',
  'data.markers[].tick',
  'data.masterAutomation',
  'data.mixer',
  'data.mixer.masterVolume',
  'data.mixer.masteringEffects',
  'data.mixer.masteringFxChain',
  'data.mixer.masteringFxChain[]',
  'data.notation',
  'data.notation.leadSheetChordFormat',
  'data.notation.leadSheetMelodyTrackId',
  'data.notation.leadSheetRepeats',
  'data.notation.leadSheetRepeats[]',
  'data.notation.leadSheetRepeats[].endMeasure',
  'data.notation.leadSheetRepeats[].startMeasure',
  'data.notation.leadSheetSections',
  'data.notation.leadSheetSections[]',
  'data.notation.leadSheetSections[].label',
  'data.notation.leadSheetSections[].measureIdx',
  'data.notation.leadSheetShowMelody',
  'data.notation.leadSheetShowRepeats',
  'data.notation.marks',
  'data.notation.marks.articulations',
  'data.notation.marks.articulations[]',
  'data.notation.marks.slashNotes',
  'data.notation.marks.slashNotes[]',
  'data.notation.marks.slurs',
  'data.notation.marks.slurs[]',
  'data.notation.marks.spellings',
  'data.notation.marks.spellings[]',
  'data.notation.measureFermatas',
  'data.notation.measureFermatas[]',
  'data.notation.measureRestMap',
  'data.notation.measureRowSizes',
  'data.notation.measureRowSizes[]',
  'data.notation.measuresPerLine',
  'data.notation.scoreChordHidden',
  'data.notation.scoreChordHidden[]',
  'data.notation.scoreChordTracks',
  'data.notation.scoreChordTracks[]',
  'data.notation.scorePageBreaks',
  'data.notation.scorePageBreaks[]',
  'data.notation.scoreSystemBreaks',
  'data.notation.scoreSystemBreaks[]',
  'data.notation.scoreSystemRuns',
  'data.notation.scoreSystemRuns[]',
  'data.notation.scoreSystemRuns[][]',
  'data.notation.scoreTextMarks',
  'data.notation.scoreTextMarks[]',
  'data.notation.scoreTextMarks[].id',
  'data.notation.scoreTextMarks[].kind',
  'data.notation.scoreTextMarks[].measureIdx',
  'data.notation.scoreTextMarks[].text',
  'data.prism',
  'data.prism.chordRecordMode',
  'data.prism.chordSeq',
  'data.prism.chordSeq[]',
  'data.prism.chordSeq[][]',
  'data.prism.filterPercent',
  'data.prism.genre',
  'data.prism.mode',
  'data.prism.rhythmName',
  'data.prism.rootLocked',
  'data.prism.rootNote',
  'data.prism.stringSeq',
  'data.prism.stringSeq[]',
  'data.prism.strumAmount',
  'data.prism.strumMode',
  'data.prism.swing',
  'data.prism.tiltAmount',
  'data.prism.tiltMode',
  'data.projectId',
  'data.projectName',
  'data.returns',
  'data.returns[]',
  'data.returns[].effects',
  'data.returns[].fxChain',
  'data.returns[].fxChain[]',
  'data.returns[].id',
  'data.returns[].label',
  'data.returns[].volume',
  'data.tracks',
  'data.tracks[]',
  'data.tracks[].activeEffects',
  'data.tracks[].activeEffects[]',
  'data.tracks[].audioClips',
  'data.tracks[].audioClips[]',
  'data.tracks[].audioClips[].assetId',
  'data.tracks[].audioClips[].duration',
  'data.tracks[].audioClips[].fadeInTicks',
  'data.tracks[].audioClips[].fadeOutTicks',
  'data.tracks[].audioClips[].gain',
  'data.tracks[].audioClips[].id',
  'data.tracks[].audioClips[].offsetSeconds',
  'data.tracks[].audioClips[].startTick',
  'data.tracks[].audioInputChannel',
  'data.tracks[].audioInputChannel.channel',
  'data.tracks[].audioInputChannel.left',
  'data.tracks[].audioInputChannel.mode',
  'data.tracks[].audioInputChannel.right',
  'data.tracks[].audioInputId',
  'data.tracks[].color',
  'data.tracks[].id',
  'data.tracks[].instrument',
  'data.tracks[].midiClips',
  'data.tracks[].midiClips[]',
  'data.tracks[].midiClips[].ccEvents',
  'data.tracks[].midiClips[].ccEvents.channels',
  'data.tracks[].midiClips[].ccEvents.channels[]',
  'data.tracks[].midiClips[].ccEvents.controllers',
  'data.tracks[].midiClips[].ccEvents.controllers[]',
  'data.tracks[].midiClips[].ccEvents.tickDeltas',
  'data.tracks[].midiClips[].ccEvents.tickDeltas[]',
  'data.tracks[].midiClips[].ccEvents.values',
  'data.tracks[].midiClips[].ccEvents.values[]',
  'data.tracks[].midiClips[].durationTicks',
  'data.tracks[].midiClips[].events',
  'data.tracks[].midiClips[].events.channels',
  'data.tracks[].midiClips[].events.channels[]',
  'data.tracks[].midiClips[].events.durations',
  'data.tracks[].midiClips[].events.durations[]',
  'data.tracks[].midiClips[].events.ids',
  'data.tracks[].midiClips[].events.ids[]',
  'data.tracks[].midiClips[].events.notes',
  'data.tracks[].midiClips[].events.notes[]',
  'data.tracks[].midiClips[].events.startTickDeltas',
  'data.tracks[].midiClips[].events.startTickDeltas[]',
  'data.tracks[].midiClips[].events.velocities',
  'data.tracks[].midiClips[].events.velocities[]',
  'data.tracks[].midiClips[].id',
  'data.tracks[].midiClips[].name',
  'data.tracks[].midiClips[].startTick',
  'data.tracks[].midiInputId',
  'data.tracks[].monitoring',
  'data.tracks[].mute',
  'data.tracks[].name',
  'data.tracks[].pan',
  'data.tracks[].recordArmed',
  'data.tracks[].settings',
  'data.tracks[].settings.automation',
  'data.tracks[].settings.bassVoice',
  'data.tracks[].settings.drumKit',
  'data.tracks[].settings.drumPads',
  'data.tracks[].settings.effects',
  'data.tracks[].settings.gmProgram',
  'data.tracks[].settings.guitarChain',
  'data.tracks[].settings.oracleSynth',
  'data.tracks[].settings.organState',
  'data.tracks[].settings.presetName',
  'data.tracks[].settings.samplerSample',
  'data.tracks[].settings.sends',
  'data.tracks[].settings.sourceTrackId',
  'data.tracks[].settings.vocalChain',
  'data.tracks[].solo',
  'data.tracks[].trackRole',
  'data.tracks[].type',
  'data.tracks[].volume',
  'data.transport',
  'data.transport.bpm',
  'data.transport.loopEnabled',
  'data.transport.loopEnd',
  'data.transport.loopStart',
  'data.transport.position',
  'data.transport.timeSignatureDenominator',
  'data.transport.timeSignatureNumerator',
  'data.view',
  'data.view.automationOpenTrackId',
  'data.view.automationParamId',
  'data.view.channelStripTab',
  'data.view.currentView',
  'data.view.libraryOpen',
  'data.view.masteringBypass',
  'data.view.selectedTrackId',
  'data.view.timelineScrollLeft',
  'data.view.timelineZoom',
  'schema',
  'timestamp',
  'version',
];

const V3_RECORDS = {
  track: [
    'activeEffects',
    'audioClips',
    'audioInputChannel',
    'audioInputId',
    'color',
    'id',
    'instrument',
    'midiClips',
    'midiInputId',
    'monitoring',
    'mute',
    'name',
    'pan',
    'recordArmed',
    'settings',
    'solo',
    'trackRole',
    'type',
    'volume',
  ],
  midiClip: ['ccEvents', 'durationTicks', 'events', 'id', 'name', 'startTick'],
  audioClip: [
    'assetId',
    'duration',
    'fadeInTicks',
    'fadeOutTicks',
    'gain',
    'id',
    'offsetSeconds',
    'startTick',
  ],
  settings: [
    'automation',
    'bassVoice',
    'drumKit',
    'drumPads',
    'effects',
    'gmProgram',
    'guitarChain',
    'oracleSynth',
    'organState',
    'presetName',
    'samplerSample',
    'sends',
    'sourceTrackId',
    'vocalChain',
  ],
};
