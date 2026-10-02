import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createContentMockServer,
  type ContentMockServer,
  type MockViewer,
} from '@/features/admin/content/mock/contentMockServer';
import {
  ContentApiError,
  type ContentItemDetail,
  unwrapSaveResponse,
} from '@/hooks/data/admin/useAdminContent';
import { CellEditStore } from '../cellEditStore';
import { ItemLocks } from '../itemLock';
import {
  type CellWrite,
  NOT_UNDONE,
  type PutInput,
  sentBackMessage,
  type WriteEvent,
  WriteQueue,
} from '../writeQueue';

/**
 * The write queue against the offline mock's own server, where what the
 * server holds afterwards is the test, in the ways a cell's write could
 * otherwise lose or invent a value:
 *
 *  - edits to other cells folded into one write with a cell whose value
 *    changed since are written; only that cell waits, and Keep theirs
 *    drops only it;
 *  - a cell edited again after its write failed leaves that write with its
 *    ops, so a Retry from the write's other cells never sends the value it
 *    replaced;
 *  - a pin (`[lat, lng]`) moved since is a conflict, and an undo over it is
 *    not undone — never a pin nobody set, or three numbers;
 *  - an editor's own proposal that was sent back is not resubmitted by a
 *    cell edit.
 *
 * A read can be held before it reaches the server (`holdNextRead`), so a
 * change someone else makes meanwhile is what the next write reads.
 */

const ADMIN: MockViewer = { role: 'admin', userId: 'admin-1', name: 'Ada' };
const EDITOR: MockViewer = { role: 'editor', userId: 'ed-1', name: 'Eddie' };

const CITY = {
  id: 'testville',
  name: 'Testville',
  country: 'USA',
  subdivision: 'MI',
  region: 'north-america',
  coordinates: [42.33, -83.05] as [number, number],
  genres: [],
  description: '',
  activeDecades: [],
};

let server: ContentMockServer;
let AFRICA: Record<string, unknown>;
let clock = 0;
let puts: PutInput[] = [];
/** The index of a put that fails as if the network had gone. */
let failPut = -1;
let gate: Promise<void> | null = null;
let openGate: () => void = () => {};

beforeEach(async () => {
  const { africa } = await import('@/curriculum/data/songs/africa');
  AFRICA = JSON.parse(JSON.stringify(africa));
  puts = [];
  failPut = -1;
  gate = null;
  server = createContentMockServer({
    seed: {
      items: [
        { kind: 'song', slug: 'africa', body: AFRICA },
        { kind: 'globe_city', slug: 'testville', body: CITY },
      ],
    },
    mode: 'all',
    now: () => new Date(Date.UTC(2026, 9, 1) + (clock += 1000)),
  });
});

const queues: WriteQueue[] = [];
afterEach(() => {
  for (const queue of queues.splice(0)) queue.dispose();
});

const idOf = (kind: string, slug: string): string =>
  (
    server.handle({
      method: 'GET',
      path: '/items/lookup',
      query: { kind, slug },
      viewer: ADMIN,
    }).body as { id: string }
  ).id;

const stored = (kind: string, slug: string): ContentItemDetail =>
  server.handle({
    method: 'GET',
    path: `/items/${idOf(kind, slug)}`,
    query: {},
    viewer: ADMIN,
  }).body as ContentItemDetail;

/** Someone else's save. */
const saveAs = (
  viewer: MockViewer,
  kind: string,
  slug: string,
  edit: (body: Record<string, unknown>) => Record<string, unknown>,
) => {
  const response = server.handle({
    method: 'PUT',
    path: '/items',
    query: {},
    body: { kind, slug, body: edit(stored(kind, slug).body) },
    viewer,
  });
  if (response.status !== 200)
    throw new Error(`setup save failed: ${JSON.stringify(response.body)}`);
};

/** The next read waits, before it reaches the server, until `openGate`. */
const holdNextRead = () => {
  gate = new Promise<void>((go) => {
    openGate = go;
  });
};

