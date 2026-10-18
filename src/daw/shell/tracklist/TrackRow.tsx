import { Circle, Ear, EarOff, MoreHorizontal } from 'lucide-react';
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { cn } from '@/components/utilities';
import { useTrackPresence } from '@/daw/collab/presence';
import {
  useListenMode,
  useRemoteTrackActive,
  useRemoteTrackAudible,
  useStudioListenStore,
} from '@/daw/collab/studioListenStore';
import { PresenceTrackDots } from '@/daw/collab/ui/PresenceTrackDots';
import { meterSource } from '@/daw/engine/meterBus';
import { useTrackVolumeControl } from '@/daw/hooks/useMixControls';
import { openTrackInDock } from '@/daw/shell/dock/dockSelection';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore, useTrack, type Track } from '@/daw/store';
import { contrastRatio, onColor } from '@/daw/ui/color';
import { COLOR } from '@/daw/ui/tokens';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';
import { IconButton } from '@/daw/ui/IconButton';
import { Meter } from '@/daw/ui/Meter';
import { Menu, MenuTrigger } from '@/daw/ui/Menu';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { TRACK_ROW_PX } from './rowLayout';
import { trackIcon } from './trackIcon';
import { onTrackMenuRequest } from './trackMenuRequests';
import { TrackMenuContent } from './TrackMenu';
import { useTrackRename } from './useTrackRename';

// ── A track row (milestone 2.6) ────────────────────────────────────────────
//
// 64 px, two lines (ia-flows-36, timeline-21):
//   grip · instrument · name · collaborators · ⋯
//   M · S · Arm · volume over its meter
// Everything else (the name, colour, role, duplicate, monitor, test sound,
// automation, export, release, delete) is in the ⋯ menu, which a right-click
// on the row opens too, at the pointer (2.15). The instrument button opens
// the track's instrument in the dock, as Soundtrap's row does (ST10). The
// selected row has a 4 px edge in its track colour and its instrument on a
// track-colour fill; the others show their colour in the instrument's glyph
// (colour is the track's meaning here, and selection also reads as the
// lighter row and aria-current). Every control is named in full
// ('Mute Rhodes'), shows its state by more than colour (pressed, filled),
// and is at least 24×24. A muted row dims.
//
// The name is the row's selector: a click selects the track, a double-click
// (or F2 / N with focus on it) renames it, and the arrow keys move the
// selection (the track list's keys, useTrackListKeys). The colour bar at
// the left edge is the grip that drags the row up or down.
//
// A track a collaborator has selected is theirs for now: it is outlined in
// their colour and only Mute and Solo (which are each person's own) stay
// live; while they play it live, Listen sets whether you hear them.

/** The fader and meter's length in a 200 px row. */
const FADER_PX = 88;

export interface TrackRowProps {
  trackId: string;
  index: number;
  /** This row's selector takes the list's Tab stop. */
  tabStop: boolean;
  /** This row's ⋯ is the lessons' 'track-menu-button'. */
  menuAnchor: boolean;
  /** A grip press: the list drags the row from here. */
  onGripDown(event: PointerEvent<HTMLElement>, trackId: string): void;
  /** The row is being dragged to a new place. */
  dragging?: boolean;
}

export const TrackRow = memo(function TrackRow(props: TrackRowProps) {
  const track = useTrack(props.trackId);
  return track ? <TrackRowBody track={track} {...props} /> : null;
});

