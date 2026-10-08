// @vitest-environment jsdom
/**
 * The save status (persistence/saveStatusStore.ts, decision D7): cheap
 * triggers that move on every write to the project document (and, for the
 * draft, to a track's per-user fields), and a content fingerprint that
 * decides whether the project really changed (audit state-reload-29,
 * engine-hooks-01, ia-flows-18).
 *
 * - documentVersion moves for every doc key of the registry, the cloud link
 *   included, and every doc field of a track, and for nothing else: not the
 *   playhead, arming, monitoring, inputs, selection, zoom, a view, a pref or
 *   session state. draftVersion also moves for the per-user track fields.
 *   The lists come from the registry, so a key classified there is covered
 *   here.
 * - Equal-content rewrites move the trigger but leave the project clean, and
 *   an undo back to the baseline reads clean. The captured autosaves show it
 *   on real projects.
 * - The fingerprint is the same text for the same content, and holds each
 *   Oracle track's patch; a check between writes reuses it.
 * - Kept work follows the document: the kept-work matrix the 1.3 map
 *   measured flips (a marker, 3/4, the master volume, a slur, a lead-sheet
 *   section and the Prism strum become work; arming and the metronome stop
 *   being work); a legacy cloud save that leaves content out keeps it as
 *   work (cloudSaveGaps), marked as a cloud copy in part (savedInPart), and
 *   the Prism generator's settings, which every template sets, are not such
 *   content; letting go of the cloud copy (File ▸ Delete) makes the session
 *   the only copy; a blank draft from an older build is empty.
 *
 * Run: npx vitest run src/daw/persistence/__tests__/saveStatusStore.test.ts
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTrackSynthState } from '@/daw/oracle-synth/synthTrackState';
import { useStore, type AllSlices, type Track } from '@/daw/store';
import { pushUndo, resetUndoHistory, undo } from '@/daw/store/undoMiddleware';
import {
  DOC_CONTENT_KEYS,
  DOC_KEYS,
  DROP_KEYS,
  PREF_KEYS,
  SESSION_KEYS,
  STORE_FIELDS,
  TRACK_DOC_FIELDS,
  TRACK_PER_USER_FIELDS,
  VIEW_KEYS,
  fieldDefault,
  type StoreDataKey,
} from '../projectDocument/fields';
import {
  attachDocumentObserver,
  changesDocument,
  cloudSaveGaps,
  documentFingerprint,
  documentSnapshot,
  hasWorkToKeep,
  isDocumentDirty,
  isDocumentEmpty,
  markDocumentBaseline,
  noteSynthPatchChange,
  setSynthPatchReader,
  trackFieldsChanged,
  useSaveStatusStore,
} from '../saveStatusStore';
import { deserializeSession, type SessionData } from '../SessionSerializer';

const s = () => useStore.getState();
const status = () => useSaveStatusStore.getState();

/** How far `write` moves documentVersion. */
function bumpsOf(write: () => void): number {
  const before = status().documentVersion;
  write();
  return status().documentVersion - before;
}

/**
 * The store as this file loaded it, for a copy of the module loaded later
 * (vi.resetModules): importing the store again would make a second one.
 */
const thisStore = () => ({ useStore });

/** How far `write` moves each counter. */
function movesOf(write: () => void): { document: number; draft: number } {
  const before = status();
  write();
  return {
    document: status().documentVersion - before.documentVersion,
    draft: status().draftVersion - before.draftVersion,
  };
}

/** A value whose content (and so whose reference) differs from `value`. */
function different(value: unknown): unknown {
  if (typeof value === 'number') return value + 1;
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'string') return `${value}-changed`;
  if (value === null || value === undefined) return 1;
  if (value instanceof Map) return new Map([...value, ['changed', 1]]);
  if (value instanceof Set) return new Set([...value, -1]);
  if (Array.isArray(value)) {
    // A list of entries (tracks, clips, notes, return buses) gets one more,
    // well formed, since the store's own writes walk them.
    const first: unknown = value[0];
    if (first !== null && typeof first === 'object' && 'id' in first) {
      return [
        ...value,
        { ...structuredClone(first), id: `${String(first.id)}-copy` },
      ];
    }
    return [...value, 1];
  }
  return { ...(value as object), changed: 1 };
}

/** The store keys the project's content is made of: doc keys but the link. */
const CONTENT_KEYS = DOC_CONTENT_KEYS;

/** A copy of the document with every object made anew: equal content. */
const copyOfDocument = (state: AllSlices): Partial<AllSlices> =>
  Object.fromEntries(
    CONTENT_KEYS.map((key) => [key, structuredClone(state[key])]),
  );

/** A store write the way a key's own setter would make it. */
const write = (key: StoreDataKey, value: unknown) =>
  useStore.setState({ [key]: value } as Partial<AllSlices>);

interface Project {
  keys: string;
  synth: string;
  guitar: string;
  clip: string;
}

/**
 * A small project as a load leaves it: a keys track with a clip of three
 * notes, an Oracle synth and a guitar, baselined.
 */
function openProject(): Project {
  const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  const synth = s().addTrack('midi', 'oracle-synth', 'Lead');
  const guitar = s().addTrack('audio', 'guitar-fx', 'Guitar');
  const clip = 'clip-keys';
  s().addMidiClip(keys, {
    id: clip,
    startTick: 0,
    events: [60, 64, 67].map((note, i) => ({
      id: `note0000000${i}`,
      note,
      velocity: 100,
      startTick: i * 480,
      durationTicks: 480,
      channel: 0,
    })),
  });
  s().setSelectedTrackId(keys);
  markDocumentBaseline();
  return { keys, synth, guitar, clip };
}

