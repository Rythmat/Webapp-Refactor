import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ContentItemDetail,
  ContentKind,
  SaveContentResult,
} from '@/hooks/data/admin/useAdminContent';
import { CellEditStore, type Timers } from '../cellEditStore';
import type { CellOp } from '../cellOps';
import { ItemLocks } from '../itemLock';
import {
  type CellWrite,
  IN_PANEL_MESSAGE,
  NOT_UNDONE,
  PANEL_CONFLICT_MESSAGE,
  type PutInput,
  type WriteEvent,
  WriteQueue,
  type WriteQueueDeps,
} from '../writeQueue';

/**
 * The write queue over a fake server: every read and write it makes is
 * recorded, and a write can be held open (`gate`) to see what the queue
 * does meanwhile. What the queue promises (design §3.2, §8 "Queue"): one
 * write in flight per item, edits made meanwhile folded into one, a full
 * re-read before every write, a retry on a revision conflict, proposals
 * that stop it, the item lock the row panel shares, and one refresh once
 * everything is idle.
 */

type Body = Record<string, unknown>;

interface Stored {
  id: string;
  kind: ContentKind;
  slug: string;
  body: Body;
  pendingBody?: Body | null;
  pendingById?: string | null;
  editState?: 'pending' | 'rejected' | null;
  revision?: number;
}

/** A song as the server holds it: whole, chart and all. */
const AFRICA: Body = {
  id: 'africa',
  title: 'Africa',
  year: 1982,
  popularity: 50,
  sections: [{ name: 'Verse', bars: [['B'], ['C#m']] }],
};

const ADMIN = { editor: false, userId: 'admin-1' };
const EDITOR = { editor: true, userId: 'ed-1' };

/** The server, the queue over it, and what each did. */
function setup({
  items = [
    { id: 'db-africa', kind: 'song', slug: 'africa', body: AFRICA },
    {
      id: 'db-toto',
      kind: 'artist',
      slug: 'toto',
      body: { slug: 'toto', name: 'Toto' },
    },
  ] as Stored[],
  viewer = ADMIN,
  lock,
  timers,
  canCreate = false,
  deps = {},
}: {
  items?: Stored[];
  viewer?: { editor: boolean; userId: string };
  lock?: ItemLocks;
  timers?: Timers;
  canCreate?: boolean;
  deps?: Partial<WriteQueueDeps>;
} = {}) {
  const server = new Map(
    items.map((item) => [`${item.kind}:${item.slug}`, structuredClone(item)]),
  );
  const reads: string[] = [];
  const puts: PutInput[] = [];
  /** Held puts, released in order by `release()`. */
  const gates: (() => void)[] = [];
  const net = {
    hold: false,
    /** Thrown by the next puts, one each, before anything is stored. */
    failures: [] as unknown[],
  };
  const detailOf = (item: Stored): ContentItemDetail =>
    ({
      id: item.id,
      kind: item.kind,
      slug: item.slug,
      status: 'published',
      title: item.slug,
      subtitle: null,
      sortYear: null,
      tags: [],
      derivedFromId: null,
      derivedFromSlug: null,
      updatedAt: new Date(0),
      updatedById: null,
      editState: item.editState ?? null,
      pendingAt: null,
      pendingById: item.pendingById ?? null,
      reviewNote: null,
      body: structuredClone(item.body),
      overrides: null,
      pendingBody: item.pendingBody ? structuredClone(item.pendingBody) : null,
      pendingOverrides: null,
      pendingNote: null,
      reviewedAt: null,
      createdAt: new Date(0),
      Revisions: [],
      ...(item.revision !== undefined ? { revision: item.revision } : {}),
    }) as ContentItemDetail;

  const store = new CellEditStore({
    timers: timers ?? { set: () => 0, clear: () => {} },
  });
  const events: WriteEvent[] = [];
  const refresh = vi.fn();
  const invalidated: string[] = [];
  const who = { ...viewer };
  const queue = new WriteQueue({
    store,
    timers,
    lock: lock?.run,
    viewer: () => who,
    canCreate: () => canCreate,
    read: async ({ kind, slug }) => {
      reads.push(`${kind}:${slug}`);
      const found = server.get(`${kind}:${slug}`);
      return found ? detailOf(found) : null;
    },
    put: async (input): Promise<SaveContentResult> => {
      puts.push(structuredClone(input));
      if (net.hold) await new Promise<void>((go) => gates.push(go));
      if (net.failures.length) throw net.failures.shift();
      const key = `${input.kind}:${input.slug}`;
      const found = server.get(key) ?? {
        id: `db-${input.slug}`,
        kind: input.kind,
        slug: input.slug,
        body: {},
      };
      if (who.editor) {
        found.pendingBody = structuredClone(input.body);
        found.pendingById = who.userId;
        found.editState = 'pending';
      } else found.body = structuredClone(input.body);
      if (found.revision !== undefined) found.revision += 1;
      server.set(key, found);
      return { item: detailOf(found), warnings: [] };
    },
    invalidateItem: (id) => invalidated.push(id),
    refresh,
    ...deps,
  });
  queue.onEvent((event) => events.push(event));

  /** Lets the oldest held write go on, and waits for what follows. */
  const release = async () => {
    await vi.waitFor(() => expect(gates.length).toBeGreaterThan(0));
    gates.shift()!();
    await flush();
  };

  return {
    server,
    reads,
    puts,
    net,
    store,
    events,
    refresh,
    invalidated,
    queue,
    who,
    release,
    body: (key: string) => server.get(key)!.body,
  };
}

