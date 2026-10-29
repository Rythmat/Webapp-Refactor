import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ATLAS_POPOVER } from '@/components/atlas/components/UI/primitives';
import type { EraId } from '@/components/atlas/data/musicalEras';
import { useAtlasPortal } from '@/components/atlas/layout/portalRoot';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import type { PlaceHover } from '@/components/atlas/state/stageSignals';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { cn } from '@/lib/utils';
import { hoverFacts } from './hoverFacts';
import { placeCard } from './placeCard';

/** Each era's colour as a class (static, so Tailwind keeps it). */
const ERA_BG: Record<EraId, string> = {
  ancient: 'bg-atlas-era-ancient',
  renaissance: 'bg-atlas-era-renaissance',
  'classical-romantic': 'bg-atlas-era-classical-romantic',
  'early-modern': 'bg-atlas-era-early-modern',
  postwar: 'bg-atlas-era-postwar',
  'electronic-hiphop': 'bg-atlas-era-electronic-hiphop',
  'global-digital': 'bg-atlas-era-global-digital',
};

const eventsLine = (n: number) =>
  n === 0 ? 'No events in these years' : n === 1 ? '1 event' : `${n} events`;

/**
 * The card the pointer brings up over the map (owner, 2026-10-29, after
 * the map-dashboard reference's): what is under it, its events in the
 * years shown, and how they fall across the eras. It follows the pointer
 * (a place, from its dot), stays out of the Inspector, and takes no
 * pointer itself. The same facts are in the Inspector, so it is hidden from
 * assistive technology.
 */
export default function HoverCard({ hover }: { hover: PlaceHover }) {
  const w = useAtlasSelector((s) => s.timeWindow);
  const insets = useAtlasSelector((s) => s.mapInsets);
  const facts = useMemo(() => hoverFacts(hover.target, w), [hover.target, w]);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const portal = useAtlasPortal();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    setPos(
      placeCard(
        hover.anchor,
        { width: box.width, height: box.height },
        {
          left: 8,
          top: 8,
          right: window.innerWidth - insets.right - 8,
          bottom: window.innerHeight - insets.bottom - 8,
        },
      ),
    );
  }, [hover.anchor, facts, insets.right, insets.bottom]);

  if (!facts) return null;
  const total = facts.eras?.reduce((n, e) => n + e.count, 0) ?? 0;
  const card = (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        ATLAS_POPOVER,
        ATLAS_Z.popovers,
        'pointer-events-none fixed w-56 px-3 py-2.5',
      )}
      data-atlas-hover-card
      style={{
        left: pos?.left ?? hover.anchor.x,
        top: pos?.top ?? hover.anchor.y,
        visibility: pos ? 'visible' : 'hidden',
      }}
    >
      <p className="truncate text-sm font-bold text-atlas-text">
        {facts.title}
      </p>
      <p className="truncate text-xs text-atlas-text-2">{facts.subtitle}</p>
      {facts.detail && (
        <p className="mt-1 text-xs text-atlas-text-2">{facts.detail}</p>
      )}
      {facts.events !== undefined && (
        <p className="mt-2 text-xs tabular-nums text-atlas-text">
          {eventsLine(facts.events)}
        </p>
      )}
      {facts.eras && total > 0 && (
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          {facts.eras.map((era) => (
            <span
              key={era.id}
              className={ERA_BG[era.id]}
              style={{ width: `${(era.count / total) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
  return portal ? createPortal(card, portal) : card;
}