const trackById = (id: string): Track => {
  const track = s().tracks.find((t) => t.id === id);
  if (!track) throw new Error(`No track ${id}`);
  return track;
};

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useSaveStatusStore.setState(useSaveStatusStore.getInitialState(), true);
  setSynthPatchReader(null);
  attachDocumentObserver();
  resetUndoHistory();
  markDocumentBaseline();
});

// ── The trigger ────────────────────────────────────────────────────────────

describe('documentVersion', () => {
  it('stays put for the playhead, arming, monitoring, inputs, selection, zoom, views and prefs', () => {
    const { keys, guitar } = openProject();
    expect(
      bumpsOf(() => {
        for (let tick = 0; tick < 3000; tick += 30) s().setPosition(tick);
        s().toggleRecordArm(keys);
        s().toggleMonitoring(guitar);
        s().updateTrack(guitar, {
          audioInputChannel: { mode: 'stereo', left: 2, right: 3 },
          midiInputId: 'controller',
          audioInputId: 'interface',
        });
        s().setSelectedTrackId(guitar);
        s().setTimelineZoom(2);
        s().setTimelineScrollLeft(400);
        s().setCurrentView('studio');
        s().setLibraryOpen(false);
        s().setLoopEnabled(true);
        s().toggleMetronome();
        s().setActiveTool('pencil');
      }),
    ).toBe(0);
    expect(isDocumentDirty()).toBe(false);
  });

  it('moves for every content key of the registry, once per write', () => {
    openProject();
    const missed = CONTENT_KEYS.filter(
      (key) => bumpsOf(() => write(key, different(s()[key]))) !== 1,
    );
    expect(missed).toEqual([]);
  });

  it('moves for every doc field of a track', () => {
    openProject();
    const missed = TRACK_DOC_FIELDS.filter((field) => {
      // Looked up each time: one of the fields is the id itself.
      const id = s().tracks[0].id;
      return (
        bumpsOf(() =>
          s().updateTrack(id, {
            [field]: different(trackById(id)[field]),
          } as Partial<Track>),
        ) !== 1
      );
    });
    expect(missed).toEqual([]);
  });

  it('moves when a track is added, removed or moved', () => {
    const { keys, synth } = openProject();
    expect(bumpsOf(() => s().addTrack('midi', 'organ', 'Organ'))).toBe(1);
    expect(bumpsOf(() => s().removeTrack(synth))).toBe(1);
    expect(
      bumpsOf(() => useStore.setState({ tracks: [...s().tracks].reverse() })),
    ).toBe(1);
    expect(trackById(keys)).toBeDefined();
  });

  it('never moves for a per-user track field', () => {
    const { guitar } = openProject();
    const moved = TRACK_PER_USER_FIELDS.filter(
      (field) =>
        bumpsOf(() =>
          s().updateTrack(guitar, {
            [field]: different(trackById(guitar)[field]),
          } as Partial<Track>),
        ) !== 0,
    );
    expect(moved).toEqual([]);
  });

  it('never moves for a view, pref, session or retired key', () => {
    openProject();
    const others: StoreDataKey[] = [
      ...VIEW_KEYS,
      ...PREF_KEYS,
      ...SESSION_KEYS,
      ...DROP_KEYS,
    ];
    const moved = others.filter(
      (key) => bumpsOf(() => write(key, different(s()[key]))) !== 0,
    );
    expect(moved).toEqual([]);
  });

  it('moves for the cloud link, a doc key, which leaves the project clean', () => {
    openProject();
    expect(DOC_KEYS).toContain('projectId');
    expect(bumpsOf(() => s().setProjectId('cloud-1'))).toBe(1);
    expect(isDocumentDirty()).toBe(false);
  });

  it('moves when an Oracle patch changes', () => {
    expect(bumpsOf(noteSynthPatchChange)).toBe(1);
  });

  it('tells a document change from a per-user one', () => {
    const { keys } = openProject();
    const before = s();
    s().toggleRecordArm(keys);
    expect(changesDocument(s(), before)).toBe(false);
    expect(
      trackFieldsChanged(s().tracks, before.tracks, TRACK_PER_USER_FIELDS),
    ).toBe(true);
    s().updateTrack(keys, { volume: 0.2 });
    expect(changesDocument(s(), before)).toBe(true);
  });
});

describe('draftVersion', () => {
  it('moves with documentVersion, for the content, the cloud link and an Oracle patch', () => {
    const { keys } = openProject();
    expect(movesOf(() => s().setBpm(97))).toEqual({ document: 1, draft: 1 });
    expect(movesOf(() => s().updateTrack(keys, { volume: 0.4 }))).toEqual({
      document: 1,
      draft: 1,
    });
    expect(movesOf(() => s().setProjectId('cloud-1'))).toEqual({
      document: 1,
      draft: 1,
    });
    expect(movesOf(noteSynthPatchChange)).toEqual({ document: 1, draft: 1 });
  });

  it('moves alone for every per-user track field: the draft keeps them, the project is unchanged', () => {
    const { guitar } = openProject();
    const wrong = TRACK_PER_USER_FIELDS.filter((field) => {
      const moves = movesOf(() =>
        s().updateTrack(guitar, {
          [field]: different(trackById(guitar)[field]),
        } as Partial<Track>),
      );
      return moves.document !== 0 || moves.draft !== 1;
    });
    expect(wrong).toEqual([]);
    expect(isDocumentDirty()).toBe(false);
  });

  it('never moves for the playhead, a view, a pref or session state', () => {
    openProject();
    const moves = movesOf(() => {
      for (let tick = 0; tick < 3000; tick += 30) s().setPosition(tick);
      for (const key of [...VIEW_KEYS, ...PREF_KEYS, ...SESSION_KEYS]) {
        write(key, different(s()[key]));
      }
    });
    expect(moves).toEqual({ document: 0, draft: 0 });
  });
});

