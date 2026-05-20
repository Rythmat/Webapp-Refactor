/**
 * lessonVolumeStore.ts — Module-level store for the lesson volume dial.
 *
 * Centralises the 0..1 volume value used by every lesson surface so the dial
 * stays in sync across the genre container, fundamentals container, and the
 * activity components used by the theory lessons. Persists to localStorage so
 * the level survives navigation between activities and reloads.
 *
 * Side-effect: applies the current value to the global piano sampler whenever
 * it changes, which covers note playback in every lesson surface.
 */

import { setPianoSamplerVolume } from '@/audio/pianoSampler';

const STORAGE_KEY = 'lesson-volume';
const DEFAULT_VOLUME = 0.8;

function readInitial(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return DEFAULT_VOLUME;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(1, n));
  } catch {
    return DEFAULT_VOLUME;
  }
}

let currentVolume = readInitial();
const listeners = new Set<() => void>();

export function lessonVolumeToDb(v: number): number {
  // 0 → -Infinity (mute); otherwise standard dB conversion.
  return v <= 0.001 ? -Infinity : 20 * Math.log10(v);
}

// Apply the persisted level to the sampler at module load so the very first
// note in any lesson respects the saved volume even before the dial mounts.
setPianoSamplerVolume(lessonVolumeToDb(currentVolume));

export function getLessonVolume(): number {
  return currentVolume;
}

export function getLessonVolumeDb(): number {
  return lessonVolumeToDb(currentVolume);
}

export function setLessonVolume(v: number): void {
  const clamped = Math.max(0, Math.min(1, v));
  if (clamped === currentVolume) return;
  currentVolume = clamped;
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {
    // localStorage may be unavailable; fall through.
  }
  setPianoSamplerVolume(lessonVolumeToDb(clamped));
  for (const cb of listeners) cb();
}

export function subscribeLessonVolume(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
