// @vitest-environment jsdom
/**
 * Loading or starting a project leaves nothing of the previous one behind,
 * and the per-track fields milestone 1.1 started saving come back.
 *
 * Within one page the store is a singleton, so whatever a load or reset
 * doesn't set carries over: a lesson running on in an unrelated project, a
 * practice screen drawn over it, a key lock that blocks the next song's key,
 * the last project's markers, metre, mastering and Score marks (audit
 * practice-tutorial-03/06, prism-ui-03, state-reload-15/16, ia-flows-06,
 * score-03, insight-05, prism-engine-13).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { defaultReturns } from '@/daw/store/returnsSlice';
import { pushUndo, canUndo } from '@/daw/store/undoMiddleware';
import { resolveTrackRole } from '@/daw/utils/trackRole';
import {
  dedupeChordRegionIds,
  deserializeCloudProject,
  deserializeSession,
  forgetLiveSession,
  isPristineSession,
  markSessionPristine,
  resetSessionToEmpty,
  serializeSession,
  serializeSessionForCloud,
  sessionLoadedAt,
  type CloudProjectDetail,
  type CloudProjectInput,
} from '../SessionSerializer';
import { hasWorkToKeep } from '../saveStatusStore';

const s = () => useStore.getState();

/** What the previous project leaves in the store, field by field. */
function leaveAProjectBehind(): void {
  s().startTutorial('make-first-track');
  s().goToTutorialStep(2);
  s().setPracticeSession({
    kind: 'theory',
    mode: 'dorian',
    rootParam: 'd',
    level: 1,
    openTrack: 'melody',
  });
  s().setCurrentView('practice');
  s().setRootNote(2);
  s().toggleRootLock();
  s().setDetectedKey(7, 'mixolydian', 0.9, 'unison-offline');
  s().addMarker(1920, 'Verse');
  s().setTimeSignature(6, 8);
  s().addMasteringFx('compressor');
  s().toggleMasteringBypass();
  s().setMasterVolume(0.3);
  const reverb = s().returns.find((r) => r.id === 'A')?.effects.reverb;
  if (!reverb) throw new Error('No return A');
  s().updateReturnEffects('A', { reverb: { ...reverb, decay: 9 } });
  s().setScoreSpellings(['a|F♭']);
  s().setScoreSystemBreaks([4]);
  s().setScorePageBreaks([16]);
  s().setScoreSystemRuns([[8, 3]]);
  s().setScoreTextMarks([{ id: 'm', measureIdx: 0, kind: 'segno' }]);
  s().setLeadSheetChordFormat('jazz');
  s().setLeadSheetShowRepeats(true);
  s().setLeadSheetShowMelody(true);
  s().setLeadSheetMelodyTrackId('melody-track');
  useStore.setState({
    prismSuggestOpen: true,
    prismSuggestInsertTick: 1920,
    prismSuggestTrackId: 'keys',
    prismSuggestActiveIdx: 2,
  });
}

/** The fields above, as a fresh page has them. */
function leftovers() {
  const x = s();
  return {
    tutorial: [x.activeTutorialId, x.tutorialStepIndex],
    practice: [x.practiceSession, x.currentView],
    keyLock: [x.rootLocked, x.rootTrackColor],
    detectedKey: [x.detectedKeyRootPc, x.detectedMode, x.keySource],
    autoTuneMask: x.activeNotesBitmask,
    markers: x.markers,
    metre: [x.timeSignatureNumerator, x.timeSignatureDenominator],
    mastering: [x.masteringFxChain, x.masteringBypass, x.masterVolume],
    returnA: x.returns.find((r) => r.id === 'A')?.effects.reverb.decay,
    score: [
      x.scoreSpellings,
      x.scoreSystemBreaks,
      x.scorePageBreaks,
      x.scoreSystemRuns,
      x.scoreTextMarks,
    ],
    leadSheet: [
      x.leadSheetChordFormat,
      x.leadSheetShowRepeats,
      x.leadSheetShowMelody,
      x.leadSheetMelodyTrackId,
    ],
    suggestion: [
      x.prismSuggestOpen,
      x.prismSuggestInsertTick,
      x.prismSuggestTrackId,
      x.prismSuggestActiveIdx,
    ],
  };
}

