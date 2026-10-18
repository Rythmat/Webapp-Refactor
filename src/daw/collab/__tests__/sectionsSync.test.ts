import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import {
  appendSection,
  resizeSectionEdge,
  type SongSection,
} from '@/daw/model/sections';
import type { AllSlices } from '@/daw/store/index';
import { COLLAB_DOC_SCHEMA_VERSION, ORIGIN_LOCAL } from '../types';
import { diffAndApply } from '../diffEngine';
import { collabUndoScope } from '../undoScope';
import {
  getYLeadSheet,
  getYSections,
  hydrateDocFromStore,
  sectionToYMap,
  sectionsFromDoc,
  yMapToSection,
} from '../YjsDocManager';
import { observeYjsAndPushToStore, pullDocIntoStore } from '../yjsToZustand';
import { useStore } from '@/daw/store';

// ── Song sections in the room (milestone 2.13) ─────────────────────────────
// Doc schema 3: the song's sections are an array of their own, one Y.Map
// each, diffed by id as the markers are; the lead sheet's old `sections`
// key (its bar marks) is neither written nor read. Every peer reads the doc
// in order and without overlaps. Run:
// npx vitest run src/daw/collab/__tests__/sectionsSync.test.ts

const verse: SongSection = {
  id: 'sec-verse',
  type: 'verse',
  label: 'Verse 1',
  startTick: 0,
  endTick: 15360,
};
const chorus: SongSection = {
  id: 'sec-chorus',
  type: 'chorus',
  label: 'Chorus',
  startTick: 15360,
  endTick: 30720,
};

/** Two docs that pass every update to each other, as the room does. */
function room() {
  const mine = new Y.Doc();
  const theirs = new Y.Doc();
  mine.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'network') Y.applyUpdate(theirs, update, 'network');
  });
  theirs.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'network') Y.applyUpdate(mine, update, 'network');
  });
  return { mine, theirs };
}

/** Writes `next` over `prev` into `doc`, as the bridge does for an edit. */
function edit(doc: Y.Doc, prev: SongSection[], next: SongSection[]) {
  const before = { ...useStore.getInitialState(), sections: prev };
  const after = { ...before, sections: next } as AllSlices;
  doc.transact(() => diffAndApply(doc, before, after), ORIGIN_LOCAL);
}

describe('song sections in the doc', () => {
  it('is doc schema 3', () => {
    expect(COLLAB_DOC_SCHEMA_VERSION).toBe(3);
  });

  it('round-trips a section through its Y.Map', () => {
    const doc = new Y.Doc();
    getYSections(doc).push([sectionToYMap(verse)]);
    expect(yMapToSection(getYSections(doc).get(0))).toEqual(verse);
  });

  it('reads a type it doesn’t know as custom, and a missing name as the type’s', () => {
    const doc = new Y.Doc();
    const m = new Y.Map<unknown>();
    m.set('id', 'sec-x');
    m.set('type', 'refrain-of-the-future');
    m.set('startTick', 0);
    m.set('endTick', 1920);
    getYSections(doc).push([m]);
    expect(sectionsFromDoc(doc)).toEqual([
      {
        id: 'sec-x',
        type: 'custom',
        label: 'Custom',
        startTick: 0,
        endTick: 1920,
      },
    ]);
  });

  it('is written by the hydrate, and the lead sheet’s old key is not', () => {
    const doc = new Y.Doc();
    hydrateDocFromStore(doc, {
      ...useStore.getInitialState(),
      sections: [verse, chorus],
    } as AllSlices);
    expect(sectionsFromDoc(doc)).toEqual([verse, chorus]);
    expect(getYLeadSheet(doc).has('sections')).toBe(false);
  });

  it('sends an addition, a resize, a rename and a removal by id', () => {
    const { mine, theirs } = room();
    edit(mine, [], [verse]);
    expect(sectionsFromDoc(theirs)).toEqual([verse]);

    const longer = { ...verse, endTick: 19200 };
    edit(mine, [verse], [longer, { ...chorus, startTick: 19200 }]);
    expect(sectionsFromDoc(theirs)).toEqual([
      longer,
      { ...chorus, startTick: 19200 },
    ]);

    const renamed = { ...longer, label: 'Verse', type: 'verse' as const };
    edit(
      mine,
      [longer, { ...chorus, startTick: 19200 }],
      [renamed, { ...chorus, startTick: 19200 }],
    );
    expect(sectionsFromDoc(theirs)[0].label).toBe('Verse');

    edit(mine, [renamed, { ...chorus, startTick: 19200 }], [renamed]);
    expect(sectionsFromDoc(theirs)).toEqual([renamed]);
    // One Y.Map per section, never a whole-array rewrite.
    expect(getYSections(theirs).length).toBe(1);
  });

  it('reads two sections added at the same end at once in order, neither lost', () => {
    const { mine, theirs } = room();
    // Both peers add a section after the last one before hearing the other.
    const a: SongSection = { ...chorus, id: 'sec-a', label: 'A' };
    const b: SongSection = { ...chorus, id: 'sec-b', label: 'B' };
    mine.transact(() => getYSections(mine).push([sectionToYMap(a)]));
    theirs.transact(() => getYSections(theirs).push([sectionToYMap(b)]));
    const expected = [a, { ...b, startTick: 30720, endTick: 46080 }];
    expect(sectionsFromDoc(mine)).toEqual(expected);
    expect(sectionsFromDoc(theirs)).toEqual(expected);
  });

  it('reaches a peer’s store through the observer and the first pull', () => {
    const { mine, theirs } = room();
    let store: Partial<AllSlices> = {};
    const setState = (patch: Partial<AllSlices>) => {
      store = { ...store, ...patch };
    };
    const stop = observeYjsAndPushToStore(
      theirs,
      setState,
      () => false,
      () => ({ ...useStore.getInitialState(), ...store }) as AllSlices,
      () => () => {},
    );
    edit(mine, [], [chorus, verse]);
    expect(store.sections).toEqual([verse, chorus]);
    stop();

    const fresh: Partial<AllSlices> = {};
    pullDocIntoStore(
      theirs,
      (patch) => Object.assign(fresh, patch),
      () => useStore.getInitialState() as AllSlices,
    );
    expect(fresh.sections).toEqual([verse, chorus]);
  });

  it('is in the collab undo scope', () => {
    const doc = new Y.Doc();
    const names = new Map<unknown, string>();
    const scope = collabUndoScope(doc);
    for (const [name, type] of doc.share) names.set(type, name);
    expect(scope.map((t) => names.get(t))).toContain('sections');
  });
});

