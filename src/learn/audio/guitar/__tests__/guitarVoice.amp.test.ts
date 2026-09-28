import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FretPosition } from '@/lib/guitar/types';

const synth = vi.hoisted(() => ({
  initJamSynth: vi.fn<() => Promise<void>>(),
  allocateChannel: vi.fn<(id: string) => number>(),
  jamProgramChange: vi.fn(),
  jamNoteOn: vi.fn(),
  jamNoteOff: vi.fn(),
  jamControllerChange: vi.fn(),
}));
vi.mock('@/components/JamRoom/jamSoundFont', () => synth);

/** Tone's audio clock (Tone.immediate) and the rig's context clock differ. */
const clock = vi.hoisted(() => ({ audio: 0 }));
vi.mock('tone', () => ({ immediate: () => clock.audio }));

const amp = vi.hoisted(() => {
  let strikes = 0;
  const strings = {
    noteOn: vi.fn<
      (
        midi: number,
        velocity: number,
        opts?: { string?: number; time?: number },
      ) => number
    >(() => ++strikes),
    noteOff: vi.fn(),
    strum: vi.fn(),
    allOff: vi.fn(),
    dispose: vi.fn(),
  };
  const input = { name: 'pedal input' };
  const rig = {
    context: { currentTime: 3 },
    getPlaybackInputNode: vi.fn(() => input),
    setAmpModel: vi.fn(async () => {}),
  };
  return {
    strings,
    input,
    rig,
    resetStrikes: () => (strikes = 0),
    acquireGuitarAmpRig: vi.fn<() => Promise<typeof rig>>(),
    releaseGuitarAmpRig: vi.fn(),
    createStringVoice: vi.fn(async () => strings),
    resume: vi.fn(),
  };
});
vi.mock('../GuitarAmpRig', () => ({
  acquireGuitarAmpRig: amp.acquireGuitarAmpRig,
  releaseGuitarAmpRig: amp.releaseGuitarAmpRig,
}));
vi.mock('../stringVoice', () => ({ createStringVoice: amp.createStringVoice }));
vi.mock('@/audio/core/AudioContextOwner', () => ({
  audioContextOwner: { resume: amp.resume },
}));

// The lesson volume store and practice guide reach the piano sampler.
vi.mock('@/audio/pianoSampler', () => ({
  setPianoSamplerVolume: vi.fn(),
  triggerPianoAttackRelease: vi.fn(),
}));

type GuitarVoice = typeof import('../guitarVoice');
type Prefs = typeof import('../guitarTonePrefs');
let voice: GuitarVoice;
let prefs: Prefs;

