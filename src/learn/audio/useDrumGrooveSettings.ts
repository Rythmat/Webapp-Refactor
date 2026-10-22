import { useSyncExternalStore } from 'react';
import {
  getDrumGrooveSettings,
  setDrumGrooveClick,
  setDrumGrooveId,
  setDrumsVolume,
  subscribeDrumGrooveSettings,
  type DrumGrooveSettings,
} from './drumGrooveSettingsStore';

/** React binding for the play-along drums store. */
export function useDrumGrooveSettings(): DrumGrooveSettings & {
  setGrooveId: (grooveId: string | null) => void;
  setClick: (click: boolean) => void;
  setVolume: (volume: number) => void;
} {
  const settings = useSyncExternalStore(
    subscribeDrumGrooveSettings,
    getDrumGrooveSettings,
    getDrumGrooveSettings,
  );
  return {
    ...settings,
    setGrooveId: setDrumGrooveId,
    setClick: setDrumGrooveClick,
    setVolume: setDrumsVolume,
  };
}