function makeQueue(viewer: MockViewer = ADMIN) {
  const events: WriteEvent[] = [];
  const queue = new WriteQueue({
    store: new CellEditStore(),
    lock: new ItemLocks().run,
    read: async (item) => {
      if (gate) {
        const held = gate;
        gate = null;
        await held;
      }
      const response = server.handle({
        method: 'GET',
        path: `/items/${item.id ?? idOf(item.kind, item.slug)}`,
        query: {},
        viewer,
      });
      return response.status === 404
        ? null
        : (structuredClone(response.body) as ContentItemDetail);
    },
    put: async (input) => {
      const at = puts.length;
      puts.push(structuredClone(input));
      if (at === failPut) throw new Error('Network down');
      const response = server.handle({
        method: 'PUT',
        path: '/items',
        query: {},
        body: structuredClone(input),
        viewer,
      });
      if (response.status !== 200)
        throw new ContentApiError(response.status, response.body as never);
      return unwrapSaveResponse(structuredClone(response.body));
    },
    viewer: () => ({
      editor: viewer.role === 'editor',
      userId: viewer.userId,
    }),
    canCreate: () => true,
    idleMs: 1,
  });
  queue.onEvent((event) => events.push(event));
  queues.push(queue);
  return { queue, events };
}

/** A song cell's write, as the grid makes it: the cell says its own line. */
const songSet = (
  column: string,
  label: string,
  value: unknown,
  seen: unknown,
): CellWrite => {
  const summary = `${label} of Africa: ${String(seen)} → ${String(value)}`;
  return {
    item: {
      kind: 'song',
      slug: 'africa',
      id: idOf('song', 'africa'),
      name: 'Africa',
    },
    ops: [{ op: 'set', path: column, value, seen }],
    cells: [
      {
        table: 'songs',
        rowKey: 'africa',
        column,
        paths: [column],
        seen: { [column]: seen },
        field: label,
        summary,
      },
    ],
    fields: [label],
    summary,
  };
};

const PIN = { table: 'locations', rowKey: 'testville', column: 'coordinates' };

const pinSet = (
  value: [number, number],
  seen: [number, number],
): CellWrite => ({
  item: {
    kind: 'globe_city',
    slug: 'testville',
    id: idOf('globe_city', 'testville'),
    name: 'Testville',
  },
  ops: [{ op: 'set', path: 'coordinates', value, seen }],
  cells: [{ ...PIN, paths: ['coordinates'], seen: { coordinates: seen } }],
  fields: ['Coordinates'],
  summary: 'Coordinates of Testville',
});

const cell = (column: string) => ({ table: 'songs', rowKey: 'africa', column });

/**
 * A popularity write in flight (its read held), and a Year and a Title
 * edited meanwhile, folded into one waiting write.
 */
const foldYearAndTitle = (queue: WriteQueue) => {
  holdNextRead();
  queue.commit(songSet('popularity', 'Popularity', 61, AFRICA.popularity));
  queue.commit(songSet('year', 'Year', 1983, 1982));
  queue.commit(songSet('title', 'Title', 'Africa (x)', 'Africa'));
};