const TrackRowBody = memo(function TrackRowBody({
  track,
  index,
  tabStop,
  menuAnchor,
  onGripDown,
  dragging = false,
}: TrackRowProps & { track: Track }) {
  const isSelected = useStore((s) => s.selectedTrackId === track.id);
  const lockOwner = useTrackPresence(track.id)[0] ?? null;
  const locked = lockOwner !== null;
  const [menuOpen, setMenuOpen] = useState(false);
  // A right-click's menu, at the pointer.
  const [pointerMenu, setPointerMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const rename = useTrackRename(track);
  // ⇧F10 and the menu key on the row's name (the list's tracks.menu).
  useEffect(
    () => onTrackMenuRequest(track.id, () => setMenuOpen(true)),
    [track.id],
  );

  const select = useCallback(() => {
    useStore.getState().setSelectedTrackId(track.id);
  }, [track.id]);

  // A right-click selects the track (as Soundtrap's does; a collaborator's
  // track stays theirs) and opens its menu where the pointer is. The name's
  // field, while renaming, keeps the browser's own menu.
  const onContextMenu = useCallback(
    (e: MouseEvent<HTMLLIElement>) => {
      if (e.target instanceof HTMLInputElement) return;
      e.preventDefault();
      if (!locked) select();
      setMenuOpen(false);
      setPointerMenu({ x: e.clientX, y: e.clientY });
    },
    [locked, select],
  );
  const Icon = trackIcon(track.instrument);
  // A dark track colour can't be read as a glyph on the row: then it is
  // drawn in the row's own text colour (3:1, WCAG's for graphics).
  const glyphReads = contrastRatio(track.color, COLOR['surface-1'].value) >= 3;

  return (
    <li
      data-track-id={track.id}
      data-testid="track-row"
      data-selected={isSelected || undefined}
      aria-label={track.name}
      aria-current={isSelected || undefined}
      className={cn(
        'relative flex border-b border-daw-hairline',
        isSelected ? 'bg-daw-selected' : 'bg-daw-surface-1 hover:bg-daw-hover',
        dragging && 'opacity-60',
        TRANSITION,
      )}
      style={{ height: TRACK_ROW_PX }}
      onClick={select}
      onContextMenu={onContextMenu}
    >
      {/* The grip that reorders the row, with the track's colour at its
          edge: a hairline, and the full 4 px edge on the selected row. */}
      <div
        aria-hidden
        data-testid="track-grip"
        className="flex w-3 shrink-0 cursor-grab touch-none justify-start active:cursor-grabbing"
        onPointerDown={(e) => onGripDown(e, track.id)}
      >
        {isSelected ? (
          <span
            data-testid="track-selected-edge"
            className="h-full w-1"
            style={{ backgroundColor: track.color }}
            data-meaning="track-colour"
          />
        ) : (
          <span
            className="h-full w-0.5 opacity-60"
            style={{ backgroundColor: track.color }}
            data-meaning="track-colour"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-1 pr-1">
        <div className="flex h-7 min-w-0 items-center gap-1">
          <IconButton
            label={`Open ${track.name}’s instrument`}
            icon={<Icon />}
            size="sm"
            data-hint={hintText(
              `Open ${track.name}’s instrument`,
              'Show its sound in the dock',
            )}
            data-testid="track-instrument-button"
            data-meaning="track-colour"
            className="shrink-0 rounded-full"
            style={
              isSelected
                ? { backgroundColor: track.color, color: onColor(track.color) }
                : glyphReads
                  ? { color: track.color }
                  : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              openTrackInDock(track.id);
            }}
          />
          {rename.editing ? (
            <input
              ref={rename.inputRef}
              aria-label={`Name of ${track.name}`}
              defaultValue={track.name}
              className={cn(
                'h-6 min-w-0 flex-1 rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-bg px-1 font-bold text-daw-text outline-none',
                TYPE_CLASS.label,
              )}
              spellCheck={false}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={rename.onKeyDown}
              onBlur={rename.commit}
            />
          ) : (
            <button
              type="button"
              data-track-selector
              tabIndex={tabStop ? 0 : -1}
              aria-pressed={isSelected}
              aria-label={`${track.name}, track ${index + 1}`}
              data-hint={hintText(
                track.name,
                locked
                  ? 'Select this track'
                  : 'Select this track; double-click to rename it',
              )}
              className={cn(
                'h-6 min-w-0 flex-1 truncate rounded-[var(--daw-radius-sm)] px-1 text-left font-bold text-daw-text',
                TYPE_CLASS.label,
                track.mute && 'opacity-45',
                FOCUS_RING,
              )}
              onClick={(e) => {
                e.stopPropagation();
                select();
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (!locked) rename.start();
              }}
            >
              {track.name}
            </button>
          )}
          <PresenceTrackDots trackId={track.id} />
          <Menu open={menuOpen} onOpenChange={setMenuOpen}>
            <MenuTrigger asChild>
              <IconButton
                label={`More for ${track.name}`}
                icon={<MoreHorizontal />}
                size="sm"
                data-tutorial-id={menuAnchor ? 'track-menu-button' : undefined}
                data-hint={hintText(
                  `More for ${track.name}`,
                  'Rename, colour, duplicate, export or delete it',
                )}
                data-testid="track-menu-button"
                onClick={(e) => e.stopPropagation()}
              />
            </MenuTrigger>
            {menuOpen ? (
              <TrackMenuContent
                track={track}
                locked={locked}
                isSelected={isSelected}
              />
            ) : null}
          </Menu>
          {pointerMenu ? (
            <Menu
              open
              onOpenChange={(open) => {
                if (!open) setPointerMenu(null);
              }}
            >
              <MenuTrigger asChild>
                <span
                  aria-hidden
                  tabIndex={-1}
                  className="pointer-events-none fixed"
                  style={{ left: pointerMenu.x, top: pointerMenu.y }}
                />
              </MenuTrigger>
              <TrackMenuContent
                track={track}
                locked={locked}
                isSelected={isSelected}
                side="bottom"
                // Back to the row's name, never to the hidden trigger.
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                  document
                    .querySelector<HTMLElement>(
                      `[data-track-id="${track.id}"] [data-track-selector]`,
                    )
                    ?.focus({ preventScroll: true });
                }}
              />
            </Menu>
          ) : null}
        </div>
        <div
          className="flex h-7 items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Toggle
            label={`Mute ${track.name}`}
            data-hint={hintText(`Mute ${track.name}`, 'Silence this track')}
            size="sm"
            pressed={track.mute}
            onPressedChange={() => useStore.getState().toggleMute(track.id)}
          >
            M
          </Toggle>
          <Toggle
            label={`Solo ${track.name}`}
            data-hint={hintText(
              `Solo ${track.name}`,
              'Hear only this track and other soloed ones',
            )}
            size="sm"
            pressed={track.solo}
            onPressedChange={() => useStore.getState().toggleSolo(track.id)}
          >
            S
          </Toggle>
          {locked && lockOwner ? (
            <RemoteListen trackId={track.id} owner={lockOwner.userName} />
          ) : (
            <>
              <Toggle
                label={`Arm ${track.name} to record`}
                data-hint={hintText(
                  `Arm ${track.name} to record`,
                  'Record onto this track when you press Record',
                )}
                tone="record"
                size="sm"
                icon={
                  <Circle
                    className={track.recordArmed ? 'fill-current' : undefined}
                  />
                }
                pressed={track.recordArmed}
                onPressedChange={() =>
                  useStore.getState().toggleRecordArm(track.id)
                }
              />
              <RowVolume track={track} dimmed={track.mute} />
            </>
          )}
        </div>
      </div>
      {/* Last, so it is drawn over the row without a z-index of its own. */}
      {locked && lockOwner ? (
        <LockOutline color={lockOwner.color} trackId={track.id} />
      ) : null}
    </li>
  );
});

