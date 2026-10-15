import { expect } from 'vitest';
import { useStore } from '@/daw/store';
import { STORE_FIELDS, fieldDefault, type StoreDataKey } from '../fields';

// ── A project left behind ──────────────────────────────────────────────────
//
// What the reset and load tests start from: a store in which every key holds
// something other than its default, as the project before would have left
// it. The keys the store's own actions walk get real entries, made the way
// the editor makes them; every other key gets a sentinel. One copy, so the
// tests that ask what a reset puts back (fieldCoverage.test.ts) and what it
// leaves alone (initialState.test.ts) start from the same project.

const s = () => useStore.getState();

/** The store's data, by key: everything but the actions. */
export function storeData(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(s()).filter(([, value]) => typeof value !== 'function'),
  );
}

/** Whether two values are equal the way toEqual sees them (Maps and Sets too). */
export function same(a: unknown, b: unknown): boolean {
  try {
    expect(a).toEqual(b);
    return true;
  } catch {
    return false;
  }
}

/** A value of the same kind as `value` that differs from it. */
function sentinel(value: unknown, key: string): unknown {
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return value + 7;
  if (typeof value === 'string') return `${value} (left behind)`;
  if (value instanceof Set) return new Set([...value, 99]);
  if (value instanceof Map) return new Map([...value, [99, key]]);
  if (Array.isArray(value)) return [...value, `left behind: ${key}`];
  if (value !== null && typeof value === 'object') {
    return { ...value, leftBehind: key };
  }
  return { leftBehind: key };
}

/**
 * Keys whose entries code outside the store walks (store observers, the
 * engines): these change through store actions, so they hold real entries.
 */
const MADE_BY_ACTIONS: readonly StoreDataKey[] = [
  'tracks',
  'chordRegions',
  'markers',
  'returns',
];

/**
 * Leave a project behind. A drum machine, a live guitar track, a chord, a
 * marker and a return's level come from the store's actions, and every other
 * key of `keys` (by default every data key the store holds, reset or not)
 * gets a sentinel off its registry default. Returns the store's data as it
 * then stands.
 */
export function leaveAProjectBehind(
  keys: readonly string[] = Object.keys(storeData()),
): Record<string, unknown> {
  s().addTrack('midi', 'drum-machine', 'Drums');
  s().addTrack('audio', 'guitar-fx', 'Guitar');
  s().insertChordRegion(0, '1 maj', 'C maj');
  s().addMarker(1920, 'Verse');
  s().setReturnVolume('A', 0.3);
  const now = storeData();
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    if ((MADE_BY_ACTIONS as readonly string[]).includes(key)) continue;
    const base =
      key in STORE_FIELDS ? fieldDefault(key as StoreDataKey) : now[key];
    patch[key] = sentinel(base, key);
  }
  useStore.setState(patch as Partial<ReturnType<typeof s>>);
  return storeData();
}
