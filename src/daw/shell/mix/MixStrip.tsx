import { memo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '@/components/utilities';
import { useTrackPresence } from '@/daw/collab/presence';
import { meterSource } from '@/daw/engine/meterBus';
import {
  useTrackPanControl,
  useTrackSendControl,
  useTrackVolumeControl,
} from '@/daw/hooks/useMixControls';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore, useTrack, type Track } from '@/daw/store';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';
import { Knob } from '@/daw/ui/Knob';
import { Meter } from '@/daw/ui/Meter';
import { Readout } from '@/daw/ui/Readout';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { InsertList } from './InsertList';
import { useFaderLength } from './useFaderLength';

// ── A track's strip in the Mix view (milestone 2.10) ───────────────────────
//
// 96 px wide (owner, 2026-10-18), the height of the view. Top to bottom:
// the name under a 4 px edge in the track's colour (a click selects the
// track), its effects (InsertList), one send knob per return and the pan
// knob, Mute and Solo, then the fader beside the track's meter with its
// value under them. Every control comes from the 2.2 primitives and is at
// least 24 px; a drag plays as it moves and writes the store once on
// release, as one undo step (useMixControls). The meter paints itself off
// the meter bus, so playing re-renders nothing here, and each strip reads
// only its own track, so an edit re-renders only its strip.
//
// A track a collaborator has selected is theirs for now: only Mute and
// Solo (each person's own) stay live, as in the track list.

export const MIX_STRIP_PX = 96;

/** The value's line under the fader and meter. */
const VALUE_PX = 16;

/** The rows above the fader, in px, so the faders line up across strips. */
export const STRIP_ROWS = {
  header: 32,
  knobs: 48,
  toggles: 24,
} as const;

const panText = (pan: number) =>
  Math.abs(pan) < 0.005
    ? 'Centre'
    : `${pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(pan) * 100)}`;

const percent = (v: number) => `${Math.round(v * 100)}%`;

export const MixStrip = memo(function MixStrip({
  trackId,
}: {
  trackId: string;
}) {
  const track = useTrack(trackId);
  return track ? <StripBody track={track} /> : null;
});

const StripBody = memo(function StripBody({ track }: { track: Track }) {
  const selected = useStore((s) => s.selectedTrackId === track.id);
  const locked = useTrackPresence(track.id).length > 0;

  return (
    <div
      data-testid="mix-strip"
      data-track-id={track.id}
      data-selected={selected || undefined}
      aria-label={`${track.name} strip`}
      role="group"
      className={cn(
        'flex min-h-fit shrink-0 flex-col border-r border-daw-hairline',
        selected ? 'bg-daw-selected' : 'bg-daw-surface-1',
        TRANSITION,
      )}
      style={{ width: MIX_STRIP_PX }}
    >
      <StripHeader track={track} selected={selected} />
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-1 pb-2 pt-1">
        <InsertList
          target={{ kind: 'track', id: track.id }}
          owner={track.name}
        />
        <div
          className="flex shrink-0 items-start justify-center gap-0.5"
          style={{ height: STRIP_ROWS.knobs }}
        >
          <Sends track={track} disabled={locked} />
          <Pan track={track} disabled={locked} />
        </div>
        <div
          className="flex shrink-0 items-center justify-center gap-1"
          style={{ height: STRIP_ROWS.toggles }}
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
        </div>
        <Volume track={track} disabled={locked} />
      </div>
    </div>
  );
});

