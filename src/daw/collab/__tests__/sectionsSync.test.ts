import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import type { SongSection } from '@/daw/model/sections';
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
