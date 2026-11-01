/**
 * The lesson volume dial's value, alone: 0..1, persisted, with listeners. A
 * surface that makes its own sound (the Audio labs) reads it from here without
 * loading the piano sampler and Tone with it, as lessonVolumeStore.ts does.
 */

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
  for (const cb of listeners) cb();
}

export function subscribeLessonVolume(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
