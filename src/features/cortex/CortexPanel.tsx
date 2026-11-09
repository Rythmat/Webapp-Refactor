import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CortexMap, NODE_COLOR } from './CortexMap';
import { neighboursOf, type CortexWeb, type WebNode } from './buildWeb';
import { useCortexView } from './useCortexView';
import { useCortexWeb } from './useCortexWeb';
import './cortex.css';

/** The Cortex on Learn's own page: the student's map, or how one starts. */

const KIND_NAME: Readonly<Record<WebNode['kind'], string>> = {
  song: 'Song',
  theory: 'Theory lesson',
  lesson: 'Genre lesson',
  audio: 'Audio lesson',
  anatomy: 'Anatomy lesson',
  technique: 'Technique',
  literacy: 'Music Literacy',
  game: 'Arcade game',
  project: 'Studio project',
  tutorial: 'Studio lesson',
  artist: 'Artist',
  place: 'Place',
  event: 'Globe event',
  person: 'Artist',
  release: 'Record',
  studio: 'Recording studio',
  mode: 'Mode',
  key: 'Key',
  genre: 'Genre',
  instrument: 'Instrument',
  group: 'Shared',
};

const LEGEND: readonly { label: string; kind: WebNode['kind'] }[] = [
  { label: 'Songs', kind: 'song' },
  { label: 'Lessons', kind: 'theory' },
  { label: 'Arcade', kind: 'game' },
  { label: 'Studio', kind: 'project' },
  { label: 'Globe', kind: 'artist' },
];

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60],
  ['month', 30 * 24 * 60],
  ['day', 24 * 60],
  ['hour', 60],
  ['minute', 1],
];

/** "3 days ago"; exported for tests. */
export const timeAgo = (ms: number, now = Date.now()): string => {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return 'just now';
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (minutes >= size)
      return format.format(-Math.floor(minutes / size), unit);
  }
  return 'just now';
};

/** A bright node isn't always a lesson finished: a song is saved. */
const DONE_WORD: Partial<Record<WebNode['kind'], string>> = {
  song: 'Saved',
  project: 'Saved',
  game: 'Cleared a level',
};

const status = (node: WebNode): string | null => {
  if (node.role !== 'activity') return null;
  if (node.done) {
    const word = DONE_WORD[node.kind] ?? 'Finished';
    return node.doneAt > 0 ? `${word} ${timeAgo(node.doneAt)}` : word;
  }
  return node.lastAt > 0 ? `Last here ${timeAgo(node.lastAt)}` : null;
};

const CARD_BUTTON =
  'rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white outline-none transition-colors duration-150 hover:bg-white/[0.14] focus-visible:ring-2 focus-visible:ring-white/40';

const NodeCard = ({
  node,
  web,
  onSelect,
}: {
  node: WebNode;
  web: CortexWeb;
  onSelect: (id: string | null) => void;
}) => {
  const others = useMemo(() => {
    const byId = new Map(web.nodes.map((n) => [n.id, n]));
    return (neighboursOf(web).get(node.id) ?? [])
      .map((id) => byId.get(id))
      .filter((n): n is WebNode => n !== undefined);
  }, [web, node.id]);
  const line = status(node);
  const heading =
    node.role === 'concept' ? 'What you’ve done here' : 'Connected through';
  return (
    <aside
      aria-label={node.label}
      className="absolute inset-x-2 bottom-2 z-10 max-h-[60%] overflow-y-auto rounded-[1.25rem] border border-white/10 bg-[#141416] p-4 sm:inset-x-auto sm:bottom-auto sm:left-2 sm:top-12 sm:w-[17rem]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-white/55">{KIND_NAME[node.kind]}</p>
          <h3 className="mt-0.5 break-words text-base font-bold text-white">
            {node.label}
          </h3>
          {node.detail && (
            <p className="mt-0.5 text-sm text-white/70">{node.detail}</p>
          )}
          {line && <p className="mt-1 text-xs text-white/55">{line}</p>}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => onSelect(null)}
          className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-white/55 outline-none transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <X className="size-4" />
        </button>
      </div>
      {node.hollow && (
        <p className="mt-2 text-sm text-white/70">
          Do one more thing in {node.label} and this becomes a connection.
        </p>
      )}
      {node.route && (
        <Link to={node.route} className={`mt-3 inline-block ${CARD_BUTTON}`}>
          Open
        </Link>
      )}
      {others.length > 0 && !node.hollow && (
        <>
          <p className="mt-3 text-xs text-white/55">{heading}</p>
          <ul className="mt-1">
            {others.map((other) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => onSelect(other.id)}
                  className="flex w-full items-center gap-2 rounded-lg py-1 text-left text-sm text-white/85 outline-none transition-colors duration-150 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: NODE_COLOR[other.kind] }}
                  />
                  <span className="min-w-0 truncate">{other.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
};

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
  const view = useCortexView(web);
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
