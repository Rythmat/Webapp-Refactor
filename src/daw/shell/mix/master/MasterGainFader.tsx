import { useMasterVolumeControl } from '@/daw/hooks/useMixControls';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';

// ── The master's gain (milestones 2.9, 2.10) ───────────────────────────────
//
// One fader for the Master wherever it shows: the dock's Master and the Mix
// view's master column. A drag plays at once and writes the store once, on
// release (one undo step).

export function MasterGainFader({ length }: { length: number }) {
  const volume = useMasterVolumeControl();
  return (
    <div onPointerDownCapture={volume.begin}>
      <Fader
        label="Master gain"
        length={length}
        min={0}
        max={1}
        step={0.01}
        resetValue={0.8}
        value={volume.value}
        format={(v) => formatGain(v)}
        onChange={volume.change}
        onCommit={volume.end}
        hideLabel
      />
    </div>
  );
}
