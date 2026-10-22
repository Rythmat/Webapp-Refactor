import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── What the clip menu does (milestone 2.12) ───────────────────────────────
// Each action is one undo step with a label, works on the clip it names, and
// leaves drums, the keyboard's ends and a clip's other fade alone. Run:
// npx vitest run src/daw/shell/canvas/clipMenu/__tests__/clipActions.test.ts

const h = vi.hoisted(() => ({
  playhead: 0,
  prompt: null as string | null,
  shared: [] as Array<[string, string]>,
  toasts: [] as Array<{ title?: string; description?: string }>,
}));
vi.mock('@/daw/engine/playheadClock', () => ({
  getPlayheadTick: () => h.playhead,
}));
vi.mock('@/daw/ui/DialogHost', () => ({
  promptDialog: () => Promise.resolve(h.prompt),
}));
vi.mock('@/daw/shell/notice', () => ({
  notice: (t: { title?: string; description?: string }) => {
    h.toasts.push(t);
  },
}));
vi.mock('@/daw/audio/AudioBufferStore', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  shareClipAudio: (from: string, to: string) => {
    h.shared.push([from, to]);
    return true;
  },
}));

import type { UserPresence } from '@/daw/collab/types';
import { noteKey } from '@/daw/model/noteKeys';
import { useStore } from '@/daw/store';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
} from '@/daw/store/history';
import type { AudioClip, MidiClip } from '@/daw/store/tracksSlice';
import {
  copyClip,
  createClipAt,
  cutClip,
  deleteClipStep,
  duplicateClip,
  pasteClipboard,
  quantizeClip,
  renameClip,
  setClipFade,
  splitClipAtPlayhead,
  toggleClipFade,
  toggleClipMute,
  transposeClip,
} from '../clipActions';
import { runCanvasMenuItem } from '../runCanvasMenuItem';

const s = () => useStore.getState();
const note = (n: number, startTick = 0, durationTicks = 240) => ({
  id: `n${n}-${startTick}`,
  note: n,
  velocity: 100,
  startTick,
  durationTicks,
  channel: 0,
});

let keys = '';
let drums = '';
let vocal = '';
const KEYS = () => ({ trackId: keys, clipId: 'keys-1' });
const TAKE = () => ({ trackId: vocal, clipId: 'take-1' });
const keysClip = () => s().tracks[0].midiClips.find((c) => c.id === 'keys-1');
const take = () => s().tracks[2].audioClips.find((c) => c.id === 'take-1');

let stopHistory: () => void;
beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  h.playhead = 0;
  h.prompt = null;
  h.shared = [];
  h.toasts = [];
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  drums = s().addTrack('midi', 'drum-machine', 'Beat');
  vocal = s().addTrack('audio', 'audio-input', 'Vocal');
  s().addMidiClip(keys, {
    id: 'keys-1',
    // Off the grid: bar 2 and a 16th.
    startTick: 1920 + 120,
    events: [note(60, 0), note(64, 250), note(67, 470)],
  } as MidiClip);
  s().addMidiClip(drums, {
    id: 'beat-1',
    startTick: 0,
    events: [note(36), note(38, 960)],
  } as MidiClip);
  s().addAudioClip(vocal, {
    id: 'take-1',
    startTick: 0,
    duration: 3840,
    fadeInTicks: 0,
    fadeOutTicks: 0,
  } as AudioClip);
  resetHistory();
  stopHistory = startHistory();
});
afterEach(() => stopHistory());

describe('Transpose', () => {
  it('moves every note and keeps their ids, as one undo step', () => {
    const ids = keysClip()!.events.map((e) => e.id);
    expect(transposeClip(KEYS(), 3)).toBe(true);
    expect(keysClip()!.events.map((e) => e.note)).toEqual([63, 67, 70]);
    expect(keysClip()!.events.map((e) => e.id)).toEqual(ids);
    expect(historyLabels().at(-1)).toBe('Transpose clip');
    undo();
    expect(keysClip()!.events.map((e) => e.note)).toEqual([60, 64, 67]);
  });

  it('never moves drums', () => {
    expect(transposeClip({ trackId: drums, clipId: 'beat-1' }, 1)).toBe(false);
    expect(s().tracks[1].midiClips[0].events.map((e) => e.note)).toEqual([
      36, 38,
    ]);
  });

  it('refuses a move that would push a note off the keyboard', () => {
    expect(transposeClip(KEYS(), 61)).toBe(false);
    expect(keysClip()!.events.map((e) => e.note)).toEqual([60, 64, 67]);
  });
});

