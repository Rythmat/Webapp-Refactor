// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import {
  addInstrumentTrack,
  setTrackInstrument,
} from '@/daw/commands/trackCommands';
import { useMusicalTypingStore } from '@/daw/commands/musicalTypingStore';
import { applyDemo, prepareDemo } from '@/daw/data/demoSeed';
import { loadGrooveEvents } from '@/daw/midi/loadGrooveEvents';
import {
  forgetLiveSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import { resetProjectState } from '@/daw/persistence/projectDocument/initialState';
import { useStore } from '@/daw/store';
import { MAX_TOTAL_TRACKS } from '@/daw/store/tracksSlice';
import { initUndoTracking, resetUndoHistory } from '@/daw/store/undoMiddleware';
import { toggleTrackNotes } from '@/daw/utils/insightSelection';
import { idsOf } from '../anchorRegistry';
import type { DemoBeat } from '../demo/demoTypes';
import { getTutorial, type TutorialStep } from '../tutorials';
import { bottomTrack, TRACK_SLOTS } from '../studioBasics/trackChecks';
import { pianoRollOpen } from '../studioBasics/pianoRollChecks';

/**
 * Studio Basics 1 to 5 on the course's demo song (Melody, Chords, Bass,
 * Drums), step by step as a student meets them, on one store:
 *
 * - each step's demo is played through the store: its `run` actions, and
 *   what each click on its targets does in the Studio (a mute, a selection,
 *   an open Inspector), with menus, pickers, tools and key presses changing
 *   nothing in the song; the Studio must be as the demo found it;
 * - the step's check, armed against that Studio, doesn't pass yet;
 * - the student's move (the store change a click or a key makes) passes it.
 *
 * The browser walkthrough plays the same lessons for real, in Chromium.
 */

vi.mock('@/daw/midi/loadGrooveEvents', () => ({
  loadGrooveEvents: vi.fn(),
}));

const s = () => useStore.getState();
const grooves = vi.mocked(loadGrooveEvents);

const HITS: MidiNoteEvent[] = [
  { note: 36, velocity: 100, startTick: 0, durationTicks: 120, channel: 9 },
  { note: 38, velocity: 100, startTick: 960, durationTicks: 120, channel: 9 },
];

async function openDemoSong(): Promise<void> {
  grooves.mockResolvedValue(HITS);
  const prepared = await prepareDemo('demo-studio-basics');
  if (!prepared) throw new Error('no demo-studio-basics');
  resetProjectState('open:demo');
  resetUndoHistory();
  applyDemo(prepared);
  resetUndoHistory();
}

beforeAll(() => {
  initUndoTracking();
});

beforeEach(async () => {
  localStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  useMusicalTypingStore.setState({ enabled: false });
  forgetLiveSession();
  resetSessionToEmpty();
  await openDemoSong();
});

const trackAt = (i: number) => {
  const track = s().tracks[i];
  if (!track) throw new Error(`no track ${i}`);
  return track;
};
const lastIndex = () => s().tracks.length - 1;

// ── The demos, through the store ──────────────────────────────────────────

/** Anchors whose click changes nothing in the song: menus, pickers, tools. */
const UI_ONLY = [
  /^dock-instrument$/,
  /^track-instrument-\d+$/,
  /^instrument-picker$/,
  /^instrument-family-/,
  /^instrument-/,
  /^add-track-(button|soundfont|menu)$/,
  /^track-menu-(button|monitor|change-instrument)$/,
  /^count-in-(menu|0|1|2)$/,
  /^top-bar-more$/,
  /^piano-roll-tool-/,
  /^piano-roll-(grid|keys|select-all|modal)$/,
  /^insight-(tab|tracks|selection|analyze)$/,
  /^selected-track-header$/,
];

/** Whether an anchor is on screen in this song (a per-track one needs its track). */
function present(id: string): boolean {
  const perTrack = id.match(/^(?:track|insight)-[a-z]+-(\d+)$/);
  if (perTrack) return Number(perTrack[1]) < s().tracks.length;
  const clip = id.match(/^timeline-clip-(\d+)-(\d+)$/);
  if (clip) {
    return !!s().tracks[Number(clip[1])]?.midiClips[Number(clip[2])];
  }
  if (id.startsWith('piano-roll-')) return pianoRollOpen(s(), s());
  if (id === 'musical-typing') return useMusicalTypingStore.getState().enabled;
  return true;
}

/** What a click (or double-click) on `id` does in the store. */
function clickOn(id: string, action: 'click' | 'doubleClick'): void {
  const n = (re: RegExp) => Number(id.match(re)?.[1]);
  if (/^track-(name|header)-\d+$/.test(id)) {
    s().setSelectedTrackId(trackAt(n(/(\d+)$/)).id);
  } else if (/^track-mute-\d+$/.test(id)) {
    s().toggleMute(trackAt(n(/(\d+)$/)).id);
  } else if (/^track-solo-\d+$/.test(id)) {
    s().toggleSolo(trackAt(n(/(\d+)$/)).id);
  } else if (/^track-arm-\d+$/.test(id)) {
    s().toggleRecordArm(trackAt(n(/(\d+)$/)).id);
  } else if (/^track-monitor-\d+$/.test(id)) {
    s().toggleMonitoring(trackAt(n(/(\d+)$/)).id);
  } else if (id === 'metronome-toggle') {
    s().toggleMetronome();
  } else if (id === 'inspector-toggle' || id === 'rail-insight') {
    // Stage B: the side rail's Insight button (inspector-toggle's alias).
    s().toggleInspectorPanel('insight');
  } else if (id === 'musical-typing' || id === 'top-bar-more-typing') {
    // The Typing pill, and the top bar ⋯ menu's switch.
    useMusicalTypingStore.getState().toggle();
  } else if (/^insight-track-\d+$/.test(id)) {
    const track = trackAt(n(/(\d+)$/));
    s().setSelectedNotes(toggleTrackNotes(track, s().selectedNotes));
  } else if (/^timeline-clip-\d+-\d+$/.test(id)) {
    const [, t, c] = id.match(/^timeline-clip-(\d+)-(\d+)$/)!;
    const track = trackAt(Number(t));
    const clip = track.midiClips[Number(c)];
    s().setSelectedClip(clip.id, track.id);
    // Stage B: the clip's notes open in the dock's Notes tab.
    if (action === 'doubleClick') openNotes(track.id);
  } else if (id === 'piano-roll-close') {
    closeNotes();
  } else if (!UI_ONLY.some((re) => re.test(id))) {
    throw new Error(`the test doesn't know what a click on ${id} does`);
  }
}

/** The dock's Notes tab on `trackId`: Stage B's Piano Roll. */
function openNotes(trackId: string): void {
  s().setSelectedTrackId(trackId);
  s().setChannelStripTab('piano-roll');
}

/** Back to the dock's Instrument tab: the Piano Roll closed. */
function closeNotes(): void {
  s().setChannelStripTab('controls');
}

/** Plays a demo's beats as the player would, through the store. */
async function playDemo(beats: readonly DemoBeat[]): Promise<void> {
  for (const beat of beats) {
    const ids = idsOf(beat.target);
    const id = ids.find(present) ?? null;
    const { action } = beat;
    if (typeof action === 'function') {
      await action(s());
    } else if (action === 'click' || action === 'doubleClick') {
      // A pointer action on a target that isn't there is passed over.
      if (id) clickOn(id, action);
    }
    // 'hover' and key presses (Esc in a menu or picker; A and S while
    // Typing is on, a note on and off) leave the song as it was.
  }
}

/** The Studio a demo must leave as it found it. */
const studio = () => {
  const st = s();
  return {
    tracks: st.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      instrument: t.instrument,
      gmProgram: t.gmProgram,
      bassVoice: t.bassVoice,
      drumKit: t.drumKit,
      mute: t.mute,
      solo: t.solo,
      recordArmed: t.recordArmed,
      monitoring: t.monitoring,
      clips: t.midiClips.map((c) => ({ id: c.id, events: c.events })),
    })),
    metronome: st.metronomeEnabled,
    countIn: st.countInBars,
    library: st.libraryOpen,
    editing: pianoRollOpen(st, st),
    selectedNotes: st.selectedNotes,
    analysis: st.selectionAnalysis,
    recording: st.isRecording || st.isCountingIn,
    typing: useMusicalTypingStore.getState().enabled,
  };
};

