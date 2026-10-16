import {
  Flag,
  Hash,
  Magnet,
  Maximize2,
  Minus,
  MousePointer2,
  MoveRight,
  Palette,
  Pencil,
  Plus,
  Scissors,
} from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import { cn } from '@/components/utilities';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { getPlayheadTick } from '@/daw/engine/playheadClock';
import {
  fitTimeline,
  zoomTimelineIn,
  zoomTimelineOut,
} from '@/daw/editor/viewport';
import { zoomPercent } from '@/daw/editor/zoom';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import type { ToolType } from '@/daw/store/uiSlice';
import { snapTicks, timelineSnapGrid } from '@/daw/time/timeModel';
import { Button } from '@/daw/ui/Button';
import { promptDialog } from '@/daw/ui/DialogHost';
import { IconButton } from '@/daw/ui/IconButton';
import { Segmented } from '@/daw/ui/Segmented';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { Tooltip } from '@/daw/ui/Tooltip';
import { chordNotationLockTitle } from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';
import { openAddTrackSheet } from '../tracklist/addTrack';
import { CREATE_TOOLBAR_PX } from '../tracklist/rowLayout';
import { useToolbarOverflow } from '../topbar/useToolbarOverflow';
import { GridMenu } from './GridMenu';

// ── Create's toolbar (milestone 2.7) ───────────────────────────────────────
//
// 32 px over the track list and the lanes. Its left cell, above the track
// rows, holds + Add track. Then the timeline's own tools, all visible: the
// editing tool (Pointer V, Draw B, Cut C), the grid and snap, zoom (−, the
// level, +, Fit), Follow, + Marker, the chord lane's labels and what colours
// the clips (timeline-15, ia-flows-26, design-system-07). They were in the
// old top bar, hidden behind keys or right-click, or nowhere. The toolbar
// leaves room after + Marker for + Section (milestone 4.4).

const TOOLS: readonly { value: ToolType; label: string; icon: JSX.Element }[] =
  [
    { value: 'cursor', label: 'Pointer (V)', icon: <MousePointer2 /> },
    { value: 'pencil', label: 'Draw clips (B)', icon: <Pencil /> },
    { value: 'scissors', label: 'Cut clips (C)', icon: <Scissors /> },
  ];

const ZOOM_IN_KEYS = shortcutKeys('timeline.zoomIn');
const ZOOM_OUT_KEYS = shortcutKeys('timeline.zoomOut');
const FIT_KEYS = shortcutKeys('timeline.zoomToFit');

/** Adds a marker at the playhead (on the grid), then asks for its name. */
async function addMarkerAtPlayhead(): Promise<void> {
  const s = useStore.getState();
  const tick = snapTicks(getPlayheadTick(), timelineSnapGrid(s));
  const name = `Marker ${s.markers.length + 1}`;
  withTransaction('Add marker', () => s.addMarker(tick, name));
  const added = useStore.getState().markers.at(-1);
  if (!added) return;
  const typed = await promptDialog({
    title: 'Name the marker',
    label: 'Marker name',
    defaultValue: name,
    confirmLabel: 'Done',
  });
  const next = typed?.trim();
  if (!next || next === name) return;
  if (!useStore.getState().markers.some((m) => m.id === added.id)) return;
  useStore.getState().updateMarker(added.id, { name: next });
}

/**
 * When the lanes are narrow (a Chromebook with the Inspector open), the
 * toolbar folds a step at a time, as the top bar does (useToolbarOverflow),
 * rather than clip: the colour label goes, Follow and Marker become icons,
 * the zoom level goes, and Track | Harmony becomes one Harmony toggle.
 */
const FOLD_STEPS = ['colour-label', 'icons', 'zoom-level', 'colour-toggle'];
const at = (level: number, step: string) => FOLD_STEPS.indexOf(step) < level;

export const CreateToolbar = memo(function CreateToolbar() {
  const barRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const zones = useMemo(() => [leftRef, rightRef], []);
  const fold = useToolbarOverflow(barRef, zones, 16, FOLD_STEPS.length);
  return (
    <div
      data-ds="v2"
      data-testid="create-toolbar"
      className="flex shrink-0 border-b border-daw-hairline bg-daw-surface-1"
      style={{ height: CREATE_TOOLBAR_PX }}
    >
      <div className="flex w-[200px] shrink-0 items-center border-r border-daw-hairline px-2">
        <Button
          size="sm"
          variant="ghost"
          data-tutorial-id="add-track-button"
          data-testid="add-track-button"
          className="w-full justify-start"
          onClick={openAddTrackSheet}
        >
          <Plus aria-hidden />
          Add track
        </Button>
      </div>
      <div
        ref={barRef}
        role="group"
        aria-label="Timeline tools"
        data-fold={fold}
        className="flex min-w-0 flex-1 items-center justify-between gap-4 overflow-hidden px-2"
      >
        <div ref={leftRef} className="flex w-max shrink-0 items-center gap-1">
          <ToolPicker />
          <Divider />
          <SnapToggle />
          <GridMenu />
          <Divider />
          <ZoomControls showLevel={!at(fold, 'zoom-level')} />
          <Divider />
          <FollowToggle iconOnly={at(fold, 'icons')} />
          {at(fold, 'icons') ? (
            <IconButton
              label="Add a marker at the playhead"
              icon={<Flag />}
              size="sm"
              data-testid="add-marker"
              onClick={() => void addMarkerAtPlayhead()}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              data-testid="add-marker"
              onClick={() => void addMarkerAtPlayhead()}
            >
              <Flag aria-hidden />
              Marker
            </Button>
          )}
        </div>
        <div ref={rightRef} className="flex w-max shrink-0 items-center gap-1">
          <ChordLabelsToggle />
          <ClipColours
            showLabel={!at(fold, 'colour-label')}
            asToggle={at(fold, 'colour-toggle')}
          />
        </div>
      </div>
    </div>
  );
});