/** Lets every settled promise run on. */
const flush = async () => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};

const YEAR = { table: 'songs', rowKey: 'africa', column: 'year' };
const TITLE = { table: 'songs', rowKey: 'africa', column: 'title' };
const TOTO = { table: 'artists', rowKey: 'toto', column: 'name' };

const setYear = (value: unknown, seen: unknown = 1982): CellWrite => ({
  item: { kind: 'song', slug: 'africa', id: 'db-africa', name: 'Africa' },
  ops: [{ op: 'set', path: 'year', value, seen }],
  cells: [{ ...YEAR, paths: ['year'], seen }],
  fields: ['Year'],
  summary: `Year of Africa: ${String(seen)} → ${String(value)}`,
});

const setTitle = (value: string, seen = 'Africa'): CellWrite => ({
  item: { kind: 'song', slug: 'africa', id: 'db-africa', name: 'Africa' },
  ops: [{ op: 'set', path: 'title', value, seen }],
  cells: [{ ...TITLE, paths: ['title'], seen }],
  fields: ['Title'],
  summary: `Title of Africa: ${seen} → ${value}`,
});

const renameToto = (value: string): CellWrite => ({
  item: { kind: 'artist', slug: 'toto', id: 'db-toto', name: 'Toto' },
  ops: [{ op: 'set', path: 'name', value, seen: 'Toto' }],
  cells: [{ ...TOTO, paths: ['name'], seen: 'Toto' }],
  fields: ['Artist Name'],
  summary: `Name of Toto: Toto → ${value}`,
});

/** A `ContentApiError`, as far as the queue reads one. */
const apiError = (status: number, code: string, body: Body = {}) =>
  Object.assign(new Error(`${status} ${code}`), {
    status,
    code,
    body: { code, ...body },
  });

afterEach(() => {
  vi.useRealTimers();
});

