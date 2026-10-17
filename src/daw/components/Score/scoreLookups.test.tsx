// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { useMemo } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type {
  BarlinePosition,
  NoteInfo,
} from '@/components/notation/StaffView';
import { parseNoteId } from '@/daw/model/noteKeys';
import { useStore, type AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import {
  ARTICULATIONS,
  articulationsFor,
  groupChordArticulations,
  parseSlur,
  type ArticulationKind,
  type TieCandidate,
} from './noteEditor';
import { buildScoreParts } from './scoreParts';
import {
  articulationMarkKey,
  slurMarkKey,
  tieMarkKey,
  type ScoreMark,
} from './scoreMarks';
import {
  articulationIndex,
  byBar,
  clipEventIndex,
  noteIndex,
  scoreMarksOf,
  systemOpeningBars,
  tieCandidatesOf,
} from './scoreLookups';
import { marksAt, type ScoreTextMark } from './scoreText';
import { useScoreEditing } from './useScoreEditing';
import * as fx from './scoreLookups.fixture';

// ── The Score's lookups answer as their searches did (score-06) ────────────
// The tie candidates, the markings and the overlay's barlines used to search
// the whole page once per note or barline. They now read maps built once per
// layout. Each map is checked here against the search it replaced, kept below
// as it was written, on a hand-made page and on pages made at random.

vi.mock('@/components/notation/StaffView', () => ({
  loadVexFlow: () => new Promise(() => {}),
}));

afterEach(cleanup);

// ── The searches, as useScoreEditing ran them ──────────────────────────────

function searchedTieCandidates(
  notes: readonly NoteInfo[],
  tracks: readonly Track[],
): TieCandidate[] {
  const byId = new Map<string, TieCandidate>();
  for (const info of notes) {
    const ref = parseNoteId(info.id);
    if (!ref) continue;
    const event = tracks
      .find((t) => t.id === ref.trackId)
      ?.midiClips.find((c) => c.id === ref.clipId)
      ?.events.find(
        (e) => e.startTick === ref.startTick && e.note === ref.midi,
      );
    if (!event) continue;
    const existing = byId.get(info.id);
    if (existing && existing.tick <= info.tick) continue;
    byId.set(info.id, {
      id: info.id,
      partIndex: info.partIndex,
      tick: info.tick,
      midi: event.note,
      durationTicks: event.durationTicks,
    });
  }
  return [...byId.values()];
}

function searchedMarks(
  notes: readonly NoteInfo[],
  articulations: readonly string[],
  slurs: readonly string[],
): ScoreMark[] {
  const chordMarks = groupChordArticulations(notes, (id) =>
    articulationsFor(articulations, id),
  );
  const out: ScoreMark[] = [];
  for (const chord of chordMarks) {
    for (const kind of chord.kinds) {
      out.push({
        key: articulationMarkKey(chord.note.id, kind),
        kind: { type: 'articulation', kind },
        partIndex: chord.note.partIndex,
        tick: chord.note.tick,
        noteIds: notes
          .filter(
            (n) =>
              n.partIndex === chord.note.partIndex &&
              n.tick === chord.note.tick &&
              articulationsFor(articulations, n.id).includes(kind),
          )
          .map((n) => n.id),
      });
    }
  }
  for (const entry of slurs) {
    const ends = parseSlur(entry);
    const from = notes.find((n) => n.id === ends?.fromId);
    if (!ends || !from) continue;
    out.push({
      key: slurMarkKey(ends.fromId, ends.toId),
      kind: { type: 'slur' },
      partIndex: from.partIndex,
      tick: from.tick,
      noteIds: [ends.fromId, ends.toId],
    });
  }
  const fragments = new Map<string, NoteInfo[]>();
  for (const note of notes) {
    fragments.set(note.id, [...(fragments.get(note.id) ?? []), note]);
  }
  for (const [id, pieces] of fragments) {
    if (pieces.length < 2) continue;
    const ordered = [...pieces].sort((a, b) => a.tick - b.tick);
    for (let i = 1; i < ordered.length; i++) {
      out.push({
        key: tieMarkKey(id, ordered[i].tick),
        kind: { type: 'tie' },
        partIndex: ordered[i].partIndex,
        tick: ordered[i - 1].tick,
        noteIds: [id],
        splitTick: ordered[i].tick,
      });
    }
  }
  return out;
}

const searchedAtSystemStart = (
  barline: BarlinePosition,
  barlines: readonly BarlinePosition[],
) =>
  !barline.atSystemEnd &&
  !barlines.some(
    (other) =>
      other.system === barline.system &&
      !other.atSystemEnd &&
      other.measureIndex < barline.measureIndex,
  );

// ── The maps, read the way useScoreEditing reads them ──────────────────────

function mappedMarks(
  notes: readonly NoteInfo[],
  articulations: readonly string[],
  slurs: readonly string[],
): ScoreMark[] {
  const byNote = articulationIndex(articulations);
  const kindsOf = (id: string) => byNote.get(id) ?? [];
  return scoreMarksOf({
    chordMarks: groupChordArticulations(notes, kindsOf),
    notes: noteIndex(notes),
    kindsOf,
    slurs,
  });
}

/** Compare every lookup on one page. */
function expectSameAnswers(page: {
  notes: NoteInfo[];
  tracks: Track[];
  articulations: string[];
  slurs: string[];
  barlines: BarlinePosition[];
  sections: { measureIdx: number; label: string }[];
  textMarks: ScoreTextMark[];
}) {
  const { notes, tracks, articulations, slurs, barlines } = page;
  expect(tieCandidatesOf(notes, clipEventIndex(tracks))).toEqual(
    searchedTieCandidates(notes, tracks),
  );

  const byNote = articulationIndex(articulations);
  for (const note of notes) {
    expect(byNote.get(note.id) ?? []).toEqual(
      articulationsFor(articulations, note.id),
    );
  }
  expect(mappedMarks(notes, articulations, slurs)).toEqual(
    searchedMarks(notes, articulations, slurs),
  );

  // The overlay's slurs take the first drawing of each end, and its ties
  // the drawings of one note in time order.
  const index = noteIndex(notes);
  for (const id of new Set([...notes.map((n) => n.id), 'missing'])) {
    expect(index.byId.get(id)?.[0]).toBe(notes.find((n) => n.id === id));
    expect(
      [...(index.byId.get(id) ?? [])].sort((a, b) => a.tick - b.tick),
    ).toEqual(notes.filter((n) => n.id === id).sort((a, b) => a.tick - b.tick));
  }

  const opening = systemOpeningBars(barlines);
  const sectionsByBar = byBar(page.sections);
  const textMarksByBar = byBar(page.textMarks);
  for (const barline of barlines) {
    const atSystemStart =
      !barline.atSystemEnd &&
      !(
        (opening.get(barline.system) ?? barline.measureIndex) <
        barline.measureIndex
      );
    expect(atSystemStart).toBe(searchedAtSystemStart(barline, barlines));
    expect(sectionsByBar.get(barline.measureIndex)?.[0]).toBe(
      page.sections.find((s) => s.measureIdx === barline.measureIndex),
    );
    expect(textMarksByBar.get(barline.measureIndex) ?? []).toEqual(
      marksAt(page.textMarks, barline.measureIndex),
    );
  }
}

const track = (id: string, clips: Track['midiClips']): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument: 'piano-sampler',
    midiClips: clips,
    audioClips: [],
  }) as never;

