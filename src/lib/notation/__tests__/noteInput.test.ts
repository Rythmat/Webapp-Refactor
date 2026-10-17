import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type { MeasureBox, StaffLayout } from '@/components/notation/StaffView';
import { DURATIONS } from '@/daw/components/Score/noteEditor';
import {
  barAnchors,
  drawnSpans,
  inputGrid,
  inputTargetAt,
  letterPitch,
  pinnedSpelling,
  pitchAtY,
  planNoteInsert,
  snapTick,
  soundingStep,
  staffAt,
  writtenName,
  xAtTick,
  type DrawnSpan,
} from '@/daw/components/Score/noteInput';
import type { Track } from '@/daw/store/tracksSlice';
import { buildScore } from '@/lib/notation';

// ── Note input: the pointer as a pitch and a time, and what a note writes ──

const STEP = 5; // px from a line to the next space
const length = (name: string) => DURATIONS.find((d) => d.name === name)!;

describe('the pitch under the pointer', () => {
  // A staff's top line at y = 100: each step down is 5 px.
  const at = (
    position: number,
    staff: 'treble' | 'bass' | 'alto' | 'bass8vb',
    fifths = 0,
  ) => pitchAtY(100 + position * STEP, 100, STEP, staff, fifths)?.midi;

  it('reads the treble clef', () => {
    expect(at(0, 'treble')).toBe(77); // F5, the top line
    expect(at(4, 'treble')).toBe(71); // B4, the middle line
    expect(at(8, 'treble')).toBe(64); // E4, the bottom line
    expect(at(7, 'treble')).toBe(65); // F4, the bottom space
    expect(at(10, 'treble')).toBe(60); // C4, one ledger line below
    expect(at(-2, 'treble')).toBe(81); // A5, one ledger line above
  });

  it('reads the bass clef', () => {
    expect(at(0, 'bass')).toBe(57); // A3, the top line
    expect(at(8, 'bass')).toBe(43); // G2, the bottom line
    expect(at(-2, 'bass')).toBe(60); // C4, one ledger line above
  });

  it('reads the alto clef, middle C on its middle line', () => {
    expect(at(0, 'alto')).toBe(67); // G4, the top line
    expect(at(4, 'alto')).toBe(60); // C4, the middle line
    expect(at(8, 'alto')).toBe(53); // F3, the bottom line
    expect(at(7, 'alto')).toBe(55); // G3, the bottom space
    expect(at(10, 'alto')).toBe(50); // D3, one ledger line below
    expect(at(-2, 'alto')).toBe(71); // B4, one ledger line above
    // In F major the middle line is still C, its top space B♭4.
    expect(at(-1, 'alto', -1)).toBe(69);
    expect(at(1, 'alto', -1)).toBe(65);
  });

  it('reads the bass clef with an 8 an octave below where it is written', () => {
    // The lines say A3 … G2; the bass sounds A2 … G1.
    expect(at(0, 'bass8vb')).toBe(45); // written A3, the top line
    expect(at(8, 'bass8vb')).toBe(31); // written G2, the bottom line
    // The written C3 space writes MIDI C2.
    expect(at(5, 'bass8vb')).toBe(36);
    expect(pitchAtY(125, 100, STEP, 'bass8vb', 0)).toEqual({
      midi: 36,
      step: 3 * 7, // C3, as written
      position: 5,
    });
    // The low E string, E1, on the first ledger line under the staff.
    expect(at(10, 'bass8vb')).toBe(28);
    // F major's B♭ is a B♭ an octave down too.
    expect(at(6, 'bass8vb', -1)).toBe(34);
  });

  it('reads the key signature', () => {
    // G major: the top line is F♯5.
    expect(at(0, 'treble', 1)).toBe(78);
    // F major: the middle line is B♭4; the bass clef's second line B♭2.
    expect(at(4, 'treble', -1)).toBe(70);
    expect(at(6, 'bass', -1)).toBe(46);
  });

  it('snaps between a line and a space', () => {
    expect(pitchAtY(100 + 3.4 * STEP, 100, STEP, 'treble', 0)?.midi).toBe(72);
    expect(pitchAtY(100 + 3.6 * STEP, 100, STEP, 'treble', 0)?.midi).toBe(71);
  });

  it('reads nothing on a drumset staff', () => {
    expect(pitchAtY(100, 100, STEP, 'percussion', 0)).toBeNull();
  });

  it('names the note as the key writes it', () => {
    expect(writtenName(5 * 7 + 3, 1)).toBe('F♯5');
    expect(writtenName(4 * 7 + 6, -1)).toBe('B♭4');
    expect(writtenName(4 * 7, 0)).toBe('C4');
  });
});

