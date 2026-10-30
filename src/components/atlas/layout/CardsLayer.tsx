import { LayoutGrid, X } from 'lucide-react';
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  ATLAS_CARD,
  AtlasIconButton,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { isTimelineView } from '@/components/atlas/navigation/atlasFrame';
import {
  useAtlasFrame,
  useAtlasStopSelector,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import type { MapInsets } from '@/components/atlas/types';
import { cn } from '@/lib/utils';
import { CARDS_REM, cardsMode, type CardsMode } from './cardsLayout';
import { insetsFrom, useReportInsets } from './mapInsets';

const StageCards = lazy(
  () => import('@/components/atlas/components/Cards/StageCards'),
);

const remPx = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/**
 * The floating cards' place over the map (owner, 2026-10-29: the Studio
 * frame with floating cards, after the map-dashboard reference): a column
 * at the stage's left, under the Inspector and the era rail, its cards
 * loading with their own chunk. It tells the map what it covers, so
 * flights land beside it; folded to "At a glance" when the Inspector leaves
 * too little room, the pill opens it over the map instead.
 */
export function CardsLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const dispatch = useAtlasDispatch();
  const hidden = useAtlasSelector((s) => s.cards.hidden);
  const inspectorPx = useAtlasSelector(
    (s) => s.zoneInsets.inspector?.right ?? 0,
  );
  const river = useAtlasFrame(isTimelineView);
  const phone = useIsPhone();
  // The world's cards for now; a stop's come with its connections.
  const world = useAtlasStopSelector(
    (stop) => stop.kind === 'home' || stop.kind === 'search',
  );
  const [stageWidth, setStageWidth] = useState(0);
  useLayoutEffect(() => {
    const stage = ref.current?.parentElement;
    if (!stage) return;
    const measure = () => setStageWidth(stage.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const mode: CardsMode =
    stageWidth === 0 || !world
      ? 'hidden'
      : cardsMode({
          hidden,
          river,
          phone,
          stageWidth,
          inspectorPx,
          remPx: remPx(),
        });
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (mode !== 'collapsed') setOpened(false);
  }, [mode]);
  useEscapeLayer(opened, () => setOpened(false));

  // What the column covers of the map's left; nothing when it floats over
  // the map from the pill, or is gone.
  const docked = mode === 'full' || mode === 'compact';
  const onInsets = useCallback(
    (insets: MapInsets) =>
      dispatch({
        type: 'SET_ZONE_INSETS',
        payload: { zone: 'cards', insets: docked ? insets : null },
      }),
    [dispatch, docked],
  );
  useReportInsets(
    ref,
    () => [columnRef.current],
    (root) =>
      insetsFrom(root.getBoundingClientRect(), {
        left: columnRef.current?.getBoundingClientRect() ?? null,
      }),
    onInsets,
    `${mode}`,
  );
  useEffect(
    () => () =>
      dispatch({
        type: 'SET_ZONE_INSETS',
        payload: { zone: 'cards', insets: null },
      }),
    [dispatch],
  );

  const showColumn = docked || (mode === 'collapsed' && opened);
  const width = mode === 'full' ? CARDS_REM.full : CARDS_REM.compact;
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {mode === 'collapsed' && !opened && (
        <AtlasPillButton
          className={cn(
            'pointer-events-auto absolute left-2 top-2',
            ATLAS_Z.mapControls,
          )}
          variant="pill"
          onClick={() => setOpened(true)}
        >
          <LayoutGrid aria-hidden className="size-4" />
          At a glance
        </AtlasPillButton>
      )}
      {showColumn && (
        <section
          ref={columnRef}
          aria-label="At a glance"
          className={cn(
            'atlas-cards pointer-events-auto absolute bottom-10 left-2 top-2 flex flex-col gap-2 overflow-y-auto overscroll-contain pb-6',
            ATLAS_Z.mapControls,
          )}
          data-atlas-cards
          style={{ width: `${width}rem` }}
        >
          {mode === 'collapsed' && (
            <div
              className={cn(
                ATLAS_CARD,
                'flex items-center justify-between py-1 pl-4 pr-1.5',
              )}
            >
              <span className="text-[0.8125rem] font-bold">At a glance</span>
              <AtlasIconButton
                aria-label="Close the cards"
                size="sm"
                onClick={() => setOpened(false)}
              >
                <X aria-hidden className="size-4" />
              </AtlasIconButton>
            </div>
          )}
          <Suspense fallback={null}>
            <StageCards compact={mode !== 'full'} />
          </Suspense>
        </section>
      )}
    </div>
  );
}
