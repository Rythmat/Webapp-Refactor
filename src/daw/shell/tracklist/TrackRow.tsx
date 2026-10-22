import { Ear, EarOff, SlidersHorizontal } from 'lucide-react';
import { useTrackColor } from '@/daw/harmony/trackColor';
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
import {
  useTrackPanControl,
  useTrackVolumeControl,
} from '@/daw/hooks/useMixControls';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore, useTrack, type Track } from '@/daw/store';
import { RecordGlyph } from '@/daw/ui/icons/frameIcons';
import { Menu, MenuTrigger } from '@/daw/ui/Menu';
import { formatPan } from '@/daw/ui/format';
import { Knob } from '@/daw/ui/Knob';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { VolumePill } from '@/daw/ui/VolumePill';
import { selectTrackInList } from './useTrackListKeys';
import { armHint, armLabel, armStateOf, nextArm } from './recordArm';
import { TRACK_ROW_PX } from './rowLayout';
import { onTrackMenuRequest } from './trackMenuRequests';
import { TrackMenuContent } from './TrackMenu';
import { useTrackRename } from './useTrackRename';

// ── A track row (milestone 2.6; Suno's track header, 2026-10-21) ────────
//
// 86 px, two lines, after Suno's header:
//   number · name · (⋯ on hover) · mute · solo · arm · input ▾
//   the volume pill (the fader over the track's stereo meter) · pan dial
// The track's colour runs down the left edge (4 px), which is the grip
// that drags the row up or down; the selected row is lifted white/4, and a
// muted row fades. Everything else (the name, colour, role, duplicate,
// monitor, test sound, automation, export, release, delete) is in the ⋯
// menu, which a right-click on the row opens too, at the pointer (2.15),
// and so is the track's input: its MIDI device, or its audio input and
// channel (TrackInputSub; it was a ▾ on the header until 2026-10-22). Every control is named in full ('Mute Rhodes'),
// shows its state by more than colour (pressed, filled), and is at least
// 24 × 24. Solo shows on in white, never yellow (owner decision 3). The
// record button steps through three states (recordArm.ts): armed and
// hearing its input (a red disc with a halo), armed and quiet (the red
// disc), off (a grey dot).
//
// The name is the row's selector: a click selects the track, a double-click
// (or F2 / N with focus on it) renames it, and the arrow keys move the
// selection (the track list's keys, useTrackListKeys).
//
// A track a collaborator has selected is theirs for now: it is outlined in
// their colour and only Mute and Solo (which are each person's own) stay
// live; while they play it live, Listen sets whether you hear them.

/** A header button: 28 × 32, its icon or letter in white/50 until hovered. */
const HEADER_BUTTON = cn(
  'flex h-8 w-7 shrink-0 items-center justify-center rounded-[var(--daw-radius-sm)] text-daw-pill-text hover:text-daw-text [&_svg]:size-3.5',
  TRANSITION,
  FOCUS_RING,
);

/** The 24 px circle a header toggle fills when it is on. */
const CIRCLE = 'flex size-6 items-center justify-center rounded-full';

/**
 * The volume pill's width: with the 28 px pan knob and the 4 px gap, as wide
 * as Main's pill (MasterRow's 232 px), so their right ends line up.
 */
