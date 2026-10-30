import { useMemo } from 'react';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import { useAtlasStop } from '@/components/atlas/navigation/useAtlasNavigate';
import { stopScope } from '@/components/atlas/stats/stopScope';
import { LegendCard } from './LegendCard';
import { StopCards } from './StopCards';
import { WorldCards } from './WorldCards';

/**
 * The cards over the map (owner, 2026-10-29: the Studio frame with
 * floating cards, after the map-dashboard reference): the world's with
 * nothing chosen, else the stop's (a place, an artist, an event), and the
 * Legend at the foot. A tour or a pathway has its own card (journeys).
 */
export default function StageCards({ compact }: { compact: boolean }) {
  const stop = useAtlasStop();
  const key = stopKey(stop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scope = useMemo(() => stopScope(stop), [key]);
  const world = stop.kind === 'home' || stop.kind === 'search';
  return (
    <>
      {world ? (
        <WorldCards compact={compact} />
      ) : (
        scope && <StopCards compact={compact} scope={scope} />
      )}
      <LegendCard order={4} />
    </>
  );
}