describe('attachDocumentObserver', () => {
  it('attaching again changes nothing: each write still counts once', () => {
    openProject();
    const detach = attachDocumentObserver();
    expect(attachDocumentObserver()).toBe(detach);
    markDocumentBaseline();
    expect(bumpsOf(() => s().setBpm(97))).toBe(1);
  });

  it('stops counting when detached, and a baseline attaches it again', () => {
    openProject();
    attachDocumentObserver()();
    expect(bumpsOf(() => s().setBpm(97))).toBe(0);
    markDocumentBaseline();
    expect(bumpsOf(() => s().setBpm(98))).toBe(1);
  });

  it('counts from the moment the module loads, so a restore before any baseline is seen', async () => {
    // The editor's boot restores the autosave before anything has marked a
    // baseline or attached the observer by hand.
    openProject();
    vi.resetModules();
    vi.doMock('@/daw/store', thisStore);
    try {
      const loaded = await import('../saveStatusStore');
      const before = loaded.useSaveStatusStore.getState();

      useStore.setState({ projectName: 'Restored', bpm: 101 });

      const after = loaded.useSaveStatusStore.getState();
      expect(after.documentVersion).toBe(before.documentVersion + 1);
      expect(after.draftVersion).toBe(before.draftVersion + 1);
    } finally {
      vi.doUnmock('@/daw/store');
      attachDocumentObserver();
    }
    expect(bumpsOf(() => s().setBpm(99))).toBe(1);
  });

  it('a hot-reloaded copy of the module replaces the old observer instead of adding one', async () => {
    openProject();
    vi.resetModules();
    vi.doMock('@/daw/store', thisStore);
    try {
      // Loading the module attaches its observer, as the old copy did.
      const reloaded = await import('../saveStatusStore');
      const reloadedVersion = () =>
        reloaded.useSaveStatusStore.getState().documentVersion;
      reloaded.attachDocumentObserver();

      const before = reloadedVersion();
      expect(bumpsOf(() => s().setBpm(97))).toBe(0);
      expect(reloadedVersion() - before).toBe(1);

      reloaded.attachDocumentObserver()();
      expect(bumpsOf(() => s().setBpm(98))).toBe(0);
      expect(reloadedVersion() - before).toBe(1);
    } finally {
      vi.doUnmock('@/daw/store');
      attachDocumentObserver();
    }
    expect(bumpsOf(() => s().setBpm(99))).toBe(1);
  });

  it('a hot-reloaded copy carries on from the old copy’s status', async () => {
    const { keys } = openProject();
    markDocumentBaseline({ savedComplete: false });
    s().updateTrack(keys, { volume: 0.3 });
    expect(isDocumentDirty()).toBe(true);
    const old = status();

    vi.resetModules();
    vi.doMock('@/daw/store', thisStore);
    try {
      const reloaded = await import('../saveStatusStore');
      // The project neither reads as saved nor as a new, empty one.
      expect(reloaded.useSaveStatusStore.getState()).toEqual(old);
      expect(reloaded.isDocumentDirty()).toBe(true);
      expect(reloaded.hasWorkToKeep()).toBe(true);
      s().updateTrack(keys, { volume: 0.8 });
      expect(reloaded.useSaveStatusStore.getState().documentVersion).toBe(
        old.documentVersion + 1,
      );
      expect(reloaded.isDocumentDirty()).toBe(false);
      reloaded.attachDocumentObserver()();
    } finally {
      vi.doUnmock('@/daw/store');
      attachDocumentObserver();
    }
  });

  it('a copy loaded while the store is still loading attaches once it has loaded', async () => {
    openProject();
    let reads = 0;
    let unready = 0;
    let loaded = false;
    vi.resetModules();
    vi.doMock('@/daw/store', () => ({
      get useStore() {
        // The store finishes loading right after the module that read it.
        if (reads++ === 0) queueMicrotask(() => (loaded = true));
        if (!loaded) unready++;
        return loaded ? useStore : undefined;
      },
    }));
    try {
      const early = await import('../saveStatusStore');
      await Promise.resolve();
      expect(unready).toBeGreaterThan(0);
      const before = early.useSaveStatusStore.getState().documentVersion;
      expect(bumpsOf(() => s().setBpm(97))).toBe(0);
      expect(early.useSaveStatusStore.getState().documentVersion).toBe(
        before + 1,
      );
      early.attachDocumentObserver()();
    } finally {
      vi.doUnmock('@/daw/store');
      attachDocumentObserver();
    }
  });
});

// ── Dirty ──────────────────────────────────────────────────────────────────

