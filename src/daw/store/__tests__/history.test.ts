import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_TEMPLATES } from '@/daw/data/projectTemplates';
import { UNDO_KEYS } from '@/daw/persistence/projectDocument/fields';
import { stampClipAsset } from '@/lib/studio-assets/assetStamps';
import { useStore } from '../index';
import {
  MAX_HISTORY,
  canRedo,
  canUndo,
  historyLabels,
  redo,
  redoLabel,
  resetHistory,
  startHistory,
  undo,
  undoLabel,
  withTransaction,
  withoutHistory,
} from '../history';
import { withOrigin } from '../writeContext';

// ── The project's undo history (milestone 1.9) ─────────────────────────────
// Undo records what each edit changed, by reference, over the registry's
// undo fields; a gesture is one labelled entry; seeds, the editor's own
// bookkeeping and a collaborator's edits are not recorded.

const s = () => useStore.getState();
/** Past the idle wait, so writes made outside a transaction are an entry. */
const settle = () => vi.advanceTimersByTime(1000);

let release: () => void = () => {};
let keys = '';

beforeEach(() => {
  vi.useFakeTimers();
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  resetHistory();
  release = startHistory();
});

afterEach(() => {
  release();
  resetHistory();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('one gesture, one entry', () => {
  it('a transaction of many writes is one labelled step', () => {
    withTransaction('Change volume', () => {
      for (let i = 1; i <= 30; i++) s().updateTrack(keys, { volume: i / 40 });
    });
    expect(historyLabels()).toEqual(['Change volume']);
    expect(undoLabel()).toBe('Change volume');

    expect(undo()).toBe(true);
    expect(s().tracks[0].volume).toBe(0.8);
    expect(canUndo()).toBe(false);
    expect(redoLabel()).toBe('Change volume');
    expect(redo()).toBe(true);
    expect(s().tracks[0].volume).toBe(0.75);
  });

  it('two transactions back to back are two steps', () => {
    withTransaction('Change volume', () =>
      s().updateTrack(keys, { volume: 0.3 }),
    );
    withTransaction('Change pan', () => s().updateTrack(keys, { pan: -0.5 }));
    expect(historyLabels()).toEqual(['Change volume', 'Change pan']);
    undo();
    expect(s().tracks[0]).toMatchObject({ volume: 0.3, pan: 0 });
  });

  it('a transaction inside another joins it', () => {
    withTransaction('Move clip', () => {
      s().updateTrack(keys, { volume: 0.3 });
      withTransaction('Edit chords', () => s().setBpm(90));
    });
    expect(historyLabels()).toEqual(['Move clip']);
    undo();
    expect(s().bpm).toBe(120);
    expect(s().tracks[0].volume).toBe(0.8);
  });

  it('writes outside a transaction gather until they settle', () => {
    s().updateTrack(keys, { volume: 0.3 });
    vi.advanceTimersByTime(100);
    s().updateTrack(keys, { volume: 0.4 });
    settle();
    expect(historyLabels()).toEqual(['Edit tracks']);
  });

  it('undo right after an edit undoes it, without waiting for it to settle', () => {
    s().setBpm(100);
    expect(canUndo()).toBe(true);
    expect(undoLabel()).toBe('Change tempo');
    expect(undo()).toBe(true);
    expect(s().bpm).toBe(120);
  });

  it('a gesture that ends where it began is no step', () => {
    withTransaction('Change volume', () => {
      s().updateTrack(keys, { volume: 0.3 });
      s().updateTrack(keys, { volume: 0.8 });
    });
    // The value is back, but the track is a new object: a step whose
    // fields all match is kept only if a reference changed. Volume compares
    // by value inside the track, so nothing is recorded.
    expect(canUndo()).toBe(false);
  });

  it('a rewrite of equal data is no step', () => {
    withTransaction('Change volume', () =>
      s().updateTrack(keys, { volume: 0.3 }),
    );
    // A panel opening re-saves what it shows: new objects, same data.
    useStore.setState({
      tracks: structuredClone(s().tracks),
      masteringEffects: structuredClone(s().masteringEffects),
    });
    settle();
    expect(historyLabels()).toEqual(['Change volume']);
  });

  it('keeps the last edit across leaving the editor and coming back (R2)', () => {
    s().updateTrack(keys, { volume: 0.44 });
    // The editor closes before the edit settles, then opens again.
    release();
    settle();
    release = startHistory();
    useStore.setState({ tracks: structuredClone(s().tracks) });
    settle();

    expect(undo()).toBe(true);
    expect(s().tracks[0].volume).toBe(0.8);
    expect(redo()).toBe(true);
    expect(s().tracks[0].volume).toBe(0.44);
  });

  it('a new edit clears redo', () => {
    s().setBpm(100);
    undo();
    expect(canRedo()).toBe(true);
    s().setBpm(110);
    settle();
    expect(canRedo()).toBe(false);
  });
});

describe('what undo covers: the registry', () => {
  it('covers every undo key and nothing else', () => {
    expect(UNDO_KEYS).toContain('masteringEffects');
    expect(UNDO_KEYS).toContain('returns');
    expect(UNDO_KEYS).toContain('markers');
    expect(UNDO_KEYS).toContain('bpm');
    expect(UNDO_KEYS).toContain('measureRestMap');
    expect(UNDO_KEYS).not.toContain('position');
    expect(UNDO_KEYS).not.toContain('selectedTrackId');
    expect(UNDO_KEYS).not.toContain('chordSeq');
  });

  it('undoes a mastering effect change (fx-mixer-08)', () => {
    const before = s().masteringEffects;
    withTransaction('Change effect', () =>
      s().updateMasteringEffects({
        reverb: { ...before.reverb, wet: 0.9 },
      }),
    );
    undo();
    expect(s().masteringEffects).toBe(before);
  });

  it('undoes the Master fader and a return fader', () => {
    s().setMasterVolume(0.5);
    s().setReturnVolume(s().returns[0].id, 0.2);
    settle();
    undo();
    expect(s().masterVolume).toBe(0.8);
    expect(s().returns[0].volume).toBe(0.8);
  });

  it('undoes a key change as one step, colours and key chip together (prism-ui-11, insight-06)', () => {
    s().setRootNote(0);
    s().setMode('ionian');
    settle();
    const colour = s().rootTrackColor;
    withTransaction('Change key', () => {
      s().setRootNote(4);
      s().setMode('dorian');
    });
    expect(s().rootTrackColor).not.toBe(colour);
    undo();
    expect(s().rootNote).toBe(0);
    expect(s().mode).toBe('ionian');
    expect(s().rootTrackColor).toBe(colour);
    // A key change never recolours the tracks themselves: Harmony Color
    // shows the key's colour in their place (2026-10-22).
    expect(s().tracks[0].color).not.toBe(colour);
  });

  it('undoes a marker and a tempo change', () => {
    s().addMarker(1920, 'Verse');
    settle();
    s().setBpm(140);
    settle();
    undo();
    expect(s().bpm).toBe(120);
    undo();
    expect(s().markers).toEqual([]);
  });

  it('undoes slash notation, chord visibility and multi-bar rests (score-12, prism-ui-02)', () => {
    useStore.setState({ scoreSlashNotes: ['n1'] });
    settle();
    useStore.setState({ scoreChordTracks: [keys] });
    settle();
    s().setMeasureRestMap({ 2: 4 });
    settle();
    undo();
    expect(s().measureRestMap).toBeNull();
    undo();
    expect(s().scoreChordTracks).toEqual([]);
    undo();
    expect(s().scoreSlashNotes).toEqual([]);
  });

  it("leaves each track's own fields as they are (mute, solo, arm)", () => {
    withTransaction('Change volume', () =>
      s().updateTrack(keys, { volume: 0.3 }),
    );
    s().toggleMute(keys);
    s().toggleSolo(keys);
    settle();
    // Mute and solo are each collaborator's own: no step.
    expect(historyLabels()).toEqual(['Change volume']);
    undo();
    expect(s().tracks[0]).toMatchObject({
      volume: 0.8,
      mute: true,
      solo: true,
    });
  });

  it('costs no serialising or cloning per edit (state-reload-07)', () => {
    const stringify = vi.spyOn(JSON, 'stringify');
    const clone = vi.spyOn(globalThis, 'structuredClone');
    for (let i = 1; i <= 30; i++) s().updateTrack(keys, { volume: i / 40 });
    settle();
    undo();
    redo();
    expect(stringify).not.toHaveBeenCalled();
    expect(clone).not.toHaveBeenCalled();
  });

  it('playback writes are no step', () => {
    for (let tick = 0; tick < 3000; tick += 100) s().setPosition(tick);
    settle();
    expect(canUndo()).toBe(false);
  });
});

describe('writes undo leaves out', () => {
  it('a seed is no step: Cmd+Z after a template keeps its tracks (state-reload-21)', () => {
    resetHistory();
    const pop = PROJECT_TEMPLATES.find((t) => t.id === 'project-pop');
    if (!pop) throw new Error('missing template');
    withOrigin('seed', () => s().loadProjectTemplate(pop.id));
    settle();
    const tracks = s().tracks;
    expect(tracks.length).toBeGreaterThan(1);
    expect(canUndo()).toBe(false);
    expect(undo()).toBe(false);
    expect(s().tracks).toBe(tracks);
  });

  it("a collaborator's edit is no step", () => {
    withOrigin('remote', () => s().setBpm(100));
    settle();
    expect(canUndo()).toBe(false);
  });

  it("the editor's own write ends the edit before it, and is no step", () => {
    s().setBpm(100);
    withoutHistory(() => s().setMasterVolume(0.3));
    settle();
    expect(historyLabels()).toEqual(['Change tempo']);
    undo();
    expect(s().bpm).toBe(120);
    expect(s().masterVolume).toBe(0.3);
  });

  it("an upload's asset stamp survives undo and redo of the take", () => {
    withTransaction('Record', () =>
      s().addAudioClip(keys, {
        id: 'take-1',
        startTick: 0,
        duration: 1920,
        fadeInTicks: 0,
        fadeOutTicks: 0,
        assetId: null,
      }),
    );
    // The upload finishes after the take was made.
    stampClipAsset(keys, 'take-1', 'asset-9', (current) => !current);
    expect(historyLabels()).toEqual(['Record']);
    expect(s().tracks[0].audioClips[0].assetId).toBe('asset-9');

    undo();
    expect(s().tracks[0].audioClips).toEqual([]);
    redo();
    expect(s().tracks[0].audioClips[0].assetId).toBe('asset-9');
  });
});

describe('the cap', () => {
  it(`keeps the last ${MAX_HISTORY} steps`, () => {
    for (let i = 0; i < MAX_HISTORY + 20; i++) {
      withTransaction(`Step ${i}`, () => s().setBpm(60 + i));
    }
    const labels = historyLabels();
    expect(labels).toHaveLength(MAX_HISTORY);
    expect(labels[0]).toBe('Step 20');
    expect(labels.at(-1)).toBe(`Step ${MAX_HISTORY + 19}`);
  });
});