// ── A lesson, step by step ────────────────────────────────────────────────

type Move = () => void;

/**
 * Runs lesson `id` on the store: each step's demo, then its check against
 * the Studio the demo left (it mustn't pass), then the student's move (it
 * must). A step with no check is free-form, so no move. A step in `quiet`
 * is one the Studio already satisfies as it arrives (the layer passes it
 * quietly), so it has no move either.
 */
async function walk(
  id: string,
  moves: Record<string, Move>,
  quiet: readonly string[] = [],
): Promise<void> {
  const lesson = getTutorial(id);
  if (!lesson) throw new Error(`no lesson ${id}`);
  expect(Object.keys(moves).sort()).toEqual(
    lesson.steps
      .filter((step) => step.check && !quiet.includes(step.id))
      .map((step) => step.id)
      .sort(),
  );
  for (const step of lesson.steps) {
    // The step's preconditions, as the lesson layer sets them on arrival.
    const r = step.requires;
    if (r?.view !== undefined) s().setCurrentView(r.view);
    if (r?.libraryOpen !== undefined) s().setLibraryOpen(r.libraryOpen);
    if (r?.channelStripTab !== undefined) {
      s().setChannelStripTab(r.channelStripTab);
    }
    const before = studio();
    if (step.demo) await playDemo(step.demo);
    expect(studio(), `${id}/${step.id}: the demo restores the Studio`).toEqual(
      before,
    );
    if (!step.check) continue;
    const armed = s();
    const where = `${id}/${step.id}`;
    if (quiet.includes(step.id)) {
      expect(step.check(armed, armed), `${where} on arrival`).toBe(true);
      continue;
    }
    expect(step.check(armed, armed), `${where} before the move`).toBe(false);
    moves[step.id]();
    expect(step.check(s(), armed), `${where} after the move`).toBe(true);
  }
}

