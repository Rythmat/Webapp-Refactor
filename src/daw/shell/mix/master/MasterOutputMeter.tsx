import { useRef } from 'react';
import { meterSource } from '@/daw/engine/meterBus';
import { Meter } from '@/daw/ui/Meter';

// ── The master's output peak (milestones 2.9, 2.10) ────────────────────────
//
// What leaves the master chain, on the meter bus: the dock's Master and the
// Mix view's master column show this one meter. It reads peak, not loudness
// (labelled so; real LUFS is deferred).

export function MasterOutputMeter({ length }: { length: number }) {
  const output = useRef(meterSource('master'));
  return (
    <Meter
      label="Master output"
      source={output.current}
      orientation="vertical"
      length={length}
      showPeak
    />
  );
}
