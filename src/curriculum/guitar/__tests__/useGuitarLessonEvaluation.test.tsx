// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildGuitarAppliedTheoryFundamentalsFlow,
  buildGuitarScaleFlow,
} from '@/curriculum/data/activityFlows/guitarAppliedTheoryFundamentals';
import {
  toPianoRollEvents,
  type LessonNoteEvent,
} from '@/curriculum/engine/genreGeneration/resolveStepContent';
import {
  classifyGuitarStep,
  chromaPitchClasses,
  heardPitchClasses,
  isNameableChord,
  useGuitarLessonEvaluation,
  type GuitarLessonEvaluationInput,
} from '@/curriculum/guitar/useGuitarLessonEvaluation';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import type { GuitarChordEvent } from '@/learn/audio/guitar/types';

const voice = vi.hoisted(() => ({
  guitarNoteOn: vi.fn(),
  guitarNoteOff: vi.fn(),
}));
vi.mock('@/learn/audio/guitar/guitarVoice', () => voice);

type Listener<T> = (event: T) => void;
function emitter<T>() {
  const listeners = new Set<Listener<T>>();
  return {
    subscribe: (cb: Listener<T>) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    emit: (event: T) => listeners.forEach((cb) => cb(event)),
  };
}

const flow = buildGuitarAppliedTheoryFundamentalsFlow('C');
const steps = flow.sections.flatMap((s) => s.steps);
const find = (prefix: string) =>
  steps.find((s) => s.activity.startsWith(prefix))!;

const C = [0, 4, 7];
const Dm = [2, 5, 9];

function setup(
  step: ActivityStepV2,
  overrides: Partial<GuitarLessonEvaluationInput> = {},
) {
  const isIT = step.assessment !== 'pitch_only';
  const shift = isIT ? 1920 : 0;
  const events: LessonNoteEvent[] = toPianoRollEvents(
    step.targetNotes!,
    '#d2404a',
    60,
  ).map((e) => ({ ...e, startTicks: e.startTicks + shift }));
  const notesOn = emitter<MidiNoteEvent>();
  const notesOff = emitter<MidiNoteEvent>();
  const chords = emitter<GuitarChordEvent>();
  const completed = { current: new Set<string>() };
  const tick = { current: 0 };
  const state: GuitarLessonEvaluationInput['activityStateRef'] = {
    current: 'performance',
  };
  const onProgress = vi.fn();
  const props = {
    enabled: true,
    step,
    events,
    isIT,
    activityState: 'performance',
    activityStateRef: state,
    resetKey: 'run-1',
    countInOffset: 1920,
    currentTickRef: tick,
    soundingTicks: () => tick.current,
    heardTicksAt: () => tick.current,
    completedEventIdsRef: completed,
    onProgress,
    subscribeNoteOn: notesOn.subscribe,
    subscribeNoteOff: notesOff.subscribe,
    subscribeChord: chords.subscribe,
    keyRoot: 60,
    suppressInput: false,
    ...overrides,
  } as GuitarLessonEvaluationInput;
  const hook = renderHook(
    (p: GuitarLessonEvaluationInput) => useGuitarLessonEvaluation(p),
    { initialProps: props },
  );
  return {
    hook,
    props,
    state,
    events,
    notesOn,
    notesOff,
    chords,
    completed,
    tick,
  };
}

const chord = (
  strumId: number,
  pcs: number[],
  extra: Partial<GuitarChordEvent> = {},
): GuitarChordEvent => ({
  phase: 'on',
  strumId,
  rootPc: pcs[0],
  quality: 'major',
  pcs,
  confidence: 0.9,
  onsetPerfMs: 0,
  source: 'audio',
  ...extra,
});

