import { lazy, Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { ChordNotation } from '@/lib/chordNotation';
import {
  GRAPH_DRAWER_WIDTH_KEY,
  usePanelWidth,
} from '../../../table/panel/PanelFrame';
import { ConsoleCallout } from '../../../ui/ConsoleCallout';
import { TryAgain, WorkingGraphNotice } from '../WorkingGraphNotice';
import { useWorkingGraph } from '../useWorkingGraph';
import { useWorkingGraphStatus } from '../workingGraphStatus';
import { TesseractMap } from './TesseractMap';
import {
  newProgressionHref,
  type OpenSpec,
  PROGRESSIONS_TABLE,
  showInCortexHref,
} from './tesseractLinks';
import { buildTesseractModel, readProgressionRows } from './tesseractModel';
import { parseKey, parseNotation } from './tesseractNaming';
import { useTesseractUrlState } from './useTesseractUrlState';

// The row panel, the table's model and the editors load with the first row
// opened, not with the map, as beside Cortex's graph.
const GraphRowDrawer = lazy(() => import('../map/GraphRowDrawer'));

/**
 * Tesseract, the map of chord progression openings (owner, 1 Oct 2026), at
 * /console/cortex/tesseract: every progression in the working copy as a
 * branch of one tree per starting chord, named and coloured in the key the
 * picker holds (`TesseractMap`).
 *
 * The page wires the map to the URL (`useTesseractUrlState`): the key, the
 * notation, the list and what is open are in the query, so a view can be
 * linked, and the browser keeps the last one, which a bare URL (the pill)
 * and every link from Cortex open in.
 *
 * A progression's row opens beside the map in the path
 * (`/console/cortex/tesseract/progressions/12`), a child route, so the map
 * (its canvas and its open branches) stays mounted while rows open, change
 * and close, and leaving a row with unsaved edits asks first, as beside
 * Cortex's graph. The drawer is Cortex's (`GraphRowDrawer`), whose header
 * offers Show in Cortex: the progression's local graph, with its songs,
 * vibes and genres. A path naming any other table goes back to the map.
 *
 * Arriving with a row in the path (a progression's dot clicked in Cortex),
 * the map opens with that progression's branch open, flies to it and rings
 * it. A row opened from outside the map later (Back, a link) is flown to
 * the same way; one the reader clicks on the map is already in view.
 *
 * A duplicate pair (two progressions with the same chords) ends on one
 * opening; while either is open, a strip at the bottom of the map offers
 * both.
 *
 * The right-click menu's "New progression from here" opens the Table's New
 * flow with the opening's chords filled in (`?new=`).
 */
export const TesseractPage = () => {
  const url = useTesseractUrlState();
  const navigate = useNavigate();
  const working = useWorkingGraph({ items: false });
  const status = useWorkingGraphStatus(working);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [width, setWidth] = usePanelWidth(GRAPH_DRAWER_WIDTH_KEY);

  const rows = working.snapshot?.progressions as readonly unknown[] | undefined;
  const model = useMemo(
    () => buildTesseractModel(readProgressionRows(rows)),
    [rows],
  );
  const songTitles = useMemo(
    () =>
      new Map(
        (working.snapshot?.songs ?? []).map((song) => [song.id, song.title]),
      ),
    [working.snapshot],
  );
  const songTitle = useCallback(
    (id: string) => songTitles.get(id),
    [songTitles],
  );

  const { view, setView, openRow, row } = url;
  const keyName = parseKey(view.key);
  const notation = parseNotation(view.notation);

  const rowId =
    row?.table === PROGRESSIONS_TABLE && /^\d+$/.test(row.row)
      ? Number(row.row)
      : null;
  // The row the map itself last opened: it is in view already, so only a
  // row opened from elsewhere is flown to.
  const openedByMap = useRef<number | null>(null);
  const revealId =
    rowId !== null && rowId !== openedByMap.current ? rowId : null;
  const onOpenRow = useCallback(
    (id: number) => {
      openedByMap.current = id;
      openRow(id);
    },
    [openRow],
  );

  const pair = useMemo(() => {
    if (rowId === null) return [];
    const end = model.forest.endNodeOf.get(rowId);
    return end ? (model.forest.nodes.get(end)?.endIds ?? []) : [];
  }, [model, rowId]);

  const onKeyChange = useCallback((key: string) => setView({ key }), [setView]);
  const onNotationChange = useCallback(
    (next: ChordNotation) => setView({ notation: next }),
    [setView],
  );
  const onListChange = useCallback(
    (list: boolean) => setView({ list }),
    [setView],
  );
  const onOpenChange = useCallback(
    (open: OpenSpec) => setView({ open }),
    [setView],
  );
  const onShowInCortex = useCallback(
    (id: number) => void navigate(showInCortexHref(id)),
    [navigate],
  );
  const onNewFromHere = useCallback(
    (chords: string[]) => void navigate(newProgressionHref(chords)),
    [navigate],
  );

  let stage;
  if (rows) {
    stage = (
      <TesseractMap
        rows={rows}
        model={model}
        songTitle={songTitle}
        keyName={keyName}
        onKeyChange={onKeyChange}
        notation={notation}
        onNotationChange={onNotationChange}
        list={view.list}
        onListChange={onListChange}
        openSpec={view.open}
        onOpenChange={onOpenChange}
        selectedProgressionId={rowId}
        revealProgressionId={revealId}
        onOpenRow={onOpenRow}
        onShowInCortex={onShowInCortex}
        onNewFromHere={onNewFromHere}
        reducedMotion={reducedMotion}
      />
    );
  } else if (working.error) {
    stage = (
      <div className="px-6 py-6 md:px-10">
        <ConsoleCallout tone="danger">
          The progressions could not be loaded: {String(working.error)}.{' '}
          <TryAgain />
        </ConsoleCallout>
      </div>
    );
  } else {
    stage = (
      <div className="flex flex-1 flex-col gap-4 px-6 py-6 md:px-10">
        <Skeleton className="h-10 w-2/3 rounded-xl motion-reduce:animate-none" />
        <Skeleton className="h-[60vh] rounded-xl motion-reduce:animate-none" />
        <p role="status" className="text-sm text-white/45">
          Growing the trees…
        </p>
      </div>
    );
  }

  let drawer = null;
  if (row) {
    drawer =
      rowId === null ? (
        <Navigate replace to={url.mapHref} />
      ) : (
        <Suspense fallback={<DrawerLoading width={width} />}>
          <GraphRowDrawer
            context="tesseract"
            table={PROGRESSIONS_TABLE}
            row={String(rowId)}
            onClose={url.closeRow}
            width={width}
            onWidthChange={setWidth}
          />
        </Suspense>
      );
  }

  return (
    <div className="flex min-h-0 flex-1 bg-[hsl(var(--ui-background))]">
      <h1 className="sr-only">Tesseract</h1>
      {/* Ahead of the map, so its effect runs first: a view the map reports
          as it mounts then lands on top of the one written here. */}
      <WriteBareView bare={url.bare} write={url.writeBare} />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {stage}
        {rows ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex flex-col items-center gap-2">
            <div className="pointer-events-auto max-w-2xl empty:hidden">
              <WorkingGraphNotice
                status={status}
                error={working.error}
                subject="map"
                className="px-3 py-2 text-xs shadow-lg"
              />
            </div>
            {pair.length > 1 ? (
              <div
                role="group"
                aria-label="Progressions ending here"
                className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/[0.1] bg-popover/95 px-3 py-1.5 text-xs text-white/70 shadow-lg"
              >
                <span>{pair.length} progressions end on these chords:</span>
                {pair.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={id === rowId}
                    onClick={() => onOpenRow(id)}
                    className={
                      id === rowId
                        ? 'rounded-full bg-white px-2 py-0.5 text-[#101012]'
                        : 'rounded-full border border-white/20 px-2 py-0.5 text-white hover:bg-white/10'
                    }
                  >
                    {id}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {drawer}
    </div>
  );
};

/** Writes the view showing into a bare URL, once per bare URL. */
const WriteBareView = ({
  bare,
  write,
}: {
  bare: boolean;
  write: () => void;
}) => {
  useEffect(() => {
    if (bare) write();
  }, [bare, write]);
  return null;
};

/** Where the drawer will be while its code loads: beside the map from xl. */
const DrawerLoading = ({ width }: { width: number }) => (
  <div
    aria-hidden
    className="hidden h-full shrink-0 border-l border-border bg-[hsl(var(--ui-background))] xl:block"
    style={{ width }}
  />
);
