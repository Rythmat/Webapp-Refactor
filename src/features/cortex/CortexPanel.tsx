import { useEffect, useState } from 'react';
import { CortexMap } from './CortexMap';
import { NodeCard } from './NodeCard';
import type { WebNode } from './buildWeb';
import { NODE_COLOR } from './nodeMeta';
import { useCortexView } from './useCortexView';
import { useCortexWeb } from './useCortexWeb';
import './cortex.css';

/** The Cortex on Learn's own page: the student's map, or how one starts. */

const LEGEND: readonly { label: string; kind: WebNode['kind'] }[] = [
  { label: 'Songs', kind: 'song' },
  { label: 'Lessons', kind: 'theory' },
  { label: 'Arcade', kind: 'game' },
  { label: 'Studio', kind: 'project' },
  { label: 'Globe', kind: 'artist' },
];

const EmptyCortex = () => (
  <div className="flex size-full flex-col items-center justify-center px-4 text-center">
    <span
      aria-hidden
      className="size-3 rounded-full border border-dashed border-white/40"
    />
    <h3 className="mt-4 text-lg font-bold text-white">
      Your Cortex starts here
    </h3>
    <p className="mt-1 max-w-[26rem] text-[0.9375rem] leading-6 text-white/60">
      Everything you do in Music Atlas appears here, and connects as you go. Ask
      for something above, or open a tab, to make your first connection.
    </p>
  </div>
);

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

  if (web.activityCount === 0) return loading ? null : <EmptyCortex />;

  const present = LEGEND.filter(({ kind }) =>
    web.nodes.some((n) => NODE_COLOR[n.kind] === NODE_COLOR[kind]),
  );

  return (
    <section
      aria-label="Your Cortex"
      data-testid="cortex-panel"
      className="cortex-map-appear relative size-full"
    >
      <CortexMap
        web={web}
        view={view}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <div className="pointer-events-none absolute left-3 top-2 flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-white/85">Your Cortex</h3>
        <p aria-live="polite" className="text-xs text-white/55">
          {view.caption ??
            `${web.activityCount} ${web.activityCount === 1 ? 'activity' : 'activities'} · ${web.connectionCount} ${web.connectionCount === 1 ? 'connection' : 'connections'}`}
        </p>
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
        <NodeCard node={selected} web={web} onSelect={setSelectedId} />
      )}
    </section>
  );
};

export default CortexPanel;
