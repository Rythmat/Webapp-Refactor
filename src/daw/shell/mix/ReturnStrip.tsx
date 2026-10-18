import { memo, useRef } from 'react';
import { cn } from '@/components/utilities';
import { useReturnVolumeControl } from '@/daw/hooks/useMixControls';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import type { ReturnId } from '@/daw/store/effectRack';
import type { ReturnBus } from '@/daw/store/returnsSlice';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';
import { Readout } from '@/daw/ui/Readout';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { InsertList } from './InsertList';
import { MIX_STRIP_PX, STRIP_ROWS } from './MixStrip';
import { openRack } from './rackTarget';
import { useFaderLength } from './useFaderLength';

// ── A return's strip in the Mix view (milestone 2.10) ─────────────────────
//
// After the track strips, one per return bus (A · Reverb, B · Delay), as
// wide as a track's and with its fader at the same height. Its name and
// its effects open the return's rack in the RackDock (a click anywhere on
// the strip but the fader does too, as the lessons' 'return-strip-A'
// spotlight asks). A return has no sends, pan, mute or solo, and no meter:
// the meter bus has no key for a return, so the meter's place stays empty
// rather than showing a level it can't read.

const VALUE_PX = 16;

export const ReturnStrip = memo(function ReturnStrip({
  returnId,
}: {
  returnId: ReturnId;
}) {
  const ret = useStore((s) => s.returns.find((r) => r.id === returnId));
  const open = useStore(
    (s) => s.mixRack?.kind === 'return' && s.mixRack.id === returnId,
  );
  if (!ret) return null;
  const name = `Return ${returnId}`;
  const show = () => openRack({ kind: 'return', id: returnId });

  return (
    <div
      role="group"
      aria-label={`${name} · ${ret.label} strip`}
      data-tutorial-id={`return-strip-${returnId}`}
      data-testid="return-strip"
      data-return-id={returnId}
      data-open={open || undefined}
      onClick={show}
      className={cn(
        'flex min-h-fit shrink-0 cursor-pointer flex-col border-r border-daw-hairline',
        open ? 'bg-daw-selected' : 'bg-daw-surface-1 hover:bg-daw-hover',
        TRANSITION,
      )}
      style={{ width: MIX_STRIP_PX }}
    >
      <div
        className="flex shrink-0 flex-col"
        style={{ height: STRIP_ROWS.header }}
      >
        <span aria-hidden className="h-1 shrink-0 bg-daw-outline" />
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${name} · ${ret.label}: show its effects`}
          data-hint={hintText(
            `${name} · ${ret.label}`,
            'Show the effect the tracks’ sends feed',
          )}
          data-testid="return-strip-name"
          onClick={(e) => {
            e.stopPropagation();
            show();
          }}
          className={cn(
            TYPE_CLASS.label,
            'mx-1 mt-0.5 flex h-6 min-w-0 items-baseline gap-1 rounded-[var(--daw-radius-sm)] px-1 text-left hover:bg-daw-hover',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          <span className="shrink-0 font-bold text-daw-text">{returnId}</span>
          <span className="truncate text-daw-text-2">{ret.label}</span>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-1 pb-2 pt-1">
        <InsertList target={{ kind: 'return', id: returnId }} owner={name} />
        {/* The rows a track strip uses for its knobs and toggles: kept
            empty, so the faders line up. */}
        <div
          aria-hidden
          className="shrink-0"
          style={{ height: STRIP_ROWS.knobs + STRIP_ROWS.toggles + 4 }}
        />
        <ReturnVolume ret={ret} name={name} />
      </div>
    </div>
  );
});

function ReturnVolume({ ret, name }: { ret: ReturnBus; name: string }) {
  const volume = useReturnVolumeControl(ret);
  const box = useRef<HTMLDivElement>(null);
  const length = useFaderLength(box, { reserve: VALUE_PX + 4 });
  return (
    <div
      ref={box}
      data-testid="return-strip-fader"
      className="flex min-h-[100px] flex-1 cursor-default flex-col items-center gap-1 overflow-hidden"
      // The fader moves the level; it never opens the rack.
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-center gap-1">
        <div className="flex" onPointerDownCapture={volume.begin}>
          <Fader
            label={`Volume of ${name} · ${ret.label}`}
            data-hint={hintText(
              `Volume of ${name} · ${ret.label}`,
              'How loud this effect is in the mix',
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
          />
        </div>
        {/* Where a meter would be: a return has no level to read yet. */}
        <span aria-hidden className="w-6" data-testid="return-meter-space" />
      </div>
      <Readout
        value={formatGain(volume.value)}
        tone="muted"
        aria-hidden
        style={{ height: VALUE_PX }}
      />
    </div>
  );
}
