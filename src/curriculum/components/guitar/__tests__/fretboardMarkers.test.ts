import { describe, expect, it } from 'vitest';
import type { FretMarker } from '@/components/guitar/types';
import { buildGuitarAppliedTheoryFundamentalsFlow } from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import { toPianoRollEvents } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import { shapePositions } from '@/lib/guitar/fretboard';
import {
  fretboardMarkers,
  groupAt,
  noteGroups,
  outOfTimeGroup,
  type FretboardMarkerInput,
} from '../fretboardMarkers';
import { guitarVisualModel } from '../guitarVisualModel';

const flow = buildGuitarAppliedTheoryFundamentalsFlow('C');
function stepOf(suffix: string): ActivityStepV2 {
  const tag = `guitar_fund:${suffix} | applied_theory_guitar`;
  const step = flow.sections.flatMap((s) => s.steps).find((s) => s.tag === tag);
  if (!step) throw new Error(`no step ${tag}`);
  return step;
}

/** A step as the container hands it over, out of time (no count-in shift). */
function setup(suffix: string) {
  const step = stepOf(suffix);
  const model = guitarVisualModel(step, 'C');
  const events = toPianoRollEvents(step.targetNotes ?? [], '#D2404A', 60);
  const groups = noteGroups(events, step.chordTargets ?? [], 0, 0);
  const input = (
    over: Partial<FretboardMarkerInput> = {},
  ): FretboardMarkerInput => ({
    groups,
    cursor: 0,
    completedIds: new Set(),
    context: null,
    window: model.window,
    keyRootPc: 0,
    activityState: 'preview',
    demoMidis: new Set(),
    isPlayingDemo: false,
    activeMidis: [],
    practiceMidis: new Set(),
    targetMidiSet: new Set(events.map((e) => e.midi!)),
    ...over,
  });
  return { step, events, groups, input };
}

/** 'role string:fret', sorted, for comparing whole marker sets. */
const summary = (markers: readonly FretMarker[]) =>
  markers.map((m) => `${m.role} ${m.string}:${m.fret}`).sort();

// C major (X-3-2-0-1-0) and D minor (X-X-0-2-3-1), as the book draws them.
const C_SPOTS = ['5:3', '4:2', '3:0', '2:1', '1:0'];
const DM_SPOTS = ['4:0', '3:2', '2:3', '1:1'];
const as = (role: string, spots: string[]) =>
  spots.map((spot) => `${role} ${spot}`);

describe('noteGroups and the cursor', () => {
  it('groups a strum into one chord, rooted in that chord', () => {
    const { groups } = setup('play_chords_oot');
    expect(groups.map((g) => g.startTicks)).toEqual([0, 960, 1920, 2880]);
    expect(groups.map((g) => g.notes.length)).toEqual([5, 4, 6, 4]);
    expect(groups.map((g) => g.rootPc)).toEqual([0, 2, 4, 5]);
  });

  it('follows the playhead in time and the first open note out of time', () => {
    const { groups, events } = setup('play_chords_oot');
    expect(groupAt(groups, -500)).toBe(0);
    expect(groupAt(groups, 959)).toBe(0);
    expect(groupAt(groups, 960)).toBe(1);

    const meta = Object.fromEntries(
      events.map((e) => [
        e.id,
        {
          isCompleted: e.startTicks === 0,
          isCurrentChord: e.startTicks <= 960,
          holdProgress: 0,
        },
      ]),
    );
    expect(outOfTimeGroup(groups, meta)).toBe(1);
    const allDone = Object.fromEntries(
      events.map((e) => [
        e.id,
        { isCompleted: true, isCurrentChord: true, holdProgress: 1 },
      ]),
    );
    expect(outOfTimeGroup(groups, allDone)).toBe(groups.length);
  });
});

