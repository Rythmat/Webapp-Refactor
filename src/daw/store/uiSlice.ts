import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import type { MidiClip, AudioClip } from './tracksSlice';
import type { AllGridSize } from '@/daw/utils/quantize';
import type { ThemeId } from '@/daw/constants/themes';

// ── UI Slice ──────────────────────────────────────────────────────────────
// Global UI state: active tool, selected clip, timeline zoom/scroll/grid.

export type ToolType = 'cursor' | 'pencil' | 'scissors' | 'layout';
export type ViewType = 'arrange' | 'studio';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export interface UiSlice {
  activeTool: ToolType;
  selectedClipId: string | null;
  selectedClipTrackId: string | null;
  editingClipId: string | null;
  editingClipTrackId: string | null;
  editingAudioClipId: string | null;
  editingAudioClipTrackId: string | null;
  clipboardClips: MidiClip[];
  clipboardAudioClip: { clip: AudioClip; bufferId: string } | null;

  // ── Timeline zoom / scroll / grid ──
  timelineZoom: number;
  timelineScrollLeft: number;
  timelineGridSize: AllGridSize;
  timelineSnapEnabled: boolean;
  timelineTripletMode: boolean;

  setActiveTool: (tool: ToolType) => void;
  setSelectedClip: (clipId: string | null, trackId: string | null) => void;
  setEditingClip: (clipId: string | null, trackId: string | null) => void;
  setEditingAudioClip: (clipId: string | null, trackId: string | null) => void;
  setClipboard: (clips: MidiClip[]) => void;
  setAudioClipboard: (clip: AudioClip, bufferId: string) => void;

  // ── Timeline actions ──
  setTimelineZoom: (zoom: number) => void;
  setTimelineScrollLeft: (px: number) => void;
  setTimelineGridSize: (size: AllGridSize) => void;
  toggleTimelineSnap: () => void;
  toggleTripletMode: () => void;
  /** Zoom centered on cursor — keeps tick under anchorPx visually fixed. */
  zoomAtPoint: (delta: number, anchorPx: number) => void;
  /** Zoom to fit all content in the viewport. */
  zoomToFit: (viewportWidth: number, projectLengthTicks: number) => void;

  // ── View switcher ──
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;

  // ── Library sidebar ──
  libraryOpen: boolean;
  toggleLibrary: () => void;

  // ── Clip color mode ──
  clipColorMode: 'track' | 'prism';
  setClipColorMode: (mode: 'track' | 'prism') => void;

  // ── Settings modal ──
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // ── Theme ──
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

export const createUiSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  UiSlice
> = (set) => ({
  activeTool: 'cursor',
  selectedClipId: null,
  selectedClipTrackId: null,
  editingClipId: null,
  editingClipTrackId: null,
  editingAudioClipId: null,
  editingAudioClipTrackId: null,
  clipboardClips: [],
  clipboardAudioClip: null,

  // ── Timeline defaults ──
  timelineZoom: 1.0,
  timelineScrollLeft: 0,
  timelineGridSize: '1/4',
  timelineSnapEnabled: true,
  timelineTripletMode: false,

  setActiveTool: (tool) => set({ activeTool: tool }),

  setSelectedClip: (clipId, trackId) =>
    set({ selectedClipId: clipId, selectedClipTrackId: trackId }),

  setEditingClip: (clipId, trackId) =>
    set({ editingClipId: clipId, editingClipTrackId: trackId }),

  setEditingAudioClip: (clipId, trackId) =>
    set({ editingAudioClipId: clipId, editingAudioClipTrackId: trackId }),

  setClipboard: (clips) => set({ clipboardClips: clips }),

  setAudioClipboard: (clip, bufferId) =>
    set({ clipboardAudioClip: { clip, bufferId } }),

  // ── Timeline actions ──

  setTimelineZoom: (zoom) =>
    set({ timelineZoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) }),

  setTimelineScrollLeft: (px) =>
    set({ timelineScrollLeft: Math.max(0, px) }),

  setTimelineGridSize: (size) =>
    set({ timelineGridSize: size }),

  toggleTimelineSnap: () =>
    set((s) => ({ timelineSnapEnabled: !s.timelineSnapEnabled })),

  toggleTripletMode: () =>
    set((s) => ({ timelineTripletMode: !s.timelineTripletMode })),

  zoomAtPoint: (delta, anchorPx) =>
    set((s) => {
      const oldZoom = s.timelineZoom;
      const newZoom = clamp(oldZoom * (1 + delta), MIN_ZOOM, MAX_ZOOM);
      const ratio = newZoom / oldZoom;
      const newScrollLeft = anchorPx * ratio - anchorPx + s.timelineScrollLeft * ratio;
      return {
        timelineZoom: newZoom,
        timelineScrollLeft: Math.max(0, newScrollLeft),
      };
    }),

  zoomToFit: (viewportWidth, projectLengthTicks) => {
    const BASE_PPB = 40;
    const neededZoom = (viewportWidth * 480) / (projectLengthTicks * BASE_PPB);
    set({
      timelineZoom: clamp(neededZoom, MIN_ZOOM, MAX_ZOOM),
      timelineScrollLeft: 0,
    });
  },

  // ── View switcher ──
  currentView: 'arrange' as ViewType,
  setCurrentView: (view) => set({ currentView: view }),

  // ── Library sidebar ──
  libraryOpen: true,
  toggleLibrary: () => set((s) => ({ libraryOpen: !s.libraryOpen })),

  // ── Clip color mode ──
  clipColorMode: 'track',
  setClipColorMode: (mode) => set({ clipColorMode: mode }),

  // ── Settings modal ──
  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // ── Theme ──
  theme: 'dark' as ThemeId,
  setTheme: (theme) => set({ theme }),
});