describe('one write in flight per item', () => {
  it('holds a second edit of an item until the first is written, but not another item’s', async () => {
    const t = setup();
    t.net.hold = true;
    t.queue.commit(setYear(1983));
    await vi.waitFor(() => expect(t.puts).toHaveLength(1));
    expect(t.store.get(YEAR)?.status).toBe('saving');

    t.queue.commit(setTitle('Africa (Remastered)'));
    t.queue.commit(renameToto('TOTO'));
    await vi.waitFor(() => expect(t.puts).toHaveLength(2));
    // The second write is the other item's; the song's waits its turn.
    expect(t.puts.map((put) => put.slug)).toEqual(['africa', 'toto']);
    expect(t.store.get(TITLE)?.status).toBe('queued');
    expect(t.reads.filter((read) => read === 'song:africa')).toHaveLength(1);

    await t.release();
    await t.release();
    // Only now is the song read again, and written a second time.
    await vi.waitFor(() => expect(t.puts).toHaveLength(3));
    expect(t.reads.filter((read) => read === 'song:africa')).toHaveLength(2);
    expect(t.puts[2].body).toMatchObject({
      year: 1983,
      title: 'Africa (Remastered)',
    });
    await t.release();
    await t.queue.whenIdle();
    expect(t.body('song:africa')).toMatchObject({
      year: 1983,
      title: 'Africa (Remastered)',
    });
    expect(t.body('artist:toto')).toMatchObject({ name: 'TOTO' });
  });

  it('folds the edits made meanwhile into one write, in the order they were made', async () => {
    const t = setup();
    t.net.hold = true;
    t.queue.commit(setYear(1983));
    await vi.waitFor(() => expect(t.puts).toHaveLength(1));
    t.queue.commit(setTitle('Africa!'));
    t.queue.commit(setYear(1984, 1983));
    const last = t.queue.commit(setTitle('Africa (1982)', 'Africa!'));
    // One batch waiting: every later edit joined it, and its cells are its.
    expect(t.store.get(YEAR)?.write).toBe(last);
    expect(t.store.get(TITLE)).toMatchObject({ status: 'queued', write: last });

    await t.release();
    await t.release();
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(2);
    expect(t.puts[1].body).toMatchObject({
      year: 1984,
      title: 'Africa (1982)',
    });
    expect(t.puts[1].note).toBe('Edited in the Table: Title, Year');
    const saved = t.events.filter((event) => event.type === 'saved');
    expect(saved).toHaveLength(2);
    expect(saved[1].type === 'saved' && saved[1].write.summary).toBe(
      'Title of Africa: Africa → Africa!; Year of Africa: 1983 → 1984; Title of Africa: Africa! → Africa (1982)',
    );
    expect(t.store.get(YEAR)).toMatchObject({
      status: 'saved',
      overlay: { year: 1984 },
      written: [{ item: 'song:africa', path: 'year', value: 1984 }],
    });
  });

  it('keeps a cell showing its later edit while an earlier one is still being written', async () => {
    const t = setup();
    t.net.hold = true;
    t.queue.commit(setYear(1983));
    await vi.waitFor(() => expect(t.puts).toHaveLength(1));
    t.queue.commit(setYear(1984, 1983));
    await t.release();
    // The first write has landed; the cell is the second one's, queued.
    expect(t.store.get(YEAR)).toMatchObject({
      status: 'saving',
      overlay: { year: 1984 },
    });
    await t.release();
    await t.queue.whenIdle();
    expect(t.store.get(YEAR)?.overlay).toEqual({ year: 1984 });
  });
});

describe('each write', () => {
  it('reads the item whole just before it, never sends a status, and keeps what the cell never saw', async () => {
    const t = setup();
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.reads).toEqual(['song:africa']);
    expect(t.puts).toHaveLength(1);
    const [put] = t.puts;
    expect(put).not.toHaveProperty('status');
    expect(put.note).toBe('Edited in the Table: Year');
    // Built on the stored body: the chart the lean exports leave out stays.
    expect(put.body.sections).toEqual(AFRICA.sections);
    expect(t.body('song:africa')).toEqual({ ...AFRICA, year: 1983 });
    expect(t.invalidated).toEqual(['db-africa']);
  });

  it('sends nothing when the ops change nothing', async () => {
    const t = setup();
    t.queue.commit(setYear(1982));
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(0);
    expect(t.store.get(YEAR)).toBeUndefined();
    expect(t.events.map((event) => event.type)).toEqual(['unchanged']);
    expect(t.queue.undoable()).toHaveLength(0);
  });

  it('takes a revision note of its own', async () => {
    const t = setup();
    t.queue.commit({ ...setYear(1983), note: 'Linked in the Table: x' });
    await t.queue.whenIdle();
    expect(t.puts[0].note).toBe('Linked in the Table: x');
  });

  it('makes a row only the repo has from its repo copy, create-only', async () => {
    const repoCopy = { slug: 'new-band', name: 'New Band', aliases: [] };
    const t = setup({ canCreate: true });
    t.queue.commit({
      item: {
        kind: 'artist',
        slug: 'new-band',
        name: 'New Band',
        createFrom: repoCopy,
      },
      ops: [{ op: 'set', path: 'activeFrom', value: 1990, seen: undefined }],
      cells: [
        {
          table: 'artists',
          rowKey: 'new-band',
          column: 'years',
          paths: ['activeFrom'],
        },
      ],
      fields: ['Years Active'],
      summary: 'Years Active of New Band: – → 1990–',
    });
    await t.queue.whenIdle();
    expect(t.puts).toEqual([
      expect.objectContaining({
        slug: 'new-band',
        create: true,
        body: { ...repoCopy, activeFrom: 1990 },
      }),
    ]);
  });

  it('refuses to make a row the server cannot make without the risk of overwriting one', async () => {
    const t = setup({ canCreate: false });
    t.queue.commit({
      ...renameToto('X'),
      item: {
        kind: 'artist',
        slug: 'new-band',
        name: 'New Band',
        createFrom: { slug: 'new-band', name: 'New Band' },
      },
    });
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(0);
    expect(t.store.get(TOTO)).toMatchObject({
      status: 'error',
      message: expect.stringMatching(/not in the content API yet/),
    });
  });
});

