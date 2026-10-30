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
import { stopKey } from '@/components/atlas/navigation/atlasStop';
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
import { CORNER_INSET_SHARE, INSPECTOR_REM } from './frameGeometry';
import { useIntro } from './intro';
import { cornerBox, insetsFrom, useReportInsets } from './mapInsets';

const loadStageCards = () =>
  import('@/components/atlas/components/Cards/StageCards');
const StageCards = lazy(loadStageCards);

const remPx = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/**
 * The floating card's place over the map (owner, 2026-10-30: the region is the
 * hero): the stage's top-right corner, under the panels and the era rail, its
 * code loading with its own chunk. It tells the map what it covers, so flights
 * land beside it; folded to "At a glance" when the events card leaves too
 * little room, the pill opens it over the map instead.
 */
export function CardsLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const dispatch = useAtlasDispatch();
  // Held back while the intro waits for the map; they land as it plays.
  const intro = useIntro();
  // Fetched while the intro waits, so the cards land on time.
  useEffect(() => {
    if (intro === 'wait') void loadStageCards();
  }, [intro]);
  // A new stop's cards start at the top of the column.
  const stopId = useAtlasStopSelector(stopKey);
  useEffect(() => {
    columnRef.current?.scrollTo?.({ top: 0 });
  }, [stopId]);
  const hidden = useAtlasSelector((s) => s.cards.hidden);
  const eventsOpen = useAtlasSelector(
    (s) => (s.zoneInsets.inspector?.left ?? 0) > 0,
  );
  const river = useAtlasFrame(isTimelineView);
  const phone = useIsPhone();
  // The world's cards, or a place's, an artist's or an event's; a tour or
  // a pathway speaks for itself.
  const carded = useAtlasStopSelector(
    (stop) => stop.kind !== 'tour' && stop.kind !== 'pathway',
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
    stageWidth === 0 || !carded || intro === 'wait'
      ? 'hidden'
      : cardsMode({
          hidden,
          river,
          phone,
          stageWidth,
          inspectorPx: eventsOpen ? INSPECTOR_REM.width * remPx() : 0,
          remPx: remPx(),
        });
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (mode !== 'collapsed') setOpened(false);
  }, [mode]);
  useEscapeLayer(opened, () => setOpened(false));

  // What the column covers of the map's right; nothing when it floats over
  // the map from the pill, or is gone.
  const docked = mode === 'shown';
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
    (root) => {
      const column = columnRef.current?.getBoundingClientRect() ?? null;
      return insetsFrom(root.getBoundingClientRect(), {
        right: [column ? cornerBox(column, 'right', CORNER_INSET_SHARE) : null],
      });
    },
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
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {mode === 'collapsed' && !opened && (
        <AtlasPillButton
          className={cn(
            'pointer-events-auto absolute right-2 top-2',
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
            'atlas-cards pointer-events-auto absolute right-2 top-2 flex max-h-[calc(100%-3rem)] flex-col gap-2 overflow-y-auto overscroll-contain pb-6',
            ATLAS_Z.mapControls,
          )}
          data-atlas-cards
          style={{ width: `${CARDS_REM}rem` }}
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
            <StageCards />
          </Suspense>
        </section>
      )}
    </div>
  );
}
