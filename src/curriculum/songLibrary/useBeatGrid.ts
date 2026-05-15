import { useEffect, useState } from 'react';
import type { BeatGrid } from './timing';

interface BeatSidecar {
  videoId: string;
  beats: number[];
  downbeats: number[];
  beatsPerBar: number;
  /** Optional pre-computed anchor; falls back to first downbeat. */
  anchorBeatIdx?: number;
}

const sidecarLoaders = import.meta.glob<{ default: BeatSidecar }>(
  '/src/curriculum/data/songs/_beats/*.json',
);

function loaderKeyFor(slug: string): string | null {
  const match = Object.keys(sidecarLoaders).find((k) =>
    k.endsWith(`/${slug}.json`),
  );
  return match ?? null;
}

function deriveAnchor(sidecar: BeatSidecar): number {
  if (typeof sidecar.anchorBeatIdx === 'number') return sidecar.anchorBeatIdx;
  if (sidecar.downbeats.length > 0) {
    const first = sidecar.downbeats[0];
    const idx = sidecar.beats.indexOf(first);
    return idx >= 0 ? idx : 0;
  }
  return 0;
}

/** Lazy-load a per-song beat sidecar. Returns null until ready or if absent. */
export function useBeatGrid(slug: string | undefined): BeatGrid | null {
  const [grid, setGrid] = useState<BeatGrid | null>(null);

  useEffect(() => {
    setGrid(null);
    if (!slug) return;
    const key = loaderKeyFor(slug);
    if (!key) return;

    let cancelled = false;
    sidecarLoaders[key]().then((mod) => {
      if (cancelled) return;
      const sidecar = mod.default;
      setGrid({
        beats: sidecar.beats,
        downbeats: sidecar.downbeats,
        beatsPerBar: sidecar.beatsPerBar,
        anchorBeatIdx: deriveAnchor(sidecar),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return grid;
}
