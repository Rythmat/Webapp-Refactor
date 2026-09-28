import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CHANNEL = 3;

const synth = vi.hoisted(() => ({
  initJamSynth: vi.fn<() => Promise<void>>(),
  allocateChannel: vi.fn<(id: string) => number>(),
  jamProgramChange: vi.fn(),
  jamNoteOn: vi.fn(),
  jamNoteOff: vi.fn(),
  jamControllerChange: vi.fn(),
  setJamMasterVolume: vi.fn(),
}));
vi.mock('@/components/JamRoom/jamSoundFont', () => synth);

/** Audio-clock seconds; Tone.now() runs the usual 0.1 s lookAhead ahead. */
const clock = vi.hoisted(() => ({ audio: 0 }));
vi.mock('tone', () => ({
  immediate: () => clock.audio,
  now: () => clock.audio + 0.1,
}));

// These are the acoustic (GM) tone's cases; guitarVoice.amp.test.ts has the amp's.
vi.mock('../guitarTonePrefs', () => ({
  getGuitarTonePrefs: () => ({
    tone: 'acoustic',
    ampModelId: 'nam-clean-twin',
  }),
  subscribeGuitarTonePrefs: () => () => {},
}));

// The lesson volume store and practice guide reach the piano sampler.
vi.mock('@/audio/pianoSampler', () => ({
  setPianoSamplerVolume: vi.fn(),
  triggerPianoAttackRelease: vi.fn(),
}));

type GuitarVoice = typeof import('../guitarVoice');
let voice: GuitarVoice;

/** Fresh module state (lease, pending timers, sounding notes) per test. */
beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.clearAllMocks();
  clock.audio = 0;
  synth.allocateChannel.mockReturnValue(CHANNEL);
  synth.initJamSynth.mockResolvedValue(undefined);
  voice = await import('../guitarVoice');
});

afterEach(() => {
  voice.cancelScheduledGuitarNotes();
  vi.useRealTimers();
});

const noteOns = () => synth.jamNoteOn.mock.calls.map(([, midi]) => midi);
const noteOffs = () => synth.jamNoteOff.mock.calls.map(([, midi]) => midi);

describe('loadGuitarVoice', () => {
  it('leases its own channel and applies the program once the synth is up', async () => {
    let finishLoad!: () => void;
    synth.initJamSynth.mockReturnValue(
      new Promise<void>((resolve) => (finishLoad = resolve)),
    );

    const loading = voice.loadGuitarVoice();
    expect(synth.allocateChannel).toHaveBeenCalledWith('learn-guitar');
    // Sent at once too, but the real synth drops it until it has loaded.
    expect(synth.jamProgramChange).toHaveBeenCalledTimes(1);

    const volumeSends = () =>
      synth.jamControllerChange.mock.calls.filter(
        ([ch, cc]) => ch === CHANNEL && cc === 7,
      ).length;
    expect(volumeSends()).toBe(1);

    finishLoad();
    await loading;
    expect(synth.jamProgramChange).toHaveBeenCalledTimes(2);
    expect(synth.jamProgramChange).toHaveBeenLastCalledWith(CHANNEL, 25);
    // The level was dropped with the program, so it is re-sent too.
    expect(volumeSends()).toBe(2);
  });

  it('offers nylon string', async () => {
    await voice.loadGuitarVoice(24);
    expect(synth.jamProgramChange).toHaveBeenLastCalledWith(CHANNEL, 24);
  });

  it('loads itself when a note plays before any load', () => {
    voice.playGuitarGuideNote(60, 0.5, 80);
    expect(synth.initJamSynth).toHaveBeenCalledTimes(1);
    expect(synth.jamProgramChange).toHaveBeenCalledWith(CHANNEL, 25);
    expect(synth.jamNoteOn).toHaveBeenCalledWith(CHANNEL, 60, 44);
  });
});

describe('lesson volume', () => {
  it('sets CC7 on its own channel from the dial, never the jam master', async () => {
    const { setLessonVolume } = await import('../../lessonVolumeStore');
    setLessonVolume(0.8);
    await voice.loadGuitarVoice();
    // GM's CC7 curve is squared, so the dial maps through a square root.
    expect(synth.jamControllerChange).toHaveBeenLastCalledWith(
      CHANNEL,
      7,
      Math.round(127 * Math.sqrt(0.8)),
    );

    setLessonVolume(0.25);
    expect(synth.jamControllerChange).toHaveBeenLastCalledWith(CHANNEL, 7, 64);
    setLessonVolume(0);
    expect(synth.jamControllerChange).toHaveBeenLastCalledWith(CHANNEL, 7, 0);
    expect(synth.setJamMasterVolume).not.toHaveBeenCalled();
  });

  it('leaves the synth alone until the guitar is used', async () => {
    const { setLessonVolume } = await import('../../lessonVolumeStore');
    setLessonVolume(0.3);
    expect(synth.allocateChannel).not.toHaveBeenCalled();
    expect(synth.jamControllerChange).not.toHaveBeenCalled();
  });
});

