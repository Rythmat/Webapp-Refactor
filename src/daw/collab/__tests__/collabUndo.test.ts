import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { COLLAB_UNDO_KEYS } from '@/daw/persistence/projectDocument/fields';
import { useStore } from '@/daw/store';
import {
  canUndo,
  isHistoryPaused,
  resetHistory,
  startHistory,
  withTransaction,
} from '@/daw/store/history';
import {
  destroyCollabUndo,
  initCollabUndo,
  smartCanUndo,
  smartUndo,
  smartUndoLabel,
} from '@/daw/store/undoMiddleware';
import { withOrigin } from '@/daw/store/writeContext';
import { setBridge } from '../collabMiddleware';
import { hydrateDocFromStore } from '../YjsDocManager';
import { ZustandYjsBridge } from '../ZustandYjsBridge';
import { COLLAB_UNDO_TYPES, collabUndoScope } from '../undoScope';

// ── Undo in a shared session (milestone 1.9) ───────────────────────────────
// Collab undo is the Yjs undo manager's, scoped from the project registry. A
// gesture's commit reaches the room as one update and is one labelled undo
// step; writes undo leaves out solo are left out here too.

const s = () => useStore.getState();

let doc: Y.Doc;
let bridge: ZustandYjsBridge;
let updates = 0;
let release: () => void = () => {};

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  s().addTrack('midi', 'soundfont', 'Keys');
  resetHistory();
  release = startHistory();
  doc = new Y.Doc();
  hydrateDocFromStore(doc, s());
  bridge = new ZustandYjsBridge(
    doc,
    (partial) => useStore.setState(partial),
    () => useStore.getState(),
    (listener) => useStore.subscribe(listener),
  );
  setBridge(bridge);
  initCollabUndo(doc);
  bridge.startObserving();
  updates = 0;
  doc.on('update', () => {
    updates += 1;
  });
});

afterEach(() => {
  bridge.destroy();
  setBridge(null);
  destroyCollabUndo();
  release();
  resetHistory();
  doc.destroy();
});

describe('the scope', () => {
  it('names a place in the document, or none yet, for every shared undo key', () => {
    for (const key of COLLAB_UNDO_KEYS) {
      expect(COLLAB_UNDO_TYPES).toHaveProperty(key);
    }
    expect(Object.keys(COLLAB_UNDO_TYPES).sort()).toEqual(
      [...COLLAB_UNDO_KEYS].sort(),
    );
  });

  it('watches the tracks, chords, markers, sections, mastering, lead sheet, key and tempo', () => {
    const fresh = new Y.Doc();
    const scope = collabUndoScope(fresh);
    const names = new Map<unknown, string>();
    for (const [name, type] of fresh.share) names.set(type, name);
    expect(scope.map((t) => names.get(t)).sort()).toEqual([
      'chordRegions',
      'leadSheet',
      'markers',
      'mastering',
      'prism',
      'sections',
      'tracks',
      'transport',
    ]);
  });
});

describe('a gesture in a room', () => {
  it('is one update to the room and one labelled undo step', () => {
    const id = s().tracks[0].id;
    withTransaction('Change volume', () => {
      s().updateTrack(id, { volume: 0.5 });
      s().updateTrack(id, { volume: 0.4 });
      s().setMasterVolume(0.6);
    });
    expect(updates).toBe(1);
    expect(smartUndoLabel()).toBe('Change volume');

    expect(smartUndo()).toBe(true);
    expect(s().tracks[0].volume).toBe(0.8);
    expect(s().masterVolume).toBe(0.8);
    expect(smartCanUndo()).toBe(false);
  });

  it('two labelled edits close together are two steps', () => {
    withTransaction('Change tempo', () => s().setBpm(100));
    withTransaction('Change master volume', () => s().setMasterVolume(0.5));
    expect(smartUndoLabel()).toBe('Change master volume');
    smartUndo();
    expect(s().masterVolume).toBe(0.8);
    expect(s().bpm).toBe(100);
  });

  it('undoes a lead-sheet section and a mastering edit (collab-19)', () => {
    withTransaction('Edit score', () => s().markSectionAtBar(0, 'A'));
    expect(s().sections.map((x) => x.label)).toEqual(['A']);
    const wet = s().masteringEffects.reverb.wet;
    withTransaction('Change effect', () =>
      s().updateMasteringEffects({
        reverb: { ...s().masteringEffects.reverb, wet: 0.7 },
      }),
    );
    smartUndo();
    expect(s().masteringEffects.reverb.wet).toBe(wet);
    smartUndo();
    expect(s().sections).toEqual([]);
  });
});

describe('what collab undo leaves out', () => {
  it('a change to keys outside undo (the genre) is no step', () => {
    s().selectGenre('Rock');
    s().setSwing(20);
    expect(smartCanUndo()).toBe(false);
  });

  it('a seed is no step', () => {
    withOrigin('seed', () => s().setBpm(90));
    expect(smartCanUndo()).toBe(false);
  });

  it('the project history pauses in a room, and starts empty after', () => {
    expect(isHistoryPaused()).toBe(true);
    withTransaction('Change tempo', () => s().setBpm(100));
    expect(canUndo()).toBe(false);
    destroyCollabUndo();
    expect(isHistoryPaused()).toBe(false);
    expect(canUndo()).toBe(false);
  });
});

describe('the cap', () => {
  it('keeps the last 100 steps', async () => {
    for (let i = 0; i < 105; i++) {
      withTransaction(`Step ${i}`, () => s().setBpm(60 + i));
    }
    await Promise.resolve();
    let steps = 0;
    while (smartUndo()) steps += 1;
    expect(steps).toBe(100);
  });
});