describe('useGuitarLessonEvaluation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    voice.guitarNoteOn.mockReset();
    voice.guitarNoteOff.mockReset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('listens for chords on strummed steps and notes elsewhere', () => {
    expect(classifyGuitarStep(find('B2.1'))).toBe('chords');
    expect(classifyGuitarStep(find('D3.4'))).toBe('chords');
    expect(classifyGuitarStep(find('A1.1'))).toBe('notes');
    expect(classifyGuitarStep(find('B1.1'))).toBe('notes'); // arpeggio
  });

  it('completes a scale note out of time once it has sounded long enough', () => {
    const { notesOn, completed, events } = setup(find('A1.1'));
    const first = events[0];
    act(() => {
      notesOn.emit({ number: first.midi!, velocity: 90, duration: 0 });
    });
    expect(completed.current.has(first.id)).toBe(false);
    act(() => vi.advanceTimersByTime(300));
    expect(completed.current.has(first.id)).toBe(true);
    expect(voice.guitarNoteOn).toHaveBeenCalledWith(first.midi, 90);
  });

  it('ignores a note out of order and one released too soon', () => {
    const { notesOn, notesOff, completed, events } = setup(find('A1.1'));
    act(() => {
      notesOn.emit({ number: events[1].midi!, velocity: 90, duration: 0 });
      vi.advanceTimersByTime(400);
    });
    expect(completed.current.size).toBe(0);
    act(() => {
      notesOn.emit({ number: events[0].midi!, velocity: 90, duration: 0 });
      vi.advanceTimersByTime(100);
      notesOff.emit({ number: events[0].midi!, velocity: 0, duration: 0.1 });
      vi.advanceTimersByTime(400);
    });
    expect(completed.current.size).toBe(0);
  });

  it('accepts a microphone note an octave off, but not a MIDI one', () => {
    const audio = setup(find('A1.1'));
    act(() => {
      audio.notesOn.emit({
        number: audio.events[0].midi! + 12,
        velocity: 90,
        duration: 0,
        source: 'audio',
      });
      vi.advanceTimersByTime(300);
    });
    expect(audio.completed.current.has(audio.events[0].id)).toBe(true);
    expect(voice.guitarNoteOn).not.toHaveBeenCalled(); // audio is never echoed
    cleanup();

    const midi = setup(find('A1.1'));
    act(() => {
      midi.notesOn.emit({
        number: midi.events[0].midi! + 12,
        velocity: 90,
        duration: 0,
      });
      vi.advanceTimersByTime(300);
    });
    expect(midi.completed.current.size).toBe(0);
  });

  it('completes a strummed chord by identity, any voicing, and needs a fresh strum for the next', () => {
    const { chords, completed, events, hook } = setup(find('B2.1'));
    const cIds = events.filter((e) => e.startTicks === 0).map((e) => e.id);
    act(() => chords.emit(chord(1, C)));
    act(() => vi.advanceTimersByTime(1000));
    expect(cIds.every((id) => completed.current.has(id))).toBe(true);
    // The same strum re-labelled as the next chord doesn't count.
    act(() => chords.emit(chord(1, Dm, { phase: 'change', rootPc: 2 })));
    act(() => vi.advanceTimersByTime(1000));
    const dIds = events.filter((e) => e.startTicks === 960).map((e) => e.id);
    expect(dIds.some((id) => completed.current.has(id))).toBe(false);
    act(() => chords.emit(chord(2, Dm, { rootPc: 2, quality: 'minor' })));
    act(() => vi.advanceTimersByTime(1000));
    expect(dIds.every((id) => completed.current.has(id))).toBe(true);
    expect(hook.result.current.heardChord).toMatchObject({
      label: 'Dm',
      matchesCurrent: true,
    });
  });

  it('tells a MIDI strum from a microphone strum with the same number', () => {
    const { chords, completed, events } = setup(find('B2.1'));
    const cIds = events.filter((e) => e.startTicks === 0).map((e) => e.id);
    const dIds = events.filter((e) => e.startTicks === 960).map((e) => e.id);
    act(() => chords.emit(chord(1, C, { source: 'midi' })));
    act(() => vi.advanceTimersByTime(1000));
    expect(cIds.every((id) => completed.current.has(id))).toBe(true);
    // Both sources count strums from 1: this is a new strum, not strum 1.
    act(() =>
      chords.emit(
        chord(1, Dm, { rootPc: 2, quality: 'minor', source: 'audio' }),
      ),
    );
    act(() => vi.advanceTimersByTime(1000));
    expect(dIds.every((id) => completed.current.has(id))).toBe(true);
  });

  it('names what was missing or extra after a wrong strum', () => {
    const { chords, hook } = setup(find('B2.1'));
    act(() =>
      chords.emit(chord(1, [0, 4, 9], { quality: 'minor', rootPc: 9 })),
    );
    expect(hook.result.current.heardChord?.matchesCurrent).toBe(false);
    expect(hook.result.current.diagnostics).toEqual({
      missingPcs: [7],
      extraPcs: [9],
      // The book's open C has its G on one string: the hint names it.
      hint: 'Missing the 5 (G). In this shape it is on string 3. Check that nothing is touching that string.',
      ringStrings: [3],
    });
  });

  it('hears a 7th the detector named by its triad when the chroma shows the 7th', () => {
    const chroma = new Float64Array(12);
    chroma[0] = 1;
    chroma[4] = 0.8;
    chroma[7] = 0.9;
    chroma[11] = 0.5;
    expect(heardPitchClasses({ pcs: C, chroma }, [0, 4, 7, 11])).toEqual([
      0, 4, 7, 11,
    ]);
    chroma[11] = 0.05;
    expect(heardPitchClasses({ pcs: C, chroma }, [0, 4, 7, 11])).toEqual(C);
    expect(heardPitchClasses({ pcs: C, chroma: null }, [0, 4, 7, 11])).toEqual(
      C,
    );
  });

  it('records strums in time, marks the due chord and shifts them onto the target timeline', () => {
    const step = find('B2.2'); // whole notes, in time
    const { chords, tick, hook } = setup(step);
    tick.current = 1920 + 30; // just after bar 1 of the music
    act(() => chords.emit(chord(1, C)));
    tick.current = 1920 + 1920 + 10;
    act(() => chords.emit(chord(2, Dm, { rootPc: 2, quality: 'minor' })));
    act(() => chords.emit({ ...chord(2, Dm), phase: 'off' }));
    const meta = hook.result.current.performanceMeta;
    expect(Object.keys(meta).length).toBeGreaterThan(0);
    const policy = hook.result.current.buildPolicy();
    expect(policy.kind).toBe('chords');
    if (policy.kind !== 'chords') return;
    expect(policy.userChords.map((c) => c.onset)).toEqual([30, 1930]);
    expect(policy.userChords[0].duration).toBe(1920 - 20);
    expect(policy.chordTargets).toBe(step.chordTargets);
  });

  it('leaves unclear strums out of scoring instead of failing them', () => {
    const { chords, hook } = setup(find('B2.1'));
    act(() => chords.emit(chord(1, [], { unclear: true })));
    const policy = hook.result.current.buildPolicy();
    expect(policy.unclearTargetIndexes).toEqual([0]);
    expect(hook.result.current.unclearCount).toBe(1);
    // A clean strum of that chord afterwards clears it.
    act(() => chords.emit(chord(2, C)));
    expect(hook.result.current.buildPolicy().unclearTargetIndexes).toEqual([]);
  });

  it('reads a chord the detector has no name for from its chroma', () => {
    // C major(♭5): C E G♭, the Oriental mode's chord 1.
    const target = [0, 4, 6];
    expect(isNameableChord(target)).toBe(false);
    expect(isNameableChord(C)).toBe(true);
    const chroma = new Float64Array(12).fill(0.05);
    chroma[0] = 1;
    chroma[4] = 0.7;
    chroma[6] = 0.5;
    chroma[7] = 0.2; // an overtone, quieter than the chord's tones
    expect(chromaPitchClasses(chroma, target)).toEqual([0, 4, 6]);
    expect(heardPitchClasses({ pcs: [0, 4, 7], chroma }, target)).toEqual([
      0, 4, 6,
    ]);
    // A loud stray string counts against it.
    chroma[9] = 0.9;
    expect(chromaPitchClasses(chroma, target)).toEqual([0, 4, 6, 9]);
    // A silent chroma leaves the detector's name.
    expect(
      heardPitchClasses(
        { pcs: [0, 4, 7], chroma: new Float64Array(12) },
        target,
      ),
    ).toEqual([0, 4, 7]);
  });

  it('scores an unclear strum of a chord the detector cannot name', () => {
    const oriental = buildGuitarScaleFlow('C', 'oriental');
    const step = oriental.sections[1].steps.find((s) =>
      s.activity.startsWith('B2.1'),
    )!;
    expect(step.chordTargets![0].quality).toBe('majorb5');
    const { chords, hook } = setup(step);
    const chroma = new Float64Array(12).fill(0.05);
    chroma[0] = 1;
    chroma[4] = 0.7;
    chroma[6] = 0.5;
    act(() =>
      chords.emit(
        chord(1, [], { unclear: true, rootPc: 0, quality: '', chroma }),
      ),
    );
    expect(hook.result.current.unclearCount).toBe(0);
    expect(hook.result.current.heardChord).toMatchObject({
      label: 'Cmaj(b5)',
      matchesCurrent: true,
    });
  });

  it('matches exactly from MIDI and octave-tolerantly from the microphone', () => {
    const midi = setup(find('A1.2'));
    act(() => midi.notesOn.emit({ number: 48, velocity: 80, duration: 0 }));
    expect(midi.hook.result.current.buildPolicy()).toMatchObject({
      kind: 'notes',
      match: 'exact',
    });
    cleanup();
    const audio = setup(find('A1.2'));
    act(() =>
      audio.notesOn.emit({
        number: 48,
        velocity: 80,
        duration: 0,
        source: 'audio',
      }),
    );
    expect(audio.hook.result.current.buildPolicy()).toMatchObject({
      match: 'octave_tolerant',
    });
  });

  it('starts over on a new run and hears nothing outside one', () => {
    const { chords, hook, props, state } = setup(find('B2.1'));
    act(() => chords.emit(chord(1, C)));
    expect(hook.result.current.heardChord).not.toBeNull();
    expect(
      (hook.result.current.buildPolicy() as { userChords: unknown[] })
        .userChords,
    ).toHaveLength(1);
    hook.rerender({ ...props, resetKey: 'run-2' });
    expect(hook.result.current.heardChord).toBeNull();
    expect(
      (hook.result.current.buildPolicy() as { userChords: unknown[] })
        .userChords,
    ).toHaveLength(0);
    state.current = 'preview';
    act(() => chords.emit(chord(2, C)));
    expect(hook.result.current.heardChord).toBeNull();
  });
});
