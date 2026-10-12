import { getAudioBuffer, setAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { midiClipLength } from '@/daw/components/Timeline/midiClipCuts';
import { useStore } from '@/daw/store';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import type { ToolType } from '@/daw/store/uiSlice';
import { isFormControl, isInKeyWidget } from './keys';
import { ARRANGE_SCOPE } from './keymaps';
import { useKeymap, type KeymapHandlers } from './registry';

// ── Create's timeline keys (milestone 1.6) ─────────────────────────────────
//
// Copy, paste, duplicate, delete and nudge the selected clip, pick a tool,
// zoom. The Timeline binds them, so they answer only while it is on screen,
// and only when the key wasn't pressed in a control or a widget with keys of
// its own (a knob, the docked piano roll): its arrows and Delete aren't the
// timeline's. A key they don't take goes on to the global scope.

// Nudge amount in ticks (1 beat = 480 ticks)
const NUDGE_TICKS = 480;

/** How much one ⌥= or ⌥− zooms. */
const ZOOM_STEP = 0.25;

function onTimeline(e: KeyboardEvent): boolean {
  const { currentView, editingClipId } = useStore.getState();
  return (
    currentView === 'arrange' &&
    editingClipId === null &&
    !isFormControl(e.target) &&
    !isInKeyWidget(e.target)
  );
}

function selectedClip() {
  const { tracks, selectedClipId, selectedClipTrackId } = useStore.getState();
  if (!selectedClipId || !selectedClipTrackId) return null;
  const track = tracks.find((t) => t.id === selectedClipTrackId);
  const midi = track?.midiClips.find((c) => c.id === selectedClipId);
  const audio = midi
    ? undefined
    : track?.audioClips.find((c) => c.id === selectedClipId);
  if (!midi && !audio) return null;
  return { trackId: selectedClipTrackId, midi, audio };
}

function copyClip(): boolean {
  const clip = selectedClip();
  if (!clip) return false;
  const state = useStore.getState();
  if (clip.midi) state.setClipboard([structuredClone(clip.midi)]);
  else if (clip.audio) {
    state.setAudioClipboard(structuredClone(clip.audio), clip.audio.id);
  }
  return true;
}

function pasteClips(): boolean {
  const state = useStore.getState();
  const { clipboardClips, clipboardAudioClip } = state;
  // At the playhead where it is heard, also while playing (the store's
  // position is parked then). Whole ticks, as a seek leaves them.
  const position = Math.round(getPlayheadTick());
  const targetTrackId = state.selectedClipTrackId || state.tracks[0]?.id;
  if (clipboardAudioClip) {
    if (!targetTrackId) return true;
    const srcBuffer = getAudioBuffer(clipboardAudioClip.bufferId);
    if (srcBuffer) {
      const newId = `clip-paste-${crypto.randomUUID().slice(0, 8)}`;
      setAudioBuffer(newId, srcBuffer);
      state.addAudioClip(targetTrackId, {
        ...structuredClone(clipboardAudioClip.clip),
        id: newId,
        startTick: position,
      });
      state.setSelectedClip(newId, targetTrackId);
    }
    return true;
  }
  if (clipboardClips.length === 0) return false;
  if (!targetTrackId) return true;
  for (const clip of clipboardClips) {
    state.addMidiClip(targetTrackId, {
      ...structuredClone(clip),
      id: `clip-paste-${crypto.randomUUID().slice(0, 8)}`,
      startTick: position,
    });
  }
  return true;
}

function duplicateClip(): void {
  const clip = selectedClip();
  if (!clip) return;
  const state = useStore.getState();
  const newId = `clip-dup-${crypto.randomUUID().slice(0, 8)}`;
  if (clip.midi) {
    // Events are clip-relative, so the copy goes right after the clip's own
    // length, not after its song position.
    state.addMidiClip(clip.trackId, {
      ...structuredClone(clip.midi),
      id: newId,
      startTick: clip.midi.startTick + midiClipLength(clip.midi),
    });
    state.setSelectedClip(newId, clip.trackId);
  } else if (clip.audio) {
    const srcBuffer = getAudioBuffer(clip.audio.id);
    if (!srcBuffer) return;
    setAudioBuffer(newId, srcBuffer);
    state.addAudioClip(clip.trackId, {
      ...structuredClone(clip.audio),
      id: newId,
      startTick: clip.audio.startTick + clip.audio.duration,
    });
    state.setSelectedClip(newId, clip.trackId);
  }
}

function deleteClip(): boolean {
  const clip = selectedClip();
  if (!clip) return false;
  const state = useStore.getState();
  if (clip.midi) state.removeMidiClip(clip.trackId, clip.midi.id);
  // The take's audio stays in the AudioBufferStore: undo brings the clip
  // back, and a take that was never uploaded could not play again otherwise
  // (1.10 gives the audio a lifetime).
  else if (clip.audio) state.removeAudioClip(clip.trackId, clip.audio.id);
  state.setSelectedClip(null, null);
  return true;
}

function nudgeClip(delta: number): boolean {
  const clip = selectedClip();
  if (!clip) return false;
  const state = useStore.getState();
  if (clip.midi) {
    state.updateMidiClip(clip.trackId, clip.midi.id, {
      startTick: Math.max(0, clip.midi.startTick + delta),
    });
  } else if (clip.audio) {
    state.updateAudioClip(clip.trackId, clip.audio.id, {
      startTick: Math.max(0, clip.audio.startTick + delta),
    });
  }
  return true;
}

/** Selects the first clip of the selected clip's track (or the first track). */
function selectFirstClip(): void {
  const state = useStore.getState();
  const trackId = state.selectedClipTrackId || state.tracks[0]?.id;
  if (!trackId) return;
  const first = state.tracks.find((t) => t.id === trackId)?.midiClips[0];
  if (first) state.setSelectedClip(first.id, trackId);
}

/** The song's length in ticks, with room after the last clip. */
function songLengthTicks(ticksPerBar: number): number {
  let maxTick = ticksPerBar * 8; // 8 bars minimum
  for (const track of useStore.getState().tracks) {
    for (const clip of track.midiClips) {
      maxTick = Math.max(maxTick, clip.startTick + midiClipLength(clip));
    }
    for (const clip of track.audioClips) {
      maxTick = Math.max(maxTick, clip.startTick + clip.duration);
    }
  }
  return maxTick + ticksPerBar * 4; // 4 bars padding
}

function tool(next: ToolType) {
  return (e: KeyboardEvent) => {
    if (!onTimeline(e)) return false;
    useStore.getState().setActiveTool(next);
  };
}

export interface TimelineViewport {
  /** The timeline canvas's width in px, as the Timeline measures it. */
  width: () => number;
  ticksPerBar: () => number;
}

/** Binds Create's timeline keys while the Timeline is mounted. */
export function useArrangeKeymap(viewport: TimelineViewport): void {
  const zoomBy = (factor: number) => (e: KeyboardEvent) => {
    if (!onTimeline(e)) return false;
    const state = useStore.getState();
    // Around the middle of what's on screen.
    state.zoomAtPoint(factor, state.timelineScrollLeft + viewport.width() / 2);
  };
  const handlers: KeymapHandlers = {
    'clip.copy': (e) => onTimeline(e) && copyClip(),
    'clip.paste': (e) => onTimeline(e) && pasteClips(),
    'clip.duplicate': (e) => {
      if (!onTimeline(e)) return false;
      duplicateClip();
    },
    'clip.delete': (e) => onTimeline(e) && deleteClip(),
    'clip.nudgeLeft': (e) => onTimeline(e) && nudgeClip(-NUDGE_TICKS),
    'clip.nudgeRight': (e) => onTimeline(e) && nudgeClip(NUDGE_TICKS),
    'clip.selectFirst': (e) => {
      if (!onTimeline(e)) return false;
      selectFirstClip();
    },
    // Deselects, then lets the global Escape stop the music.
    'clip.deselect': (e) => {
      if (onTimeline(e)) useStore.getState().setSelectedClip(null, null);
      return false;
    },
    'tool.cursor': tool('cursor'),
    'tool.pencil': tool('pencil'),
    'tool.scissors': tool('scissors'),
    'tool.layout': tool('layout'),
    'timeline.zoomIn': zoomBy(ZOOM_STEP),
    'timeline.zoomOut': zoomBy(-ZOOM_STEP / (1 + ZOOM_STEP)),
    'timeline.zoomToFit': (e) => {
      if (!onTimeline(e)) return false;
      useStore
        .getState()
        .zoomToFit(viewport.width(), songLengthTicks(viewport.ticksPerBar()));
    },
  };
  useKeymap(ARRANGE_SCOPE.id, handlers);
}
