import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertNoteIds,
  ensureProjectNoteIds,
  isNoteId,
  legacyNoteId,
  mintNoteId,
  mintNoteIds,
  noteIdFromCid,
  watchNoteIds,
  withNoteIds,
} from '../noteIds';

// ── Stable note ids ────────────────────────────────────────────────────────
// Every stored note carries a short id: minted when the note is made, derived
// (the same every time) when a note arrives without one. The normalisers
// return the very same array when nothing needs fixing, because collab diffs,
// undo and the engine all compare by reference.

const SHAPE = /^[A-Za-z0-9_-]{12}$/;

interface Note {
  id?: string;
  note: number;
  velocity: number;
  startTick: number;
  durationTicks: number;
  channel: number;
}

const note = (startTick: number, pitch: number, id?: string): Note => ({
  ...(id === undefined ? {} : { id }),
  note: pitch,
  velocity: 100,
  startTick,
  durationTicks: 240,
  channel: 0,
});

const project = (...clips: Array<{ id: string; events: Note[] }>[]) =>
  clips.map((midiClips, t) => ({ id: `t${t}`, midiClips }));

describe('minting', () => {
  it('makes 12 base64url characters, never a separator', () => {
    for (let i = 0; i < 2000; i++) {
      const id = mintNoteId();
      expect(id).toMatch(SHAPE);
      expect(id).not.toMatch(/[:|]/);
      // A minted id never starts the way a derived one does.
      expect(id[0]).toMatch(/[A-Za-z0-9]/);
    }
  });

  it('never repeats', () => {
    const ids = mintNoteIds(20000);
    expect(ids).toHaveLength(20000);
    expect(new Set(ids).size).toBe(20000);
    for (const id of ids.slice(0, 500)) expect(isNoteId(id)).toBe(true);
  });

  it('mints past one getRandomValues call, and none for zero', () => {
    // 65,536 bytes is 5,461 ids; this needs two calls.
    const ids = mintNoteIds(5462);
    expect(ids.every(isNoteId)).toBe(true);
    expect(new Set(ids).size).toBe(5462);
    expect(mintNoteIds(0)).toEqual([]);
  });
});

describe('isNoteId', () => {
  it('takes either shape and nothing else', () => {
    expect(isNoteId(mintNoteId())).toBe(true);
    expect(isNoteId(legacyNoteId('clip', 3))).toBe(true);
    expect(isNoteId('abcdefghijk')).toBe(false); // 11
    expect(isNoteId('abcdefghijklm')).toBe(false); // 13
    expect(isNoteId('abcdefghij:k')).toBe(false);
    expect(isNoteId('abcdefghij|k')).toBe(false);
    expect(isNoteId('abcdefghijé1')).toBe(false);
    expect(isNoteId('6f0c1a52-2c1e-4c8e-9f6a-0d5a1c9e7b11')).toBe(false);
    expect(isNoteId(undefined)).toBe(false);
    expect(isNoteId(42)).toBe(false);
  });
});

describe('derived ids', () => {
  it('are the same every time, and start with _', () => {
    expect(legacyNoteId('clip-a', 0)).toBe(legacyNoteId('clip-a', 0));
    expect(legacyNoteId('clip-a', 0)).toMatch(/^_[A-Za-z0-9_-]{11}$/);
    expect(noteIdFromCid('x')).toBe(noteIdFromCid('x'));
    expect(noteIdFromCid('x')).toMatch(/^_[A-Za-z0-9_-]{11}$/);
  });

  it('never change between builds', () => {
    // Pinned: a draft opened by two builds must give its notes the same ids.
    // Changing the hash fails this on purpose.
    expect([
      legacyNoteId('clip-1', 0),
      legacyNoteId('clip-1', 1),
      legacyNoteId('demo-clip-3', 12),
      noteIdFromCid('6f0c1a52-2c1e-4c8e-9f6a-0d5a1c9e7b11'),
    ]).toMatchInlineSnapshot(`
      [
        "_RXDvLnH5t5L",
        "_AWCyGo0Eujd",
        "_G_LKq953Gjx",
        "_XSMOKZ6d-en",
      ]
    `);
  });

  it('separate clips, indices and the two kinds of seed', () => {
    const ids = new Set<string>();
    for (let c = 0; c < 200; c++) {
      for (let i = 0; i < 250; i++) ids.add(legacyNoteId(`clip-${c}`, i));
    }
    expect(ids.size).toBe(50000);
    // The length prefix keeps "clip-1" + 11 apart from "clip-11" + 1.
    expect(legacyNoteId('clip-1', 11)).not.toBe(legacyNoteId('clip-11', 1));
    expect(noteIdFromCid('c')).not.toBe(legacyNoteId('c', 0));
  });
});

