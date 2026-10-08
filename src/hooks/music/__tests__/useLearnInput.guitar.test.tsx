// @vitest-environment jsdom
/**
 * Guitar lessons bring audio input back — for guitar only, and only from a
 * user gesture: guitar.enable() is the one path to the microphone (through
 * the Studio rig), never mount or start(). A blocked microphone leaves MIDI
 * working, and MIDI guitar strums arrive as chord events.
 */

import { act, cleanup, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audioContextOwner } from '@/audio/core/AudioContextOwner';
import { useLearnInput } from '@/hooks/music/useLearnInput';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { GuitarLearnInputEngine } from '@/learn/audio/guitar/GuitarLearnInputEngine';
import { saveGuitarInputPrefs } from '@/learn/audio/guitar/guitarInputPrefs';
import type {
  GuitarChordEvent,
  GuitarInputRig,
} from '@/learn/audio/guitar/types';
import {
  LearnInputProvider,
  useLearnInputStable,
} from '@/learn/context/LearnInputContext';

// The Studio rig, as GuitarAmpRig behaves: it opens the microphone itself and
// reports a failed open as a plain Error.
const rigs = vi.hoisted(() => {
  const state = { acquired: 0, released: 0 };
  const node = (context: object) => ({
    context,
    fftSize: 0,
    smoothingTimeConstant: 0,
    connect: () => {},
    disconnect: () => {},
    getFloatTimeDomainData: () => {},
    getFloatFrequencyData: () => {},
  });
  const makeRig = () => {
    const context = {
      sampleRate: 48000,
      createAnalyser: () => node(context),
      // NodeTapCapture's own tap off the clean pre-amp node.
      createGain: () => node(context),
    };
    let source: object | null = null;
    return {
      context,
      async setDevice(deviceId: string | null) {
        try {
          await navigator.mediaDevices.getUserMedia({
            audio: { deviceId: deviceId ?? undefined },
          });
        } catch {
          throw new Error('Could not open the audio input');
        }
        source = node(context);
      },
      setChannel: () => {},
      setInputTrim: () => {},
      setMonitoring: () => {},
      getChordAnalyserNode: () => ({ ...node(context), fftSize: 16384 }),
      getPitchDetectSourceNode: () => source,
      getInputLevel: () => 0,
      getPlaybackInputNode: () => null,
      setAmpModel: async () => {},
      dispose: () => {},
    };
  };
  return { state, makeRig };
});

vi.mock('@/learn/audio/guitar/GuitarAmpRig', () => ({
  acquireGuitarAmpRig: async () => {
    rigs.state.acquired++;
    return rigs.makeRig() as unknown as GuitarInputRig;
  },
  releaseGuitarAmpRig: () => {
    rigs.state.released++;
  },
}));

vi.mock('@/learn/audio/v2/ProbabilisticOrchestrator', () => ({
  ProbabilisticOrchestrator: vi.fn(function (this: Record<string, unknown>) {
    this.setCallbacks = () => {};
    this.start = async () => {};
    this.stop = () => {};
    this.setKeyContext = () => {};
    this.clearKeyContext = () => {};
    this.setExpectedNotes = () => {};
    this.setMode = () => {};
  }),
}));

const getUserMedia = vi.fn();
const permissionsQuery = vi.fn();
let midiInput: EventTarget & { id: string; name: string };

function midi(bytes: number[]) {
  const event = new Event('midimessage');
  Object.defineProperty(event, 'data', { value: new Uint8Array(bytes) });
  midiInput.dispatchEvent(event);
}

beforeEach(() => {
  localStorage.clear();
  rigs.state.acquired = 0;
  rigs.state.released = 0;
  getUserMedia.mockReset();
  getUserMedia.mockResolvedValue({ getTracks: () => [] });
  permissionsQuery.mockReset();
  permissionsQuery.mockResolvedValue({ state: 'prompt' });
  midiInput = Object.assign(new EventTarget(), {
    id: 'midi-guitar',
    name: 'MIDI Guitar',
  });
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia, enumerateDevices: vi.fn().mockResolvedValue([]) },
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: { query: permissionsQuery },
  });
  Object.defineProperty(navigator, 'requestMIDIAccess', {
    configurable: true,
    value: vi.fn().mockResolvedValue({
      inputs: new Map([[midiInput.id, midiInput]]),
      outputs: new Map(),
      onstatechange: null,
    }),
  });
  // The engine's analysis loops stay idle; these tests drive the hook.
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function mountGuitar() {
  const hook = renderHook(() => useLearnInput({ instrument: 'guitar' }));
  await act(async () => {
    await hook.result.current.start();
  });
  return hook;
}