describe('Quantize', () => {
  it('never moves a note before its clip starts', () => {
    // 2040 would go to 1920 on a 1/4 grid: it stays at the clip's start.
    quantizeClip(KEYS(), '1/4');
    expect(keysClip()!.events[0].startTick).toBe(0);
  });

  it('lands notes on the song’s grid, not the clip’s, keeping lengths', () => {
    // The clip starts a 16th after bar 2: its notes at song ticks 2040,
    // 2290 and 2510 go to the nearest 1/8 line (every 240 from the bar line
    // at 1920): 2160, 2400 and 2400. On the clip's own grid they'd be 2040,
    // 2280 and 2520.
    expect(quantizeClip(KEYS(), '1/8')).toBe(true);
    const clip = keysClip()!;
    expect(clip.events.map((e) => clip.startTick + e.startTick)).toEqual([
      2160, 2400, 2400,
    ]);
    expect(clip.events.map((e) => e.durationTicks)).toEqual([240, 240, 240]);
    expect(historyLabels().at(-1)).toBe('Quantize clip');
  });

  it('snaps triplets from the bar lines in any metre', () => {
    useStore.setState({
      timeSignatureNumerator: 6,
      timeSignatureDenominator: 8,
    });
    expect(quantizeClip(KEYS(), '1/8T')).toBe(true);
    const clip = keysClip()!;
    for (const e of clip.events) {
      expect((clip.startTick + e.startTick) % 160).toBe(0);
    }
  });

  it('runs to the timeline’s own grid from the menu', () => {
    useStore.setState({ timelineGridSize: '1/4' });
    // On the bar line, so no note is held back by the clip's start.
    s().updateMidiClip(keys, 'keys-1', { startTick: 1920 });
    runCanvasMenuItem({ kind: 'clip', ...KEYS() }, 'quantize:grid');
    const clip = keysClip()!;
    for (const e of clip.events) {
      expect((clip.startTick + e.startTick) % 480).toBe(0);
    }
  });
});

describe('the Score’s marks follow the notes', () => {
  const key = (startTick: number, midi: number) =>
    noteKey(keys, 'keys-1', startTick, midi);
  const marks = () => ({
    articulations: s().scoreArticulations,
    slurs: s().scoreSlurs,
    spellings: s().scoreSpellings,
    slashNotes: s().scoreSlashNotes,
  });
  beforeEach(() => {
    stopHistory();
    useStore.setState({
      scoreArticulations: [`${key(0, 60)}|staccato`],
      scoreSlurs: [`${key(0, 60)}|${key(250, 64)}`],
      scoreSpellings: [`${key(470, 67)}|G4`],
      scoreSlashNotes: [key(470, 67)],
    });
    resetHistory();
    stopHistory = startHistory();
  });

  it('through a transpose, in the same undo step', () => {
    const before = marks();
    transposeClip(KEYS(), 12);
    expect(marks()).toEqual({
      articulations: [`${key(0, 72)}|staccato`],
      slurs: [`${key(0, 72)}|${key(250, 76)}`],
      // A pinned spelling follows a note an octave away, re-octaved.
      spellings: [`${key(470, 79)}|G5`],
      slashNotes: [key(470, 79)],
    });
    expect(historyLabels()).toEqual(['Transpose clip']);
    undo();
    expect(marks()).toEqual(before);
  });

  it('through a quantize', () => {
    // Song ticks 2040, 2290 and 2510 on a 1/8 grid: 2160, 2400 and 2400,
    // so clip ticks 120, 360 and 360.
    quantizeClip(KEYS(), '1/8');
    expect(marks()).toMatchObject({
      articulations: [`${noteKey(keys, 'keys-1', 120, 60)}|staccato`],
      slurs: [
        `${noteKey(keys, 'keys-1', 120, 60)}|${noteKey(keys, 'keys-1', 360, 64)}`,
      ],
      slashNotes: [noteKey(keys, 'keys-1', 360, 67)],
    });
    expect(historyLabels()).toEqual(['Quantize clip']);
  });
});