describe('fretboardMarkers', () => {
  it('follows the keyboard: demo, then the student, then the guide, then the step', () => {
    const { input } = setup('play_chords_oot');
    const everything = input({
      activityState: 'practice',
      demoMidis: new Set([60]),
      activeMidis: [48, 52],
      practiceMidis: new Set([50, 57, 62, 65]),
    });
    expect(summary(fretboardMarkers(everything))).toEqual(['target 2:1']);

    const noDemo = { ...everything, demoMidis: new Set<number>() };
    expect(summary(fretboardMarkers(noDemo))).toEqual(
      as('played', ['4:2', '5:3']),
    );

    const noStudent = { ...noDemo, activeMidis: [] };
    expect(summary(fretboardMarkers(noStudent))).toEqual(
      as('target', DM_SPOTS).sort(),
    );

    const noGuide = { ...noStudent, practiceMidis: new Set<number>() };
    expect(summary(fretboardMarkers(noGuide))).toEqual(
      [...as('target', C_SPOTS), ...as('next', DM_SPOTS)].sort(),
    );
  });

  it('shows nothing between the demo’s notes, as the keyboard does', () => {
    const { input } = setup('play_chords_oot');
    expect(fretboardMarkers(input({ isPlayingDemo: true }))).toEqual([]);
  });

  it('only counts the student’s notes and the guide while they apply', () => {
    const { input } = setup('play_chords_oot');
    const preview = summary(fretboardMarkers(input()));
    // Notes in preview, and the guide during Play Now, fall to the step.
    expect(summary(fretboardMarkers(input({ activeMidis: [48] })))).toEqual(
      preview,
    );
    expect(
      summary(
        fretboardMarkers(
          input({
            activityState: 'performance',
            practiceMidis: new Set([50]),
          }),
        ),
      ),
    ).toEqual(preview);
  });

  it('puts a played note where the step plays it', () => {
    const { input } = setup('play_chords_oot');
    // G3 is the open G string in these shapes, not string 4 fret 5.
    const [g] = fretboardMarkers(
      input({ activityState: 'practice', activeMidis: [55] }),
    );
    expect(g).toMatchObject({ string: 3, fret: 0, role: 'played', label: 'G' });
  });

  it('maps a wrong note to the nearest spot in the window', () => {
    const { input } = setup('play_chords_oot');
    const [wrong] = fretboardMarkers(
      input({ activityState: 'practice', activeMidis: [61] }),
    );
    // D♭4 is not in the step: string 2 fret 2 is the only spot in frets 0-5.
    expect(wrong).toMatchObject({
      string: 2,
      fret: 2,
      midi: 61,
      role: 'wrong',
      label: 'D♭',
    });
  });

  it('flags the roots of the chord each marker belongs to', () => {
    const { input } = setup('play_chords_oot');
    const markers = fretboardMarkers(input());
    const roots = markers
      .filter((m) => m.isRoot)
      .map((m) => `${m.role} ${m.label} ${m.string}:${m.fret}`)
      .sort();
    expect(roots).toEqual([
      'next D 2:3',
      'next D 4:0',
      'target C 2:1',
      'target C 5:3',
    ]);
  });

  it('flags the tonic on a scale step', () => {
    const { input } = setup('major_scale_ascending_oot');
    const [first] = fretboardMarkers(input());
    expect(first).toMatchObject({ role: 'target', label: 'C', isRoot: true });
  });

  it('draws one marker per spot, the strongest role winning', () => {
    const { input } = setup('play_chords_oot');
    const context = {
      positions: shapePositions('X-3-2-0-1-0'),
      rootPc: 0,
    };
    // The shape to play covers its own faint context.
    expect(summary(fretboardMarkers(input({ context })))).toEqual(
      [...as('target', C_SPOTS), ...as('next', DM_SPOTS)].sort(),
    );
    // While the student plays, the rest of the shape stays faintly in view.
    const playing = fretboardMarkers(
      input({ context, activityState: 'practice', activeMidis: [48] }),
    );
    expect(summary(playing)).toEqual(
      [
        'played 5:3',
        ...as(
          'context',
          C_SPOTS.filter((s) => s !== '5:3'),
        ),
      ].sort(),
    );
  });

  it('shows what to play over the check of a spot played before', () => {
    const { input, groups } = setup('major_scale_ascending_descending_oot');
    // Up all eight notes; the first on the way down is playOrder[6] again,
    // and the one after it playOrder[5].
    const completedIds = new Set(
      groups.slice(0, 8).flatMap((g) => g.notes.map((n) => n.id)),
    );
    const markers = fretboardMarkers(
      input({ activityState: 'practice', cursor: 8, completedIds }),
    );
    expect(markers.find((m) => m.string === 4 && m.fret === 9)?.role).toBe(
      'target',
    );
    expect(markers.find((m) => m.string === 4 && m.fret === 7)?.role).toBe(
      'next',
    );
    expect(markers.filter((m) => m.role === 'done')).toHaveLength(6);
  });
});

describe('labelled markers', () => {
  it('shows a labeler’s text but keeps the note name to read aloud', () => {
    const { input } = setup('play_chords_oot');
    const markers = fretboardMarkers(
      input({
        labelOf: (position, _midi, group) => ({
          text: `${group?.shapeId}@${position.string}`,
          spoken: 'said',
        }),
      }),
    );
    const c = markers.find((m) => m.string === 5 && m.fret === 3)!;
    expect(c).toMatchObject({
      label: 'C',
      text: 'C/triad/1@5',
      spokenText: 'said',
      role: 'target',
    });
    const dm = markers.find((m) => m.string === 1 && m.fret === 1)!;
    expect(dm.text).toBe('C/triad/2@1');
  });

  it('labels sounding notes from their anchor group', () => {
    const { input } = setup('play_chords_oot');
    const markers = fretboardMarkers(
      input({
        activityState: 'practice',
        activeMidis: [48], // C on string 5 fret 3
        labelOf: (_p, _m, group) => ({ text: group?.shapeId ?? 'none' }),
      }),
    );
    expect(markers.find((m) => m.role === 'played')?.text).toBe('C/triad/1');
  });

  it('leaves labels alone without a labeler', () => {
    const { input } = setup('play_chords_oot');
    for (const m of fretboardMarkers(input())) {
      expect(m.text).toBeUndefined();
      expect(m.spokenText).toBeUndefined();
    }
  });
});
