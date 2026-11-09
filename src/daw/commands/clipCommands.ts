import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { ticksPerBeat, timelineSnapGrid } from '@/daw/time/timeModel';
import {
  fitTimeline,
  zoomTimelineIn,
  zoomTimelineOut,
} from '@/daw/editor/viewport';
import { openClipMenu } from '@/daw/shell/canvas/clipMenu/canvasMenuStore';
import { addMarkerAtPlayhead } from '@/daw/shell/canvas/markerActions';
import { deleteSelectedChords } from '@/daw/shell/canvas/chordActions';
import {
  copyClip,
  cutClip,
  deleteClipStep,
  duplicateClip,
  findClip,
  pasteClipboard,
  renameClip,
  splitClipAtPlayhead,
  toggleClipMute,
  transposeClip,
  type ClipRef,
} from '@/daw/shell/canvas/clipMenu/clipActions';
import type { ToolType } from '@/daw/store/uiSlice';
import { isFormControl, isInKeyWidget } from './keys';
import { ARRANGE_SCOPE } from './keymaps';
import { useKeymap, type KeymapHandlers } from './registry';

// ── Create's timeline keys (milestone 1.6) ─────────────────────────────────
//
// Cut, copy, paste, duplicate, delete, rename, split, mute, transpose and
// nudge the selected clip, open its menu, pick a tool, zoom. The Timeline
// binds them, so they answer only while it is on screen, and only when the
// key wasn't pressed in a control or a widget with keys of its own (a knob,
// the docked piano roll): its arrows and Delete aren't the timeline's. A key
// they don't take goes on to the global scope. What a clip key does is the
// clip menu's own action (clipMenu/clipActions.ts, milestone 2.12), so the
// key and the menu item can't drift apart.

/**
 * How far an arrow key nudges a clip: one step of the timeline's grid in the
 * project's metre (a dotted quarter in 6/8), or one beat with snap off.
 */
function nudgeTicks(): number {
  const state = useStore.getState();
  const grid = timelineSnapGrid(state);
  return grid.enabled ? grid.step : ticksPerBeat(grid.ts);
}

/**
 * Whether a clip key acts on the timeline: in Create, with the timeline in
 * sight (a maximized dock covers it), and not from a field, a widget or the
 * track list. A key pressed on a row's button (M, S, a fader) is about that
 * track: ⇧⌘↑ there must not move the selected clip, on another track, up
 * an octave.
 */
function onTimeline(e: KeyboardEvent): boolean {
  const { currentView, dockMaximized } = useStore.getState();
  return (
    currentView === 'arrange' &&
    !dockMaximized &&
    !isFormControl(e.target) &&
    !isInKeyWidget(e.target) &&
    !(
      e.target instanceof Element &&
      e.target.closest('[data-testid="track-list"]')
    )
  );
}

/**
 * Whether Alt+M adds a marker: in Create with the timeline in sight, and not
 * pressed in a form control (a dialog or a menu keeps its keys to itself in
 * the dispatcher). It acts at the playhead, not on what has focus, so a
 * focused section block, track row or other widget doesn't stop it, as
 * onTimeline would.
 */
function canAddMarker(e: KeyboardEvent): boolean {
  const { currentView, dockMaximized } = useStore.getState();
  return (
    currentView === 'arrange' && !dockMaximized && !isFormControl(e.target)
  );
}

/**
 * The menu key (Windows) also opens the browser's own context menu, on its
 * release: swallow that one, so ours stays on top.
 */
export function swallowNativeMenu(): void {
  const stop = (event: Event) => event.preventDefault();
  window.addEventListener('contextmenu', stop, { capture: true, once: true });
  window.setTimeout(
    () => window.removeEventListener('contextmenu', stop, { capture: true }),
    1000,
  );
}

/** The selected clip, while it is still in the project. */
function selected(): ClipRef | null {
  const state = useStore.getState();
  const { selectedClipId, selectedClipTrackId } = state;
  if (!selectedClipId || !selectedClipTrackId) return null;
  const ref = { trackId: selectedClipTrackId, clipId: selectedClipId };
  return findClip(state, ref) ? ref : null;
}