describe('playGuitarGuideNote', () => {
  it('pulls velocity back by the guide scale, in either velocity range', async () => {
    const { GUIDE_VELOCITY_SCALE } = await import('../../practiceGuide');
    voice.playGuitarGuideNote(64, 0.5, 80);
    voice.playGuitarGuideNote(67, 0.5, 1);
    expect(synth.jamNoteOn.mock.calls).toEqual([
      [CHANNEL, 64, Math.round(80 * GUIDE_VELOCITY_SCALE)],
      [CHANNEL, 67, Math.round(127 * GUIDE_VELOCITY_SCALE)],
    ]);
  });

  it('holds for the note length', () => {
    voice.playGuitarGuideNote(64, 0.5, 80);
    vi.advanceTimersByTime(499);
    expect(synth.jamNoteOff).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(synth.jamNoteOff).toHaveBeenCalledWith(CHANNEL, 64);
  });

  it('waits for a Tone.js time on the audio clock, not Tone.now()', () => {
    clock.audio = 10;
    voice.playGuitarGuideNote(60, 0.5, 80, 10.25);
    vi.advanceTimersByTime(249);
    expect(synth.jamNoteOn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(noteOns()).toEqual([60]);
    vi.advanceTimersByTime(500);
    expect(noteOffs()).toEqual([60]);
  });

  it('plays a time already past at once', () => {
    clock.audio = 10;
    voice.playGuitarGuideNote(60, 0.5, 80, 9.9);
    expect(noteOns()).toEqual([60]);
  });

  it('ignores a zero-length note', () => {
    voice.playGuitarGuideNote(60, 0, 80);
    expect(synth.jamNoteOn).not.toHaveBeenCalled();
  });
});

describe('strumGuitarChord', () => {
  it('sounds strings low to high, 12 ms apart, and damps them together', () => {
    const at = (ms: number) => {
      vi.advanceTimersByTime(ms - Date.now());
      return noteOns();
    };
    vi.setSystemTime(0);
    voice.strumGuitarChord([64, 48, 60, 55, 52], 1, 100);

    expect(at(0)).toEqual([48]);
    expect(at(11)).toEqual([48]);
    expect(at(12)).toEqual([48, 52]);
    expect(at(24)).toEqual([48, 52, 55]);
    expect(at(47)).toEqual([48, 52, 55, 60]);
    expect(at(48)).toEqual([48, 52, 55, 60, 64]);
    expect(synth.jamNoteOn.mock.calls.every(([, , v]) => v === 100)).toBe(true);

    at(999);
    expect(synth.jamNoteOff).not.toHaveBeenCalled();
    at(1000);
    expect(noteOffs()).toEqual([48, 52, 55, 60, 64]);
  });

  it('starts the first string at the Tone.js time', () => {
    clock.audio = 5;
    voice.strumGuitarChord([52, 40], 1, 100, 5.125);
    vi.advanceTimersByTime(124);
    expect(synth.jamNoteOn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(noteOns()).toEqual([40]);
    vi.advanceTimersByTime(12);
    expect(noteOns()).toEqual([40, 52]);
  });
});

describe('cancelScheduledGuitarNotes', () => {
  it('drops notes still waiting and damps the ones sounding', () => {
    clock.audio = 1;
    voice.playGuitarGuideNote(62, 2, 80); // sounding now
    voice.playGuitarGuideNote(60, 0.5, 80, 1.25); // waiting 250 ms
    voice.strumGuitarChord([40, 45, 50], 1, 100); // 40 sounding, 45/50 waiting
    expect(noteOns()).toEqual([62, 40]);

    voice.cancelScheduledGuitarNotes();
    expect(noteOffs().sort()).toEqual([40, 62]);

    vi.advanceTimersByTime(5000);
    expect(noteOns()).toEqual([62, 40]);
    expect(noteOffs()).toHaveLength(2);
  });
});

describe('a re-struck note', () => {
  it('is not cut short by the earlier strike ending', () => {
    voice.playGuitarGuideNote(64, 1, 80);
    vi.advanceTimersByTime(900);
    voice.playGuitarGuideNote(64, 1, 80);
    vi.advanceTimersByTime(100); // the first strike's end
    expect(synth.jamNoteOff).not.toHaveBeenCalled();
    vi.advanceTimersByTime(900); // the second strike's end
    expect(noteOffs()).toEqual([64]);
  });
});

describe('MIDI guitar echo', () => {
  it('holds a note from note-on to note-off at full velocity', () => {
    voice.guitarNoteOn(52, 127);
    expect(synth.jamNoteOn).toHaveBeenCalledWith(CHANNEL, 52, 127);
    vi.advanceTimersByTime(10_000);
    expect(synth.jamNoteOff).not.toHaveBeenCalled();
    voice.guitarNoteOff(52);
    expect(synth.jamNoteOff).toHaveBeenCalledWith(CHANNEL, 52);
  });

  it('takes raw MIDI velocity, so a velocity-1 ghost note stays quiet', () => {
    voice.guitarNoteOn(52, 1);
    expect(synth.jamNoteOn).toHaveBeenCalledWith(CHANNEL, 52, 1);
  });

  it("doesn't cut a guide note that re-struck the same pitch", () => {
    voice.guitarNoteOn(52, 100);
    voice.playGuitarGuideNote(52, 1, 80);
    voice.guitarNoteOff(52);
    expect(synth.jamNoteOff).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(noteOffs()).toEqual([52]);
  });
});

describe('guitarLessonVoice', () => {
  it('plucks a single note at full velocity and strums an array', () => {
    voice.guitarLessonVoice.attackRelease(60, 0.5, 80);
    expect(synth.jamNoteOn).toHaveBeenLastCalledWith(CHANNEL, 60, 80);

    voice.guitarLessonVoice.attackRelease([55, 48], 0.5, 80);
    expect(noteOns()).toEqual([60, 48]);
    vi.advanceTimersByTime(12);
    expect(noteOns()).toEqual([60, 48, 55]);
  });

  it('loads with the current program and stops by cancelling', async () => {
    await voice.loadGuitarVoice(24);
    await voice.guitarLessonVoice.load();
    expect(synth.jamProgramChange).toHaveBeenLastCalledWith(CHANNEL, 24);

    voice.guitarLessonVoice.attackRelease([40, 45], 1, 80);
    voice.guitarLessonVoice.stop();
    vi.advanceTimersByTime(1000);
    expect(noteOns()).toEqual([40]);
    expect(noteOffs()).toEqual([40]);
  });
});