describe('a folded write with one cell that conflicts', () => {
  it('writes the other cells and holds only that one; Keep theirs drops only it', async () => {
    const { queue, events } = makeQueue();
    foldYearAndTitle(queue);
    // Someone else sets the year while the first write is in flight.
    saveAs(ADMIN, 'song', 'africa', (body) => ({ ...body, year: 1990 }));
    openGate();
    await queue.whenIdle();

    // The title is written, on its own, with its own note and toast.
    expect(stored('song', 'africa').body).toMatchObject({
      year: 1990,
      title: 'Africa (x)',
      popularity: 61,
    });
    expect(puts.at(-1)?.note).toBe('Edited in the Table: Title');
    expect(queue.store.get(cell('title'))?.status).toBe('saved');
    const saved = events.filter((event) => event.type === 'saved');
    expect(saved.at(-1)?.type === 'saved' && saved.at(-1)?.write.summary).toBe(
      'Title of Africa: Africa → Africa (x)',
    );
    // Only the year waits, saying so of the year alone.
    const year = queue.store.get(cell('year'));
    expect(year).toMatchObject({
      status: 'conflict',
      message: 'Changed since you looked (year): use yours, or keep theirs.',
    });
    const failed = queue.failure(year!.write!);
    expect(failed?.write.cells.map((target) => target.column)).toEqual([
      'year',
    ]);
    expect(failed?.write.ops).toEqual([
      { op: 'set', path: 'year', value: 1983, seen: 1982 },
    ]);
    expect(failed?.write.summary).toBe('Year of Africa: 1982 → 1983');
    expect(failed?.conflicts).toEqual([
      { index: 0, path: 'year', seen: 1982, now: 1990, mine: 1983 },
    ]);

    // Keep theirs: the year stays theirs, the title stays written.
    expect(queue.keepTheirs(year!.write!)).toBe(true);
    await queue.whenIdle();
    expect(stored('song', 'africa').body).toMatchObject({
      year: 1990,
      title: 'Africa (x)',
    });
    expect(queue.store.get(cell('year'))).toBeUndefined();
    expect(queue.store.get(cell('title'))?.status).toBe('saved');
    expect(queue.hasUnsaved()).toBe(false);
  });

  it('lets Use mine write the held cell over theirs, and undoes the written part on its own', async () => {
    const { queue } = makeQueue();
    foldYearAndTitle(queue);
    saveAs(ADMIN, 'song', 'africa', (body) => ({ ...body, year: 1990 }));
    openGate();
    await queue.whenIdle();
    const year = queue.store.get(cell('year'))!;
    expect(queue.writeMine(year.write!)).toBe(true);
    await queue.whenIdle();
    expect(stored('song', 'africa').body).toMatchObject({
      year: 1983,
      title: 'Africa (x)',
    });
    // The newest undo is the year's; the one before it, the title's alone.
    expect(queue.undoable().map((entry) => entry.fields)).toEqual([
      ['Popularity'],
      ['Title'],
      ['Year'],
    ]);
  });
});

describe('a cell edited again after its write failed', () => {
  it('leaves the failed write with its ops, so Retry sends only the rest', async () => {
    const { queue } = makeQueue();
    failPut = 1; // the folded write's put (the popularity's is the first)
    foldYearAndTitle(queue);
    openGate();
    await queue.whenIdle();
    const title = queue.store.get(cell('title'))!;
    expect(title.status).toBe('error');
    expect(queue.failure(title.write!)?.write.ops).toHaveLength(2);

    // The author puts the year back in its cell, from what it shows.
    const shown = queue.store.get(cell('year'))?.overlay?.year;
    expect(shown).toBe(1983);
    queue.commit(songSet('year', 'Year', 1982, shown));
    await queue.whenIdle();
    expect(stored('song', 'africa').body.year).toBe(1982);

    const failed = queue.failure(title.write!)!;
    expect(failed.write.cells.map((target) => target.column)).toEqual([
      'title',
    ]);
    expect(failed.write.ops).toEqual([
      { op: 'set', path: 'title', value: 'Africa (x)', seen: 'Africa' },
    ]);
    expect(failed.write.summary).toBe('Title of Africa: Africa → Africa (x)');
    expect(failed.write.fields).toEqual(['Title']);

    queue.retry(title.write!);
    await queue.whenIdle();
    expect(stored('song', 'africa').body).toMatchObject({
      year: 1982,
      title: 'Africa (x)',
    });
    expect(puts.at(-1)?.note).toBe('Edited in the Table: Title');
  });

  it('keeps a conflicting write’s other cells saying only what is still theirs', async () => {
    const { queue } = makeQueue();
    foldYearAndTitle(queue);
    // Both changed under the author: the folded write cannot be split.
    saveAs(ADMIN, 'song', 'africa', (body) => ({
      ...body,
      year: 1990,
      title: 'Africa (Live)',
    }));
    openGate();
    await queue.whenIdle();
    const title = queue.store.get(cell('title'))!;
    expect(title.message).toBe(
      'Changed since you looked (year, title): use yours, or keep theirs.',
    );
    queue.commit(songSet('year', 'Year', 1991, 1990));
    await queue.whenIdle();
    expect(stored('song', 'africa').body.year).toBe(1991);
    expect(queue.store.get(cell('title'))?.message).toBe(
      'Changed since you looked (title): use yours, or keep theirs.',
    );
    expect(queue.failure(title.write!)?.conflicts).toEqual([
      {
        index: 0,
        path: 'title',
        seen: 'Africa',
        now: 'Africa (Live)',
        mine: 'Africa (x)',
      },
    ]);
  });
});