/** A handler acting on the selected clip; without one the key goes on. */
function withClip(act: (ref: ClipRef, e: KeyboardEvent) => boolean | void) {
  return (e: KeyboardEvent) => {
    if (!onTimeline(e)) return false;
    const ref = selected();
    if (!ref) return false;
    return act(ref, e) !== false;
  };
}

function nudgeClip(ref: ClipRef, direction: -1 | 1): void {
  const found = findClip(useStore.getState(), ref);
  const moving = found?.midi ?? found?.audio;
  if (!moving) return;
  // As a drag moves it: one write, the clip's own chords along, refused on
  // a track a collaborator holds (moveClip).
  withTransaction('Move clip', () =>
    useStore
      .getState()
      .moveClip(
        ref.trackId,
        moving.id,
        ref.trackId,
        moving.startTick + direction * nudgeTicks(),
      ),
  );
}

/** Selects the first clip of the selected clip's track (or the first track). */
function selectFirstClip(): void {
  const state = useStore.getState();
  const trackId = state.selectedClipTrackId || state.tracks[0]?.id;
  if (!trackId) return;
  const first = state.tracks.find((t) => t.id === trackId)?.midiClips[0];
  if (first) state.setSelectedClip(first.id, trackId);
}

function tool(next: ToolType) {
  return (e: KeyboardEvent) => {
    if (!onTimeline(e)) return false;
    useStore.getState().setActiveTool(next);
  };
}

/** Binds Create's timeline keys while the Timeline is mounted. */
export function useArrangeKeymap(): void {
  const zoom = (action: () => void) => (e: KeyboardEvent) => {
    if (!onTimeline(e)) return false;
    action();
  };
  const handlers: KeymapHandlers = {
    'clip.cut': withClip(cutClip),
    'clip.copy': withClip(copyClip),
    'clip.paste': (e) => onTimeline(e) && pasteClipboard(),
    'clip.duplicate': withClip(duplicateClip),
    // Chords picked on the chord ruler (with no clip picked since) go first.
    'clip.delete': (e) => {
      const { selectedClipId, selectedChordIds } = useStore.getState();
      if (
        onTimeline(e) &&
        selectedClipId === null &&
        selectedChordIds.length > 0
      ) {
        return deleteSelectedChords();
      }
      return withClip(deleteClipStep)(e);
    },
    'clip.rename': withClip((ref) => {
      void renameClip(ref);
    }),
    'clip.split': withClip(splitClipAtPlayhead),
    'clip.mute': withClip(toggleClipMute),
    'clip.menu': withClip((ref, e) => {
      if (e.code === 'ContextMenu') swallowNativeMenu();
      return openClipMenu(ref, 'key');
    }),
    // Taken even when the notes can't move (drums, the keyboard's end), so
    // ⇧↑ never scrolls the page instead.
    'clip.transposeUp': withClip((ref) => {
      transposeClip(ref, 1);
    }),
    'clip.transposeDown': withClip((ref) => {
      transposeClip(ref, -1);
    }),
    'clip.octaveUp': withClip((ref) => {
      transposeClip(ref, 12);
    }),
    'clip.octaveDown': withClip((ref) => {
      transposeClip(ref, -12);
    }),
    'clip.nudgeLeft': withClip((ref) => nudgeClip(ref, -1)),
    'clip.nudgeRight': withClip((ref) => nudgeClip(ref, 1)),
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
    'timeline.zoomIn': zoom(zoomTimelineIn),
    'timeline.zoomOut': zoom(zoomTimelineOut),
    'timeline.zoomToFit': zoom(fitTimeline),
    'timeline.addMarker': (e) => {
      if (!canAddMarker(e)) return false;
      void addMarkerAtPlayhead();
    },
  };
  useKeymap(ARRANGE_SCOPE.id, handlers);
}