const TRACK_PILL_PX = 200;

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
  // Harmony Color: the key centre's colour in its own's place.
  const trackColor = useTrackColor(track.color);
  // One thing is selected in the list: a track, or Master (its strip at the
  // foot, 2026-10-22), whose selection shows Master in the dock.
  const isSelected = useStore(
    (s) => s.selectedTrackId === track.id && !s.dockMaster,
  );
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
    selectTrackInList(track.id);
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
  const volume = useTrackVolumeControl(track);
  const pan = useTrackPanControl(track);
  const meter = useRef(meterSource(`track-lr:${track.id}`));
  const muted = track.mute;
  const arm = armStateOf(track);

  return (
    <li
      data-track-id={track.id}
      data-testid="track-row"
      data-selected={isSelected || undefined}
      data-muted={muted || undefined}
      aria-label={track.name}
      aria-current={isSelected || undefined}
      className={cn(
        'group/row relative flex border-b border-daw-bg',
        isSelected ? 'bg-daw-surface-2' : 'hover:bg-daw-surface-2',
        dragging && 'opacity-60',
        TRANSITION,
      )}
      style={{ height: TRACK_ROW_PX }}
      onClick={(e) => {
        select();
        // A click on the row itself (not one of its controls) puts focus on
        // the track's name, so the list's keys (Delete, M, S, the arrows)
        // act on the track just selected.
        if (
          e.target instanceof Element &&
          !e.target.closest('button, input, [role="slider"], [tabindex]')
        ) {
          e.currentTarget
            .querySelector<HTMLElement>('[data-track-selector]')
            ?.focus({ preventScroll: true });
        }
      }}
      onContextMenu={onContextMenu}
    >
      {/* The track's colour down the left edge, 4 px: the grip that drags
          the row up or down. Muted, it fades. */}
      <div
        aria-hidden
        data-testid="track-grip"
        className="flex w-2 shrink-0 cursor-grab touch-none justify-start active:cursor-grabbing"
        onPointerDown={(e) => onGripDown(e, track.id)}
      >
        <span
          data-testid="track-colour-bar"
          className={cn('h-full w-1', muted && 'opacity-40')}
          style={{ backgroundColor: trackColor }}
          data-meaning="track-colour"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 pl-2 pr-3 pt-2">
        {/* Row 1: number (the mute), name, ⋯ (on hover), solo, arm, input. */}
        <div className="flex h-8 min-w-0 items-center">
          {/* The track's number is its mute (owner, 2026-10-22: the mute
              icon went): a click silences the track, its number filled in
              while it is muted. */}
          <button
            type="button"
            data-testid="track-number"
            aria-label={`Mute ${track.name}`}
            aria-pressed={muted}
            data-hint={hintText(
              `Mute ${track.name}`,
              muted
                ? 'Muted: click the number to hear this track again'
                : 'Click the number to silence this track',
            )}
            onClick={() => useStore.getState().toggleMute(track.id)}
            className={cn(
              TYPE_CLASS.label,
              '-ml-1 flex size-6 shrink-0 items-center justify-center rounded-full font-bold tabular-nums',
              muted
                ? 'bg-daw-pill-on text-daw-text'
                : 'text-daw-text-3 hover:bg-daw-hover hover:text-daw-text',
              TRANSITION,
              FOCUS_RING,
            )}
          >
            {index + 1}
          </button>
          {rename.editing ? (
            <input
              ref={rename.inputRef}
              aria-label={`Name of ${track.name}`}
              defaultValue={track.name}
              className={cn(
                'ml-2 h-6 min-w-0 flex-1 rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-bg px-1 font-bold text-daw-text outline-none',
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
                'ml-2 h-6 min-w-0 flex-1 truncate rounded-[var(--daw-radius-sm)] text-left font-bold text-daw-text',
                TYPE_CLASS.label,
                muted && 'opacity-50',
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
          <div
            className="flex shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Menu open={menuOpen} onOpenChange={setMenuOpen}>
              <MenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`More for ${track.name}`}
                  data-tutorial-id={
                    menuAnchor ? 'track-menu-button' : undefined
                  }
                  data-hint={hintText(
                    `More for ${track.name}`,
                    'Rename, colour, duplicate, export or delete it',
                  )}
                  data-testid="track-menu-button"
                  className={cn(
                    HEADER_BUTTON,
                    // Shown on hover, with the keyboard, or while open
                    // (Suno's); its room stays, so nothing shifts.
                    'opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100 data-[state=open]:opacity-100',
                  )}
                >
                  {/* Sliders, not '⋯': the chord ruler's settings are '⋯'
                      (ChordRulerSettings), and the two sat one over the
                      other (owner, 2026-10-22). */}
                  <SlidersHorizontal aria-hidden />
                </button>
              </MenuTrigger>
              {menuOpen ? (
                <TrackMenuContent
                  track={track}
                  locked={locked}
                  isSelected={isSelected}
                />
              ) : null}
            </Menu>
            <button
              type="button"
              aria-label={`Solo ${track.name}`}
              aria-pressed={track.solo}
              data-testid="track-solo"
              data-hint={hintText(
                `Solo ${track.name}`,
                'Hear this track on its own while everything else goes quiet',
              )}
              className={HEADER_BUTTON}
              onClick={() => useStore.getState().toggleSolo(track.id)}
            >
              <span
                className={cn(
                  CIRCLE,
                  TYPE_CLASS.label,
                  track.solo && 'bg-daw-text font-bold text-daw-on-primary',
                )}
              >
                S
              </span>
            </button>
            {locked && lockOwner ? null : (
              <>
                <button
                  type="button"
                  aria-label={armLabel(track.name, arm)}
                  aria-pressed={track.recordArmed}
                  data-arm-state={arm}
                  data-testid="track-arm"
                  data-hint={hintText(armLabel(track.name, arm), armHint(arm))}
                  className={HEADER_BUTTON}
                  onClick={() =>
                    useStore.getState().updateTrack(track.id, nextArm(track))
                  }
                >
                  {/* The record dot: grey when off, on a red disc when
                      armed, with a red halo while it hears its input. */}
                  <span
                    data-testid="track-arm-face"
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full [&_svg]:size-2.5',
                      TRANSITION,
                      arm === 'off'
                        ? 'text-daw-pill-text'
                        : 'bg-daw-record text-daw-on-danger',
                      arm === 'monitoring' &&
                        'shadow-[0_0_0_2px_var(--daw-bg),0_0_0_3.5px_var(--daw-record)]',
                    )}
                  >
                    <RecordGlyph />
                  </span>
                </button>
              </>
            )}
          </div>
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

        {/* Row 2: the volume pill (the fader over the track's stereo
            meter) and the Mix strips' pan knob, as wide together as Main's
            pill. */}
        <div
          className="flex h-[26px] items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {locked && lockOwner ? (
            <RemoteListen trackId={track.id} owner={lockOwner.userName} />
          ) : (
            <>
              <VolumePill
                label={`Volume of ${track.name}`}
                data-hint={hintText(
                  `Volume of ${track.name}`,
                  'How loud this track is, over its level; double-click to reset',
                )}
                data-testid="track-volume"
                value={volume.value}
                onBegin={volume.begin}
                onChange={volume.change}
                onEnd={volume.end}
                resetValue={0.8}
                meter={meter.current}
                color={trackColor}
                dimmed={muted}
                width={TRACK_PILL_PX}
              />
              {/* The Mix strips' pan knob (owner, 2026-10-22). */}
              <div
                className={cn('flex shrink-0', muted && 'opacity-50')}
                onPointerDownCapture={pan.begin}
              >
                <Knob
                  label={`Pan of ${track.name}`}
                  data-hint={hintText(
                    `Pan of ${track.name}`,
                    'Where it sits from left to right; double-click to centre',
                  )}
                  data-testid="track-pan"
                  size="sm"
                  bipolar
                  min={-1}
                  max={1}
                  step={0.01}
                  resetValue={0}
                  value={pan.value}
                  format={formatPan}
                  onChange={pan.change}
                  onCommit={pan.end}
                  showValue={false}
                  hideLabel
                />
              </div>
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
