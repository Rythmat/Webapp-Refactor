/**
 * guitarInputPrefs.ts — the student's guitar input set-up, per device.
 *
 * Its own key, never the piano's old 'learn-audio-device-id': piano lessons
 * are MIDI-only, and nothing a piano student once chose may turn a microphone
 * back on. Values are checked on load, so a stale or hand-edited entry falls
 * back to the defaults field by field.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { GuitarInputPrefs } from './types';

export const GUITAR_INPUT_PREFS_KEY = 'learn-guitar-input-v1';
const EVENT = 'learn-guitar-input-change';

export const DEFAULT_GUITAR_INPUT_PREFS: Readonly<GuitarInputPrefs> = {
  source: 'audio',
  deviceId: null,
  channel: 0,
  trimDb: 0,
  gateRms: 0.01,
  inputLatencyMs: 0,
  bleedDetected: false,
  monitorThroughAmp: false,
};

/** The last parse and the text it came from: a stable snapshot per value. */
let cached: GuitarInputPrefs | null = null;
let cachedRaw: string | null = null;

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

function sanitize(raw: Partial<Record<keyof GuitarInputPrefs, unknown>>) {
  const d = DEFAULT_GUITAR_INPUT_PREFS;
  const prefs: GuitarInputPrefs = {
    source:
      raw.source === 'midi' || raw.source === 'audio' ? raw.source : d.source,
    deviceId:
      typeof raw.deviceId === 'string' || raw.deviceId === null
        ? raw.deviceId
        : d.deviceId,
    channel:
      Number.isInteger(raw.channel) && (raw.channel as number) >= 0
        ? (raw.channel as number)
        : d.channel,
    trimDb: isFiniteNumber(raw.trimDb) ? raw.trimDb : d.trimDb,
    gateRms:
      isFiniteNumber(raw.gateRms) && raw.gateRms > 0 ? raw.gateRms : d.gateRms,
    inputLatencyMs:
      isFiniteNumber(raw.inputLatencyMs) && raw.inputLatencyMs >= 0
        ? raw.inputLatencyMs
        : d.inputLatencyMs,
    bleedDetected:
      typeof raw.bleedDetected === 'boolean'
        ? raw.bleedDetected
        : d.bleedDetected,
    monitorThroughAmp:
      typeof raw.monitorThroughAmp === 'boolean'
        ? raw.monitorThroughAmp
        : d.monitorThroughAmp,
  };
  if (isFiniteNumber(raw.setupCompletedAt)) {
    prefs.setupCompletedAt = raw.setupCompletedAt;
  }
  return prefs;
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(GUITAR_INPUT_PREFS_KEY);
  } catch {
    return null;
  }
}

export function loadGuitarInputPrefs(): GuitarInputPrefs {
  const raw = readRaw();
  if (cached && raw === cachedRaw) return cached;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw ?? 'null');
  } catch {
    // Unreadable entry: defaults.
  }
  cachedRaw = raw;
  cached = sanitize(parsed && typeof parsed === 'object' ? parsed : {});
  return cached;
}

/** Merge `patch` into the saved prefs; returns the new prefs. */
export function saveGuitarInputPrefs(
  patch: Partial<GuitarInputPrefs>,
): GuitarInputPrefs {
  const next = sanitize({ ...loadGuitarInputPrefs(), ...patch });
  const raw = JSON.stringify(next);
  try {
    localStorage.setItem(GUITAR_INPUT_PREFS_KEY, raw);
    cachedRaw = raw;
  } catch {
    // Private mode / quota: the in-memory prefs still apply.
  }
  cached = next;
  window.dispatchEvent(new CustomEvent(EVENT));
  return next;
}

export function subscribeGuitarInputPrefs(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GUITAR_INPUT_PREFS_KEY) listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The saved prefs and a merge-and-save setter; re-renders on change. */
export function useGuitarInputPrefs(): [
  GuitarInputPrefs,
  (patch: Partial<GuitarInputPrefs>) => void,
] {
  const prefs = useSyncExternalStore(
    subscribeGuitarInputPrefs,
    loadGuitarInputPrefs,
    () => DEFAULT_GUITAR_INPUT_PREFS,
  );
  return [
    prefs,
    useCallback((patch: Partial<GuitarInputPrefs>) => {
      saveGuitarInputPrefs(patch);
    }, []),
  ];
}
