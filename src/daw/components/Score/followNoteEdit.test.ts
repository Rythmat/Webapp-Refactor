import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { isNoteId, mintNoteId } from '@/daw/model/noteIds';
import type { Track } from '@/daw/store/tracksSlice';
import { pasteNotes, copyNotes } from './scoreClipboard';
import {
  applyNoteEdit,
  applyNoteEdits,
  applyNoteSplit,
  followNoteEdit,
  type NoteKeyedMarks,
} from './scoreEdit';

// ── Marks follow their notes through a Score edit ──────────────────────────
// A Score note's id is where it sits (`track:clip:tick:midi`), so any edit
// that moves a note renames it. The edit now says which old id became which;
// marks used to be paired up by position instead, the selection's order
// against the clips' order, which moved a staccato onto another note.

const ev = (startTick: number, note: number): MidiNoteEvent => ({
  id: mintNoteId(),
  note,
  velocity: 90,
  startTick,
  durationTicks: 480,
  channel: 0,
});

const track = (id: string, events: MidiNoteEvent[]): Track =>
  ({
    id,
    midiClips: [{ id: `${id}-clip`, startTick: 0, events }],
  }) as unknown as Track;

const NONE: NoteKeyedMarks = {
  articulations: [],
  slurs: [],
  spellings: [],
  slashNotes: [],
};

/** Run an edit against `tracks`, returning the result and the clips written. */
function edit(
  tracks: Track[],
  ids: string[],
  change: Parameters<typeof applyNoteEdit>[2],
) {
  const written = new Map<string, MidiNoteEvent[]>();
  const result = applyNoteEdit(tracks, ids, change, 0, (t, c, events) =>
    written.set(`${t}:${c}`, events),
  );
  return { result, written };
}

describe('an edit says where each note went', () => {
  it('pairs old and new ids by note, not by selection order', () => {
    const tracks = [track('t', [ev(0, 60), ev(480, 64)])];
    // Selected B first, then A: the clip order is A, B.
    const { result } = edit(tracks, ['t:t-clip:480:64', 't:t-clip:0:60'], {
      deltaTicks: 120,
    });
    expect(result.ids).toEqual(['t:t-clip:120:60', 't:t-clip:600:64']);
    expect(result.renamed).toEqual(
      new Map([
        ['t:t-clip:0:60', 't:t-clip:120:60'],
        ['t:t-clip:480:64', 't:t-clip:600:64'],
      ]),
    );

    const marks = followNoteEdit(
      { ...NONE, articulations: ['t:t-clip:480:64|staccato'] },
      result,
    );
    // The staccato stays on B. Pairing by position put it on A.
    expect(marks.articulations).toEqual(['t:t-clip:600:64|staccato']);
  });

  it('keeps marks with their own instrument across a two-part selection', () => {
    const tracks = [track('a', [ev(0, 72)]), track('b', [ev(0, 48)])];
    const { result } = edit(tracks, ['b:b-clip:0:48', 'a:a-clip:0:72'], {
      steps: 1,
    });
    const marks = followNoteEdit(
      {
        ...NONE,
        articulations: ['a:a-clip:0:72|accent', 'b:b-clip:0:48|tenuto'],
      },
      result,
    );
    expect(marks.articulations).toEqual([
      'a:a-clip:0:74|accent',
      'b:b-clip:0:50|tenuto',
    ]);
  });

  it('keeps the stored id on an edited note', () => {
    const tracks = [track('t', [ev(0, 60)])];
    const id = tracks[0].midiClips[0].events[0].id;
    const { written } = edit(tracks, ['t:t-clip:0:60'], { steps: 2 });
    expect(written.get('t:t-clip')![0]).toMatchObject({ id, note: 64 });
  });

  it('lists the removed notes, and renames none of them', () => {
    const tracks = [track('t', [ev(0, 60), ev(480, 62)])];
    const written = new Map<string, MidiNoteEvent[]>();
    const result = applyNoteEdits(
      tracks,
      new Map([
        ['t:t-clip:0:60', { durationTicks: 960 }],
        ['t:t-clip:480:62', { remove: true }],
      ]),
      0,
      (t, c, events) => written.set(`${t}:${c}`, events),
    );
    expect(result.ids).toEqual(['t:t-clip:0:60']);
    expect(result.renamed.size).toBe(0);
    expect(result.removed).toEqual(new Set(['t:t-clip:480:62']));
  });
});

