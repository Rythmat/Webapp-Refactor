import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OrbitalCore } from '@/components/orbital/OrbitalCore';
import { OrbitalStage } from '@/components/orbital/OrbitalStage';
import { orbitGeometry } from '@/components/orbital/orbitSlots';
import { CortexMap } from './CortexMap';
import { NodeCard } from './NodeCard';
import type { CortexWeb, WebNode } from './buildWeb';
import { cortexOrbit } from './cortexOrbit';
import { fitCentre } from './layout';
import { NODE_COLOR } from './nodeMeta';
import { useCortexView } from './useCortexView';
import { useCortexWeb } from './useCortexWeb';
import './cortex.css';

/**
 * The Cortex on Learn's own page: the student's Orbit, what they did lately and
 * what connects it, with the whole web a click away. Or how one starts.
 */

const LEGEND: readonly { label: string; kind: WebNode['kind'] }[] = [
  { label: 'Songs', kind: 'song' },
  { label: 'Lessons', kind: 'theory' },
  { label: 'Arcade', kind: 'game' },
  { label: 'Studio', kind: 'project' },
  { label: 'Globe', kind: 'artist' },
];

type CortexMode = 'orbit' | 'map';

const MODES: readonly { mode: CortexMode; label: string }[] = [
  { mode: 'orbit', label: 'Orbit' },
  { mode: 'map', label: 'Whole map' },
];

const DEFAULT_MODE: CortexMode = 'orbit';
/** Which view this device last chose: a convenience, so it can come back empty. */
const MODE_KEY = 'music-atlas-cortex-mode';
/** Under this, the card is a sheet over the foot of the panel. */
const SHEET_BELOW_PX = 1024;

const readMode = (): CortexMode => {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    return saved === 'orbit' || saved === 'map' ? saved : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
};

const writeMode = (mode: CortexMode) => {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Private browsing: it opens on the default next time.
  }
};

const remInPx = () =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** The core alone, and under it how the rest begins, once that's known. */
const EmptyCortex = ({ loading }: { loading: boolean }) => (
  <div className="flex size-full flex-col items-center justify-center px-4 text-center">
    <svg aria-hidden width={32} height={32}>
      <OrbitalCore r={8} cx={16} cy={16} />
    </svg>
    {!loading && (
      <>
        <h3 className="mt-4 text-lg font-bold text-white">
          Your Cortex starts here
        </h3>
        <p className="mt-1 max-w-[26rem] text-[0.9375rem] leading-6 text-white/60">
          Everything you do in Music Atlas appears here, and connects as you go.
          Ask for something above, or open a tab, to make your first connection.
        </p>
      </>
    )}
  </div>
);

/** The map in words, whichever view is showing. */
const ConnectionList = ({ web }: { web: CortexWeb }) => {
  const sentences = useMemo(() => {
    const names = new Map(web.nodes.map((n) => [n.id, n.label]));
    return web.links
      .filter((l) => !l.hollow)
      .map((l) => `${names.get(l.source)} connects to ${names.get(l.target)}`);
  }, [web]);
  return (
    <ul className="sr-only">
      {sentences.map((sentence) => (
        <li key={sentence}>{sentence}</li>
      ))}
    </ul>
  );
};

export const CortexPanel = () => {
  const { web, loading } = useCortexWeb();
  const [mode, setMode] = useState<CortexMode>(readMode);
  // Once opened it stays laid out, so coming back to it is instant.
  const [mapOpened, setMapOpened] = useState(mode === 'map');
  const view = useCortexView(web, { loading, layout: mapOpened });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? web.nodes.find((n) => n.id === selectedId)
    : undefined;

  // What's selected can leave the web as it changes.
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  // Wherever focus has gone: a resize can restart the rings and drop it.
  const open = Boolean(selectedId);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const choose = (next: CortexMode) => {
    setMode(next);
    writeMode(next);
    if (next === 'map') setMapOpened(true);
  };

  // The box the rings have to fit, which only exists once there's a map.
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!box) return;
    const measure = () =>
      setSize({ width: box.clientWidth, height: box.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [box]);

  const geometry = useMemo(
    () =>
      orbitGeometry(
        size.width,
        size.height,
        remInPx(),
        fitCentre(size.width, size.height),
      ),
    [size],
  );
  const orbit = useMemo(
    () => cortexOrbit(web, selectedId, geometry.capacity),
    [web, selectedId, geometry.capacity],
  );

  // How much of the stage the card covers, where it's a sheet over its foot.
  const cardRef = useRef<HTMLElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  useLayoutEffect(() => {
    const card = cardRef.current;
    setSheetHeight(
      card && selectedId && window.innerWidth < SHEET_BELOW_PX
        ? card.getBoundingClientRect().height + 8
        : 0,
    );
  }, [selectedId]);

  if (web.activityCount === 0) return <EmptyCortex loading={loading} />;

  const present = LEGEND.filter(({ kind }) =>
    web.nodes.some((n) => NODE_COLOR[n.kind] === NODE_COLOR[kind]),
  );

  return (
    <section
      aria-label="Your Cortex"
      data-testid="cortex-panel"
      className="cortex-map-appear relative size-full"
    >
      <div ref={setBox} className="absolute inset-0">
        {mode === 'map' ? (
          <CortexMap
            web={web}
            view={view}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ) : (
          size.width > 0 && (
            <OrbitalStage
              geometry={geometry}
              nodes={orbit.nodes}
              links={orbit.links}
              selectedId={selectedId}
              onSelect={setSelectedId}
              ariaLabel={`Your Cortex: ${web.activityCount} activities, ${web.connectionCount} connections`}
              bornNodes={view.bornNodes}
              bornLinks={view.bornLinks}
              bottomInset={sheetHeight}
              footer={
                orbit.overflow > 0 && (
                  <button
                    type="button"
                    onClick={() => choose('map')}
                    className="rounded-full border border-white/10 bg-[#141416] px-3 py-1.5 text-xs text-white/70 outline-none transition-colors duration-150 hover:bg-[#1f1f22] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    +{orbit.overflow} in whole map
                  </button>
                )
              }
            />
          )
        )}
      </div>
      <ConnectionList web={web} />
      <div className="pointer-events-none absolute left-3 top-2 flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-white/85">Your Cortex</h3>
        <p aria-live="polite" className="text-xs text-white/55">
          {view.caption ??
            `${web.activityCount} ${web.activityCount === 1 ? 'activity' : 'activities'} · ${web.connectionCount} ${web.connectionCount === 1 ? 'connection' : 'connections'}`}
        </p>
      </div>
      <div
        role="group"
        aria-label="How to show your Cortex"
        className="absolute right-2 top-2 flex rounded-full border border-white/10 bg-[#141416] p-0.5"
      >
        {MODES.map((option) => (
          <button
            key={option.mode}
            type="button"
            aria-pressed={mode === option.mode}
            onClick={() => choose(option.mode)}
            className={`rounded-full px-3 py-1 text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/40 ${
              mode === option.mode
                ? 'bg-white/[0.14] text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <ul className="pointer-events-none absolute bottom-2 left-3 hidden flex-wrap gap-x-3 gap-y-1 sm:flex">
        {present.map(({ label, kind }) => (
          <li
            key={label}
            className="inline-flex items-center gap-1.5 text-xs text-white/55"
          >
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ backgroundColor: NODE_COLOR[kind] }}
            />
            {label}
          </li>
        ))}
      </ul>
      {selected && (
        <NodeCard
          node={selected}
          web={web}
          onSelect={setSelectedId}
          cardRef={cardRef}
        />
      )}
    </section>
  );
};

export default CortexPanel;