/** The strip's name, under its colour; a click selects the track. */
export function StripHeader({
  track,
  selected,
}: {
  track: Track;
  selected: boolean;
}) {
  return (
    <div
      className="flex shrink-0 flex-col"
      style={{ height: STRIP_ROWS.header }}
    >
      <span
        aria-hidden
        data-meaning="track-colour"
        data-testid="mix-strip-colour"
        className="h-1 shrink-0"
        style={{ backgroundColor: track.color }}
      />
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${track.name}: select the track`}
        data-hint={hintText(
          track.name,
          'Select this track to edit it in Create',
        )}
        data-testid="mix-strip-name"
        onClick={() => useStore.getState().setSelectedTrackId(track.id)}
        className={cn(
          TYPE_CLASS.label,
          'mx-1 mt-0.5 h-6 truncate rounded-[var(--daw-radius-sm)] px-1 text-left font-bold text-daw-text hover:bg-daw-hover',
          track.mute && 'opacity-45',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        {track.name}
      </button>
    </div>
  );
}

/** One knob per return bus, named for the return ('Send to A · Reverb'). */
function Sends({ track, disabled }: { track: Track; disabled: boolean }) {
  // The returns' ids and names only, so a return's fader or effect edit
  // (which rebuilds the returns array) doesn't re-render every strip.
  const meta = useStore(
    useShallow((s) => s.returns.flatMap((r) => [r.id, r.label])),
  );
  const returns: { id: string; label: string }[] = [];
  for (let i = 0; i < meta.length; i += 2) {
    returns.push({ id: meta[i], label: meta[i + 1] });
  }
  return (
    <>
      {returns.map((ret) => (
        <div
          key={ret.id}
          data-tutorial-id={`mixer-sends-${ret.id}`}
          className="flex flex-col items-center"
        >
          <SendKnob
            track={track}
            returnId={ret.id}
            label={`Send to ${ret.id} · ${ret.label}`}
            disabled={disabled}
          />
          <span aria-hidden className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>
            {ret.id}
          </span>
        </div>
      ))}
    </>
  );
}

function SendKnob({
  track,
  returnId,
  label,
  disabled,
}: {
  track: Track;
  returnId: string;
  label: string;
  disabled: boolean;
}) {
  const send = useTrackSendControl(track, returnId);
  return (
    <div
      className="flex"
      onPointerDownCapture={disabled ? undefined : send.begin}
    >
      <Knob
        label={label}
        data-hint={hintText(
          label,
          'How much of this track goes to the return’s effect',
        )}
        size="sm"
        min={0}
        max={1}
        step={0.01}
        resetValue={0}
        value={send.value}
        format={percent}
        onChange={send.change}
        onCommit={send.end}
        showValue={false}
        hideLabel
        disabled={disabled}
      />
    </div>
  );
}

function Pan({ track, disabled }: { track: Track; disabled: boolean }) {
  const pan = useTrackPanControl(track);
  return (
    <div
      className="flex flex-col items-center"
      onPointerDownCapture={disabled ? undefined : pan.begin}
    >
      <Knob
        label={`Pan of ${track.name}`}
        data-hint={hintText(
          `Pan of ${track.name}`,
          'Place it left or right; double-click to centre',
        )}
        size="sm"
        bipolar
        min={-1}
        max={1}
        step={0.01}
        resetValue={0}
        value={pan.value}
        format={panText}
        onChange={pan.change}
        onCommit={pan.end}
        showValue={false}
        hideLabel
        disabled={disabled}
      />
      <span aria-hidden className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>
        Pan
      </span>
    </div>
  );
}

/** The fader beside the track's meter, its length the room left. */
function Volume({ track, disabled }: { track: Track; disabled: boolean }) {
  const volume = useTrackVolumeControl(track);
  const box = useRef<HTMLDivElement>(null);
  const length = useFaderLength(box, { reserve: VALUE_PX + 4 });
  const source = useRef(meterSource(`track:${track.id}`));
  return (
    <div
      ref={box}
      data-testid="mix-strip-fader"
      className={cn(
        'flex min-h-[100px] flex-1 flex-col items-center gap-1 overflow-hidden',
        track.mute && 'opacity-45',
      )}
    >
      <div className="flex items-start justify-center gap-1">
        <div
          className="flex"
          onPointerDownCapture={disabled ? undefined : volume.begin}
        >
          <Fader
            label={`Volume of ${track.name}`}
            data-hint={hintText(
              `Volume of ${track.name}`,
              'How loud this track is; double-click to reset',
            )}
            length={length}
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
            disabled={disabled}
          />
        </div>
        <Meter
          label={`${track.name} level`}
          data-hint={hintText(
            `${track.name} level`,
            'How loud it plays; click to clear the red light',
          )}
          source={source.current}
          orientation="vertical"
          length={length}
          channels={1}
        />
      </div>
      <Readout
        value={formatGain(volume.value)}
        tone="muted"
        aria-hidden
        data-testid="mix-strip-volume"
        style={{ height: VALUE_PX }}
      />
    </div>
  );
}