describe('a track a collaborator holds', () => {
  beforeEach(() => {
    useStore.setState({
      remoteUsers: new Map([
        [
          7,
          {
            userId: 'sam',
            userName: 'Sam',
            selectedTrackId: keys,
          } as unknown as UserPresence,
        ],
      ]),
    });
  });

  it('refuses every change, saying who holds it, and changes nothing', async () => {
    const before = keysClip();
    h.playhead = 2400;
    h.prompt = 'Renamed';
    expect(cutClip(KEYS())).toBe(true);
    expect(deleteClipStep(KEYS())).toBe(true);
    expect(duplicateClip(KEYS())).toBe(true);
    expect(splitClipAtPlayhead(KEYS())).toBe(true);
    expect(toggleClipMute(KEYS())).toBe(true);
    expect(quantizeClip(KEYS(), '1/8')).toBe(true);
    expect(transposeClip(KEYS(), 2)).toBe(false);
    await renameClip(KEYS());

    expect(s().tracks[0].midiClips).toEqual([before]);
    // A refused cut leaves the clipboard as it was.
    expect(s().clipboardClips).toEqual([]);
    expect(historyLabels()).toEqual([]);
    expect(h.toasts).toHaveLength(8);
    for (const toast of h.toasts) {
      expect(toast).toMatchObject({
        title: 'Track locked',
        description: 'Sam is editing this track',
      });
    }
  });

  it('pastes nothing onto it and draws no clip on it', () => {
    copyClip(KEYS());
    expect(pasteClipboard({ trackId: keys, tick: 0 })).toBe(true);
    expect(createClipAt(keys, 0)).toBeNull();
    expect(s().tracks[0].midiClips).toHaveLength(1);
  });

  it('leaves the other tracks free', () => {
    expect(toggleClipMute(TAKE())).toBe(true);
    expect(take()!.muted).toBe(true);
    expect(h.toasts).toEqual([]);
  });
});

describe('Mute clip', () => {
  it('mutes and unmutes, leaving no `false` behind', () => {
    toggleClipMute(KEYS());
    expect(keysClip()!.muted).toBe(true);
    expect(historyLabels().at(-1)).toBe('Mute clip');
    toggleClipMute(KEYS());
    expect(keysClip()!.muted).toBeUndefined();
    expect(historyLabels().at(-1)).toBe('Unmute clip');
    toggleClipMute(TAKE());
    expect(take()!.muted).toBe(true);
  });
});

describe('fades', () => {
  it('Fade in from the menu is a beat, and off again', () => {
    toggleClipFade(TAKE(), 'in');
    expect(take()!.fadeInTicks).toBe(480);
    toggleClipFade(TAKE(), 'in');
    expect(take()!.fadeInTicks).toBe(0);
  });

  it('a handle’s fade stays inside the clip and clear of the other fade', () => {
    setClipFade(TAKE(), 'out', 1000);
    expect(setClipFade(TAKE(), 'in', 5000)).toBe(true);
    expect(take()).toMatchObject({
      fadeInTicks: 3840 - 1000,
      fadeOutTicks: 1000,
    });
    expect(historyLabels().slice(-2)).toEqual(['Fade out', 'Fade in']);
  });
});

describe('split at the playhead', () => {
  it('splits where the playhead is, and selects the right half', () => {
    h.playhead = 2400;
    expect(splitClipAtPlayhead(KEYS())).toBe(true);
    const clips = s().tracks[0].midiClips;
    expect(clips).toHaveLength(2);
    expect(s().selectedClipId).toBe(clips[1].id);
    expect(historyLabels().at(-1)).toBe('Split clip');
  });

  it('leaves a clip the playhead isn’t in whole', () => {
    h.playhead = 100;
    splitClipAtPlayhead(KEYS());
    expect(s().tracks[0].midiClips).toHaveLength(1);
  });
});