/** Let the amp's lazy imports and loads finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  amp.resetStrikes();
  clock.audio = 0;
  amp.rig.context.currentTime = 3;
  amp.acquireGuitarAmpRig.mockResolvedValue(amp.rig);
  synth.allocateChannel.mockReturnValue(3);
  synth.initJamSynth.mockResolvedValue(undefined);
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
  voice = await import('../guitarVoice');
  prefs = await import('../guitarTonePrefs');
});

afterEach(() => {
  voice.releaseGuitarVoice();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the amp tone (the default)', () => {
  it('loads the Studio rig, the strings into its input, and the chosen amp', async () => {
    await voice.loadGuitarVoice();
    await voice.loadGuitarVoice();

    expect(amp.resume).toHaveBeenCalled();
    expect(amp.acquireGuitarAmpRig).toHaveBeenCalledTimes(1);
    expect(amp.createStringVoice).toHaveBeenCalledWith(
      amp.rig.context,
      amp.input,
    );
    expect(amp.rig.setAmpModel).toHaveBeenCalledWith('nam-clean-twin');
    // The GM synth isn't loaded for it.
    expect(synth.initJamSynth).not.toHaveBeenCalled();
    expect(synth.allocateChannel).not.toHaveBeenCalled();
  });

  it('plucks a guide note on the book string, scaled like the piano guide, damped after its length', async () => {
    const { GUIDE_VELOCITY_SCALE } = await import('../../practiceGuide');
    await voice.loadGuitarVoice();
    clock.audio = 10;
    const position: FretPosition = { string: 3, fret: 5 };
    voice.playGuitarGuideNote(60, 0.5, 80, 10.25, position);

    const [midi, level, opts] = amp.strings.noteOn.mock.calls[0];
    expect(midi).toBe(60);
    expect(level).toBeCloseTo((80 / 127) * GUIDE_VELOCITY_SCALE, 9);
    // A quarter second ahead on Tone's clock is a quarter second ahead here.
    expect(opts?.string).toBe(3);
    expect(opts?.time).toBeCloseTo(3.25, 9);
    const [offMidi, offTime, strike] = amp.strings.noteOff.mock.calls[0];
    expect(offMidi).toBe(60);
    expect(offTime).toBeCloseTo(3.75, 9);
    expect(strike).toBe(1);
    expect(synth.jamNoteOn).not.toHaveBeenCalled();
  });

  it('plays now when no time is given, or the time has passed', async () => {
    await voice.loadGuitarVoice();
    clock.audio = 10;
    voice.playGuitarGuideNote(60, 0.5, 1);
    voice.playGuitarGuideNote(62, 0.5, 1, 9.5);
    expect(amp.strings.noteOn.mock.calls.map(([, , o]) => o)).toEqual([
      { string: undefined, time: 3 },
      { string: undefined, time: 3 },
    ]);
  });

  it('strums through the amp, on the shape strings when it has them', async () => {
    await voice.loadGuitarVoice();
    const positions: FretPosition[] = [
      { string: 5, fret: 3 },
      { string: 4, fret: 2 },
    ];
    voice.strumGuitarChord([48, 52], 1, 100, undefined, positions);
    voice.strumGuitarChord([48, 52], 1, 100);
    voice.strumGuitarChord([48, 52, 55], 1, 100, undefined, positions);
    voice.strumGuitarChord([48, 52], 0, 100);

    const level = 100 / 127;
    expect(amp.strings.strum.mock.calls).toEqual([
      [positions, 1, level, 3, 12],
      [[48, 52], 1, level, 3, 12],
      // Positions that don't cover the chord are ignored.
      [[48, 52, 55], 1, level, 3, 12],
    ]);
  });

  it('echoes a MIDI guitar, releasing only its own strike', async () => {
    await voice.loadGuitarVoice();
    voice.guitarNoteOn(52, 127);
    expect(amp.strings.noteOn).toHaveBeenLastCalledWith(52, 1);
    voice.playGuitarGuideNote(52, 1, 80); // re-strikes 52 as strike 2
    amp.strings.noteOff.mockClear();

    voice.guitarNoteOff(52);
    expect(amp.strings.noteOff).toHaveBeenCalledWith(52, undefined, 1);
    voice.guitarNoteOff(52);
    expect(amp.strings.noteOff).toHaveBeenCalledTimes(1);
  });

  it('cancel stops the strings and forgets held notes', async () => {
    await voice.loadGuitarVoice();
    voice.guitarNoteOn(52, 100);
    voice.cancelScheduledGuitarNotes();
    expect(amp.strings.allOff).toHaveBeenCalled();
    voice.guitarNoteOff(52);
    expect(amp.strings.noteOff).not.toHaveBeenCalled();
  });

  it('is the demo voice: plucks, strums and stops through the amp', async () => {
    await voice.guitarLessonVoice.load();
    voice.guitarLessonVoice.attackRelease(60, 0.5, 80);
    voice.guitarLessonVoice.attackRelease([48, 55], 0.5, 80);
    voice.guitarLessonVoice.stop();
    expect(amp.strings.noteOn).toHaveBeenCalledWith(60, 80 / 127, {
      string: undefined,
      time: 3,
    });
    expect(amp.strings.strum).toHaveBeenCalledWith(
      [48, 55],
      0.5,
      80 / 127,
      3,
      12,
    );
    expect(amp.strings.allOff).toHaveBeenCalled();
  });

  it('lets the guitar play, dry, when the amp model is slow to arrive', async () => {
    vi.useFakeTimers();
    amp.rig.setAmpModel.mockReturnValueOnce(new Promise(() => {}));
    let loaded = false;
    void voice.loadGuitarVoice().then(() => (loaded = true));
    await vi.advanceTimersByTimeAsync(4999);
    expect(loaded).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(loaded).toBe(true);
    voice.playGuitarGuideNote(60, 0.5, 80);
    expect(amp.strings.noteOn).toHaveBeenCalledTimes(1);
  });

  it('drops notes while the amp loads, as the GM synth does, and loads it', async () => {
    voice.playGuitarGuideNote(60, 0.5, 80);
    voice.playGuitarGuideNote(62, 0.5, 80);
    expect(amp.strings.noteOn).not.toHaveBeenCalled();
    await settle();
    expect(amp.acquireGuitarAmpRig).toHaveBeenCalledTimes(1);
    voice.playGuitarGuideNote(64, 0.5, 80);
    expect(amp.strings.noteOn).toHaveBeenCalledTimes(1);
  });
});

describe('switching tone', () => {
  it('plays the next note acoustic, and lets go of the amp', async () => {
    await voice.loadGuitarVoice();
    prefs.setGuitarTonePrefs({ tone: 'acoustic' });
    expect(amp.strings.dispose).toHaveBeenCalled();
    expect(amp.releaseGuitarAmpRig).toHaveBeenCalledTimes(1);
    // The guitar was in use, so the new tone loads straight away.
    expect(synth.initJamSynth).toHaveBeenCalled();

    voice.playGuitarGuideNote(60, 0.5, 80);
    expect(synth.jamNoteOn).toHaveBeenCalledWith(3, 60, expect.any(Number));
    expect(amp.strings.noteOn).not.toHaveBeenCalled();
  });

  it('picks the amp up again on the way back', async () => {
    await voice.loadGuitarVoice();
    prefs.setGuitarTonePrefs({ tone: 'acoustic' });
    prefs.setGuitarTonePrefs({ tone: 'amp' });
    await settle();
    expect(amp.acquireGuitarAmpRig).toHaveBeenCalledTimes(2);
    voice.playGuitarGuideNote(60, 0.5, 80);
    expect(amp.strings.noteOn).toHaveBeenCalledTimes(1);
  });

  it('asks the rig for a newly chosen amp', async () => {
    await voice.loadGuitarVoice();
    prefs.setGuitarTonePrefs({ ampModelId: 'nam-vox-ac15' });
    await settle();
    expect(amp.rig.setAmpModel).toHaveBeenLastCalledWith('nam-vox-ac15');
  });

  it('leaves the amp alone before the guitar is used', async () => {
    prefs.setGuitarTonePrefs({ ampModelId: 'nam-vox-ac15' });
    await settle();
    expect(amp.acquireGuitarAmpRig).not.toHaveBeenCalled();
  });
});

describe('when the amp is unavailable', () => {
  it('falls back to the acoustic guitar', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    amp.acquireGuitarAmpRig.mockRejectedValue(new Error('no AudioWorklet'));
    await voice.loadGuitarVoice();
    expect(synth.initJamSynth).toHaveBeenCalled();
    expect(amp.releaseGuitarAmpRig).not.toHaveBeenCalled();

    voice.playGuitarGuideNote(60, 0.5, 80);
    expect(synth.jamNoteOn).toHaveBeenCalledWith(3, 60, expect.any(Number));
    warn.mockRestore();
  });
});

describe('releaseGuitarVoice', () => {
  it('silences the strings and lets go of the rig', async () => {
    await voice.loadGuitarVoice();
    voice.releaseGuitarVoice();
    expect(amp.strings.allOff).toHaveBeenCalled();
    expect(amp.strings.dispose).toHaveBeenCalled();
    expect(amp.releaseGuitarAmpRig).toHaveBeenCalledTimes(1);

    // No longer in use, so a tone change doesn't bring it back.
    prefs.setGuitarTonePrefs({ ampModelId: 'nam-vox-ac15' });
    await settle();
    expect(amp.acquireGuitarAmpRig).toHaveBeenCalledTimes(1);
  });

  it('lets go of what a load still in flight gets', async () => {
    let finish!: (rig: typeof amp.rig) => void;
    amp.acquireGuitarAmpRig.mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve)),
    );
    const loading = voice.loadGuitarVoice();
    await settle();
    voice.releaseGuitarVoice();
    finish(amp.rig);
    await loading;
    expect(amp.strings.dispose).toHaveBeenCalled();
    expect(amp.releaseGuitarAmpRig).toHaveBeenCalledTimes(1);
    // Nothing fell back to acoustic.
    expect(synth.initJamSynth).not.toHaveBeenCalled();
  });

  it('drops a late note (a preview that outlived the lesson) rather than take the rig back', async () => {
    let finish!: (rig: typeof amp.rig) => void;
    amp.acquireGuitarAmpRig.mockReturnValueOnce(
      new Promise((resolve) => (finish = resolve)),
    );
    const preview = voice
      .loadGuitarVoice()
      .then(() => voice.strumGuitarChord([48, 52], 1, 0.8));
    await settle();
    voice.releaseGuitarVoice();
    finish(amp.rig);
    await preview;
    voice.guitarNoteOn(52, 100);
    await settle();
    expect(amp.acquireGuitarAmpRig).toHaveBeenCalledTimes(1);
    expect(amp.releaseGuitarAmpRig).toHaveBeenCalledTimes(1);
    expect(amp.strings.strum).not.toHaveBeenCalled();

    // The next lesson's load brings it back.
    await voice.loadGuitarVoice();
    voice.strumGuitarChord([48, 52], 1, 0.8);
    expect(amp.strings.strum).toHaveBeenCalledTimes(1);
  });
});
