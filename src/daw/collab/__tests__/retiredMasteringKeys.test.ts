/**
 * The eight mastering macros (style, EQ, presence, de-esser, loudness, stereo
 * field, dynamics, amount) left the store in milestone 1.3 (decision D5): no
 * control set them and no engine read them. Older peers still read their
 * keys from the room's doc, so the doc keeps its shape without a schema
 * bump: a doc made here holds the keys at the values every older build
 * wrote, no diff writes them, and nothing read from a doc puts them back in
 * the store.
 *
 * Run: npx vitest run src/daw/collab/__tests__/retiredMasteringKeys.test.ts
 */
import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { useStore, type AllSlices } from '@/daw/store';
import { diffAndApply } from '../diffEngine';
import { ORIGIN_LOCAL } from '../types';
import { getYMastering, hydrateDocFromStore } from '../YjsDocManager';
import { observeYjsAndPushToStore, pullDocIntoStore } from '../yjsToZustand';

/** What every build before 1.3 wrote under each key: the slice defaults. */
const AS_OLDER_BUILDS_WROTE: Record<string, unknown> = {
  style: 'balanced',
  eq: JSON.stringify({ low: 0, mid: 0, high: 0 }),
  dynamics: JSON.stringify({ compression: 50, character: 50, saturation: 0 }),
  loudness: -2,
  stereoField: '100%',
  amount: 100,
  presence: 50,
  deEsser: JSON.stringify({ amount: 0, frequency: 6000 }),
};
const MACRO_KEYS = Object.keys(AS_OLDER_BUILDS_WROTE);

/** The store keys the macros had. */
const RETIRED_STORE_KEYS = [
  'masteringStyle',
  'masteringEq',
  'masteringDynamics',
  'masteringLoudness',
  'masteringStereoField',
  'masteringAmount',
  'masteringPresence',
  'masteringDeEsser',
];

const fresh = (): AllSlices => ({ ...useStore.getInitialState() });

/** A doc an older host made, with macros a student never could have set. */
function olderHostsDoc(): Y.Doc {
  const doc = new Y.Doc();
  hydrateDocFromStore(doc, fresh());
  doc.transact(() => {
    const m = getYMastering(doc);
    m.set('style', 'warm');
    m.set('eq', JSON.stringify({ low: 3, mid: 0, high: -2 }));
    m.set('amount', 80);
  }, 'older-host');
  return doc;
}

describe('a doc made here', () => {
  it('holds the eight macro keys as older builds wrote them', () => {
    const doc = new Y.Doc();
    hydrateDocFromStore(doc, fresh());
    const m = getYMastering(doc);
    expect(Object.fromEntries(MACRO_KEYS.map((k) => [k, m.get(k)]))).toEqual(
      AS_OLDER_BUILDS_WROTE,
    );
    // An older peer parses the JSON ones when it joins.
    for (const key of ['eq', 'dynamics', 'deEsser']) {
      expect(() => JSON.parse(m.get(key) as string)).not.toThrow();
    }
  });

  it('still holds the live mastering keys', () => {
    const state = fresh();
    state.masterVolume = 0.5;
    const doc = new Y.Doc();
    hydrateDocFromStore(doc, state);
    const m = getYMastering(doc);
    expect(m.get('masterVolume')).toBe(0.5);
    for (const key of [
      'bypass',
      'fxChain',
      'effects',
      'masterAutomation',
      'returns',
    ]) {
      expect(m.has(key)).toBe(true);
    }
  });
});

describe('a diff', () => {
  it('never writes the macro keys', () => {
    const doc = new Y.Doc();
    const prev = fresh();
    hydrateDocFromStore(doc, prev);
    const written: string[] = [];
    getYMastering(doc).observe((event) => {
      written.push(...event.keysChanged);
    });
    const next = {
      ...prev,
      masterVolume: 0.4,
      masteringBypass: true,
      masteringFxChain: ['compressor'],
    } as AllSlices;
    doc.transact(() => diffAndApply(doc, prev, next), ORIGIN_LOCAL);
    expect(written.sort()).toEqual(['bypass', 'fxChain', 'masterVolume']);
  });
});

describe('reading a doc into the store', () => {
  it('leaves the macros out when joining a room', () => {
    const patches: Partial<AllSlices>[] = [];
    pullDocIntoStore(olderHostsDoc(), (p) => patches.push(p), fresh);
    const keys = patches.flatMap((p) => Object.keys(p));
    expect(keys.filter((k) => RETIRED_STORE_KEYS.includes(k))).toEqual([]);
    expect(keys).toEqual(
      expect.arrayContaining(['masteringBypass', 'masterVolume', 'returns']),
    );
  });

  it("leaves an older peer's macro edit out of the store, and applies the rest", () => {
    const doc = new Y.Doc();
    hydrateDocFromStore(doc, fresh());
    const patches: Partial<AllSlices>[] = [];
    const stop = observeYjsAndPushToStore(
      doc,
      (p) => patches.push(p),
      () => false,
      fresh,
      () => () => {},
    );
    doc.transact(() => {
      const m = getYMastering(doc);
      m.set('style', 'open');
      m.set('stereoField', 'wide');
      m.set('dynamics', JSON.stringify({ compression: 80 }));
    }, 'older-peer');
    expect(patches).toEqual([]);

    doc.transact(() => {
      getYMastering(doc).set('masterVolume', 0.6);
    }, 'older-peer');
    expect(patches).toEqual([{ masterVolume: 0.6 }]);
    stop();
  });
});