describe('isDocumentDirty', () => {
  it('is false for a project as it opened, and true after an edit', () => {
    const { keys } = openProject();
    expect(isDocumentDirty()).toBe(false);
    s().updateTrack(keys, { volume: 0.25 });
    expect(isDocumentDirty()).toBe(true);
  });

  it('stays false when equal content is written back, though the version moves', () => {
    const { keys } = openProject();
    s().setChordRegions([
      {
        id: 'region-1',
        startTick: 0,
        endTick: 1920,
        name: 'I',
        noteName: 'C',
        color: [255, 0, 0],
      },
    ]);
    markDocumentBaseline();
    const moved = bumpsOf(() => {
      // A panel writing its chain back, an equal chord lane, a deep copy of
      // the whole document (a collab rebuild, an undo snapshot).
      s().updateTrack(keys, {
        effects: structuredClone(trackById(keys).effects),
      });
      useStore.setState({ chordRegions: structuredClone(s().chordRegions) });
      useStore.setState(copyOfDocument(s()));
    });
    expect(moved).toBe(3);
    expect(isDocumentDirty()).toBe(false);
  });

  it('reads clean again after an undo back to the baseline', () => {
    const { keys } = openProject();
    pushUndo();
    s().updateTrack(keys, { volume: 0.1 });
    s().updateMidiClip(keys, 'clip-keys', { startTick: 1920 });
    expect(isDocumentDirty()).toBe(true);
    expect(undo()).toBe(true);
    expect(status().documentVersion).toBeGreaterThan(status().baselineVersion);
    expect(isDocumentDirty()).toBe(false);
  });

  it("counts a collaborator's edit as unsaved", () => {
    const { keys } = openProject();
    // The collab bridge writes the store directly.
    useStore.setState({
      tracks: s().tracks.map((t) => (t.id === keys ? { ...t, pan: -1 } : t)),
    });
    expect(isDocumentDirty()).toBe(true);
  });

  it('counts an Oracle patch edit, and reads clean when the patch is put back', () => {
    const { synth } = openProject();
    const patches: Record<string, unknown> = {
      [synth]: { glide: 0.1, macros: [{ value: 0.5 }] },
    };
    setSynthPatchReader(() => patches);
    markDocumentBaseline();

    patches[synth] = { glide: 0.4, macros: [{ value: 0.5 }] };
    noteSynthPatchChange();
    expect(isDocumentDirty()).toBe(true);

    // The same patch, its keys made in another order (a panel restoring it).
    patches[synth] = { macros: [{ value: 0.5 }], glide: 0.1 };
    noteSynthPatchChange();
    expect(isDocumentDirty()).toBe(false);
  });

  it('compares with the empty project before any baseline', () => {
    useSaveStatusStore.setState(useSaveStatusStore.getInitialState(), true);
    const id = s().addTrack('midi', 'organ', 'Organ');
    expect(isDocumentDirty()).toBe(true);
    s().removeTrack(id);
    expect(isDocumentDirty()).toBe(false);
  });

  it('reuses the fingerprint between document writes: checks during playback cost nothing', () => {
    openProject();
    let reads = 0;
    setSynthPatchReader(() => {
      reads++;
      return {};
    });
    markDocumentBaseline();
    const bpm = s().bpm;
    s().setBpm(bpm + 1);
    expect(isDocumentDirty()).toBe(true);
    const afterEdit = reads;
    for (let tick = 0; tick < 3000; tick += 30) {
      s().setPosition(tick);
      expect(isDocumentDirty()).toBe(true);
    }
    expect(reads).toBe(afterEdit);
    s().setBpm(bpm);
    expect(isDocumentDirty()).toBe(false);
    expect(reads).toBe(afterEdit + 1);
  });

  it('stops reusing it once the observer is detached', () => {
    openProject();
    const bpm = s().bpm;
    s().setBpm(bpm + 1);
    expect(isDocumentDirty()).toBe(true);
    attachDocumentObserver()();
    // Unseen by the trigger: only a fresh fingerprint can tell.
    useStore.setState({ bpm });
    expect(isDocumentDirty()).toBe(false);
  });
});

// ── The baseline ───────────────────────────────────────────────────────────

