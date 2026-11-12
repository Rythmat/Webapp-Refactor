import { useSyncExternalStore } from 'react';
import {
  getPracticeSettings,
  setAutoFlow,
  setMetronomeEnabled,
  setTempoBpm,
  subscribePracticeSettings,
  type PracticeSettings,
} from './practiceSettingsStore';

/**
 * React binding for the Learn practice-settings store.
 *
 * `resolveTempo` is the piece most callers want: pass the tempo the activity
 * was written for and get back the tempo it should actually run at.
 */
export function usePracticeSettings(): PracticeSettings & {
  setAutoFlow: (autoFlow: boolean) => void;
  setMetronomeEnabled: (enabled: boolean) => void;
  setTempoBpm: (bpm: number | null) => void;
  resolveTempo: (activityDefaultBpm: number) => number;
} {
  const settings = useSyncExternalStore(
    subscribePracticeSettings,
    getPracticeSettings,
    getPracticeSettings,
  );

  return {
    ...settings,
    setAutoFlow,
    setMetronomeEnabled,
    setTempoBpm,
    resolveTempo: (activityDefaultBpm: number) =>
      settings.tempoBpm ?? activityDefaultBpm,
  };
}