describe('which staff the pointer is on', () => {
  // A grand staff: treble top line at 100, bass top line 100 px lower.
  const grand: MeasureBox = {
    measureIndex: 0,
    partIndex: 0,
    system: 0,
    x: 0,
    y: 60,
    width: 200,
    height: 180,
    startTick: 0,
    endTick: 1920,
    staves: [
      { staff: 'treble', topLineY: 100 },
      { staff: 'bass', topLineY: 200 },
    ],
  };
  const drums: MeasureBox = {
    ...grand,
    partIndex: 1,
    y: 300,
    staves: [{ staff: 'percussion', topLineY: 340 }],
  };
  const layout = { measures: [grand, drums], stepPx: STEP, topLineDrop: 40 };
  const staves = () => ['treble', 'bass'] as const;

  it('takes the nearest staff, ledger lines included', () => {
    expect(staffAt(layout, 50, 120, staves)?.staff).toBe('treble');
    expect(staffAt(layout, 50, 150, staves)?.staff).toBe('treble'); // C4
    expect(staffAt(layout, 50, 175, staves)?.staff).toBe('bass');
    expect(staffAt(layout, 50, 220, staves)?.staffIndex).toBe(1);
  });

  it('reads nothing on a drumset or far off the staves', () => {
    expect(staffAt(layout, 50, 360, staves)).toBeNull();
    expect(staffAt(layout, 50, 10, staves)).toBeNull();
    expect(staffAt(layout, 500, 120, staves)).toBeNull();
  });

  it('finds staves a layout did not report by their slot', () => {
    const box: MeasureBox = { ...grand, staves: undefined, y: 60 };
    // Top lines at 60 + 40 and 100 px below that.
    const hit = staffAt(
      { measures: [box], stepPx: STEP, topLineDrop: 40 },
      50,
      205,
      staves,
    );
    expect(hit?.staff).toBe('bass');
    expect(hit?.topLineY).toBe(200);
  });
});

describe('where a length can start', () => {
  it('is every place of its own length', () => {
    expect(inputGrid(length('Quarter'), 480, false)).toBe(480);
    expect(inputGrid(length('Eighth'), 480, false)).toBe(240);
    expect(inputGrid(length('16th'), 480, false)).toBe(120);
    expect(inputGrid(length('Whole'), 480, false)).toBe(1920);
  });

  it('is every place of its dot for a dotted length', () => {
    expect(inputGrid(length('Quarter'), 480, true)).toBe(240);
    expect(inputGrid(length('Half'), 480, true)).toBe(480);
  });

  it('is never finer than a sixteenth', () => {
    expect(inputGrid(length('32nd'), 480, false)).toBe(120);
    expect(inputGrid(length('Eighth'), 480, true)).toBe(120);
  });
});

