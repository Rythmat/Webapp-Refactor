import { useMemo, type CSSProperties } from 'react';
import {
  ATLAS_CARD,
  ATLAS_EYEBROW,
} from '@/components/atlas/components/UI/primitives';
import {
  introDelayStyle,
  useIntroDelay,
} from '@/components/atlas/layout/intro';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { useAtlasStop } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  edgesInWindow,
  scopeLinks,
  worldLinks,
} from '@/components/atlas/network/placeNetwork';
import { useNetwork } from '@/components/atlas/network/useNetwork';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { stopScope } from '@/components/atlas/stats/stopScope';
import { cn } from '@/lib/utils';

/**
 * The floating card on a phone (owner, 2026-10-30: only the most important
 * information): one small Connections card above the bottom rail, the
 * world's or the stop's. The events are in the bottom sheet.
 */
export default function PhoneStrip() {
  const stop = useAtlasStop();
  const key = stopKey(stop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scope = useMemo(() => stopScope(stop), [key]);
  const world = stop.kind === 'home' || stop.kind === 'search';
  const w = useAtlasSelector((s) => s.timeWindow);
  const ix = useNetwork().index;
  const delay = useIntroDelay();
  const links = useMemo(() => {
    if (!ix) return null;
    if (world) {
      const top = worldLinks(ix, w, { limit: 1 })[0];
      return {
        total: edgesInWindow(ix, w).length,
        line: top
          ? `${ix.node(top.from)?.label ?? ''} → ${ix.node(top.to)?.label ?? ''} · ${top.weight}`
          : 'None in these years',
      };
    }
    if (!scope) return null;
    const s = scope.pinned
      ? scopeLinks(ix, new Set([scope.pinned.event.id]), null)
      : scopeLinks(ix, scope.eventIds, w);
    return {
      total: s.total - s.local,
      line: `Came from ${s.roots.length} · Went to ${s.routes.length}`,
    };
  }, [ix, world, scope, w]);

  if (!world && !scope) return null;
  return (
    <section
      aria-label="Connections"
      className={cn(
        ATLAS_CARD,
        'atlas-card-in pointer-events-auto w-full px-4 py-3',
      )}
      data-atlas-strip
      style={{ ...introDelayStyle(delay), '--i': 0 } as CSSProperties}
    >
      <p className={ATLAS_EYEBROW}>Connections</p>
      <p className="mt-1 text-sm font-bold text-atlas-text">
        {links ? `${links.total.toLocaleString('en')} influences` : '—'}
      </p>
      <p className="truncate text-xs text-atlas-text-2">
        {links?.line ?? 'Loading the links'}
      </p>
    </section>
  );
}