describe('the Score lookups', () => {
  it('answer as the searches did on a marked-up page', () => {
    expectSameAnswers({
      notes: fx.layout.notes,
      tracks: [
        track(fx.TRACK, [
          { id: 'clip', startTick: 0, events: fx.melodyEvents },
          // A second clip under the same id is never searched.
          {
            id: 'clip',
            startTick: 0,
            events: [{ ...fx.melodyEvents[0], startTick: 3840, note: 60 }],
          },
        ]),
        track(fx.BASS, [{ id: 'clip', startTick: 0, events: fx.bassEvents }]),
        // Nor is a second track under the same id.
        track(fx.TRACK, [
          {
            id: 'clip',
            startTick: 0,
            events: [{ ...fx.melodyEvents[0], durationTicks: 1 }],
          },
        ]),
      ],
      articulations: fx.articulations,
      slurs: fx.slurs,
      barlines: fx.layout.barlines,
      sections: fx.sections,
      textMarks: fx.textMarks,
    });
  });

  it('answer as the searches did on pages made at random', () => {
    // A small seeded generator, so a failure can be run again.
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const pick = <T,>(items: readonly T[]) =>
      items[Math.floor(random() * items.length)];
    const kinds = ARTICULATIONS.map((a) => a.kind) as ArticulationKind[];

    for (let page = 0; page < 40; page++) {
      const trackIds = ['t0', 't1', 't2'];
      const events = new Map<string, MidiNoteEvent[]>();
      const notes: NoteInfo[] = [];
      for (let i = 0; i < 60; i++) {
        const partIndex = Math.floor(random() * 3);
        const startTick = Math.floor(random() * 8) * 240;
        const midi = 60 + Math.floor(random() * 5);
        const id = `${trackIds[partIndex]}:c:${startTick}:${midi}`;
        // Some drawn notes have no event; some events are drawn twice.
        if (random() < 0.85) {
          const list = events.get(trackIds[partIndex]) ?? [];
          list.push({
            note: midi,
            startTick,
            durationTicks: 120 + Math.floor(random() * 4) * 120,
            velocity: 90,
            channel: 0,
          });
          events.set(trackIds[partIndex], list);
        }
        const drawings = random() < 0.2 ? 3 : 1;
        for (let d = 0; d < drawings; d++) {
          notes.push({
            id,
            partIndex,
            measureIndex: d,
            tick: startTick + Math.floor(random() * 3) * 1920,
            x: random() * 600,
            y: random() * 200,
            space: 5,
            stem: pick(['up', 'down', null] as const),
            letter: 'c',
            octave: 4,
            alteration: 0,
            line: Math.floor(random() * 8) / 2,
          });
        }
      }
      const ids = [...new Set(notes.map((n) => n.id)), 'gone:c:0:60'];
      const barlines: BarlinePosition[] = [];
      for (let i = 0; i < 12; i++) {
        barlines.push({
          system: Math.floor(random() * 3),
          measureIndex: Math.floor(random() * 10),
          atSystemEnd: random() < 0.25,
          x: random() * 600,
          y: 0,
          height: 100,
        });
      }
      expectSameAnswers({
        notes,
        tracks: trackIds.map((id) =>
          track(id, [{ id: 'c', startTick: 0, events: events.get(id) ?? [] }]),
        ),
        articulations: Array.from(
          { length: 30 },
          () => `${pick(ids)}|${pick(kinds)}`,
        ),
        slurs: Array.from({ length: 10 }, () => `${pick(ids)}|${pick(ids)}`),
        barlines,
        sections: Array.from({ length: 6 }, (_, i) => ({
          measureIdx: Math.floor(random() * 10),
          label: `S${i}`,
        })),
        textMarks: Array.from({ length: 8 }, (_, i) => ({
          id: `m${i}`,
          measureIdx: Math.floor(random() * 10),
          kind: 'text' as const,
          text: `${i}`,
        })),
      });
    }
  });
});