describe('withNoteIds', () => {
  const clean = () => [note(0, 60, mintNoteId()), note(480, 62, mintNoteId())];

  it('hands back the same array when every id is whole', () => {
    const events = clean();
    expect(withNoteIds(events)).toBe(events);
    expect(withNoteIds([])).toEqual([]);
  });

  it('fills missing and malformed ids in a copy, leaving the input alone', () => {
    const kept = mintNoteId();
    const events = [
      note(0, 60),
      note(480, 62, kept),
      note(960, 64, 'uuid-ish'),
    ];
    const out = withNoteIds(events);
    expect(out).not.toBe(events);
    expect(out[1]).toBe(events[1]); // untouched notes are the same objects
    expect(out[1].id).toBe(kept);
    expect(out.every((e) => isNoteId(e.id))).toBe(true);
    expect(new Set(out.map((e) => e.id)).size).toBe(3);
    expect(events[0].id).toBeUndefined();
    expect(events[2].id).toBe('uuid-ish');
  });

  it('lets the first of two notes sharing an id keep it', () => {
    const id = mintNoteId();
    const events = [note(0, 60, id), note(0, 60, id)];
    const out = withNoteIds(events);
    expect(out[0]).toBe(events[0]);
    expect(out[1].id).not.toBe(id);
    expect(isNoteId(out[1].id)).toBe(true);
  });

  it('keeps clear of taken ids and adds its own, across clips', () => {
    const shared = mintNoteId();
    const first = [note(0, 60, shared)];
    const second = [note(0, 60, shared), note(480, 62)];
    const taken = new Set<string>();
    expect(withNoteIds(first, taken)).toBe(first);
    expect(taken.has(shared)).toBe(true);
    const out = withNoteIds(second, taken);
    expect(out[0].id).not.toBe(shared); // a copy of the first clip's note
    expect(taken.size).toBe(3);
    for (const event of out) expect(taken.has(event.id!)).toBe(true);
  });

  it('never gives a new note an id a later note keeps', () => {
    const later = legacyNoteId('c', 0);
    const events = [note(0, 60), note(480, 62, later)];
    // A deterministic minter that would hand out the later note's id first.
    const offers = [later, legacyNoteId('c', 1)];
    const out = withNoteIds(events, undefined, () => offers.shift()!);
    expect(out[1]).toBe(events[1]);
    expect(out[0].id).toBe(legacyNoteId('c', 1));
  });

  it('stops trusting a minter that keeps colliding or returns junk', () => {
    const taken = new Set([legacyNoteId('c', 0)]);
    const out = withNoteIds([note(0, 60)], taken, () => legacyNoteId('c', 0));
    expect(isNoteId(out[0].id)).toBe(true);
    expect(out[0].id).not.toBe(legacyNoteId('c', 0));
    const junk = withNoteIds([note(0, 60)], undefined, () => 'a:b');
    expect(isNoteId(junk[0].id)).toBe(true);
  });

  it('checks a 600-note clip without copying it, fast enough for a drag', () => {
    const events = Array.from({ length: 600 }, (_, i) =>
      note(i * 120, 48 + (i % 36), mintNoteId()),
    );
    const runs = 3000;
    // A drag rebuilds the array each frame, with the same note ids.
    const frames = [
      events,
      events.map((e) => ({ ...e, startTick: e.startTick + 1 })),
    ];
    for (let i = 0; i < 50; i++) withNoteIds(frames[i % 2]); // warm up
    const started = performance.now();
    for (let i = 0; i < runs; i++) {
      const frame = frames[i % 2];
      if (withNoteIds(frame) !== frame) throw new Error('copied a clean clip');
    }
    const perCall = (performance.now() - started) / runs;
    // About 5 µs in practice; the bound only catches a regression to
    // copying the clip, without being flaky on a slow machine.
    expect(perCall).toBeLessThan(0.5);
  });
});

