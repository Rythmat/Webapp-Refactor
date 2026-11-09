import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ECHO_CLASS_SETTINGS, type EchoClassSettings } from './types';

// ── The Teacher Settings, saved per classroom ──────────────────────────────
// The spec keeps them on the teacher's account, per classroom. Until the
// server has a place for them, they're saved on the teacher's device, in
// localStorage keyed by the classroom (every read and write wrapped, so
// private browsing just forgets). A classroom's saved settings win over an
// Echo slide's own; a classroom with none starts from the slide's.

const KEY_PREFIX = 'echo_class_settings:v1';

const keyFor = (classroomId: string) => `${KEY_PREFIX}:${classroomId}`;

const oneOf = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/** Saved settings read back; anything odd falls back to `base`. */
export function parseEchoClassSettings(
  raw: unknown,
  base: EchoClassSettings = DEFAULT_ECHO_CLASS_SETTINGS,
): EchoClassSettings {
  if (!raw || typeof raw !== 'object') return base;
  const v = raw as Record<string, unknown>;
  return {
    playOn: oneOf(v.playOn, ['choice', 'pads', 'keyboard'], base.playOn),
    // The room speaker needs Tune In, which is still to come: headphones.
    sound: 'headphones',
    afterRound: oneOf(v.afterRound, ['result', 'nothing'], base.afterRound),
    lights: oneOf(v.lights, ['pads', 'none'], base.lights),
    classProgress:
      typeof v.classProgress === 'boolean'
        ? v.classProgress
        : base.classProgress,
    projector: oneOf(
      v.projector,
      ['class', 'leaderboard', 'grid'],
      base.projector,
    ),
    snapCall: typeof v.snapCall === 'boolean' ? v.snapCall : base.snapCall,
    grading: oneOf(v.grading, ['quantized', 'off'], base.grading),
  };
}

/** A classroom's saved settings, or null if it has none. */
export function readEchoClassSettings(
  classroomId: string,
): EchoClassSettings | null {
  try {
    const raw = window.localStorage.getItem(keyFor(classroomId));
    return raw ? parseEchoClassSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Save a classroom's settings. */
export function writeEchoClassSettings(
  classroomId: string,
  settings: EchoClassSettings,
): void {
  try {
    window.localStorage.setItem(keyFor(classroomId), JSON.stringify(settings));
  } catch {
    // Private browsing or full storage: the settings last this session.
  }
}

/**
 * A classroom's Teacher Settings and a setter that saves them: the saved
 * ones, else the slide's (`base`).
 */
export function useEchoClassSettings(
  classroomId: string,
  base: EchoClassSettings,
): [EchoClassSettings, (patch: Partial<EchoClassSettings>) => void] {
  const [settings, setSettings] = useState<EchoClassSettings>(
    () => readEchoClassSettings(classroomId) ?? parseEchoClassSettings(base),
  );
  useEffect(() => {
    setSettings(
      readEchoClassSettings(classroomId) ?? parseEchoClassSettings(base),
    );
    // The slide's settings only seed a classroom with none saved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);
  const update = useCallback(
    (patch: Partial<EchoClassSettings>) =>
      setSettings((now) => {
        const next = parseEchoClassSettings({ ...now, ...patch }, now);
        writeEchoClassSettings(classroomId, next);
        return next;
      }),
    [classroomId],
  );
  return [settings, update];
}
