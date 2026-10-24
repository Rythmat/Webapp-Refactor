import { useMasterFaderMeters } from '@/daw/hooks/useFaderMeters';
import { useMasterVolumeControl } from '@/daw/hooks/useMixControls';
import { hintText } from '@/daw/shell/help/hintSource';
import { Readout } from '@/daw/ui/Readout';
import { pillDbText, VolumePill } from '@/daw/ui/VolumePill';

// ── The master's volume (milestones 2.9, 2.10) ─────────────────────────────
//
// The Mix view's Master strip has the volume pill (MasterVolumePill), as the
// strips beside it do; the dock's Master is its effects since 2026-10-22,
// and the Main row's pill is its volume there. A drag plays at once and
// writes the store once, on release (one undo step).

/**
 * The Mix view's Master strip: the master's volume pill (the track
 * headers' and the Main row's, stood on end, 2026-10-21) over the mix's
 * level, with its value under it.
 */
export function MasterVolumePill({
  length,
  valueHeight,
}: {
  length: number;
  /** The value line's height, as the strips beside it have it. */
  valueHeight?: number;
}) {
  const volume = useMasterVolumeControl();
  const levels = useMasterFaderMeters();
  return (
    <div className="flex flex-col items-center gap-1">
      <VolumePill
        label="Master gain"
        data-hint={hintText(
          'Master gain',
          'The volume of the whole mix, over its level; double-click to reset',
        )}
        orientation="vertical"
        length={length}
        value={volume.value}
        onBegin={volume.begin}
        // The store keeps the master at unity or under.
        onChange={(gain) => volume.change(Math.min(1, gain))}
        onEnd={volume.end}
        resetValue={0.8}
        meter={levels.meter}
        ghosts={levels.ghosts}
        dimmed={!levels.audible}
        color="var(--daw-text-2)"
        showChip={false}
      />
      <Readout
        value={pillDbText(volume.value)}
        tone="muted"
        aria-hidden
        data-testid="master-volume-value"
        style={valueHeight ? { height: valueHeight } : undefined}
      />
    </div>
  );
}