describe('the time under the pointer', () => {
  // A 4/4 bar whose notes may sit from x = 100 to x = 506.
  const bar: MeasureBox = {
    measureIndex: 0,
    partIndex: 0,
    system: 0,
    x: 80,
    y: 0,
    width: 440,
    height: 80,
    startTick: 0,
    endTick: 1920,
    noteStartX: 100,
    noteEndX: 506,
  };
  const wholeRest = {
    key: 'rest|0|0',
    partIndex: 0,
    measureIndex: 0,
    tick: 0,
    durationTicks: 1920,
    x: 300,
    y: 0,
  };

  it('sweeps an empty bar evenly, its centred whole rest aside', () => {
    const anchors = barAnchors(bar, [], [wholeRest], STEP);
    expect(anchors).toEqual([
      { tick: 0, x: 106 },
      { tick: 1920, x: 500 },
    ]);
    expect(xAtTick(anchors, 960)).toBe(303);
  });

  it('snaps to the nearest place of the chosen length', () => {
    const anchors = barAnchors(bar, [], [wholeRest], STEP);
    // Beats every 98.5 px from 106; eighths every 49.25.
    expect(snapTick(200, bar, anchors, 480)).toBe(480);
    expect(snapTick(240, bar, anchors, 480)).toBe(480);
    expect(snapTick(260, bar, anchors, 480)).toBe(960);
    expect(snapTick(240, bar, anchors, 240)).toBe(720);
    expect(snapTick(140, bar, anchors, 120)).toBe(120);
    expect(snapTick(150, bar, anchors, 120)).toBe(240);
    // Never past the bar's last place.
    expect(snapTick(519, bar, anchors, 480)).toBe(1440);
  });

  it('follows the engraving where notes are written', () => {
    const note = (tick: number, x: number) => ({
      id: `n${tick}`,
      partIndex: 0,
      measureIndex: 0,
      tick,
      x,
      y: 0,
      space: STEP,
      stem: 'up' as const,
      letter: 'c',
      octave: 5,
      alteration: 0,
      line: 3,
    });
    // Four sixteenths crowd beat 1; a dotted half fills the rest narrowly.
    const notes = [
      note(0, 106),
      note(120, 150),
      note(240, 194),
      note(360, 238),
      note(480, 282),
    ];
    const anchors = barAnchors(bar, notes, [], STEP);
    expect(xAtTick(anchors, 240)).toBe(194);
    // Beat 3 sits between beat 2's note and the bar's end.
    expect(xAtTick(anchors, 960)).toBeCloseTo(282 + (500 - 282) / 3);
    // Another part's notes don't count.
    expect(
      barAnchors({ ...bar, partIndex: 1 }, notes, [], STEP).map((a) => a.tick),
    ).toEqual([0, 1920]);
  });

  it('puts pitch and time together', () => {
    const layout: Pick<
      StaffLayout,
      'measures' | 'notes' | 'rests' | 'stepPx' | 'topLineDrop'
    > = {
      measures: [{ ...bar, staves: [{ staff: 'treble', topLineY: 40 }] }],
      notes: [],
      rests: [wholeRest],
      stepPx: STEP,
      topLineDrop: 40,
    };
    const target = inputTargetAt({
      layout,
      x: 205,
      y: 41,
      grid: 240,
      staffIdsOf: () => ['treble'],
      keyFifthsOf: () => 1,
    });
    expect(target).toMatchObject({
      partIndex: 0,
      staffIndex: 0,
      tick: 480,
      midi: 78, // F♯5 in G major
      position: 0,
      y: 40,
    });
    expect(target?.x).toBeCloseTo(204.5);
  });
});

describe('a typed letter', () => {
  const F4 = 4 * 7 + 3;
  const E4 = 4 * 7 + 2;

  it('goes to the nearest octave', () => {
    expect(letterPitch(6, F4, 0)?.midi).toBe(71); // B4, up a fourth
    expect(letterPitch(0, F4, 0)?.midi).toBe(60); // C4, down a fourth
    expect(letterPitch(3, F4, 0)?.midi).toBe(65); // the same F
  });

  it('is read in the key', () => {
    expect(letterPitch(3, F4, 1)?.midi).toBe(66); // F♯4 in G major
    expect(letterPitch(6, F4, -1)?.midi).toBe(70); // B♭4 in F major
  });

  it('climbs above the last note to join its chord', () => {
    expect(letterPitch(4, E4, 0, true)?.midi).toBe(67); // G4 over E4
    expect(letterPitch(2, E4, 0, true)?.midi).toBe(76); // E5 over E4
    expect(letterPitch(0, E4, 0, true)?.midi).toBe(72); // C5 over E4
  });

  it('sounds an octave below the line it is written on, on the bass clef with an 8', () => {
    const D3 = 3 * 7 + 1; // the middle line, as written
    // C: written C3, a step down; it sounds C2.
    expect(letterPitch(0, D3, 0, false, 'bass8vb')).toEqual({
      midi: 36,
      step: 3 * 7,
    });
    expect(letterPitch(0, D3, 0, false, 'bass')?.midi).toBe(48);
    expect(letterPitch(0, 4 * 7, 0, false, 'alto')?.midi).toBe(60);
  });
});

describe('the step a note sounds on', () => {
  it('is an octave below the written one on the bass clef with an 8', () => {
    expect(soundingStep(3 * 7, 'bass8vb')).toBe(2 * 7);
    expect(soundingStep(3 * 7, 'bass')).toBe(3 * 7);
    expect(soundingStep(4 * 7, 'alto')).toBe(4 * 7);
  });

  it('names a pinned spelling in the octave the note sounds', () => {
    // G♯2 written on the G3 space of the bass clef with an 8, no key set
    // and an inferred A major: the default name A♭ would move it, so G♯2 is
    // pinned, not the G♯3 it is drawn as.
    const written = 3 * 7 + 4; // G3, as written
    expect(
      pinnedSpelling(44, soundingStep(written, 'bass8vb'), 3, null, 'ionian'),
    ).toBe('G♯2');
  });
});