describe('markDocumentBaseline', () => {
  it('records savedComplete, true unless told otherwise', () => {
    openProject();
    markDocumentBaseline({ savedComplete: false });
    expect(status().savedComplete).toBe(false);
    markDocumentBaseline();
    expect(status().savedComplete).toBe(true);
    markDocumentBaseline({
      savedComplete: false,
      snapshot: documentSnapshot(),
    });
    expect(status().savedComplete).toBe(false);
  });

  it('marks only a save that left content out as a cloud copy in part', () => {
    openProject();
    s().setProjectId('cloud-1');
    expect(status().savedInPart).toBe(false);
    // A restored draft is the only copy: not a cloud copy at all.
    markDocumentBaseline({ savedComplete: false });
    expect(status().savedInPart).toBe(false);
    markDocumentBaseline({ snapshot: documentSnapshot(), savedComplete: true });
    expect(status().savedInPart).toBe(false);
    markDocumentBaseline({
      snapshot: documentSnapshot(),
      savedComplete: false,
    });
    expect(status()).toMatchObject({
      savedComplete: false,
      savedInPart: true,
    });
    // An edit leaves the baseline as it was.
    s().setBpm(97);
    expect(status().savedInPart).toBe(true);
    // The next load or reset is a baseline of its own.
    markDocumentBaseline();
    expect(status().savedInPart).toBe(false);
  });

  it('stops counting a cloud copy in part once the session lets go of it', () => {
    openProject();
    s().setProjectId('cloud-1');
    markDocumentBaseline({
      snapshot: documentSnapshot(),
      savedComplete: false,
    });
    // File ▸ Delete: the session is the only copy of all of it now.
    s().setProjectId(null);
    expect(status()).toMatchObject({
      savedComplete: false,
      savedInPart: false,
    });
    expect(hasWorkToKeep()).toBe(true);
  });

  it('takes the version and fingerprint as they stand', () => {
    openProject();
    s().setBpm(97);
    markDocumentBaseline();
    expect(status().baselineVersion).toBe(status().documentVersion);
    expect(status().baselineFingerprint).toBe(documentFingerprint());
  });

  it("keeps an edit made while a save's request was in flight unsaved", () => {
    const { keys } = openProject();
    const sent = documentSnapshot();
    s().updateTrack(keys, { name: 'Piano' });
    markDocumentBaseline({ snapshot: sent });
    expect(isDocumentDirty()).toBe(true);
    s().updateTrack(keys, { name: 'Keys' });
    expect(isDocumentDirty()).toBe(false);
  });

  it('ignores a save that finishes after a newer baseline', () => {
    openProject();
    const sent = documentSnapshot();
    s().setBpm(97);
    markDocumentBaseline(); // a newer save, or another project opened
    const baseline = status();
    markDocumentBaseline({ snapshot: sent, savedComplete: false });
    expect(status()).toEqual(baseline);
  });

  it('ignores a save whose cloud copy was let go while it was in flight', () => {
    openProject();
    s().setProjectId('cloud-1');
    markDocumentBaseline();
    const sent = documentSnapshot();
    expect(sent.projectId).toBe('cloud-1');
    // File ▸ Delete finished first: the copy the save wrote is gone.
    s().setProjectId(null);
    markDocumentBaseline({ snapshot: sent });
    expect(status().savedComplete).toBe(false);
    expect(hasWorkToKeep()).toBe(true);
  });

  it('takes in patches seeded since the last store write', () => {
    const { synth } = openProject();
    const patches: Record<string, unknown> = {};
    setSynthPatchReader(() => patches);
    s().setBpm(97);
    expect(isDocumentDirty()).toBe(true);
    // A loader seeds the patch cache after its last store write.
    patches[synth] = { glide: 0.2 };
    markDocumentBaseline();
    // The panel then shows that patch: equal content.
    noteSynthPatchChange();
    expect(isDocumentDirty()).toBe(false);
  });

  it('uses the patches it is given in place of the live ones', () => {
    const { synth } = openProject();
    setSynthPatchReader(() => ({ [synth]: { glide: 1 } }));
    markDocumentBaseline({ synthPatches: { [synth]: { glide: 0 } } });
    noteSynthPatchChange();
    expect(isDocumentDirty()).toBe(true);
  });
});

// ── The fingerprint ────────────────────────────────────────────────────────

describe('documentFingerprint', () => {
  it('is JSON of every content key, sorted, and nothing else', () => {
    openProject();
    const doc = JSON.parse(documentFingerprint()) as Record<string, unknown>;
    expect(Object.keys(doc)).toEqual([...CONTENT_KEYS].sort());
    expect(doc).not.toHaveProperty('projectId');
    expect(doc).not.toHaveProperty('position');
  });

  it("holds each track's doc fields, never its per-user ones", () => {
    const { keys, guitar } = openProject();
    s().toggleRecordArm(keys);
    s().toggleMonitoring(guitar);
    const doc = JSON.parse(documentFingerprint()) as {
      tracks: Record<string, unknown>[];
    };
    const allowed = new Set<string>(TRACK_DOC_FIELDS);
    for (const track of doc.tracks) {
      expect(Object.keys(track).filter((k) => !allowed.has(k))).toEqual([]);
    }
  });

  it('changes with every content key and every track doc field', () => {
    openProject();
    const unchanged: string[] = [];
    for (const key of CONTENT_KEYS) {
      const before = documentFingerprint();
      write(key, different(s()[key]));
      if (documentFingerprint() === before) unchanged.push(key);
    }
    for (const field of TRACK_DOC_FIELDS) {
      const before = documentFingerprint();
      const id = s().tracks[0].id;
      s().updateTrack(id, {
        [field]: different(trackById(id)[field]),
      } as Partial<Track>);
      if (documentFingerprint() === before) unchanged.push(`Track.${field}`);
    }
    expect(unchanged).toEqual([]);
  });

  it('is the same text for the same content, whatever order its keys were made in', () => {
    const { keys } = openProject();
    const before = documentFingerprint();
    const reversed = <T extends object>(value: T): T =>
      Object.fromEntries(Object.entries(value).reverse()) as T;
    const track = trackById(keys);
    s().updateTrack(keys, {
      effects: reversed(track.effects),
      midiClips: track.midiClips.map((clip) =>
        reversed({ ...clip, events: clip.events.map(reversed) }),
      ),
    });
    useStore.setState({ returns: s().returns.map(reversed) });
    expect(documentFingerprint()).toBe(before);
  });

  it('reads a missing field and an undefined one the same', () => {
    const { keys } = openProject();
    const before = documentFingerprint();
    expect(trackById(keys)).not.toHaveProperty('gmProgram');
    s().updateTrack(keys, { gmProgram: undefined });
    expect(trackById(keys)).toHaveProperty('gmProgram');
    expect(documentFingerprint()).toBe(before);
  });

  it("holds an Oracle track's patch, and no other track's", () => {
    const { keys, synth } = openProject();
    const none = documentFingerprint(s(), {});
    const withPatch = documentFingerprint(s(), { [synth]: { glide: 0.3 } });
    expect(withPatch).not.toBe(none);
    expect(
      (JSON.parse(withPatch) as { tracks: Record<string, unknown>[] })
        .tracks[1],
    ).toMatchObject({ id: synth, oracleSynth: { glide: 0.3 } });
    // A patch for a track that isn't an Oracle synth, or isn't in the
    // project, is not part of the document.
    expect(
      documentFingerprint(s(), { [keys]: { glide: 1 }, gone: { glide: 1 } }),
    ).toBe(none);
  });

  it('reads the live patches through the registered reader', () => {
    const { synth } = openProject();
    setSynthPatchReader((tracks) => ({ [tracks[1].id]: { glide: 0.7 } }));
    expect(documentFingerprint()).toBe(
      documentFingerprint(s(), { [synth]: { glide: 0.7 } }),
    );
    const stop = setSynthPatchReader(() => ({}));
    stop();
    expect(documentFingerprint()).toBe(documentFingerprint(s(), {}));
  });
});

