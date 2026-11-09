import { memo, useRef } from 'react';
import { cn } from '@/components/utilities';
import { useReturnVolumeControl } from '@/daw/hooks/useMixControls';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import type { ReturnId } from '@/daw/store/effectRack';
import type { ReturnBus } from '@/daw/store/returnsSlice';
import { Readout } from '@/daw/ui/Readout';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { pillDbText, VolumePill } from '@/daw/ui/VolumePill';
import { InsertList } from './InsertList';
import { MIX_STRIP_PX, STRIP_ROWS } from './MixStrip';
import { openRack } from './rackTarget';
import { useFaderLength } from './useFaderLength';

// ── A return's strip in the Mix view (milestone 2.10) ─────────────────────
//
// Pinned at the right beside the Master, one per return bus, named Send A and Send B
// (owner, 2026-10-21); their effects start as Reverb and Delay. As
// wide as a track's and with its fader at the same height. Its name and
// its effects open the return's rack in the RackDock (a click anywhere on
// the strip but the fader does too, as the lessons' 'return-strip-A'
// spotlight asks). A return has no sends, pan, mute or solo, and no meter:
// the meter bus has no key for a return, so its volume pill (the tracks'
// pill, 2026-10-21) stays empty rather than showing a level it can't read.

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
  const name = `Send ${returnId}`;
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
            'mx-1 mt-0.5 h-6 truncate rounded-[var(--daw-radius-sm)] px-1 text-left font-bold text-daw-text hover:bg-daw-hover',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          {name}
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
  const length = useFaderLength(box, { reserve: VALUE_PX + 8 });
  return (
    <div
      ref={box}
      data-testid="return-strip-fader"
      className="flex min-h-[100px] flex-1 cursor-default flex-col items-center gap-1 overflow-hidden pt-1"
      // The fader moves the level; it never opens the rack.
      onClick={(e) => e.stopPropagation()}
    >
      <VolumePill
        label={`Volume of ${name} · ${ret.label}`}
        data-hint={hintText(
          `Volume of ${name} · ${ret.label}`,
          'How loud this effect is in the mix; double-click to reset',
        )}
        orientation="vertical"
        length={length}
        value={volume.value}
        onBegin={volume.begin}
        // The store keeps a return at unity or under.
        onChange={(gain) => volume.change(Math.min(1, gain))}
        onEnd={volume.end}
        resetValue={0.8}
        color="var(--daw-text-2)"
        showChip={false}
      />
      <Readout
        value={pillDbText(volume.value)}
        tone="muted"
        aria-hidden
        style={{ height: VALUE_PX }}
      />
    </div>
  );
}