describe('revisions', () => {
  const withRevision = (): Stored[] => [
    {
      id: 'db-africa',
      kind: 'song',
      slug: 'africa',
      body: AFRICA,
      revision: 7,
    },
  ];

  it('sends the item’s revision, and on REVISION_CONFLICT reads it again and tries once more', async () => {
    const t = setup({ items: withRevision() });
    // Someone else's save lands between our read and our write.
    t.net.failures.push(apiError(409, 'REVISION_CONFLICT', { revision: 8 }));
    const put = t.queue.commit(setYear(1983));
    expect(put).not.toBeNull();
    const stored = t.server.get('song:africa')!;
    stored.body = { ...stored.body, popularity: 77 };
    stored.revision = 8;
    await t.queue.whenIdle();
    expect(t.puts.map((sent) => sent.expectedRevision)).toEqual([7, 8]);
    expect(t.reads).toHaveLength(2);
    // Theirs kept, ours laid on.
    expect(t.body('song:africa')).toMatchObject({
      year: 1983,
      popularity: 77,
    });
    expect(t.store.get(YEAR)?.status).toBe('saved');
  });

  it('gives up after the one retry, and keeps the write for Retry', async () => {
    const t = setup({ items: withRevision() });
    t.net.failures.push(
      apiError(409, 'REVISION_CONFLICT'),
      apiError(409, 'REVISION_CONFLICT'),
    );
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(2);
    const state = t.store.get(YEAR)!;
    expect(state.status).toBe('error');
    expect(t.queue.hasUnsaved()).toBe(true);

    expect(t.queue.retry(state.write!)).toBe(true);
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(3);
    expect(t.body('song:africa').year).toBe(1983);
    expect(t.queue.hasUnsaved()).toBe(false);
  });

  it('sends no revision to a server that gives none', async () => {
    const t = setup();
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.puts[0]).not.toHaveProperty('expectedRevision');
  });
});

describe('failures', () => {
  it('keeps a failed write for Retry, and a Discard lets it go', async () => {
    const t = setup();
    t.net.failures.push(new Error('Failed to fetch'));
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    const state = t.store.get(YEAR)!;
    expect(state).toMatchObject({
      status: 'error',
      message: 'Failed to fetch',
      overlay: { year: 1983 },
    });
    expect(t.queue.hasUnsaved()).toBe(true);
    const failed = t.events.find((event) => event.type === 'failed');
    expect(failed?.type === 'failed' && failed.failed.kind).toBe('error');

    t.queue.retry(state.write!);
    await t.queue.whenIdle();
    expect(t.body('song:africa').year).toBe(1983);
    expect(t.store.get(YEAR)?.status).toBe('saved');

    t.net.failures.push(new Error('Failed to fetch'));
    t.queue.commit(setTitle('Nope'));
    await t.queue.whenIdle();
    expect(t.queue.discard(t.store.get(TITLE)!.write!)).toBe(true);
    expect(t.store.get(TITLE)).toBeUndefined();
    expect(t.queue.hasUnsaved()).toBe(false);
    expect(t.body('song:africa').title).toBe('Africa');
  });

  it('puts a refused save’s problems on the cells whose paths they name', async () => {
    const t = setup();
    t.net.failures.push(
      apiError(422, 'VALIDATION_FAILED', {
        error: 'Invalid song body',
        problems: [
          {
            code: 'INVALID_BODY',
            slug: 'africa',
            detail: 'year: Expected a number between 1000 and 2100.',
            path: 'year',
          },
          {
            code: 'INVALID_REFERENCE',
            slug: 'africa',
            detail: 'Only a warning.',
            path: 'title',
            severity: 'warning',
          },
        ],
      }),
    );
    t.queue.commit({
      ...setYear(99_999),
      ops: [...setYear(99_999).ops, ...setTitle('Africa?').ops],
      cells: [...setYear(99_999).cells, ...setTitle('Africa?').cells],
    });
    await t.queue.whenIdle();
    expect(t.store.get(YEAR)?.message).toBe(
      'year: Expected a number between 1000 and 2100.',
    );
    expect(t.store.get(TITLE)?.message).toBe('422 VALIDATION_FAILED');
  });

  it('lets a new edit of a failed cell stand in for the failed one', async () => {
    const t = setup();
    t.net.failures.push(new Error('offline'));
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.queue.hasUnsaved()).toBe(true);
    t.queue.commit(setYear(1984));
    await t.queue.whenIdle();
    expect(t.queue.hasUnsaved()).toBe(false);
    expect(t.body('song:africa').year).toBe(1984);
  });
});

