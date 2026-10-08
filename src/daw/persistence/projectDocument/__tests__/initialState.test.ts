// @vitest-environment jsdom
/**
 * A new project's starting state (projectDocument/initialState.ts and the
 * store-free projectDefaults.ts it re-exports), built from the registry
 * instead of hand-kept lists.
 *
 * - initialProjectState holds every key the registry resets, at its default,
 *   as fresh copies, and never a retired key. Its module never loads the
 *   store, so the store's own slices can start a project from it.
 * - resetProjectState puts every key the registry resets back to its default
 *   and leaves every other key exactly as it was: prefs, the collaboration
 *   room, devices, the clipboard and panel layout carry on. Checked with a
 *   sentinel in every key, since a spy can't see the calls a module makes to
 *   its own exports.
 * - It starts a new session generation before it writes the store, so the
 *   caches keyed by track id are empty before the new project shows, and it
 *   never sends the reset to a collaboration room.
 *
 * A new track's defaults are tested in trackDefaults.test.ts.
 *
 * Audit: state-reload-16, ia-flows-06, score-03, insight-05, prism-ui-03,
 * state-reload-15 (the reset's part; the loaders and resetSessionToEmpty
 * start from it).
 *
 * Run: npx vitest run src/daw/persistence/projectDocument/__tests__/initialState.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { setBridge } from '@/daw/collab/collabMiddleware';
import type { ZustandYjsBridge } from '@/daw/collab/ZustandYjsBridge';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';
import { useStore } from '@/daw/store';
import { defaultReturns } from '@/daw/store/returnsSlice';
import { RESET_ON_NEW_KEYS, fieldDefault, type StoreDataKey } from '../fields';
import { initialProjectState, resetProjectState } from '../initialState';
import { leaveAProjectBehind, same, storeData } from './projectLeftBehind';

const s = () => useStore.getState();

/** The keys decision D5 deletes from the store in milestone 1.3. */
const RETIRED = [
  'pitchData',
  'theme',
  'editingAudioClipId',
  'editingAudioClipTrackId',
  'masteringStyle',
  'masteringEq',
  'masteringPresence',
  'masteringDeEsser',
  'masteringLoudness',
  'masteringStereoField',
  'masteringDynamics',
  'masteringAmount',
  'melodyOverrides',
];

const stops: Array<() => void> = [];

beforeEach(() => {
  // A fresh page's store, without a reload.
  useStore.setState(useStore.getInitialState(), true);
});

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  setBridge(null);
});

// ── initialProjectState ────────────────────────────────────────────────────

describe('initialProjectState', () => {
  it('holds every key the registry resets, at its default, and no other', () => {
    const state = initialProjectState() as Record<string, unknown>;
    expect(Object.keys(state).sort()).toEqual([...RESET_ON_NEW_KEYS].sort());
    for (const key of RESET_ON_NEW_KEYS) {
      expect({ key, value: state[key] }).toEqual({
        key,
        value: fieldDefault(key),
      });
    }
  });

  it('holds only keys the store holds, and no retired one', () => {
    // fieldCoverage.test.ts keeps prefs, the room, devices and the
    // clipboard out of RESET_ON_NEW_KEYS. A key no slice declares must stay
    // out too, or every reset would write it into the store: one milestone
    // 1.3 retired (decision D5) above all.
    const state = initialProjectState();
    const held = Object.keys(storeData());
    expect(Object.keys(state).filter((key) => !held.includes(key))).toEqual([]);
    expect(RETIRED.filter((key) => key in state)).toEqual([]);
  });

  it('hands out fresh arrays and objects on every call', () => {
    const first = initialProjectState() as Record<string, unknown>;
    const second = initialProjectState() as Record<string, unknown>;
    const shared = Object.keys(first).filter(
      (key) =>
        first[key] !== null &&
        typeof first[key] === 'object' &&
        first[key] === second[key],
    );
    expect(shared).toEqual([]);
    expect(second).toEqual(first);
  });

  it('starts over everything the audit found carrying over', () => {
    const x = initialProjectState();
    expect({
      // prism-ui-03, state-reload-15: the key lock and the key colour.
      keyLock: [x.rootLocked, x.rootTrackColor],
      // insight-05: the detected key and the auto-tune mask it sets.
      detectedKey: [
        x.detectedKeyRootPc,
        x.detectedMode,
        x.keyConfidence,
        x.keySource,
        x.activeNotesBitmask,
      ],
      // score-03: text marks, breaks, runs and spellings.
      score: [
        x.scoreTextMarks,
        x.scoreSystemBreaks,
        x.scorePageBreaks,
        x.scoreSystemRuns,
        x.scoreSpellings,
      ],
      // ia-flows-06, state-reload-16: metre, markers, mastering, returns,
      // the loop, a lesson or practice screen, the selected track.
      metre: [x.timeSignatureNumerator, x.timeSignatureDenominator],
      markers: x.markers,
      mastering: [x.masteringFxChain, x.masterVolume, x.masteringBypass],
      masteringEffects: x.masteringEffects,
      returns: x.returns,
      loop: [x.loopEnabled, x.loopStart, x.loopEnd],
      context: [x.activeTutorialId, x.practiceSession, x.currentView],
      selection: [x.selectedTrackId, x.automationOpenTrackId],
      // Decision D6: the rhythm a fresh page starts with.
      rhythm: x.rhythmName,
    }).toEqual({
      keyLock: [false, null],
      detectedKey: [null, null, 0, null, 0xfff],
      score: [[], [], [], [], []],
      metre: [4, 4],
      markers: [],
      mastering: [[], 0.8, false],
      masteringEffects: DEFAULT_EFFECTS,
      returns: defaultReturns(),
      loop: [false, 0, 7680],
      context: [null, null, 'arrange'],
      selection: [null, null],
      rhythm: 'Whole Notes',
    });
  });
});