describe('useLearnInput (guitar)', () => {
  it('never opens the microphone on mount or start()', async () => {
    const { result } = await mountGuitar();
    expect(navigator.requestMIDIAccess).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(rigs.state.acquired).toBe(0);
    expect(result.current.instrument).toBe('guitar');
    expect(result.current.activeSource).toBe('midi');
    expect(result.current.guitar).toMatchObject({
      status: 'needs-setup',
      prefs: { source: 'audio', deviceId: null },
      level: 0,
      error: null,
    });
  });

  it('enable() opens the input through the Studio rig', async () => {
    saveGuitarInputPrefs({ setupCompletedAt: 1 });
    const resume = vi.spyOn(audioContextOwner, 'resume');
    const { result } = await mountGuitar();
    expect(result.current.guitar?.status).toBe('idle');
    expect(resume).not.toHaveBeenCalled();

    let enabling!: Promise<void>;
    act(() => {
      enabling = result.current.guitar!.enable();
    });
    // Resumed within the gesture itself, before anything is awaited.
    expect(resume).toHaveBeenCalledTimes(1);
    await act(() => enabling);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(rigs.state.acquired).toBe(1);
    expect(result.current.guitar?.status).toBe('listening');
    expect(result.current.activeSource).toBe('audio');
    expect(result.current.guitar?.getTunerAnalyser()?.fftSize).toBe(4096);

    await act(async () => {
      await result.current.guitar!.enable(); // already listening
    });
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('a blocked microphone reads as denied and MIDI keeps working', async () => {
    getUserMedia.mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError'),
    );
    permissionsQuery.mockResolvedValue({ state: 'denied' });
    const { result } = await mountGuitar();
    const heard: MidiNoteEvent[] = [];
    result.current.subscribeNoteOn((e) => heard.push(e));

    await act(async () => {
      await result.current.guitar!.enable();
    });
    expect(result.current.guitar?.status).toBe('denied');
    expect(result.current.guitar?.error).toBeTruthy();
    expect(result.current.activeSource).toBe('midi');
    expect(rigs.state.released).toBe(1);

    act(() => midi([0x90, 64, 90]));
    expect(heard).toEqual([
      { number: 64, duration: 0, velocity: 90, source: 'midi' },
    ]);
  });

  it('a set-up save while the permission prompt is up keeps asking', async () => {
    let grant!: () => void;
    getUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          grant = () => resolve({ getTracks: () => [] });
        }),
    );
    const { result } = await mountGuitar();
    let enabling!: Promise<void>;
    await act(async () => {
      enabling = result.current.guitar!.enable();
      await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    });
    await act(async () => {
      await result.current.guitar!.restart({ setupCompletedAt: 5 });
    });
    expect(result.current.guitar?.status).toBe('requesting-permission');

    grant();
    await act(() => enabling);
    expect(result.current.guitar?.status).toBe('listening');
  });

  it('a MIDI-guitar set-up never asks for the microphone', async () => {
    saveGuitarInputPrefs({ source: 'midi' });
    const { result } = await mountGuitar();
    expect(result.current.guitar?.status).toBe('idle');
    await act(async () => {
      await result.current.guitar!.enable();
    });
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(rigs.state.acquired).toBe(0);
  });

  it('turns MIDI guitar strums into chord events', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result } = await mountGuitar();
    const chords: GuitarChordEvent[] = [];
    const unsubscribe = result.current.subscribeChord((e) => chords.push(e));

    act(() => {
      for (const note of [48, 52, 55, 60, 64]) midi([0x90, note, 90]);
    });
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(chords).toEqual([
      expect.objectContaining({
        phase: 'on',
        strumId: 1,
        rootPc: 0,
        quality: 'major',
        pcs: [0, 4, 7],
        source: 'midi',
        midis: [48, 52, 55, 60, 64],
      }),
    ]);
    expect(result.current.activeNotes).toEqual([48, 52, 55, 60, 64]);

    unsubscribe();
    act(() => {
      for (const note of [48, 52, 55, 60, 64]) midi([0x80, note, 0]);
      vi.advanceTimersByTime(200);
    });
    expect(chords).toHaveLength(1);
  });

  it('routes the engine’s notes, chords, level and errors', async () => {
    const setCallbacks = vi.spyOn(
      GuitarLearnInputEngine.prototype,
      'setCallbacks',
    );
    const { result } = await mountGuitar();
    const callbacks = setCallbacks.mock.calls[0][0];
    const notes: MidiNoteEvent[] = [];
    const chords: GuitarChordEvent[] = [];
    result.current.subscribeNoteOn((e) => notes.push(e));
    result.current.subscribeChord((e) => chords.push(e));

    const note: MidiNoteEvent = {
      number: 64,
      duration: 0,
      velocity: 70,
      source: 'audio',
      onsetPerfMs: 1234,
    };
    const chord: GuitarChordEvent = {
      phase: 'on',
      strumId: 1,
      rootPc: 0,
      quality: 'major',
      pcs: [0, 4, 7],
      confidence: 0.9,
      onsetPerfMs: 1234,
      source: 'audio',
    };
    act(() => {
      callbacks.onNoteOn?.(note);
      callbacks.onChord?.(chord);
      callbacks.onLevel?.(0.3);
    });
    expect(notes).toEqual([note]);
    expect(chords).toEqual([chord]);
    expect(result.current.activeNotes).toEqual([64]);
    expect(result.current.inputLevel).toBe(0.3);
    expect(result.current.guitar?.level).toBe(0.3);

    const unplugged = new Error('The guitar input was disconnected');
    unplugged.name = 'NotFoundError';
    act(() => callbacks.onError?.(unplugged));
    expect(result.current.guitar).toMatchObject({
      status: 'no-device',
      error: 'The guitar input was disconnected',
    });
  });

  it('switching to MIDI guitar stops the microphone', async () => {
    const { result } = await mountGuitar();
    await act(async () => {
      await result.current.guitar!.enable();
    });
    await act(async () => {
      await result.current.guitar!.restart({ source: 'midi' });
    });
    expect(result.current.guitar?.status).toBe('idle');
    expect(result.current.guitar?.prefs.source).toBe('midi');
    expect(result.current.guitar?.getTunerAnalyser()).toBeNull();
    expect(result.current.activeSource).toBe('midi');
    await vi.waitFor(() => expect(rigs.state.released).toBe(1));
  });

  it('stop() and unmount hand the rig back', async () => {
    const { result, unmount } = await mountGuitar();
    await act(async () => {
      await result.current.guitar!.enable();
    });
    act(() => result.current.stop());
    expect(result.current.guitar?.getTunerAnalyser()).toBeNull();
    expect(result.current.activeSource).toBe('midi');
    await act(async () => {
      await result.current.guitar!.enable();
    });
    expect(result.current.guitar?.status).toBe('listening');
    unmount();
    await vi.waitFor(() => expect(rigs.state.released).toBe(2));
  });
});