describe('proposals', () => {
  it('stops an editor’s write while another editor’s proposal is on the item', async () => {
    const t = setup({
      viewer: EDITOR,
      items: [
        {
          id: 'db-africa',
          kind: 'song',
          slug: 'africa',
          body: AFRICA,
          // Hidden from an editor: only that someone has one.
          pendingBody: null,
          pendingById: 'ed-2',
          editState: 'pending',
        },
      ],
    });
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(0);
    expect(t.store.get(YEAR)).toMatchObject({
      status: 'error',
      blocked: true,
      message: expect.stringMatching(/Another editor’s proposal is waiting/),
    });
  });

  it('stops an admin’s write while a proposal waits for review', async () => {
    const t = setup({
      items: [
        {
          id: 'db-africa',
          kind: 'song',
          slug: 'africa',
          body: AFRICA,
          pendingBody: { ...AFRICA, year: 1999 },
          pendingById: 'ed-2',
          editState: 'pending',
        },
      ],
    });
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(0);
    expect(t.store.get(YEAR)).toMatchObject({
      status: 'error',
      blocked: true,
      message: expect.stringMatching(/Review the pending proposal on Africa/),
    });
  });

  it('builds an editor’s write on their own proposal, and shows it as proposed', async () => {
    const t = setup({
      viewer: EDITOR,
      items: [
        {
          id: 'db-africa',
          kind: 'song',
          slug: 'africa',
          body: AFRICA,
          pendingBody: { ...AFRICA, popularity: 90 },
          pendingById: 'ed-1',
          editState: 'pending',
        },
      ],
    });
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.puts[0].body).toMatchObject({ year: 1983, popularity: 90 });
    expect(t.server.get('song:africa')!.pendingBody).toMatchObject({
      year: 1983,
      popularity: 90,
    });
    expect(t.body('song:africa')).toEqual(AFRICA);
    expect(t.store.get(YEAR)?.status).toBe('proposed');
    const saved = t.events.find((event) => event.type === 'saved');
    expect(saved?.type === 'saved' && saved.proposed).toBe(true);
  });
});

describe('the item lock', () => {
  it('waits while the row panel’s save holds the item, then reads what it wrote', async () => {
    const locks = new ItemLocks();
    const t = setup({ lock: locks });
    let finishSave = () => {};
    const panelSave = locks.run('song:africa', async () => {
      await new Promise<void>((go) => {
        finishSave = go;
      });
      // The panel's write lands while it holds the lock.
      const stored = t.server.get('song:africa')!;
      stored.body = { ...stored.body, title: 'Africa (panel)' };
    });
    t.queue.commit(setYear(1983));
    await flush();
    expect(t.reads).toHaveLength(0);
    expect(t.store.get(YEAR)?.status).toBe('saving');

    finishSave();
    await panelSave;
    await t.queue.whenIdle();
    expect(t.reads).toEqual(['song:africa']);
    expect(t.body('song:africa')).toMatchObject({
      year: 1983,
      title: 'Africa (panel)',
    });
  });

  it('holds the panel’s save while a cell writes, for the same item only', async () => {
    const locks = new ItemLocks();
    const t = setup({ lock: locks });
    t.net.hold = true;
    t.queue.commit(setYear(1983));
    await vi.waitFor(() => expect(t.puts).toHaveLength(1));
    const order: string[] = [];
    const panel = locks.run('song:africa', async () => order.push('panel'));
    const other = locks.run('artist:toto', async () => order.push('other'));
    await other;
    expect(order).toEqual(['other']);
    await t.release();
    await panel;
    expect(order).toEqual(['other', 'panel']);
  });
});