/** The row's volume and its meter, one under the other. */
function RowVolume({ track, dimmed }: { track: Track; dimmed: boolean }) {
  const volume = useTrackVolumeControl(track);
  const source = useRef(meterSource(`track:${track.id}`));
  return (
    <div
      className={cn('ml-1 flex flex-col items-start', dimmed && 'opacity-45')}
      onPointerDownCapture={volume.begin}
    >
      <Fader
        label={`Volume of ${track.name}`}
        data-hint={hintText(
          `Volume of ${track.name}`,
          'How loud this track is; double-click to reset',
        )}
        orientation="horizontal"
        length={FADER_PX}
        min={0}
        max={1}
        step={0.01}
        resetValue={0.8}
        value={volume.value}
        format={(v) => formatGain(v)}
        onChange={volume.change}
        onCommit={volume.end}
        showValue={false}
        hideLabel
      />
      <Meter
        label={`${track.name} level`}
        data-hint={hintText(
          `${track.name} level`,
          'How loud it plays; click to clear the red light',
        )}
        source={source.current}
        orientation="horizontal"
        length={FADER_PX}
        channels={1}
      />
    </div>
  );
}

/**
 * Whether you hear a collaborator's live signal on a track they hold: in
 * Listen-all you mute or unmute them, in Solo-listen you listen to them or
 * stop.
 */
function RemoteListen({ trackId, owner }: { trackId: string; owner: string }) {
  const mode = useListenMode();
  const audible = useRemoteTrackAudible(trackId);
  const toggle = useStudioListenStore((s) => s.toggleTrackAudible);
  const label =
    mode === 'all'
      ? `${audible ? 'Mute' : 'Unmute'} ${owner}'s live audio`
      : `${audible ? 'Stop listening to' : 'Listen to'} ${owner}`;
  return (
    <Toggle
      label={label}
      size="sm"
      pressed={audible}
      icon={audible ? <Ear /> : <EarOff />}
      onPressedChange={() => toggle(trackId)}
    >
      {audible ? 'Listening' : 'Listen'}
    </Toggle>
  );
}

/** A collaborator's track: their colour round it, brighter while they play. */
function LockOutline({ color, trackId }: { color: string; trackId: string }) {
  const audible = useRemoteTrackAudible(trackId);
  const active = useRemoteTrackActive(trackId);
  const playing = audible && active;
  return (
    <div
      aria-hidden
      data-meaning="presence"
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[var(--daw-radius-sm)]',
        playing && 'animate-pulse motion-reduce:animate-none',
      )}
      style={{ boxShadow: `inset 0 0 0 2px ${color}` }}
    />
  );
}