describe('followNoteEdit', () => {
  const moved = {
    renamed: new Map([['t:c:0:66', 't:c:120:66']]),
    removed: new Set<string>(),
  };

  it('moves every kind of mark with its note', () => {
    const marks = followNoteEdit(
      {
        articulations: ['t:c:0:66|staccato'],
        slurs: ['t:c:0:66|t:c:960:67', 't:c:-1:1|t:c:0:66'],
        spellings: ['t:c:0:66|G♭4'],
        slashNotes: ['t:c:0:66'],
      },
      moved,
    );
    expect(marks).toEqual({
      articulations: ['t:c:120:66|staccato'],
      slurs: ['t:c:120:66|t:c:960:67', 't:c:-1:1|t:c:120:66'],
      spellings: ['t:c:120:66|G♭4'],
      slashNotes: ['t:c:120:66'],
    });
  });

  it('drops every kind of mark on a removed note', () => {
    const marks = followNoteEdit(
      {
        articulations: ['t:c:0:66|staccato', 't:c:480:67|accent'],
        slurs: ['t:c:0:66|t:c:480:67'],
        spellings: ['t:c:0:66|G♭4'],
        slashNotes: ['t:c:0:66', 't:c:480:67'],
      },
      { renamed: new Map(), removed: new Set(['t:c:0:66']) },
    );
    expect(marks).toEqual({
      articulations: ['t:c:480:67|accent'],
      slurs: [],
      spellings: [],
      slashNotes: ['t:c:480:67'],
    });
  });

  it('lets a spelling go when its note leaves the pitch class', () => {
    const spellings = ['t:c:0:66|G♭4'];
    const stepped = followNoteEdit(
      { ...NONE, spellings },
      { renamed: new Map([['t:c:0:66', 't:c:0:67']]), removed: new Set() },
    );
    expect(stepped.spellings).toEqual([]);
    // An octave up still sounds G♭, the one an octave higher.
    const octave = followNoteEdit(
      { ...NONE, spellings },
      { renamed: new Map([['t:c:0:66', 't:c:0:78']]), removed: new Set() },
    );
    expect(octave.spellings).toEqual(['t:c:0:78|G♭5']);
    // The octave follows the written letter: B♯4 sounds as C5 (72).
    const sharp = followNoteEdit(
      { ...NONE, spellings: ['t:c:0:72|B♯4'] },
      { renamed: new Map([['t:c:0:72', 't:c:0:60']]), removed: new Set() },
    );
    expect(sharp.spellings).toEqual(['t:c:0:60|B♯3']);
  });

  it('drops a slur whose two ends land on one note', () => {
    const marks = followNoteEdit(
      { ...NONE, slurs: ['t:c:0:60|t:c:120:60'] },
      { renamed: new Map([['t:c:0:60', 't:c:120:60']]), removed: new Set() },
    );
    expect(marks.slurs).toEqual([]);
  });

  it('hands back the very same lists when no marked note moved', () => {
    const marks: NoteKeyedMarks = {
      articulations: ['t:c:960:60|staccato'],
      slurs: ['t:c:960:60|t:c:1440:62'],
      spellings: ['t:c:960:60|C4'],
      slashNotes: ['t:c:960:60'],
    };
    const out = followNoteEdit(marks, moved);
    expect(out.articulations).toBe(marks.articulations);
    expect(out.slurs).toBe(marks.slurs);
    expect(out.spellings).toBe(marks.spellings);
    expect(out.slashNotes).toBe(marks.slashNotes);
    expect(
      followNoteEdit(marks, { renamed: new Map(), removed: new Set() }),
    ).toBe(marks);
  });
});

describe('new notes get ids of their own', () => {
  it('splitting a held note keeps the id on the first piece', () => {
    const held = { ...ev(0, 60), durationTicks: 3840 };
    const tracks = [track('t', [held])];
    let written: MidiNoteEvent[] = [];
    applyNoteSplit(tracks, 't:t-clip:0:60', 1920, (_t, _c, events) => {
      written = events;
    });
    expect(written).toHaveLength(2);
    expect(written[0].id).toBe(held.id);
    expect(isNoteId(written[1].id)).toBe(true);
    expect(written[1].id).not.toBe(held.id);
  });

  it('pasted notes are new notes, not the ones copied', () => {
    const tracks = [track('t', [ev(0, 60), ev(1920, 64)])];
    const clip = copyNotes(tracks, ['t:t-clip:0:60'], new Map([['t', 0]]))!;
    const { writes } = pasteNotes(
      clip,
      { partIndex: 0, tick: 960 },
      tracks,
      new Map([[0, 't']]),
    );
    const ids = writes[0].events.map((e) => e.id);
    expect(ids.every(isNoteId)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it('a measure paste reports the notes it cleared', () => {
    const tracks = [track('t', [ev(0, 60), ev(1920, 64), ev(2400, 65)])];
    const clip = {
      kind: 'notes' as const,
      notes: [],
      span: 1920,
      replace: true,
      partCount: 1,
    };
    const { removedIds } = pasteNotes(
      clip,
      { partIndex: 0, tick: 1920 },
      tracks,
      new Map([[0, 't']]),
    );
    expect(removedIds).toEqual(['t:t-clip:1920:64', 't:t-clip:2400:65']);
  });
});
