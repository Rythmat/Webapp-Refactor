import { memo, useEffect, useRef, useState } from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { MasterRow } from './MasterRow';
import { SongControls } from './SongControls';
import { TransportControls } from './TransportControls';

// ── The bottom rail (B4a) ──────────────────────────────────────────────────
//
// 44 px, the window's full width, under every view (owner, 2026-10-16,
// after Soundtrap's): Master at the left (volume, level, its automation,
// Effects → Mix), the transport in the middle (Play, Record, the readout,
// Loop, Click and its count-in), the song at the right (Key, Tempo, Metre).
// The top bar keeps the project, the views, Share and the account. The
// transport stays centred in the window whatever the sides hold; below
// SHORT_KEY_PX of width the key drops its mode word ('C', not 'C major').

const SHORT_KEY_PX = 1100;

export const BottomRail = memo(function BottomRail({
  isReady,
  onInit,
}: {
  isReady: boolean;
  onInit(): void;
}) {
  useDevCommitCount('BottomRail');
  const ref = useRef<HTMLDivElement>(null);
  const narrow = useNarrow(ref, SHORT_KEY_PX);
  return (
    <div
      ref={ref}
      data-testid="bottom-rail"
      className="grid h-11 items-center gap-2 border-t border-daw-hairline bg-daw-bg px-3"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}
    >
      <div
        role="group"
        aria-label="Master"
        data-zone="master"
        className="flex min-w-0 items-center justify-self-start"
      >
        <MasterRow />
      </div>
      <div
        role="group"
        aria-label="Transport"
        data-zone="transport"
        className="flex items-center"
      >
        <TransportControls isReady={isReady} onInit={onInit} />
      </div>
      <div
        role="group"
        aria-label="Song"
        data-zone="song"
        className="flex min-w-0 items-center justify-self-end"
      >
        <SongControls short={narrow} />
      </div>
    </div>
  );
});

/** Whether the element is narrower than `px`, as it resizes. */
function useNarrow(ref: React.RefObject<HTMLElement>, px: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) =>
      setNarrow(entry.contentRect.width < px),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, px]);
  return narrow;
}