const YOUR_TRACKS: Record<string, Move> = {
  'select-track': () => s().setSelectedTrackId(trackAt(1).id),
  'change-instrument': () => {
    expect(setTrackInstrument(trackAt(1).id, 'trumpet')).toBe(true);
  },
  mute: () => s().toggleMute(trackAt(1).id),
  unmute: () => s().toggleMute(trackAt(1).id),
  solo: () => s().toggleSolo(trackAt(1).id),
  unsolo: () => s().toggleSolo(trackAt(1).id),
  arm: () => s().toggleRecordArm(trackAt(1).id),
  // Monitor input, in the chosen row's ⋯ menu.
  monitor: () => s().toggleMonitoring(trackAt(1).id),
};

const ADD_A_TRACK: Record<string, Move> = {
  'add-track': () => {
    expect(addInstrumentTrack('flute')).not.toBe('');
  },
  'new-sound': () => {
    expect(setTrackInstrument(trackAt(lastIndex()).id, 'clarinet')).toBe(true);
  },
  mute: () => s().toggleMute(trackAt(lastIndex()).id),
  unmute: () => s().toggleMute(trackAt(lastIndex()).id),
  solo: () => s().toggleSolo(trackAt(lastIndex()).id),
  unsolo: () => s().toggleSolo(trackAt(lastIndex()).id),
  arm: () => s().toggleRecordArm(trackAt(lastIndex()).id),
  monitor: () => s().toggleMonitoring(trackAt(lastIndex()).id),
};

/**
 * The take a recording keeps on `trackId` (useMidiRecording's clip), as the
 * student's Pause ends it.
 */
const keepTake = (trackId: string) => {
  s().addMidiClip(trackId, {
    id: 'take-1',
    startTick: 0,
    events: [
      { note: 60, velocity: 100, startTick: 0, durationTicks: 240, channel: 0 },
    ],
  });
  s().pause();
};

