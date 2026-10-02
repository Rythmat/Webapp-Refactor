import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type GraphSettings,
  loadGraphSettings,
  saveGraphSettings,
} from './model/graphSettings';

/**
 * Cortex's settings panel's state, kept in the browser
 * (`ma-console-graph-settings-v1`, see `model/graphSettings.ts`).
 *
 * The settings are read once when the page opens; anything unreadable falls
 * back to Obsidian's stock settings. Each change is written a moment later
 * (a dragged slider is one write, not a hundred) and once more when the
 * page closes, so nothing set is lost. Where the browser refuses storage (a
 * private window, blocked site data) the panel still works for the visit.
 */

/** How long after the last change the settings are written. */
const SETTINGS_SAVE_DELAY_MS = 300;

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export type GraphSettingsUpdate = (settings: GraphSettings) => GraphSettings;

export function useGraphSettings(): [
  GraphSettings,
  (update: GraphSettingsUpdate) => void,
] {
  const [settings, setSettings] = useState<GraphSettings>(() =>
    loadGraphSettings(storage()),
  );
  const latest = useRef(settings);
  latest.current = settings;
  const unsaved = useRef(false);

  useEffect(() => {
    if (!unsaved.current) return;
    const timer = window.setTimeout(() => {
      unsaved.current = false;
      saveGraphSettings(storage(), latest.current);
    }, SETTINGS_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [settings]);

  // Whatever is still waiting is written as the page closes.
  useEffect(
    () => () => {
      if (unsaved.current) saveGraphSettings(storage(), latest.current);
    },
    [],
  );

  const update = useCallback((change: GraphSettingsUpdate) => {
    unsaved.current = true;
    setSettings((current) => change(current));
  }, []);

  return [settings, update];
}