/** The store's index and the slices that would close the loop through it. */
const STORE_MODULES = [
  '@/daw/store',
  '@/daw/store/tracksSlice',
  '@/daw/store/prismSlice',
];

describe('loading', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    for (const path of STORE_MODULES) vi.doUnmock(path);
    vi.resetModules();
  });

  it('gives the slices initialProjectState without loading the store', async () => {
    for (const path of STORE_MODULES) {
      vi.doMock(path, () => {
        throw new Error(`projectDefaults.ts loaded ${path}`);
      });
    }
    const fresh = await import('../projectDefaults');
    expect(Object.keys(fresh.initialProjectState()).sort()).toEqual(
      [...RESET_ON_NEW_KEYS].sort(),
    );
  });

  it('is the function initialState.ts exports, the contract path', async () => {
    const [initial, defaults] = await Promise.all([
      import('../initialState'),
      import('../projectDefaults'),
    ]);
    expect(initial.initialProjectState).toBe(defaults.initialProjectState);
  });
});

// ── resetProjectState ──────────────────────────────────────────────────────

describe('resetProjectState', () => {
  it('puts every key the registry resets back to its default', () => {
    const before = leaveAProjectBehind();
    // Every reset key really was off its default, or the check below
    // would prove nothing.
    expect(
      RESET_ON_NEW_KEYS.filter((key) => same(before[key], fieldDefault(key))),
    ).toEqual([]);

    resetProjectState('test');
    const after = storeData();
    expect(
      RESET_ON_NEW_KEYS.filter((key) => !same(after[key], fieldDefault(key))),
    ).toEqual([]);
  });

  it('leaves every other key exactly as it was', () => {
    const before = leaveAProjectBehind();
    resetProjectState('test');
    const after = storeData();
    const kept = Object.keys(before).filter(
      (key) => !RESET_ON_NEW_KEYS.includes(key as StoreDataKey),
    );
    // Prefs, the room, devices, the clipboard and panel layout among them.
    expect(kept).toEqual(
      expect.arrayContaining([
        'metronomeEnabled',
        'timelineGridSize',
        'roomId',
        'remoteUsers',
        'inputs',
        'clipboardClips',
        'userListOpen',
      ]),
    );
    expect(kept.filter((key) => !Object.is(after[key], before[key]))).toEqual(
      [],
    );
  });

  it('starts a new session generation before it writes the store, once', () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    const heard: string[] = [];
    stops.push(
      onSessionGeneration((generation, reason) => {
        heard.push(
          `generation ${generation} (${reason}), ${s().tracks.length} track in the store`,
        );
      }),
    );
    stops.push(
      useStore.subscribe(() => {
        heard.push(`store written in generation ${getSessionGeneration()}`);
      }),
    );

    const next = getSessionGeneration() + 1;
    resetProjectState('new');
    expect(getSessionGeneration()).toBe(next);
    expect(heard).toEqual([
      `generation ${next} (new), 1 track in the store`,
      `store written in generation ${next}`,
    ]);
    expect(s().tracks).toEqual([]);
  });

  it('never sends the reset to a collaboration room', () => {
    const syncToYjs = vi.fn();
    setBridge({
      suppressStoreToYjs: false,
      syncToYjs,
    } as unknown as ZustandYjsBridge);

    s().setBpm(96); // an edit goes to the room…
    expect(syncToYjs).toHaveBeenCalledTimes(1);
    resetProjectState('test'); // …the reset doesn't
    expect(syncToYjs).toHaveBeenCalledTimes(1);
    expect(s().bpm).toBe(120);
  });

  it('lets the next song set its key after a locked one (state-reload-15)', () => {
    s().setRootNote(2);
    s().toggleRootLock();
    resetProjectState('song');
    s().setRootNote(7); // what seedStudioFromSong does next
    expect(s().rootNote).toBe(7);
  });

  it('lets a lesson boot start its lesson after the reset', () => {
    s().startTutorial('make-first-track');
    resetProjectState('tutorial');
    expect(s().activeTutorialId).toBeNull();
    s().startTutorial('drums-101');
    expect(s().activeTutorialId).toBe('drums-101');
  });
});