const freshPage = {
  tutorial: [null, 0],
  practice: [null, 'arrange'],
  keyLock: [false, null],
  detectedKey: [null, null, null],
  autoTuneMask: 0xfff,
  markers: [],
  metre: [4, 4],
  mastering: [[], false, 0.8],
  returnA: defaultReturns().find((r) => r.id === 'A')?.effects.reverb.decay,
  score: [[], [], [], [], []],
  leadSheet: ['hybrid', false, false, null],
  suggestion: [false, 0, null, 0],
};

const cloudProject = (body: CloudProjectInput): CloudProjectDetail => ({
  ...body,
  id: 'p2',
  createdAt: new Date(),
  updatedAt: new Date(),
  tracks: body.tracks.map((t, i) => ({ ...t, id: `row-${i}`, ordinal: i })),
});

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
});

describe('a load or reset starts the project afresh', () => {
  it('starting a new project clears what the last one left', () => {
    leaveAProjectBehind();
    resetSessionToEmpty();
    expect(leftovers()).toEqual(freshPage);
    expect(s().libraryOpen).toBe(true);
  });

  it('restoring a local session does too', () => {
    const saved = serializeSession();
    leaveAProjectBehind();
    deserializeSession(saved);
    expect(leftovers()).toEqual(freshPage);
  });

  it('opening a cloud project does too', () => {
    const body = serializeSessionForCloud();
    leaveAProjectBehind();
    deserializeCloudProject(cloudProject(body));
    expect(leftovers()).toEqual(freshPage);
  });

  it('a key set after the reset is not blocked by the old lock', () => {
    s().setRootNote(2);
    s().toggleRootLock();
    resetSessionToEmpty();
    s().setRootNote(7); // what seedStudioFromSong does next
    expect(s().rootNote).toBe(7);
  });

  it('a lesson boot can start its lesson after the reset', () => {
    s().startTutorial('make-first-track');
    resetSessionToEmpty();
    s().startTutorial('drums-101');
    expect(s().activeTutorialId).toBe('drums-101');
  });

  it('keeps a restored session’s own returns and master automation', () => {
    const reverb = s().returns.find((r) => r.id === 'A')?.effects.reverb;
    if (!reverb) throw new Error('No return A');
    s().updateReturnEffects('A', { reverb: { ...reverb, decay: 4.2 } });
    s().upsertMasterAutomationPoint('volume', { tick: 0, value: 0.5 });
    const saved = serializeSession();
    resetSessionToEmpty();
    deserializeSession(saved);
    expect(s().returns.find((r) => r.id === 'A')?.effects.reverb.decay).toBe(
      4.2,
    );
    expect(s().masterAutomation).toEqual({
      volume: [{ tick: 0, value: 0.5 }],
    });
    expect(s().masteringEffects).toEqual(DEFAULT_EFFECTS);
  });
});

describe('the live-session marker', () => {
  it('is unset on a fresh page and set by every load and reset', () => {
    expect(sessionLoadedAt()).toBeNull();
    resetSessionToEmpty();
    expect(sessionLoadedAt()).not.toBeNull();

    forgetLiveSession();
    deserializeSession(serializeSession());
    expect(sessionLoadedAt()).not.toBeNull();

    forgetLiveSession();
    deserializeCloudProject(cloudProject(serializeSessionForCloud()));
    expect(sessionLoadedAt()).not.toBeNull();
  });

  it('an unreadable save loads nothing and marks nothing', () => {
    const saved = { ...serializeSession(), version: 99 };
    expect(deserializeSession(saved)).toBe(false);
    expect(sessionLoadedAt()).toBeNull();
  });

  it('a cloud project counts as untouched until it changes', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    deserializeCloudProject(cloudProject(serializeSessionForCloud()));
    expect(hasWorkToKeep()).toBe(false);
    s().setPosition(1920); // the playhead is not work
    expect(hasWorkToKeep()).toBe(false);
    s().updateTrack(s().tracks[0].id, { volume: 0.3 });
    expect(hasWorkToKeep()).toBe(true);
  });

  it('a restored session never counts as untouched', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    markSessionPristine();
    deserializeSession(serializeSession());
    expect(isPristineSession()).toBe(false);
  });

  // A restore starts its own undo history. (The links' seeds take theirs as
  // the baseline in replaceSession; see studio-projects' replaceSession test.)
  it('a restored session starts with no undo history', () => {
    resetSessionToEmpty();
    s().addTrack('midi', 'piano-sampler', 'Keys');
    pushUndo();
    expect(canUndo()).toBe(true);
    deserializeSession(serializeSession());
    expect(canUndo()).toBe(false);
  });
});