// ── Through the hook ───────────────────────────────────────────────────────

let editing: ReturnType<typeof useScoreEditing>;

function ScoreEditor() {
  const tracks = useStore((s) => s.tracks);
  const scoreParts = useMemo(
    () =>
      buildScoreParts({
        tracks,
        rootNote: 0,
        mode: 'ionian',
        timeSignature: [4, 4],
      }),
    [tracks],
  );
  const parts = useMemo(
    () => scoreParts.map(({ id, name, score }) => ({ id, name, score })),
    [scoreParts],
  );
  editing = useScoreEditing({ parts, scoreParts });
  return <div>{editing.staff.overlay}</div>;
}

describe('the Score overlay', () => {
  it('draws the marked-up page from its lookups', () => {
    const BAR = 1920;
    const section = (label: string, startTick: number, endTick: number) => ({
      id: `section-${label}`,
      type: 'custom' as const,
      label,
      startTick,
      endTick,
    });
    useStore.setState({
      currentView: 'score',
      tracks: [
        track(fx.TRACK, [
          { id: 'clip', startTick: 0, events: fx.melodyEvents },
        ]),
        track(fx.BASS, [{ id: 'clip', startTick: 0, events: fx.bassEvents }]),
      ],
      scoreArticulations: fx.articulations,
      scoreSlurs: fx.slurs,
      // The song's sections, each marked at the bar it starts in. Two start
      // in bar 3, and only the first of them is marked there.
      sections: [
        section('A', 0, 3 * BAR),
        section('B', 3 * BAR, 3 * BAR + 480),
        section('C', 3 * BAR + 480, 6 * BAR),
      ],
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
      scoreTextMarks: fx.textMarks,
    } as Partial<AllSlices>);
    const { container } = render(<ScoreEditor />);
    act(() => editing.staff.onLayout(fx.layout));

    // One rehearsal mark per bar, the first one written.
    const labels = [...container.querySelectorAll('button')]
      .map((b) => b.textContent)
      .filter((text) => text === 'A' || text === 'B' || text === 'C');
    expect(labels).toEqual(['A', 'B']);

    // A system's opening barline leans inward; the others sit centred.
    const targets = [...container.querySelectorAll('button[title^="Barline"]')]
      .map((b) => [b.getAttribute('title'), (b as HTMLElement).style.left])
      .filter(([title]) => !title!.endsWith('6'));
    expect(targets).toEqual([
      ['Barline before bar 2', '253px'],
      ['Barline before bar 1', '18px'],
      ['Barline before bar 3', '493px'],
      ['Barline before bar 4', '733px'],
      ['Barline before bar 5', '253px'],
      ['Barline before bar 4', '18px'],
    ]);

    // The note held over two barlines has two ties to pick up, and every
    // slur whose ends are both drawn has an arc (each arc is two paths).
    const svg = container.querySelector('svg.ma-marks')!;
    const strokes = [...svg.querySelectorAll('path')].map((p) =>
      p.getAttribute('stroke'),
    );
    expect(strokes.filter((s) => s === 'var(--daw-text)')).toHaveLength(4);
    expect(strokes.filter((s) => s === 'transparent')).toHaveLength(4 + 2);
  });
});
