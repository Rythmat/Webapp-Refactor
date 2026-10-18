import { Sliders } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore, useTrackIds } from '@/daw/store';
import type { ReturnId } from '@/daw/store/effectRack';
import { EmptyState } from '@/daw/ui/EmptyState';
import { MasterColumn } from './MasterColumn';
import { MixStrip } from './MixStrip';
import { ReturnStrip } from './ReturnStrip';

// ── The Mix view (milestone 2.10) ──────────────────────────────────────────
//
// Mixer first, the height of the main region: a row of 96 px strips that
// scrolls sideways (each track, then Return A and B), and the 240 px master
// column pinned at the right. The racks open in the RackDock under it (the
// shell's dock area), from a strip's effects, a return or the master's
// chain. The selected track's strip scrolls into view when the selection
// changes. With no tracks yet, the row says how to start; the returns and
// the master still show.
//
// It replaces the old Studio view (components/Studio/StudioView.tsx): its
// view id stays 'studio' and its profiler id 'StudioView'.

export function MixView({ isReady }: { isReady: boolean }) {
  const trackIds = useTrackIds();
  const returnIds = useStore(
    useShallow((s) => s.returns.map((r) => r.id as ReturnId)),
  );
  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedTrackId) return;
    const strips = rowRef.current?.querySelectorAll<HTMLElement>(
      '[data-testid="mix-strip"]',
    );
    const strip = Array.from(strips ?? []).find(
      (el) => el.dataset.trackId === selectedTrackId,
    );
    strip?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [selectedTrackId]);

  return (
    <div
      data-ds="v2"
      data-testid="mix-view"
      className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-daw-bg"
    >
      <div
        ref={rowRef}
        data-tutorial-id="mixer-section"
        data-testid="mix-strips"
        role="group"
        aria-label="Mixer"
        className="flex min-h-0 min-w-0 flex-1 overflow-auto"
      >
        {trackIds.length === 0 ? (
          <EmptyState
            icon={<Sliders />}
            title="Add tracks to see the mixer"
            description="Each track gets a strip here, with its effects, sends, pan and volume."
            className="min-w-[240px] flex-1"
            data-testid="mix-empty"
          />
        ) : (
          trackIds.map((id) => <MixStrip key={id} trackId={id} />)
        )}
        {returnIds.map((id) => (
          <ReturnStrip key={id} returnId={id} />
        ))}
      </div>
      <MasterColumn isReady={isReady} />
    </div>
  );
}