describe('useLearnInput (piano) keeps guitar out', () => {
  it('has no guitar handle and makes no chords from MIDI', async () => {
    const { result } = renderHook(() => useLearnInput());
    await act(async () => {
      await result.current.start();
    });
    const chords: GuitarChordEvent[] = [];
    result.current.subscribeChord((e) => chords.push(e));
    act(() => {
      for (const note of [48, 52, 55]) midi([0x90, note, 90]);
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(result.current.instrument).toBe('piano');
    expect(result.current.guitar).toBeNull();
    expect(chords).toEqual([]);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe('LearnInputContext', () => {
  function Probe({ onValue }: { onValue: (v: unknown) => void }) {
    const stable = useLearnInputStable();
    onValue(stable);
    return null;
  }
  const renderIn = (children: ReactNode, instrument?: 'guitar') =>
    render(
      <LearnInputProvider instrument={instrument}>
        {children}
      </LearnInputProvider>,
    );

  it('shares the instrument, chord subscription and guitar handle', () => {
    let value: ReturnType<typeof useLearnInputStable> | null = null;
    renderIn(<Probe onValue={(v) => (value = v as typeof value)} />, 'guitar');
    expect(value).toMatchObject({
      instrument: 'guitar',
      subscribeChord: expect.any(Function),
      guitar: expect.objectContaining({ enable: expect.any(Function) }),
    });
  });

  it('gives piano no guitar handle', () => {
    let value: ReturnType<typeof useLearnInputStable> | null = null;
    renderIn(<Probe onValue={(v) => (value = v as typeof value)} />);
    expect(value).toMatchObject({ instrument: 'piano', guitar: null });
  });
});