// ── One song form in every store ────────────────────────────────────────────
// Every peer reads the doc in order and without overlaps; the next edit writes
// that reading back (diffSections compares with the doc), so no edit can leave
// two students looking at different section boundaries.

const TS = { numerator: 4, denominator: 4 };
const BAR = 1920;
const sec = (
  id: string,
  label: string,
  fromBar: number,
  toBar: number,
): SongSection => ({
  id,
  type: 'custom',
  label,
  startTick: fromBar * BAR,
  endTick: toBar * BAR,
});

/** A room whose cable can be pulled out, for edits made at the same time. */
function cabledRoom() {
  const mine = new Y.Doc();
  const theirs = new Y.Doc();
  let connected = true;
  const queued: Array<[Y.Doc, Uint8Array]> = [];
  mine.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === 'network') return;
    if (connected) Y.applyUpdate(theirs, update, 'network');
    else queued.push([theirs, update]);
  });
  theirs.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin === 'network') return;
    if (connected) Y.applyUpdate(mine, update, 'network');
    else queued.push([mine, update]);
  });
  return {
    mine,
    theirs,
    unplug: () => {
      connected = false;
    },
    plug: () => {
      connected = true;
      for (const [doc, update] of queued.splice(0)) {
        Y.applyUpdate(doc, update, 'network');
      }
    },
  };
}

/** Verse 1–8, then each student adds a section after it at the same time. */
function addedAtOnce() {
  const r = cabledRoom();
  const verse = appendSection(
    [],
    { type: 'verse', label: 'Verse' },
    TS,
    'sec-a',
  ).sections;
  edit(r.mine, [], verse);
  r.unplug();
  const mineStore = sectionsFromDoc(r.mine);
  edit(
    r.mine,
    mineStore,
    appendSection(mineStore, { type: 'chorus', label: 'Chorus' }, TS, 'sec-b')
      .sections,
  );
  const theirStore = sectionsFromDoc(r.theirs);
  edit(
    r.theirs,
    theirStore,
    appendSection(theirStore, { type: 'bridge', label: 'Bridge' }, TS, 'sec-c')
      .sections,
  );
  r.plug();
  const both = sectionsFromDoc(r.mine);
  expect(sectionsFromDoc(r.theirs)).toEqual(both);
  // The Bridge, added at the same end, reads after the Chorus.
  expect(both.map((x) => [x.id, x.startTick / BAR, x.endTick / BAR])).toEqual([
    ['sec-a', 0, 8],
    ['sec-b', 8, 16],
    ['sec-c', 16, 24],
  ]);
  return { ...r, both };
}