const RECORD: Record<string, Move> = {
  'click-on': () => s().toggleMetronome(),
  'click-off': () => s().toggleMetronome(),
  'count-in': () => s().setCountInBars(1),
  'choose-track': () => {
    // The Drums track (selected as the song opens) armed, the Melody's arm
    // (armed as it opens) off.
    const drums = trackAt(3);
    s().setSelectedTrackId(drums.id);
    s().toggleRecordArm(drums.id);
    s().toggleRecordArm(trackAt(0).id);
  },
  // Monitor input on the Drums, off on the Melody (on as it opens).
  monitor: () => {
    s().toggleMonitoring(trackAt(3).id);
    s().toggleMonitoring(trackAt(0).id);
  },
  'play-notes': () => s().hwNoteOn(60),
  record: () => s().record(),
  stop: () => keepTake(trackAt(3).id),
};

/** Edits the Melody's clip as the roll does (updateMidiClipEvents). */
const editMelody = (edit: (events: MidiNoteEvent[]) => MidiNoteEvent[]) => {
  const track = trackAt(0);
  const clip = track.midiClips[0];
  s().updateMidiClipEvents(track.id, clip.id, edit(clip.events));
};

const PIANO_ROLL: Record<string, Move> = {
  open: () => openNotes(trackAt(0).id),
  'add-note': () =>
    editMelody((events) => [
      ...events,
      {
        note: 84,
        velocity: 100,
        startTick: 480 * 14,
        durationTicks: 480,
        channel: 0,
      },
    ]),
  'move-note': () =>
    editMelody((events) =>
      events.map((e, i) =>
        i === 0 ? { ...e, startTick: e.startTick + 240 } : e,
      ),
    ),
  'resize-note': () =>
    editMelody((events) =>
      events.map((e, i) =>
        i === 1 ? { ...e, durationTicks: e.durationTicks + 240 } : e,
      ),
    ),
  'delete-note': () => editMelody((events) => events.slice(1)),
  close: closeNotes,
};

const INSIGHT: Record<string, Move> = {
  'open-insight': () => s().toggleInspectorPanel('insight'),
  'pick-chords': () =>
    s().setSelectedNotes(toggleTrackNotes(trackAt(1), s().selectedNotes)),
  'pick-bass': () =>
    s().setSelectedNotes(toggleTrackNotes(trackAt(2), s().selectedNotes)),
  analyze: () => s().analyzeNoteSelection(s().selectedNotes),
};