describe('refreshing', () => {
  it('refreshes once, when every item’s queue has been idle for 300 ms', async () => {
    vi.useFakeTimers();
    const t = setup({
      timers: {
        set: (run, ms) => setTimeout(run, ms),
        clear: (handle) => clearTimeout(handle as never),
      },
    });
    t.queue.commit(setYear(1983));
    t.queue.commit(renameToto('TOTO'));
    await vi.advanceTimersByTimeAsync(0);
    await t.queue.whenIdle();
    expect(t.invalidated.sort()).toEqual(['db-africa', 'db-toto']);
    await vi.advanceTimersByTimeAsync(299);
    expect(t.refresh).not.toHaveBeenCalled();

    // Another edit before the quiet: the wait starts again after it.
    t.queue.commit(setTitle('Africa!'));
    await vi.advanceTimersByTimeAsync(0);
    await t.queue.whenIdle();
    await vi.advanceTimersByTimeAsync(299);
    expect(t.refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(t.refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(t.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when nothing was written', async () => {
    vi.useFakeTimers();
    const t = setup({
      timers: {
        set: (run, ms) => setTimeout(run, ms),
        clear: (handle) => clearTimeout(handle as never),
      },
    });
    t.queue.commit(setYear(1982));
    await vi.advanceTimersByTimeAsync(0);
    await t.queue.whenIdle();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(t.refresh).not.toHaveBeenCalled();
  });

  it('logs each save against its suggestions, and a log that fails does not fail the save', async () => {
    const log = vi.fn().mockRejectedValue(new Error('decisions down'));
    const t = setup({ deps: { log } });
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(log).toHaveBeenCalledWith({
      kind: 'song',
      slug: 'africa',
      before: AFRICA,
      after: { ...AFRICA, year: 1983 },
    });
    expect(t.store.get(YEAR)?.status).toBe('saved');
    expect(t.events.map((event) => event.type)).toEqual(['saved']);
  });
});

describe('undo', () => {
  it('undoes a saved write with a write that puts back what it changed, and redoes it', async () => {
    const t = setup();
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    const saved = t.events[0];
    expect(saved.type === 'saved' && saved.entry?.ops).toEqual([
      { op: 'set', path: 'year', value: 1982, seen: 1983 },
    ]);
    expect(t.queue.undo()).toBe(true);
    await t.queue.whenIdle();
    expect(t.body('song:africa').year).toBe(1982);
    expect(t.puts[1].note).toBe('Undone in the Table: Year');
    expect(t.queue.undoable()).toHaveLength(0);
    expect(t.queue.redoable()).toHaveLength(1);

    expect(t.queue.redo()).toBe(true);
    await t.queue.whenIdle();
    expect(t.body('song:africa').year).toBe(1983);
    expect(t.queue.undoable()).toHaveLength(1);
    // A new edit forgets what could be redone.
    t.queue.commit(setTitle('Africa!'));
    await t.queue.whenIdle();
    expect(t.queue.redoable()).toHaveLength(0);
    expect(t.queue.undoable()).toHaveLength(2);
  });

  it('refuses an undo over a value someone changed since: “Changed since; not undone”', async () => {
    const t = setup();
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    t.server.get('song:africa')!.body.year = 1990;
    t.queue.undo();
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(1);
    expect(t.body('song:africa').year).toBe(1990);
    const refused = t.events.find((event) => event.type === 'not-undone');
    expect(refused?.type === 'not-undone' && refused.message).toBe(NOT_UNDONE);
    expect(t.store.get(YEAR)).toBeUndefined();
    expect(t.queue.hasUnsaved()).toBe(false);
  });

  it('undoes one entry from its toast, wherever it is, and keeps at most fifty', async () => {
    const t = setup({ deps: { undoLimit: 2 } });
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    t.queue.commit(setTitle('Africa!'));
    await t.queue.whenIdle();
    t.queue.commit(renameToto('TOTO'));
    await t.queue.whenIdle();
    expect(t.queue.undoable().map((entry) => entry.fields[0])).toEqual([
      'Title',
      'Artist Name',
    ]);
    const title = t.queue.undoable()[0];
    expect(t.queue.undoEntry(title.id)).toBe(true);
    await t.queue.whenIdle();
    expect(t.body('song:africa')).toMatchObject({
      title: 'Africa',
      year: 1983,
    });
    expect(t.body('artist:toto').name).toBe('TOTO');
    expect(t.queue.undoEntry(title.id)).toBe(false);
  });

  it('undoes only what was put in a list, keeping what others added since', async () => {
    const t = setup({
      items: [
        {
          id: 'db-toto',
          kind: 'artist',
          slug: 'toto',
          body: { slug: 'toto', name: 'Toto', genreIds: ['rock'] },
        },
      ],
    });
    const add: CellOp = { op: 'add', path: 'genreIds[]', id: 'pop' };
    t.queue.commit({
      item: { kind: 'artist', slug: 'toto', id: 'db-toto', name: 'Toto' },
      ops: [add],
      cells: [
        {
          table: 'artists',
          rowKey: 'toto',
          column: 'genres',
          paths: ['genreIds[]'],
        },
      ],
      fields: ['Genres'],
      summary: 'Genres of Toto: + Pop',
    });
    await t.queue.whenIdle();
    t.server.get('artist:toto')!.body.genreIds = ['rock', 'pop', 'soft-rock'];
    t.queue.undo();
    await t.queue.whenIdle();
    expect(t.body('artist:toto').genreIds).toEqual(['rock', 'soft-rock']);
  });
});

describe('conflicts', () => {
  it('asks when the value changed since the author saw it: Use mine writes over theirs', async () => {
    const t = setup();
    t.server.get('song:africa')!.body.year = 1985;
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(0);
    const state = t.store.get(YEAR)!;
    expect(state).toMatchObject({
      status: 'conflict',
      conflicts: [
        { index: 0, path: 'year', seen: 1982, now: 1985, mine: 1983 },
      ],
    });
    expect(t.queue.hasUnsaved()).toBe(true);

    expect(t.queue.writeMine(state.write!)).toBe(true);
    await t.queue.whenIdle();
    expect(t.body('song:africa').year).toBe(1983);
    expect(t.queue.hasUnsaved()).toBe(false);
  });

  it('still catches a change made after the author chose Use mine', async () => {
    const t = setup();
    t.server.get('song:africa')!.body.year = 1985;
    t.queue.commit(setYear(1983));
    await t.queue.whenIdle();
    t.server.get('song:africa')!.body.year = 1986;
    t.queue.writeMine(t.store.get(YEAR)!.write!);
    await t.queue.whenIdle();
    expect(t.puts).toHaveLength(0);
    expect(t.store.get(YEAR)?.conflicts?.[0]).toMatchObject({
      seen: 1985,
      now: 1986,
    });
  });

  it('Keep theirs drops the edit and refreshes the rows', async () => {
    vi.useFakeTimers();
    const t = setup({
      timers: {
        set: (run, ms) => setTimeout(run, ms),
        clear: (handle) => clearTimeout(handle as never),
      },
    });
    t.server.get('song:africa')!.body.year = 1985;
    t.queue.commit(setYear(1983));
    await vi.advanceTimersByTimeAsync(0);
    await t.queue.whenIdle();
    expect(t.queue.keepTheirs(t.store.get(YEAR)!.write!)).toBe(true);
    expect(t.store.get(YEAR)).toBeUndefined();
    expect(t.queue.hasUnsaved()).toBe(false);
    await vi.advanceTimersByTimeAsync(300);
    expect(t.refresh).toHaveBeenCalledTimes(1);
    expect(t.body('song:africa').year).toBe(1985);
  });
});

describe('the row panel’s draft', () => {
  const draftOf = (dirty: boolean, body: Body | null) => {
    const state = { dirty, body };
    const applied: Body[] = [];
    return {
      state,
      applied,
      draft: {
        dirty: () => state.dirty,
        body: () => state.body,
        applyBody: (next: Body) => {
          applied.push(next);
          state.body = next;
          state.dirty = true;
        },
      },
    };
  };

  it('takes a cell’s edit into a panel with unsaved changes, for its Save to send', async () => {
    const t = setup();
    const panel = draftOf(true, { ...AFRICA, title: 'Africa (draft)' });
    t.queue.registerDraft('song:africa', panel.draft);
    expect(t.queue.commit(setYear(1983))).toBeNull();
    await flush();
    expect(t.puts).toHaveLength(0);
    expect(panel.applied).toEqual([
      { ...AFRICA, title: 'Africa (draft)', year: 1983 },
    ]);
    expect(t.store.get(YEAR)).toMatchObject({
      status: 'in-panel',
      message: IN_PANEL_MESSAGE,
      overlay: { year: 1983 },
    });
    expect(t.queue.hasUnsaved()).toBe(false);

    // Saved from the panel: its body still holds the year.
    panel.state.dirty = false;
    t.queue.draftChanged('song:africa');
    expect(t.store.get(YEAR)?.status).toBe('saved');
  });

  it('lets the cell go when the panel’s changes are discarded', async () => {
    const t = setup();
    const panel = draftOf(true, { ...AFRICA, title: 'Africa (draft)' });
    t.queue.registerDraft('song:africa', panel.draft);
    t.queue.commit(setYear(1983));
    panel.state.dirty = false;
    panel.state.body = AFRICA;
    t.queue.draftChanged('song:africa');
    expect(t.store.get(YEAR)).toBeUndefined();
  });

  it('refuses a cell’s edit to a value the panel’s draft changed too', async () => {
    const t = setup();
    const panel = draftOf(true, { ...AFRICA, year: 1999 });
    t.queue.registerDraft('song:africa', panel.draft);
    t.queue.commit(setYear(1983));
    expect(panel.applied).toHaveLength(0);
    expect(t.store.get(YEAR)).toMatchObject({
      status: 'error',
      message: PANEL_CONFLICT_MESSAGE,
    });
    // Closing the panel lets the cell go.
    t.queue.registerDraft('song:africa', panel.draft)();
    expect(t.store.get(YEAR)).toBeUndefined();
  });

  it('leaves a cell alone that was written through the queue since the panel took it', async () => {
    const t = setup();
    const panel = draftOf(true, { ...AFRICA, title: 'Africa (draft)' });
    t.queue.registerDraft('song:africa', panel.draft);
    t.queue.commit(setYear(1983));
    // Discarded, and the cell edited again before the panel says so.
    panel.state.dirty = false;
    panel.state.body = AFRICA;
    t.queue.commit(setYear(1984));
    await t.queue.whenIdle();
    t.queue.draftChanged('song:africa');
    expect(t.store.get(YEAR)).toMatchObject({
      status: 'saved',
      overlay: { year: 1984 },
    });
    expect(t.body('song:africa').year).toBe(1984);
  });

  it('writes straight away past a panel with nothing unsaved', async () => {
    const t = setup();
    const panel = draftOf(false, AFRICA);
    t.queue.registerDraft('song:africa', panel.draft);
    expect(t.queue.commit(setYear(1983))).not.toBeNull();
    await t.queue.whenIdle();
    expect(panel.applied).toHaveLength(0);
    expect(t.body('song:africa').year).toBe(1983);
  });
});

describe('the unsaved-changes guard', () => {
  it('is up while a write is queued or in flight, and down once it lands', async () => {
    const t = setup();
    const seen: boolean[] = [];
    t.queue.subscribe(() => seen.push(t.queue.hasUnsaved()));
    t.net.hold = true;
    t.queue.commit(setYear(1983));
    expect(t.queue.hasUnsaved()).toBe(true);
    await t.release();
    await t.queue.whenIdle();
    expect(t.queue.hasUnsaved()).toBe(false);
    expect(seen[0]).toBe(true);
    expect(seen[seen.length - 1]).toBe(false);
  });
});

beforeEach(() => {
  vi.useRealTimers();
});