describe('track role and live input channel', () => {
  const addGuitar = () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    const guitar = s().addTrack('audio', 'guitar-fx', 'Guitar');
    s().updateTrack(keys, { trackRole: 'melody' });
    s().updateTrack(guitar, {
      audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
    });
  };
  const byName = (name: string) => s().tracks.find((t) => t.name === name);

  it('survive a refresh', () => {
    addGuitar();
    const saved = JSON.parse(JSON.stringify(serializeSession()));
    resetSessionToEmpty();
    deserializeSession(saved);
    expect(byName('Keys')?.trackRole).toBe('melody');
    expect(byName('Guitar')?.audioInputChannel).toEqual({
      mode: 'stereo',
      left: 2,
      right: 3,
    });
  });

  it('an older save without them loads as auto, with no channel', () => {
    addGuitar();
    const saved = structuredClone(serializeSession());
    for (const t of saved.data.tracks) {
      delete t.trackRole;
      delete t.audioInputChannel;
    }
    deserializeSession(saved);
    expect(byName('Keys')?.trackRole).toBe('auto');
    expect(byName('Guitar')?.audioInputChannel).toBeNull();
    // A missing role resolves from the name, as 'auto' does.
    expect(resolveTrackRole({ name: 'Bass', instrument: 'soundfont' })).toBe(
      'bass',
    );
    expect(
      resolveTrackRole({ trackRole: 'melody', name: 'Bass', instrument: '' }),
    ).toBe('melody');
  });

  it('the role reaches the cloud; the channel never does', () => {
    addGuitar();
    const body = JSON.parse(JSON.stringify(serializeSessionForCloud()));
    expect(JSON.stringify(body)).not.toContain('audioInputChannel');
    deserializeCloudProject(cloudProject(body));
    expect(byName('Keys')?.trackRole).toBe('melody');
    expect(byName('Guitar')?.audioInputChannel).toBeNull();
  });

  it('a cloud save without the role guesses it from the name', () => {
    addGuitar();
    const body = serializeSessionForCloud();
    for (const t of body.tracks) delete t.settings?.trackRole;
    deserializeCloudProject(cloudProject(body));
    expect(byName('Keys')?.trackRole).toBe('auto');
  });
});

describe('chord ids', () => {
  const chord = (id: string, startTick: number): ChordRegion => ({
    id,
    startTick,
    endTick: startTick + 1920,
    name: '1 major',
    noteName: 'C',
    color: [255, 0, 0],
  });

  it('a lane with no repeats comes back as the same array', () => {
    const lane = [chord('a', 0), chord('b', 1920)];
    expect(dedupeChordRegionIds(lane)).toBe(lane);
  });

  it('the first region keeps a repeated id and later ones get their own', () => {
    const lane = [chord('cr-1', 0), chord('cr-1', 1920), chord('', 3840)];
    const fixed = dedupeChordRegionIds(lane);
    expect(fixed[0]).toBe(lane[0]);
    expect(new Set(fixed.map((r) => r.id)).size).toBe(3);
    expect(fixed.every((r) => r.id)).toBe(true);
    expect(lane[1].id).toBe('cr-1'); // the input is left as it was
  });

  it('a restored lane holding one id twice comes back with two', () => {
    useStore.setState({
      chordRegions: [chord('cr-1', 0), chord('cr-1', 1920)],
    });
    deserializeSession(serializeSession());
    const ids = s().chordRegions.map((r) => r.id);
    expect(new Set(ids).size).toBe(2);
  });
});
