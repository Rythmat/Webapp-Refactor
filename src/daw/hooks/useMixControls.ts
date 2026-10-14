import { useStore, type Track } from '@/daw/store';
import type { ReturnBus } from '@/daw/store/returnsSlice';
import { previewTrack } from '@/daw/engine/trackReconciler';
import { previewMasterVolume, previewReturnVolume } from '@/daw/engine/preview';
import { useContinuousControl } from './useContinuousControl';

// ── The mixer's continuous controls ───────────────────────────────────────
// Each fader and knob of the mix (track headers, the Mix view's strips, the
// Master and the returns) as a useContinuousControl: the engine follows the
// drag, and the release writes the store once, as one undo step.

/** A track's volume (0–2 linear gain, the store's units). */
export function useTrackVolumeControl(track: Track) {
  const id = track.id;
  return useContinuousControl({
    value: track.volume,
    preview: (volume) => previewTrack(id, { volume }),
    commit: (volume) => useStore.getState().updateTrack(id, { volume }),
    label: 'Change volume',
  });
}

/** A track's pan (−1 to 1). */
export function useTrackPanControl(track: Track) {
  const id = track.id;
  return useContinuousControl({
    value: track.pan,
    preview: (pan) => previewTrack(id, { pan }),
    commit: (pan) => useStore.getState().updateTrack(id, { pan }),
    label: 'Change pan',
  });
}

/** A track's send level to one return (0–1). */
export function useTrackSendControl(track: Track, returnId: string) {
  const id = track.id;
  return useContinuousControl({
    value: track.sends?.[returnId] ?? 0,
    preview: (level) =>
      previewTrack(id, { sends: { ...track.sends, [returnId]: level } }),
    commit: (level) => useStore.getState().setSend(id, returnId, level),
    label: 'Change send',
  });
}

/** The Master fader (0–1). */
export function useMasterVolumeControl() {
  const masterVolume = useStore((s) => s.masterVolume);
  return useContinuousControl({
    value: masterVolume,
    preview: previewMasterVolume,
    commit: (volume) => useStore.getState().setMasterVolume(volume),
    label: 'Change master volume',
  });
}

/** A return's fader (0–1). */
export function useReturnVolumeControl(ret: ReturnBus) {
  const id = ret.id;
  return useContinuousControl({
    value: ret.volume,
    preview: (volume) => previewReturnVolume(id, volume),
    commit: (volume) => useStore.getState().setReturnVolume(id, volume),
    label: 'Change return volume',
  });
}