describe('the spelling a written note keeps', () => {
  it('is the key’s own when the song has a key', () => {
    // F major, B♭4 on the B line: the key spells it B♭ already.
    expect(pinnedSpelling(70, 4 * 7 + 6, -1, 5, 'ionian')).toBeNull();
  });

  it('is pinned when the default names would move it', () => {
    // No key set and an inferred A major: the default name for G♯ is A♭.
    expect(pinnedSpelling(68, 4 * 7 + 4, 3, null, 'ionian')).toBe('G♯4');
    expect(pinnedSpelling(70, 4 * 7 + 6, -1, null, 'ionian')).toBeNull();
    expect(pinnedSpelling(72, 5 * 7, 0, null, 'ionian')).toBeNull();
  });
});

// ── Writing a note ─────────────────────────────────────────────────────────

const ev = (
  note: number,
  startTick: number,
  durationTicks: number,
  id = `${note}-${startTick}`.padEnd(12, 'x').slice(0, 12),
): MidiNoteEvent => ({
  id,
  note,
  velocity: 90,
  startTick,
  durationTicks,
  channel: 0,
});

const trackWith = (
  clips: Array<{
    id: string;
    startTick: number;
    durationTicks?: number;
    events: MidiNoteEvent[];
  }>,
) => [{ id: 't', midiClips: clips }] as unknown as Track[];

const base = {
  trackId: 't',
  velocity: 100,
  barTicks: 1920,
};

/** The one write's events, as `note@start:length`. */
const written = (plan: ReturnType<typeof planNoteInsert>, clipId = 'c') =>
  plan?.writes
    .find((w) => w.clipId === clipId)
    ?.events.map((e) => `${e.note}@${e.startTick}:${e.durationTicks}`);