describe('ensureProjectNoteIds', () => {
  it('hands back the same array when every id is whole and unique', () => {
    const tracks = project(
      [{ id: 'a', events: [note(0, 60, mintNoteId())] }],
      [{ id: 'b', events: [note(0, 60, mintNoteId())] }],
    );
    expect(ensureProjectNoteIds(tracks)).toBe(tracks);
  });

  it('gives id-less notes their legacy ids, in (startTick, note) order', () => {
    // Stored out of order: the legacy index counts in the codec's order.
    const tracks = project([
      { id: 'clip', events: [note(480, 60), note(0, 64), note(0, 60)] },
    ]);
    const out = ensureProjectNoteIds(tracks);
    expect(out[0].midiClips[0].events.map((e) => e.id)).toEqual([
      legacyNoteId('clip', 2),
      legacyNoteId('clip', 1),
      legacyNoteId('clip', 0),
    ]);
    // Deterministic: the same project comes out with the same ids.
    expect(
      ensureProjectNoteIds(
        project([
          { id: 'clip', events: [note(480, 60), note(0, 64), note(0, 60)] },
        ]),
      ),
    ).toEqual(out);
  });

  it('keeps an id for its first note, project-wide, and shares the rest', () => {
    const id = mintNoteId();
    const untouched = { id: 'x', events: [note(0, 50, mintNoteId())] };
    const tracks = project(
      [{ id: 'a', events: [note(0, 60, id)] }],
      [untouched, { id: 'b', events: [note(0, 60, id), note(960, 62, id)] }],
    );
    const out = ensureProjectNoteIds(tracks);
    expect(out).not.toBe(tracks);
    expect(out[0]).toBe(tracks[0]);
    expect(out[1].midiClips[0]).toBe(untouched);
    const repaired = out[1].midiClips[1].events.map((e) => e.id);
    expect(repaired).toEqual([legacyNoteId('b', 0), legacyNoteId('b', 1)]);
    expect(assertNoteIds(out)).toEqual([]);
    // The input is left as it was.
    expect(tracks[1].midiClips[1].events[0].id).toBe(id);
  });

  it('never takes an id that a later note holds', () => {
    // The second clip's note already holds what the first clip's would get.
    const tracks = project(
      [{ id: 'c', events: [note(0, 60)] }],
      [{ id: 'd', events: [note(0, 60, legacyNoteId('c', 0))] }],
    );
    const out = ensureProjectNoteIds(tracks);
    expect(out[1]).toBe(tracks[1]);
    expect(out[0].midiClips[0].events[0].id).toBe(legacyNoteId('c#1', 0));
    expect(assertNoteIds(out)).toEqual([]);
  });

  it('keeps notes apart in two clips that share an id', () => {
    const tracks = project(
      [{ id: 'same', events: [note(0, 60)] }],
      [{ id: 'same', events: [note(0, 60)] }],
    );
    const out = ensureProjectNoteIds(tracks);
    expect(assertNoteIds(out)).toEqual([]);
  });

  it('checks a project of more notes than its scratch map starts with', () => {
    // 20,000 notes, past the 16,384 ids the check holds before it sizes
    // itself to the project. Each pass still finds the ids whole.
    const ids = mintNoteIds(20000);
    const clips = (lastId?: string) =>
      Array.from({ length: 40 }, (_, c) => ({
        id: `clip-${c}`,
        events: Array.from({ length: 500 }, (_, i) =>
          note(i * 10, 60, c === 39 && i === 499 ? lastId : ids[c * 500 + i]),
        ),
      }));
    const tracks = project(clips(ids[19999]));
    for (let pass = 0; pass < 3; pass++) {
      expect(ensureProjectNoteIds(tracks)).toBe(tracks);
    }
    // A repeat is caught however full the map is.
    const repeated = project(clips(ids[0]));
    const out = ensureProjectNoteIds(repeated);
    expect(out).not.toBe(repeated);
    expect(out[0].midiClips[39].events[499].id).not.toBe(ids[0]);
    expect(assertNoteIds(out)).toEqual([]);
    expect(ensureProjectNoteIds(tracks)).toBe(tracks);
  });
});

describe('assertNoteIds', () => {
  it('names every note without a whole id', () => {
    const id = mintNoteId();
    const tracks = project([
      {
        id: 'c',
        events: [
          note(0, 60, id),
          note(0, 62),
          note(0, 64, 'x:y'),
          note(0, 65, id),
        ],
      },
    ]);
    expect(assertNoteIds(tracks)).toEqual([
      'track t0 clip c note 1: no id',
      'track t0 clip c note 2: malformed id "x:y"',
      `track t0 clip c note 3: id ${id} repeats track t0 clip c note 0`,
    ]);
    expect(assertNoteIds(ensureProjectNoteIds(tracks))).toEqual([]);
  });
});

describe('watchNoteIds', () => {
  afterEach(() => vi.useRealTimers());

  it('reports a bad project once, a moment after the tracks change', () => {
    vi.useFakeTimers();
    let tracks = project([{ id: 'c', events: [note(0, 60, mintNoteId())] }]);
    const listeners = new Set<() => void>();
    const reports: string[][] = [];
    const stop = watchNoteIds(
      (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      () => tracks,
      (problems) => reports.push(problems),
    );
    const change = (next: typeof tracks) => {
      tracks = next;
      for (const listener of listeners) listener();
    };

    change(project([{ id: 'c', events: [note(0, 60)] }]));
    change(project([{ id: 'c', events: [note(0, 60), note(0, 61)] }]));
    expect(reports).toHaveLength(0);
    vi.advanceTimersByTime(500);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toHaveLength(2);

    // The same report again stays quiet; a clean project says nothing.
    change(project([{ id: 'c', events: [note(0, 60), note(0, 61)] }]));
    vi.advanceTimersByTime(500);
    change(project([{ id: 'c', events: [note(0, 60, mintNoteId())] }]));
    vi.advanceTimersByTime(500);
    expect(reports).toHaveLength(1);
    stop();
    expect(listeners.size).toBe(0);
  });
});
