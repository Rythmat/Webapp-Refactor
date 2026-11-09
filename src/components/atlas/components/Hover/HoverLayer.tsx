import { Suspense, lazy } from 'react';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import {
  useChannel,
  useStageSignals,
} from '@/components/atlas/state/stageSignals';

const HoverCard = lazy(() => import('./HoverCard'));

/**
 * The hover card's place on the page: nothing until the pointer is first on
 * something (the card's code loads then), none on a phone (no pointer to
 * hover with).
 */
export function HoverLayer() {
  const hover = useChannel(useStageSignals().placeHover);
  const phone = useIsPhone();
  if (!hover || phone) return null;
  return (
    <Suspense fallback={null}>
      <HoverCard hover={hover} />
    </Suspense>
  );
}