describe('writing a note', () => {
  it('makes a clip from the bar’s start where the track has none', () => {
    const plan = planNoteInsert(trackWith([]), {
      ...base,
      tick: 1920 + 480,
      durationTicks: 480,
      midi: 72,
    });
    expect(plan?.writes).toHaveLength(1);
    const [write] = plan!.writes;
    expect(write.newClipStartTick).toBe(1920);
    expect(write.durationTicks).toBe(1920);
    expect(write.events.map((e) => [e.note, e.startTick, e.velocity])).toEqual([
      [72, 480, 100],
    ]);
    expect(plan?.noteId).toBe(`t:${write.clipId}:480:72`);
  });

  it('writes over the notes starting inside it', () => {
    const tracks = trackWith([
      {
        id: 'c',
        startTick: 0,
        durationTicks: 1920,
        events: [ev(60, 0, 480), ev(62, 480, 480), ev(64, 960, 960)],
      },
    ]);
    const quarter = planNoteInsert(tracks, {
      ...base,
      tick: 480,
      durationTicks: 480,
      midi: 67,
    });
    expect(written(quarter)).toEqual(['60@0:480', '67@480:480', '64@960:960']);
    expect(quarter?.removed).toEqual(['t:c:480:62']);
    expect(quarter?.noteId).toBe('t:c:480:67');

    const half = planNoteInsert(tracks, {
      ...base,
      tick: 480,
      durationTicks: 960,
      midi: 67,
    });
    expect(written(half)).toEqual(['60@0:480', '67@480:960']);
    expect(half?.removed).toEqual(['t:c:480:62', 't:c:960:64']);
  });

  it('cuts a note held into it short', () => {
    const plan = planNoteInsert(
      trackWith([{ id: 'c', startTick: 0, events: [ev(60, 0, 1920)] }]),
      { ...base, tick: 960, durationTicks: 480, midi: 67 },
    );
    expect(written(plan)).toEqual(['60@0:960', '67@960:480']);
    expect(plan?.trimmed).toEqual(['t:c:0:60']);
    expect(plan?.removed).toEqual([]);
  });

  it('goes by where notes are drawn, not where they were played', () => {
    // Played 5 ticks early, written on beat 2.
    const tracks = trackWith([
      { id: 'c', startTick: 0, events: [ev(60, 0, 470), ev(62, 475, 480)] },
    ]);
    const drawn = new Map<string, DrawnSpan>([
      ['t:c:0:60', { staff: 'treble', start: 0, end: 480 }],
      ['t:c:475:62', { staff: 'treble', start: 480, end: 960 }],
    ]);
    const plan = planNoteInsert(tracks, {
      ...base,
      tick: 480,
      durationTicks: 480,
      midi: 67,
      drawn,
    });
    expect(written(plan)).toEqual(['60@0:470', '67@480:480']);
    expect(plan?.removed).toEqual(['t:c:475:62']);
  });

  it('writes over only the staff it is written on', () => {
    const tracks = trackWith([
      { id: 'c', startTick: 0, events: [ev(48, 480, 480), ev(72, 480, 480)] },
    ]);
    const drawn = new Map<string, DrawnSpan>([
      ['t:c:480:48', { staff: 'bass', start: 480, end: 960 }],
      ['t:c:480:72', { staff: 'treble', start: 480, end: 960 }],
    ]);
    const plan = planNoteInsert(tracks, {
      ...base,
      tick: 480,
      durationTicks: 480,
      midi: 43,
      staff: 'bass',
      drawn,
    });
    expect(written(plan)?.sort()).toEqual(['43@480:480', '72@480:480']);
    expect(plan?.removed).toEqual(['t:c:480:48']);
  });

  it('joins the chord with Shift, at the chord’s length', () => {
    const tracks = trackWith([
      { id: 'c', startTick: 0, events: [ev(60, 0, 480), ev(64, 480, 960)] },
    ]);
    const plan = planNoteInsert(tracks, {
      ...base,
      tick: 480,
      durationTicks: 240,
      midi: 67,
      chord: true,
    });
    expect(written(plan)).toEqual(['60@0:480', '64@480:960', '67@480:960']);
    expect(plan?.removed).toEqual([]);
    expect(plan?.durationTicks).toBe(960);
  });

  it('picks a chord note already there rather than doubling it', () => {
    const plan = planNoteInsert(
      trackWith([{ id: 'c', startTick: 0, events: [ev(64, 480, 960)] }]),
      { ...base, tick: 480, durationTicks: 240, midi: 64, chord: true },
    );
    expect(plan?.writes).toEqual([]);
    expect(plan?.noteId).toBe('t:c:480:64');
  });

  it('writes as usual with Shift where no chord starts', () => {
    const plan = planNoteInsert(
      trackWith([{ id: 'c', startTick: 0, events: [ev(60, 0, 1920)] }]),
      { ...base, tick: 480, durationTicks: 480, midi: 67, chord: true },
    );
    expect(written(plan)).toEqual(['60@0:480', '67@480:480']);
  });

  it('grows a clip of set length to hold a note past its end', () => {
    const plan = planNoteInsert(
      trackWith([
        {
          id: 'c',
          startTick: 0,
          durationTicks: 1920,
          events: [ev(60, 0, 480)],
        },
      ]),
      { ...base, tick: 1920 + 960, durationTicks: 480, midi: 67 },
    );
    const write = plan!.writes.find((w) => w.clipId === 'c')!;
    expect(write.durationTicks).toBe(3840);
    expect(written(plan)).toEqual(['60@0:480', '67@2880:480']);
  });

  it('gives the new note an id of its own', () => {
    const plan = planNoteInsert(trackWith([]), {
      ...base,
      tick: 0,
      durationTicks: 480,
      midi: 60,
    });
    expect(plan?.writes[0].events[0].id).toMatch(/^[A-Za-z0-9][\w-]{11}$/);
  });
});

describe('where notes are drawn', () => {
  it('takes a held note’s tied pieces together, on its staff', () => {
    const score = buildScore(
      [
        { id: 'low', midi: 48, startTick: 0, durationTicks: 480 },
        { id: 'held', midi: 72, startTick: 1440, durationTicks: 960 },
      ],
      { ticksPerQuarter: 480, timeSignature: [4, 4], keyFifths: 0 },
    );
    const spans = drawnSpans(score);
    expect(spans.get('low')).toEqual({ staff: 'bass', start: 0, end: 480 });
    expect(spans.get('held')).toEqual({
      staff: 'treble',
      start: 1440,
      end: 2400,
    });
  });
});
