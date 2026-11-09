import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const noteOns: number[] = [];
vi.mock('@/components/JamRoom/jamSoundFont', () => ({
  allocateChannel: () => 5,
  initJamSynth: () => Promise.resolve(),
  jamControllerChange: vi.fn(),
  jamProgramChange: vi.fn(),
  jamNoteOn: (_ch: number, midi: number) => noteOns.push(midi),
  jamNoteOff: vi.fn(),
}));
vi.mock('tone', () => ({ now: () => 0 }));

describe('the ukulele voice (nylon fallback)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    noteOns.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  it('strums in written order, the re-entrant G first', async () => {
    const { ukuleleLessonVoice, ukuleleUsesSamples } = await import(
      '../ukuleleVoice'
    );
    await ukuleleLessonVoice.load();
    expect(ukuleleUsesSamples()).toBe(false);
    // C major 0-0-0-3: G4 C4 E4 C5.
    ukuleleLessonVoice.attackRelease([67, 60, 64, 72], 1, 80, 0);
    vi.advanceTimersByTime(100);
    expect(noteOns).toEqual([67, 60, 64, 72]);
  });

  it('stops what it has scheduled', async () => {
    const { ukuleleLessonVoice } = await import('../ukuleleVoice');
    ukuleleLessonVoice.attackRelease(60, 1, 80, 0.5);
    ukuleleLessonVoice.stop();
    vi.advanceTimersByTime(1000);
    expect(noteOns).toEqual([]);
  });
});