// ── Kept work ──────────────────────────────────────────────────────────────

describe('hasWorkToKeep', () => {
  // The 1.3 map's measured matrix (dirty-save-status §1.3), on a template
  // just opened: each edit alone, then whether a link would keep the work.
  const MATRIX: [string, (p: Project) => void, boolean][] = [
    ['nothing', () => {}, false],
    ['arm a track', (p) => s().toggleRecordArm(p.keys), false],
    [
      'arm then disarm',
      (p) => {
        s().toggleRecordArm(p.keys);
        s().toggleRecordArm(p.keys);
      },
      false,
    ],
    ['turn the metronome on', () => s().toggleMetronome(), false],
    ['play to bar 3', () => s().setPosition(3840), false],
    ['zoom in', () => s().setTimelineZoom(3), false],
    ['change the tempo', () => s().setBpm(97), true],
    ['rename the project', () => s().setProjectName('Mine'), true],
    [
      'turn a track down',
      (p) => s().updateTrack(p.keys, { volume: 0.2 }),
      true,
    ],
    ['add a marker', () => s().addMarker(1920, 'Verse'), true],
    ['switch to 3/4', () => s().setTimeSignature(3, 4), true],
    ['turn the master down', () => s().setMasterVolume(0.3), true],
    [
      'slur two notes in the Score',
      (p) =>
        s().setScoreSlurs([
          `${p.keys}:clip-keys:0:60|${p.keys}:clip-keys:480:64`,
        ]),
      true,
    ],
    [
      'add a lead-sheet section',
      () => s().addLeadSheetSection({ measureIdx: 0, label: 'Verse' }),
      true,
    ],
    ['strum the Prism chords', () => s().setStrumAmount(30), true],
  ];

  for (const [edit, apply, kept] of MATRIX) {
    it(`${kept ? 'keeps' : 'has nothing to keep'} after: ${edit}`, () => {
      apply(openProject());
      expect(hasWorkToKeep()).toBe(kept);
    });
  }

  it('has nothing to keep after an undo back to the baseline', () => {
    const { keys } = openProject();
    pushUndo();
    s().updateTrack(keys, { volume: 0.1 });
    expect(hasWorkToKeep()).toBe(true);
    undo();
    expect(hasWorkToKeep()).toBe(false);
  });

  it('keeps a session that is the only copy, untouched', () => {
    openProject();
    markDocumentBaseline({ savedComplete: false });
    expect(hasWorkToKeep()).toBe(true);
  });

  it('has nothing to keep when the project is empty, whatever the baseline', () => {
    markDocumentBaseline({ savedComplete: false });
    expect(isDocumentEmpty()).toBe(true);
    expect(hasWorkToKeep()).toBe(false);
    s().setBpm(97);
    expect(isDocumentEmpty()).toBe(false);
    expect(hasWorkToKeep()).toBe(true);
  });

  it('has nothing to keep in a blank draft a build before 1.3 saved', () => {
    for (const dir of ['v2', 'v2-1.2']) {
      useStore.setState(useStore.getInitialState(), true);
      const session = JSON.parse(
        readFileSync(join(FIXTURE_ROOT, dir, 'new-project.json'), 'utf8'),
      ) as SessionData;
      expect(deserializeSession(session)).toBe(true);
      // A restored draft is the only copy.
      markDocumentBaseline({ savedComplete: false });
      // Those builds reset the rhythm to 'Quarters' (decision D6's drift).
      expect(s().rhythmName).not.toBe(fieldDefault('rhythmName'));
      expect(isDocumentEmpty()).toBe(true);
      expect(hasWorkToKeep()).toBe(false);
    }
  });

  it('counts a tempo, a marker, a progression or a name in a project without tracks, but not a composer or the Prism generator alone', () => {
    const blank = () => {
      useStore.setState(useStore.getInitialState(), true);
      markDocumentBaseline({ savedComplete: false });
    };
    blank();
    // What builds before 1.3 wrote into blank projects by themselves.
    useStore.setState({
      composerName: 'Ada Lovelace',
      rhythmName: 'Quarters',
      genre: 'Rock',
      swing: 30,
    });
    expect(isDocumentEmpty()).toBe(true);
    expect(hasWorkToKeep()).toBe(false);

    const work: [string, () => void][] = [
      ['a tempo', () => s().setBpm(97)],
      ['a marker', () => s().addMarker(1920, 'Verse')],
      ['a progression', () => write('chordSeq', different(s().chordSeq))],
      ['a name', () => s().setProjectName('Mine')],
    ];
    const missed = work
      .filter(([, edit]) => {
        blank();
        edit();
        return isDocumentEmpty() || !hasWorkToKeep();
      })
      .map(([what]) => what);
    expect(missed).toEqual([]);
  });

  it('keeps a project whose cloud copy was deleted, until it is saved again', () => {
    openProject();
    s().setProjectId('cloud-1');
    markDocumentBaseline(); // opened from the cloud
    expect(hasWorkToKeep()).toBe(false);

    // File ▸ Delete: the cloud copy is gone, the project stays open.
    s().setProjectId(null);
    expect(status().savedComplete).toBe(false);
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(true);

    // Saved again, into a new cloud project that holds all of it. The save
    // captured what it sent before the new project's id came back.
    const sent = documentSnapshot();
    expect(sent.projectId).toBeNull();
    s().setProjectId('cloud-2');
    markDocumentBaseline({ snapshot: sent });
    expect(status().savedComplete).toBe(true);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('a Save As keeping the name ends saved, and every link change reaches the draft', () => {
    openProject();
    s().setProjectId('cloud-1');
    markDocumentBaseline();
    // FileMenu's Save As: the same name, the link cleared, then the save
    // mints the new project and sends it.
    const moves = movesOf(() => {
      s().setProjectName(s().projectName);
      s().setProjectId(null);
    });
    expect(moves.draft).toBe(1);
    expect(hasWorkToKeep()).toBe(true);
    expect(movesOf(() => s().setProjectId('cloud-2')).draft).toBe(1);
    markDocumentBaseline({ snapshot: documentSnapshot() });
    expect(status().savedComplete).toBe(true);
    expect(hasWorkToKeep()).toBe(false);
  });

  it('keeps a project after a legacy save that left its chord lane out, and not after a whole one', () => {
    const { keys } = openProject();
    s().setChordRegions([
      {
        id: 'region-1',
        startTick: 0,
        endTick: 1920,
        name: 'i',
        noteName: 'D min',
        color: [0, 0, 255],
      },
    ]);
    s().setMode('dorian');
    const sent = documentSnapshot();
    const left = cloudSaveGaps();
    markDocumentBaseline({ snapshot: sent, savedComplete: left.length === 0 });
    expect(left).toEqual(
      expect.arrayContaining(['chordRegions', 'mode', 'clipColorMode']),
    );
    expect(isDocumentDirty()).toBe(false);
    expect(hasWorkToKeep()).toBe(true);

    // In the 1.5 document format the save holds all of it.
    markDocumentBaseline({
      snapshot: documentSnapshot(),
      savedComplete: cloudSaveGaps(s(), 'document').length === 0,
    });
    expect(hasWorkToKeep()).toBe(false);
    s().updateTrack(keys, { volume: 0.5 });
    expect(hasWorkToKeep()).toBe(true);
  });
});

// ── What a cloud save leaves out ───────────────────────────────────────────

describe('cloudSaveGaps', () => {
  // The return buses go in today's payload, but the API isn't confirmed to
  // keep them, so a legacy save counts them as left out.
  const unconfirmed: StoreDataKey[] = ['returns'];
  const documentOnly = [
    ...CONTENT_KEYS.filter((key) => STORE_FIELDS[key].cloud === 'document'),
    ...unconfirmed,
  ];
  const legacy = CONTENT_KEYS.filter(
    (key) =>
      STORE_FIELDS[key].cloud === 'legacy' &&
      key !== 'tracks' &&
      !unconfirmed.includes(key),
  );

  it("is empty for a project today's payload holds whole", () => {
    expect(cloudSaveGaps()).toEqual([]);
    const { keys } = openProject();
    s().setBpm(97);
    s().setProjectName('Mine');
    s().setSwing(20);
    s().updateTrack(keys, { volume: 0.3, gmProgram: 4 });
    expect(cloudSaveGaps()).toEqual([]);
  });

  it('names each top-level field only the document field carries, and no other', () => {
    openProject();
    const missed: string[] = [];
    for (const key of documentOnly) {
      useStore.setState(useStore.getInitialState(), true);
      openProject();
      write(key, different(s()[key]));
      if (!cloudSaveGaps().includes(key)) missed.push(key);
    }
    const extra: string[] = [];
    for (const key of legacy) {
      useStore.setState(useStore.getInitialState(), true);
      openProject();
      write(key, different(s()[key]));
      extra.push(...cloudSaveGaps());
    }
    expect(missed).toEqual([]);
    expect(extra).toEqual([]);
  });

  // Every template and every genre picked in Prism writes the genre's strum,
  // which the payload's genre stands for: counting it would make every saved
  // template a cloud copy in part. The student's own strum counts (D7), and
  // so do the tilt and the filter, which nothing else sets.
  it('leaves out the strum a genre sets, as every template does, and counts the student’s own', () => {
    for (const template of [
      'project-pop',
      'project-rock',
      'project-indie',
      'project-rnb',
    ]) {
      useStore.setState(useStore.getInitialState(), true);
      s().loadProjectTemplate(template);
      expect([template, cloudSaveGaps()]).toEqual([template, []]);
    }
    s().selectGenre('Reggae');
    expect(cloudSaveGaps()).toEqual([]);
    // Reggae strums up: changed, the strum is the student's, mode and all,
    // and a cloud reopen would give neither back.
    s().setStrumAmount(45);
    expect(cloudSaveGaps().sort()).toEqual(['strumAmount', 'strumMode']);
    s().selectGenre('Reggae');
    s().setTiltAmount(0.5);
    s().setFilterPercent(0.5);
    expect(cloudSaveGaps().sort()).toEqual(['filterPercent', 'tiltAmount']);
    s().addChord('1 major');
    expect(cloudSaveGaps()).toEqual(
      expect.arrayContaining(['chordSeq', 'stringSeq']),
    );
    // In the document format they travel with the rest of the project.
    expect(cloudSaveGaps(s(), 'document')).toEqual([]);
  });

  it("names a clip's length and CC events, and not its notes' ids", () => {
    const { keys, clip } = openProject();
    expect(cloudSaveGaps()).toEqual([]);
    s().updateMidiClip(keys, clip, {
      durationTicks: 7680,
      ccEvents: [{ tick: 0, controller: 64, value: 127, channel: 0 }],
    });
    expect(cloudSaveGaps().sort()).toEqual([
      'MidiClip.ccEvents',
      'MidiClip.durationTicks',
    ]);
    s().updateMidiClip(keys, clip, { durationTicks: undefined, ccEvents: [] });
    expect(cloudSaveGaps()).toEqual([]);
  });

  it('names audio whose bytes never reached the cloud, in either format', () => {
    const { guitar } = openProject();
    const take = {
      id: 'take-1',
      startTick: 0,
      duration: 1920,
      fadeInTicks: 0,
      fadeOutTicks: 0,
      assetId: null,
    };
    s().updateTrack(guitar, { audioClips: [take] });
    expect(cloudSaveGaps()).toEqual(['AudioClip.assetId']);
    expect(cloudSaveGaps(s(), 'document')).toEqual(['AudioClip.assetId']);
    s().updateTrack(guitar, { audioClips: [{ ...take, assetId: 'asset-1' }] });
    expect(cloudSaveGaps()).toEqual([]);

    const chops = s().addTrack('midi', 'sampler', 'Chops');
    const sample = {
      sampleId: 'sample-1',
      assetId: null,
      rootNote: 60,
      attack: 0,
      release: 0.1,
    };
    s().updateTrack(chops, {
      samplerSample: sample as unknown as Track['samplerSample'],
    });
    expect(cloudSaveGaps(s(), 'document')).toEqual(['Track.samplerSample']);
    s().updateTrack(chops, {
      samplerSample: {
        ...sample,
        sourceUrl: '/samples/chop.wav',
      } as unknown as Track['samplerSample'],
    });
    expect(cloudSaveGaps()).toEqual([]);
  });

  it('names the master automation of a project with no track to carry it', () => {
    s().setMasterVolume(0.8);
    useStore.setState({
      masterAutomation: { volume: [{ tick: 0, value: 0.5 }] },
    });
    expect(cloudSaveGaps()).toEqual(['masterAutomation']);
    expect(cloudSaveGaps(s(), 'document')).toEqual([]);
    s().addTrack('midi', 'organ', 'Organ');
    expect(cloudSaveGaps()).toEqual([]);
  });

  it('names edited return buses after a legacy save, and not in the document format', () => {
    openProject();
    expect(STORE_FIELDS.returns.cloud).toBe('legacy');
    useStore.setState({
      returns: s().returns.map((bus, i) =>
        i === 0 ? { ...bus, volume: bus.volume / 2 } : bus,
      ),
    });
    expect(cloudSaveGaps()).toEqual(['returns']);
    expect(cloudSaveGaps(s(), 'document')).toEqual([]);
    useStore.setState({ returns: fieldDefault('returns') });
    expect(cloudSaveGaps()).toEqual([]);
  });

  it('names only media in the document format', () => {
    openProject();
    s().setMode('dorian');
    s().addMarker(1920, 'Chorus');
    s().setTimeSignature(6, 8);
    expect(cloudSaveGaps().sort()).toEqual([
      'markers',
      'mode',
      'timeSignatureDenominator',
      'timeSignatureNumerator',
    ]);
    expect(cloudSaveGaps(s(), 'document')).toEqual([]);
  });
});

// ── The captured autosaves ─────────────────────────────────────────────────

const FIXTURE_ROOT = resolve(
  process.cwd(),
  'src/daw/persistence/__tests__/fixtures',
);
const FIXTURES = join(FIXTURE_ROOT, 'v2-1.2');

/** Each Oracle track's patch, as synthTrackState's reader gives it. */
const readTrackPatches = (tracks: readonly Track[]) => {
  const patches: Record<string, unknown> = {};
  for (const track of tracks) {
    if (track.instrument !== 'oracle-synth') continue;
    const patch = getTrackSynthState(track.id);
    if (patch) patches[track.id] = patch;
  }
  return patches;
};

describe('projects loaded from the captured autosaves', () => {
  const files = readdirSync(FIXTURES)
    .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
    .sort();

  for (const file of files) {
    it(`${file}: a deep copy reads clean, an edit dirty`, () => {
      const session = JSON.parse(
        readFileSync(join(FIXTURES, file), 'utf8'),
      ) as SessionData;
      expect(deserializeSession(session)).toBe(true);
      setSynthPatchReader(readTrackPatches);
      markDocumentBaseline();
      const fingerprint = documentFingerprint();

      // Every saved Oracle patch is in the fingerprint.
      const saved = session.data.tracks.filter(
        (t) => t.settings?.oracleSynth !== undefined,
      ).length;
      const held = (
        JSON.parse(fingerprint) as { tracks: { oracleSynth?: unknown }[] }
      ).tracks.filter((t) => t.oracleSynth !== undefined).length;
      expect(held).toBe(saved);

      expect(
        bumpsOf(() => useStore.setState(copyOfDocument(s()))),
      ).toBeGreaterThan(0);
      expect(documentFingerprint()).toBe(fingerprint);
      expect(isDocumentDirty()).toBe(false);

      s().setBpm(s().bpm + 1);
      expect(isDocumentDirty()).toBe(true);
    });
  }
});