describe('the room keeps one song form', () => {
  it('after two sections added at once, a resize of the moved one', () => {
    const { mine, theirs, both } = addedAtOnce();
    const next = resizeSectionEdge(both, 'sec-c', 'end', 28 * BAR, TS);
    edit(mine, both, next);
    expect(sectionsFromDoc(theirs)).toEqual(next);
    expect(sectionsFromDoc(mine)).toEqual(next);
  });

  it('after two sections added at once, a drag of the edge they share', () => {
    const { mine, theirs, both } = addedAtOnce();
    const next = resizeSectionEdge(both, 'sec-b', 'end', 12 * BAR, TS);
    edit(mine, both, next);
    expect(sectionsFromDoc(theirs)).toEqual(next);
  });

  it('after two sections added at once, deleting the one that moved the other', () => {
    const { mine, theirs, both } = addedAtOnce();
    const next = both.filter((x) => x.id !== 'sec-b');
    edit(mine, both, next);
    expect(sectionsFromDoc(theirs)).toEqual(next);
  });

  it('after an Undo brings a section back over bars a partner took', () => {
    const { mine, theirs } = room();
    const undo = new Y.UndoManager(collabUndoScope(mine), {
      trackedOrigins: new Set([ORIGIN_LOCAL]),
    });
    const two = [sec('sec-v', 'Verse', 0, 8), sec('sec-c', 'Chorus', 8, 16)];
    edit(mine, [], two);
    undo.stopCapturing();
    edit(mine, two, two.slice(1));
    undo.stopCapturing();
    // The partner drags the Chorus' free start back to bar 5.
    const theirStore = sectionsFromDoc(theirs);
    edit(
      theirs,
      theirStore,
      resizeSectionEdge(theirStore, 'sec-c', 'start', 4 * BAR, TS),
    );
    undo.undo(); // the Verse comes back over bars 5–8
    const after = sectionsFromDoc(theirs);
    expect(sectionsFromDoc(mine)).toEqual(after);
    const longer = resizeSectionEdge(after, 'sec-c', 'end', 21 * BAR, TS);
    edit(theirs, after, longer);
    expect(sectionsFromDoc(mine)).toEqual(longer);
  });

  it('reads an id held twice once, and the next edit removes the copy', () => {
    const doc = new Y.Doc();
    const three = [
      sec('v', 'Verse', 0, 8),
      sec('c', 'Chorus', 8, 16),
      sec('b', 'Bridge', 16, 24),
    ];
    edit(doc, [], three);
    // Both students deleted the Chorus at once and both pressed Undo.
    getYSections(doc).insert(2, [sectionToYMap(three[1])]);
    const read = sectionsFromDoc(doc);
    expect(read).toEqual(three);
    edit(
      doc,
      read,
      read.map((x) => (x.id === 'b' ? { ...x, label: 'B' } : x)),
    );
    expect(
      getYSections(doc)
        .toArray()
        .map((m) => m.get('id')),
    ).toEqual(['v', 'c', 'b']);
  });

  it('reads a room code hydrated again over its old copy once', () => {
    const state = {
      ...useStore.getInitialState(),
      sections: [sec('v', 'Verse', 0, 8), sec('c', 'Chorus', 8, 16)],
    } as AllSlices;
    const earlier = new Y.Doc();
    hydrateDocFromStore(earlier, state);
    const now = new Y.Doc();
    hydrateDocFromStore(now, state);
    Y.applyUpdate(now, Y.encodeStateAsUpdate(earlier), 'network');
    expect(sectionsFromDoc(now)).toEqual(state.sections);
  });

  it('keeps a section whose two edges were dragged toward each other at once', () => {
    const r = cabledRoom();
    const three = [
      sec('a', 'A', 0, 8),
      sec('b', 'B', 8, 16),
      sec('c', 'C', 16, 24),
    ];
    edit(r.mine, [], three);
    r.unplug();
    // One drags A|B right to bar 15, the other B|C left to bar 11.
    const mineStore = sectionsFromDoc(r.mine);
    edit(
      r.mine,
      mineStore,
      resizeSectionEdge(mineStore, 'a', 'end', 14 * BAR, TS),
    );
    const theirStore = sectionsFromDoc(r.theirs);
    edit(
      r.theirs,
      theirStore,
      resizeSectionEdge(theirStore, 'b', 'end', 10 * BAR, TS),
    );
    r.plug();
    const read = sectionsFromDoc(r.mine);
    expect(read.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(sectionsFromDoc(r.theirs)).toEqual(read);
    // The next edit, by either, keeps B in the doc.
    edit(
      r.theirs,
      read,
      read.map((x) => (x.id === 'c' ? { ...x, label: 'Coda' } : x)),
    );
    expect(
      getYSections(r.mine)
        .toArray()
        .map((m) => m.get('id')),
    ).toContain('b');
  });

  it('gives a section whose edges met a bar', () => {
    const doc = new Y.Doc();
    getYSections(doc).push([sectionToYMap(sec('b', 'B', 12, 12))]);
    expect(sectionsFromDoc(doc)).toEqual([sec('b', 'B', 12, 13)]);
  });
});
