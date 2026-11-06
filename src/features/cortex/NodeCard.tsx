import { X } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { neighboursOf, type CortexWeb, type WebNode } from './buildWeb';
import { KIND_NAME, nodeColour, status } from './nodeMeta';

/** The card a selected node opens: what it is, and what it connects to. On
 *  the right, in the look of the console's row drawer (owner, 2026-11-04). */

const CARD_BUTTON =
  'inline-flex items-center rounded-md border border-white/10 px-2.5 py-1 text-xs text-white/85 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/40';

export const NodeCard = ({
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
      className="absolute inset-x-2 bottom-2 z-10 max-h-[45%] overflow-y-auto rounded-lg border border-white/10 bg-[#141416]/95 p-4 shadow-lg lg:inset-x-auto lg:bottom-12 lg:right-2 lg:top-2 lg:max-h-none lg:w-72"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-flex rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/85">
            {KIND_NAME[node.kind]}
          </span>
          <h3 className="mt-2 break-words text-lg font-medium text-white">
            {node.label}
          </h3>
          {node.detail && (
            <p className="mt-0.5 text-sm text-white/70">{node.detail}</p>
          )}
          {line && <p className="mt-1 text-xs text-white/55">{line}</p>}
          {others.length > 0 && !node.hollow && (
            <p className="mt-0.5 text-xs text-white/55">
              Connected to {others.length}{' '}
              {others.length === 1 ? 'thing' : 'things'}
            </p>
          )}
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
                    style={{ backgroundColor: nodeColour(other) }}
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
