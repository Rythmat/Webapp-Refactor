import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

import { createTransportSlice, type TransportSlice } from './transportSlice';
import { createTracksSlice, type TracksSlice } from './tracksSlice';
import { createMidiDeviceSlice, type MidiDeviceSlice } from './midiDeviceSlice';
import { createPrismSlice, type PrismSlice } from './prismSlice';
import { createUiSlice, type UiSlice } from './uiSlice';
import { createMasteringSlice, type MasteringSlice } from './masteringSlice';
import { createMarkersSlice, type MarkersSlice } from './markersSlice';
import { createAudioIOSlice, type AudioIOSlice } from './audioIOSlice';

// ── Composed Store ──────────────────────────────────────────────────────
// All slices merged into a single Zustand 5 store with subscribeWithSelector
// middleware for fine-grained subscriptions (e.g. transport position ticks).

export type AllSlices = TransportSlice &
  TracksSlice &
  MidiDeviceSlice &
  PrismSlice &
  UiSlice &
  MasteringSlice &
  MarkersSlice &
  AudioIOSlice;

export const useStore = create<AllSlices>()(
  subscribeWithSelector((...a) => ({
    ...createTransportSlice(...a),
    ...createTracksSlice(...a),
    ...createMidiDeviceSlice(...a),
    ...createPrismSlice(...a),
    ...createUiSlice(...a),
    ...createMasteringSlice(...a),
    ...createMarkersSlice(...a),
    ...createAudioIOSlice(...a),
  })),
);

// ── Fine-grained selectors ───────────────────────────────────────────────

/** Subscribe to a single track by ID. Only re-renders when that track changes. */
export function useTrack(id: string) {
  return useStore((s) => s.tracks.find((t) => t.id === id));
}

/** Subscribe to track IDs only. Re-renders only when tracks are added/removed. */
export function useTrackIds() {
  return useStore(useShallow((s) => s.tracks.map((t) => t.id)));
}

/** Subscribe to track count only (for layout sizing). */
export function useTrackCount() {
  return useStore((s) => s.tracks.length);
}

// ── Re-exports ──────────────────────────────────────────────────────────
// Slice interfaces
export type { TransportSlice } from './transportSlice';
export type {
  TracksSlice,
  Track,
  TrackType,
  InstrumentType,
  MidiClip,
  AudioClip,
  PitchEdit,
  AudioClipPitchData,
  AudioInputChannel,
} from './tracksSlice';
export type { EffectSlotType } from '@/daw/audio/EffectChain';
export type {
  MidiDeviceSlice,
  MidiDevice,
  MidiStatus,
} from './midiDeviceSlice';
export type { PrismSlice } from './prismSlice';
export type { UiSlice, ToolType, ViewType } from './uiSlice';
export type {
  MasteringSlice,
  MasteringStyle,
  StereoFieldMode,
} from './masteringSlice';
export type { MarkersSlice, Marker } from './markersSlice';
export type { AudioIOSlice } from './audioIOSlice';
