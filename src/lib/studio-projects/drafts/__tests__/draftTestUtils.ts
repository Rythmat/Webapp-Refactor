import type { DraftMeta, DraftWrite } from '../types';

// Shared by the draft-store tests: an in-memory Storage (with an optional
// character budget, to stand for a full localStorage) and draft builders.

/** A Storage in memory. With `budget`, a write past it throws QuotaExceededError. */
export class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  constructor(private budget = Infinity) {}

  get length(): number {
    return this.map.size;
  }
  /** Characters held, keys included (the way browsers count). */
  used(): number {
    let total = 0;
    for (const [k, v] of this.map) total += k.length + v.length;
    return total;
  }
  setBudget(budget: number): void {
    this.budget = budget;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    const before = this.map.get(key);
    const next =
      this.used() -
      (before === undefined ? 0 : key.length + before.length) +
      key.length +
      value.length;
    if (next > this.budget)
      throw new DOMException(
        'The quota has been exceeded.',
        'QuotaExceededError',
      );
    this.map.set(key, String(value));
  }
}

/** A Storage whose every access throws (storage refused). */
export function throwingStorage(): Storage {
  const fail = () => {
    throw new DOMException('denied', 'SecurityError');
  };
  return {
    get length(): number {
      return fail();
    },
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  };
}

export type DraftKind = 'work' | 'pristine' | 'cloud-equal' | 'empty';

/** The meta of a draft write: `kind` sets the fields the predicates read. */
export function writeMeta(
  draftId: string,
  userKey: string,
  kind: DraftKind = 'work',
  extra: Partial<DraftWrite['meta']> = {},
): DraftWrite['meta'] {
  const doc = `h1:doc-${draftId}`;
  const base: DraftWrite['meta'] = {
    draftId,
    userKey,
    origin: 'session',
    createdAt: 0,
    keptAt: undefined,
    schema: 3,
    name: `Draft ${draftId}`,
    trackCount: 1,
    chars: 0,
    docFingerprint: doc,
    hasContent: kind !== 'empty',
    baseline: {
      source: 'template',
      ref: 'project-pop',
      reopenable: true,
      fingerprint: kind === 'pristine' ? doc : 'h1:other',
    },
    media: [],
    mediaMissing: 0,
  };
  if (kind === 'cloud-equal') {
    base.projectId = `p-${draftId}`;
    base.cloud = {
      projectId: `p-${draftId}`,
      updatedAt: '2026-10-01T00:00:00.000Z',
      savedFingerprint: doc,
      savedComplete: true,
      savedAt: 1,
    };
  }
  return { ...base, ...extra };
}

/** A create write. */
export function createWrite(
  draftId: string,
  userKey: string,
  kind: DraftKind = 'work',
  extra: Partial<DraftWrite['meta']> = {},
  text = `{"body":"${draftId}"}`,
): DraftWrite {
  return {
    meta: writeMeta(draftId, userKey, kind, extra),
    text,
    expectedSeq: null,
  };
}

/** An update of `stored`, with `text`. */
export function updateWrite(
  stored: DraftMeta,
  text: string,
  extra: Partial<DraftWrite['meta']> = {},
): DraftWrite {
  const {
    v: _v,
    writeSeq,
    updatedAt: _u,
    writer: _w,
    contentHash: _c,
    ...meta
  } = stored;
  void _v;
  void _u;
  void _w;
  void _c;
  return { meta: { ...meta, ...extra }, text, expectedSeq: writeSeq };
}

/** A clock tests move by hand. */
export function manualClock(start = 1_000_000) {
  let t = start;
  const now = () => t;
  now.set = (value: number) => {
    t = value;
  };
  now.advance = (ms: number) => {
    t += ms;
  };
  return now;
}

export const DAY = 24 * 60 * 60 * 1000;
