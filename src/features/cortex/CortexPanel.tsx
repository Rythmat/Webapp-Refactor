import { useEffect, useMemo, useState } from 'react';
import { CortexMap } from './CortexMap';
import { NodeCard } from './NodeCard';
import type { CortexWeb } from './buildWeb';
import { useCortexView } from './useCortexView';
import { useCortexWeb } from './useCortexWeb';
import './cortex.css';

/**
 * The student's Cortex on the User page: everything they've done and what
 * connects it, drawn as the console's Cortex is (owner, 2026-11-04, which
 * retired the Orbit view and the core). Or how one starts.
 */

/** How it begins, once that's known. */
const EmptyCortex = ({ loading }: { loading: boolean }) => (
  <div
    data-cortex-empty
    className="flex size-full flex-col items-center justify-center px-4 text-center"
  >
    {!loading && (
      <>
        <h3 className="text-lg font-bold text-white">
          Your Cortex starts here
        </h3>
        <p className="mt-1 max-w-[26rem] text-[0.9375rem] leading-6 text-white/60">
          Everything you do in Music Atlas appears here, and connects as you go.
          Open a lesson, a song or a game to make your first connection.
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
  const view = useCortexView(web, { loading, layout: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId
    ? web.nodes.find((n) => n.id === selectedId)
    : undefined;

  // What's selected can leave the web as it changes.
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  // Wherever focus has gone.
  const open = Boolean(selectedId);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (web.activityCount === 0) return <EmptyCortex loading={loading} />;

  return (
    <section
      aria-label="Your Cortex"
      data-testid="cortex-panel"
      className="cortex-map-appear relative size-full"
    >
      <div className="absolute inset-0">
        <CortexMap
          web={web}
          view={view}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <ConnectionList web={web} />
      <p
        aria-live="polite"
        className="pointer-events-none absolute left-3 top-2 text-xs text-white/55"
      >
        {view.caption ??
          `${web.activityCount} ${web.activityCount === 1 ? 'activity' : 'activities'} · ${web.connectionCount} ${web.connectionCount === 1 ? 'connection' : 'connections'}`}
      </p>
      {selected && (
        <NodeCard node={selected} web={web} onSelect={setSelectedId} />
      )}
    </section>
  );
};

export default CortexPanel;