describe('a pin', () => {
  it('moved since is a conflict, not merged into one nobody set', async () => {
    const { queue } = makeQueue();
    saveAs(ADMIN, 'globe_city', 'testville', (body) => ({
      ...body,
      coordinates: [42.4, -83.05],
    }));
    queue.commit(pinSet([42.33, -83.2], [42.33, -83.05]));
    await queue.whenIdle();
    expect(queue.store.get(PIN)?.status).toBe('conflict');
    expect(stored('globe_city', 'testville').body.coordinates).toEqual([
      42.4, -83.05,
    ]);
    expect(puts).toHaveLength(0);
  });

  it('is not undone once someone moved it since, however it moved', async () => {
    for (const moved of [
      [42.6, -83.5],
      [42.6, -83.05],
    ] as [number, number][]) {
      puts = [];
      const { queue, events } = makeQueue();
      saveAs(ADMIN, 'globe_city', 'testville', (body) => ({
        ...body,
        coordinates: [42.33, -83.05],
      }));
      queue.commit(pinSet([42.33, -83.5], [42.33, -83.05]));
      await queue.whenIdle();
      expect(stored('globe_city', 'testville').body.coordinates).toEqual([
        42.33, -83.5,
      ]);
      saveAs(ADMIN, 'globe_city', 'testville', (body) => ({
        ...body,
        coordinates: moved,
      }));
      expect(queue.undo()).toBe(true);
      await queue.whenIdle();
      expect(events.map((event) => event.type)).toEqual([
        'saved',
        'not-undone',
      ]);
      const refused = events[1];
      expect(refused.type === 'not-undone' && refused.message).toBe(NOT_UNDONE);
      expect(stored('globe_city', 'testville').body.coordinates).toEqual(moved);
      expect(puts).toHaveLength(1);
    }
  });
});

describe('an editor’s own proposal that was sent back', () => {
  it('is not resubmitted by a cell edit: the write stops, saying why', async () => {
    saveAs(EDITOR, 'song', 'africa', (body) => ({ ...body, year: 1999 }));
    const sent = server.handle({
      method: 'POST',
      path: `/items/${idOf('song', 'africa')}/reject`,
      query: {},
      body: { note: 'The year is wrong' },
      viewer: ADMIN,
    });
    expect(sent.status).toBe(200);
    expect(stored('song', 'africa').editState).toBe('rejected');

    const { queue, events } = makeQueue(EDITOR);
    queue.commit(songSet('popularity', 'Popularity', 61, AFRICA.popularity));
    await queue.whenIdle();
    expect(puts).toHaveLength(0);
    const after = stored('song', 'africa');
    expect(after.editState).toBe('rejected');
    expect(after.pendingBody?.year).toBe(1999);
    expect(after.pendingBody?.popularity).toBe(AFRICA.popularity);
    expect(queue.store.get(cell('popularity'))).toMatchObject({
      status: 'error',
      blocked: true,
      message: sentBackMessage('Africa'),
    });
    expect(events.map((event) => event.type)).toEqual(['failed']);
  });
});

describe('what still goes through', () => {
  it('lands three quick edits of one cell as the last, the chart kept', async () => {
    const { queue } = makeQueue();
    holdNextRead();
    queue.commit(songSet('year', 'Year', 1983, 1982));
    queue.commit(songSet('year', 'Year', 1984, 1983));
    queue.commit(songSet('year', 'Year', 1985, 1984));
    openGate();
    await queue.whenIdle();
    expect(stored('song', 'africa').body.year).toBe(1985);
    expect(stored('song', 'africa').body.sections).toEqual(AFRICA.sections);
  });

  it('writes a folded title when the year was put back where it started', async () => {
    const { queue } = makeQueue();
    foldYearAndTitle(queue);
    queue.commit(songSet('year', 'Year', 1982, 1983));
    openGate();
    await queue.whenIdle();
    expect(stored('song', 'africa').body).toMatchObject({
      year: 1982,
      title: 'Africa (x)',
    });
    expect(puts.at(-1)?.body).toMatchObject({ year: 1982 });
  });
});