function Divider() {
  return (
    <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-daw-hairline" />
  );
}

function ToolPicker() {
  const tool = useStore((s) => s.activeTool);
  return (
    <Segmented
      label="Editing tool"
      iconOnly
      options={TOOLS}
      // 'layout' (key 4) has no button; the pointer stands for it.
      value={tool === 'layout' ? 'cursor' : tool}
      onValueChange={(next) => useStore.getState().setActiveTool(next)}
      className="shrink-0"
    />
  );
}

function SnapToggle() {
  const snap = useStore((s) => s.timelineSnapEnabled);
  // Only gestures snap: toggling it never moves the playhead (shell-18).
  return (
    <Toggle
      label="Snap to grid"
      icon={<Magnet />}
      pressed={snap}
      onPressedChange={() => useStore.getState().toggleTimelineSnap()}
      size="sm"
      data-testid="snap-toggle"
    />
  );
}

function ZoomControls({ showLevel }: { showLevel: boolean }) {
  const zoom = useStore((s) => s.timelineZoom);
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconButton
        label="Zoom out"
        icon={<Minus />}
        shortcut={ZOOM_OUT_KEYS.label}
        size="sm"
        onClick={zoomTimelineOut}
      />
      {showLevel ? (
        <Tooltip content="Timeline zoom" side="bottom">
          <span
            className={cn(
              TYPE_CLASS.label,
              'w-10 text-center tabular-nums text-daw-text-2',
            )}
            data-testid="zoom-level"
          >
            {zoomPercent(zoom)}
          </span>
        </Tooltip>
      ) : null}
      <IconButton
        label="Zoom in"
        icon={<Plus />}
        shortcut={ZOOM_IN_KEYS.label}
        size="sm"
        onClick={zoomTimelineIn}
      />
      <IconButton
        label="Fit the song"
        icon={<Maximize2 />}
        shortcut={FIT_KEYS.label}
        size="sm"
        onClick={fitTimeline}
      />
    </div>
  );
}

function FollowToggle({ iconOnly }: { iconOnly: boolean }) {
  const follow = useStore((s) => s.followPlayhead);
  return (
    <Toggle
      label="Follow the playhead"
      icon={<MoveRight />}
      size="sm"
      pressed={follow}
      onPressedChange={(on) => useStore.getState().setFollowPlayhead(on)}
      data-testid="follow-toggle"
    >
      {iconOnly ? undefined : 'Follow'}
    </Toggle>
  );
}

function ChordLabelsToggle() {
  const showNotes = useStore((s) => s.chordRulerShowNotes);
  // Jazz and Roman decide the chord lane's labels; the toggle applies to
  // hybrid only.
  const notation = useChordNotation();
  const locked = notation !== 'hybrid';
  return (
    <Toggle
      label={
        locked
          ? chordNotationLockTitle(notation)
          : showNotes
            ? 'Chord lane: note names (show degree numbers)'
            : 'Chord lane: degree numbers (show note names)'
      }
      icon={<Hash />}
      pressed={showNotes && !locked}
      disabled={locked}
      onPressedChange={() => useStore.getState().toggleChordRulerLabels()}
      size="sm"
      data-testid="chord-ruler-labels"
    />
  );
}

function ClipColours({
  showLabel,
  asToggle,
}: {
  showLabel: boolean;
  asToggle: boolean;
}) {
  const mode = useStore((s) => s.clipColorMode);
  const set = (next: 'track' | 'prism') =>
    withTransaction('Colour clips', () =>
      useStore.getState().setClipColorMode(next),
    );
  if (asToggle) {
    return (
      <Toggle
        label="Colour the notes by harmony"
        icon={<Palette />}
        size="sm"
        pressed={mode === 'prism'}
        onPressedChange={(on) => set(on ? 'prism' : 'track')}
      />
    );
  }
  return (
    <>
      {showLabel ? (
        <span aria-hidden className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>
          Colour
        </span>
      ) : null}
      <Segmented
        label="Colour clips by"
        options={[
          { value: 'track', label: 'Track' },
          { value: 'prism', label: 'Harmony' },
        ]}
        value={mode}
        onValueChange={set}
        className="shrink-0"
      />
    </>
  );
}