describe('cut, copy, paste and duplicate', () => {
  it('cuts to the clipboard and pastes it back at the playhead', () => {
    expect(cutClip(KEYS())).toBe(true);
    expect(s().tracks[0].midiClips).toHaveLength(0);
    expect(historyLabels().at(-1)).toBe('Cut clip');
    h.playhead = 3840;
    expect(pasteClipboard({ trackId: keys })).toBe(true);
    const [pasted] = s().tracks[0].midiClips;
    expect(pasted.startTick).toBe(3840);
    expect(pasted.id).not.toBe('keys-1');
    expect(s().selectedClipId).toBe(pasted.id);
  });

  it('pastes a copied clip where the lane menu was opened', () => {
    copyClip(KEYS());
    runCanvasMenuItem({ kind: 'lane', trackId: keys, tick: 960 }, 'paste');
    expect(s().tracks[0].midiClips.map((c) => c.startTick)).toEqual([
      2040, 960,
    ]);
  });

  it('copies one clip at a time: a MIDI copy replaces an audio one', () => {
    copyClip(TAKE());
    copyClip(KEYS());
    expect(s().clipboardAudioClip).toBeNull();
    expect(s().clipboardClips).toHaveLength(1);
  });

  it('duplicates an audio clip after itself, sharing its audio', () => {
    expect(duplicateClip(TAKE())).toBe(true);
    const clips = s().tracks[2].audioClips;
    expect(clips.map((c) => c.startTick)).toEqual([0, 3840]);
    expect(h.shared).toEqual([['take-1', clips[1].id]]);
  });
});

describe('rename', () => {
  it('names the clip, and a blank name gives it its track’s again', async () => {
    h.prompt = 'Verse riff';
    await renameClip(KEYS());
    expect(keysClip()!.name).toBe('Verse riff');
    expect(historyLabels().at(-1)).toBe('Rename clip');
    h.prompt = '  ';
    await renameClip(KEYS());
    expect(keysClip()!.name).toBeUndefined();
  });

  it('names an audio clip', async () => {
    h.prompt = 'Take 2';
    await renameClip(TAKE());
    expect(take()!.name).toBe('Take 2');
  });
});

describe('Prism', () => {
  it('suggests chords from the bar a lane was clicked in, or a clip starts in', () => {
    const open = vi.fn();
    useStore.setState({ openPrismSuggestion: open });
    runCanvasMenuItem(
      { kind: 'lane', trackId: keys, tick: 4000 },
      'prism:suggest',
    );
    expect(open).toHaveBeenLastCalledWith(3840, keys);
    runCanvasMenuItem({ kind: 'clip', ...KEYS() }, 'prism:suggest');
    expect(open).toHaveBeenLastCalledWith(1920, keys);
    // A clip right-clicked further in suggests from the bar under the
    // pointer.
    runCanvasMenuItem({ kind: 'clip', ...KEYS(), tick: 4000 }, 'prism:suggest');
    expect(open).toHaveBeenLastCalledWith(3840, keys);
  });

  it('opens Prism in the dock for the clip’s track', () => {
    runCanvasMenuItem({ kind: 'clip', ...KEYS() }, 'prism:open');
    expect(s().selectedTrackId).toBe(keys);
    expect(s().channelStripTab).toBe('prism');
  });
});

describe('an empty lane', () => {
  it('Create clip draws a bar from the grid line, and opens Notes', () => {
    const id = createClipAt(keys, 1000);
    const clip = s().tracks[0].midiClips.find((c) => c.id === id)!;
    expect(clip).toMatchObject({ startTick: 960, durationTicks: 1920 });
    expect(s().selectedClipId).toBe(id);
    expect(s().channelStripTab).toBe('piano-roll');
    expect(createClipAt(vocal, 0)).toBeNull();
  });

  it('from the lane menu, starts at the grid line before the click', () => {
    useStore.setState({ timelineGridSize: '1/4' });
    // 1300 is nearer 1440, but a drawn clip starts at the line before it.
    runCanvasMenuItem(
      { kind: 'lane', trackId: keys, tick: 1300 },
      'createClip',
    );
    expect(s().tracks[0].midiClips.map((c) => c.startTick)).toEqual([
      2040, 960,
    ]);
    // Paste here goes to the nearest line, as a drop does.
    copyClip(KEYS());
    runCanvasMenuItem({ kind: 'lane', trackId: keys, tick: 1300 }, 'paste');
    expect(s().tracks[0].midiClips.at(-1)!.startTick).toBe(1440);
  });
});
