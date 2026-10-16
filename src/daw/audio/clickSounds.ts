// ── The metronome's sounds and volume (milestone 2.8) ──────────────────────
//
// What the student can pick in the Click menu, kept as per-user prefs. Pure:
// the store loads it on every page, and the voices themselves (Tone) are in
// clickVoice.ts.

export type ClickSound = 'click' | 'tick' | 'hihat';

export const CLICK_SOUNDS: readonly { id: ClickSound; label: string }[] = [
  { id: 'click', label: 'Click' },
  { id: 'tick', label: 'Tick' },
  { id: 'hihat', label: 'Hi-hat' },
];

/** The click's level in dB: today's -10 by default, quieter or louder. */
export const DEFAULT_CLICK_DB = -10;
export const MIN_CLICK_DB = -30;
export const MAX_CLICK_DB = 0;

export function isClickSound(value: unknown): value is ClickSound {
  return CLICK_SOUNDS.some((sound) => sound.id === value);
}

export function isClickVolume(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_CLICK_DB &&
    value <= MAX_CLICK_DB
  );
}