describe('Studio Basics 1 to 5 on the demo song', () => {
  it('has the song the lessons are written for', () => {
    expect(s().tracks.map((t) => t.name)).toEqual([
      'Melody',
      'Chords',
      'Bass',
      'Drums',
    ]);
    // As the song opens: the top track armed and monitored, the drums
    // selected.
    expect(s().tracks.map((t) => t.recordArmed)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(s().selectedTrackId).toBe(trackAt(3).id);
  });

  it('Your Tracks: each demo restores the Studio, each move passes its step', async () => {
    await walk('studio-basics-your-tracks', YOUR_TRACKS);
    // Arm and Monitor input stay on; M and S are back off.
    const chords = trackAt(1);
    expect([chords.mute, chords.solo]).toEqual([false, false]);
    expect([chords.recordArmed, chords.monitoring]).toEqual([true, true]);
  });

  it('Add a Track: on the track it adds, at the bottom', async () => {
    await walk('studio-basics-add-a-track', ADD_A_TRACK);
    expect(s().tracks).toHaveLength(5);
    expect(trackAt(4).name).toBe('Clarinet');
    expect(s().selectedTrackId).toBe(trackAt(4).id);
  });

  it('Record: the Click, the count-in, one armed track, a take kept', async () => {
    await walk('studio-basics-record', RECORD);
    expect(trackAt(3).midiClips.map((c) => c.id)).toContain('take-1');
    // The lesson shut the dock as it began, so every row shows.
    expect(s().channelStripTab).toBeNull();
    expect(s().tracks.map((t) => [t.recordArmed, t.monitoring])).toEqual([
      [false, false],
      [false, false],
      [false, false],
      [true, true],
    ]);
  });

  it('The Piano Roll: open, add, move, stretch, delete, close', async () => {
    await walk('studio-basics-piano-roll', PIANO_ROLL);
    expect(pianoRollOpen(s(), s())).toBe(false);
  });

  it('Insight: the chords and bass tracks name 1 6 4 5', async () => {
    await walk('studio-basics-insight', INSIGHT);
    const doc = s().selectionAnalysis?.doc;
    expect(doc).toBeDefined();
    const { chordTimeline, key } = doc!.analysis;
    expect(key.rootPc).toBe(0);
    // Insight shows these as 1 maj → 6 min → 4 maj → 5 maj.
    expect(chordTimeline.map((c) => c.hybridName)).toEqual([
      '1 major',
      '6 minor',
      '4 major',
      '5 major',
    ]);
  });

  it('chains from lesson 1 to 5 on one song, as Next: does', async () => {
    await walk('studio-basics-your-tracks', YOUR_TRACKS);
    await walk('studio-basics-add-a-track', ADD_A_TRACK);
    await walk('studio-basics-record', {
      ...RECORD,
      // After Add a Track: the new track is chosen, armed and monitored,
      // under the armed and monitored Melody and Chords. Their Arm and
      // Monitor input go off.
      'choose-track': () => {
        s().toggleRecordArm(trackAt(0).id);
        s().toggleRecordArm(trackAt(1).id);
      },
      monitor: () => {
        s().toggleMonitoring(trackAt(0).id);
        s().toggleMonitoring(trackAt(1).id);
      },
      stop: () => keepTake(trackAt(4).id),
    });
    expect(trackAt(4).midiClips.map((c) => c.id)).toEqual(['take-1']);
    await walk('studio-basics-piano-roll', PIANO_ROLL);
    await walk('studio-basics-insight', INSIGHT);
  });
});

describe('the steps’ checks on other songs', () => {
  const step = (lesson: string, id: string): TutorialStep => {
    const found = getTutorial(lesson)?.steps.find((st) => st.id === id);
    if (!found) throw new Error(`no ${lesson}/${id}`);
    return found;
  };

  it('take any track, not the one the demo shows', () => {
    const mute = step('studio-basics-your-tracks', 'mute').check!;
    const armed = s();
    s().toggleMute(trackAt(3).id);
    expect(mute(s(), armed)).toBe(true);
  });

  it('pass a song with one track where there is nothing else to pick', () => {
    const select = step('studio-basics-your-tracks', 'select-track').check!;
    const pickBass = step('studio-basics-insight', 'pick-bass').check!;
    const only = trackAt(0);
    for (const t of s().tracks.slice(1)) s().removeTrack(t.id);
    expect(s().tracks).toHaveLength(1);
    const armed = s();
    expect(select(armed, armed)).toBe(true);
    s().setSelectedNotes(toggleTrackNotes(only, s().selectedNotes));
    expect(pickBass(s(), armed)).toBe(true);
  });

  it('take a switch that was on already once it goes off and on again', () => {
    const arm = step('studio-basics-your-tracks', 'arm').check!;
    // The Chords armed already, as on a second run of the course.
    s().toggleRecordArm(trackAt(1).id);
    const armed = s();
    expect(arm(armed, armed)).toBe(false);
    s().toggleRecordArm(trackAt(1).id);
    expect(arm(s(), armed)).toBe(false);
    s().toggleRecordArm(trackAt(1).id);
    expect(arm(s(), armed)).toBe(true);
  });

  it('don’t hold up an unmute when nothing was muted', () => {
    const unmute = step('studio-basics-your-tracks', 'unmute').check!;
    const armed = s();
    expect(unmute(armed, armed)).toBe(true);
  });

  it('record on the chosen track only when no other track is armed', () => {
    const choose = step('studio-basics-record', 'choose-track').check!;
    const armed = s();
    // Drums chosen and armed, the Melody still armed: the take would go on
    // the Melody.
    s().toggleRecordArm(trackAt(3).id);
    expect(choose(s(), armed)).toBe(false);
    s().toggleRecordArm(trackAt(0).id);
    expect(choose(s(), armed)).toBe(true);
    // An armed track under the chosen one holds it up too.
    s().setSelectedTrackId(trackAt(1).id);
    s().toggleRecordArm(trackAt(1).id);
    expect(choose(s(), armed)).toBe(false);
    s().toggleRecordArm(trackAt(3).id);
    expect(choose(s(), armed)).toBe(true);
    // Choosing the armed Melody itself, alone, passes too.
    s().toggleRecordArm(trackAt(1).id);
    s().toggleRecordArm(trackAt(0).id);
    s().setSelectedTrackId(trackAt(0).id);
    expect(choose(s(), armed)).toBe(true);
  });

  it('hear the live notes on the armed track only', () => {
    const monitor = step('studio-basics-record', 'monitor').check!;
    const armed = s();
    // As the song opens, the Melody is armed and monitored, alone.
    expect(monitor(armed, armed)).toBe(true);
    s().toggleMonitoring(trackAt(1).id);
    expect(monitor(s(), armed)).toBe(false);
    s().toggleMonitoring(trackAt(1).id);
    s().toggleMonitoring(trackAt(0).id);
    expect(monitor(s(), armed)).toBe(false);
    // Nothing armed: there is no track to hear.
    s().toggleMonitoring(trackAt(0).id);
    s().toggleRecordArm(trackAt(0).id);
    expect(monitor(s(), armed)).toBe(false);
  });

  it('keep a take only once it has stopped, with notes in it', () => {
    const stop = step('studio-basics-record', 'stop').check!;
    s().record();
    const armed = s();
    s().addMidiClip(trackAt(0).id, {
      id: 'empty',
      startTick: 0,
      events: [],
    });
    s().stop();
    expect(stop(s(), armed)).toBe(false);
    s().record();
    keepTake(trackAt(0).id);
    expect(stop(s(), armed)).toBe(true);
  });

  it('tell a move from a stretch', () => {
    const moved = step('studio-basics-piano-roll', 'move-note').check!;
    const resized = step('studio-basics-piano-roll', 'resize-note').check!;
    const armed = s();
    PIANO_ROLL['resize-note']();
    expect(resized(s(), armed)).toBe(true);
    expect(moved(s(), armed)).toBe(false);
  });
});

describe('the lessons’ targets and copy', () => {
  const LESSONS = [
    'studio-basics-your-tracks',
    'studio-basics-add-a-track',
    'studio-basics-record',
    'studio-basics-piano-roll',
    'studio-basics-insight',
  ];

  it('point at the bottom track from the last slot up', () => {
    expect(TRACK_SLOTS).toBe(MAX_TOTAL_TRACKS);
    const ids = bottomTrack('track-mute-');
    expect(ids).toHaveLength(MAX_TOTAL_TRACKS);
    expect(ids[0]).toBe(`track-mute-${MAX_TOTAL_TRACKS - 1}`);
    expect(ids.at(-1)).toBe('track-mute-0');
  });

  it.each(LESSONS)('%s: short captions, plain words, a wrap-up last', (id) => {
    const lesson = getTutorial(id)!;
    const stage = lesson.title.charAt(0) + lesson.title.slice(1).toLowerCase();
    expect(lesson.steps.length).toBeGreaterThanOrEqual(5);
    expect(lesson.steps.length).toBeLessThanOrEqual(10);
    for (const step of lesson.steps) {
      expect(step.stage, step.id).toBe(stage);
      const words = [step.instruction, step.hint ?? ''].join(' ');
      expect(words, step.id).not.toMatch(/\b(simply|just)\b|colour/i);
      for (const beat of step.demo ?? []) {
        const count = beat.caption.replace(/\*\*/g, '').split(/\s+/).length;
        expect(count, `${step.id}: ${beat.caption}`).toBeGreaterThanOrEqual(3);
        expect(count, `${step.id}: ${beat.caption}`).toBeLessThanOrEqual(8);
        expect(beat.caption, step.id).not.toMatch(/\b(simply|just)\b/i);
      }
    }
    const last = lesson.steps.at(-1)!;
    expect(last.id).toBe('wrap-up');
    expect(last.check).toBeUndefined();
    expect(last.instruction).toMatch(/Next:/);
  });
});
