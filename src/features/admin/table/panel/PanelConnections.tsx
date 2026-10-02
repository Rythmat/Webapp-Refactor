import { Network } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import type { Graph } from '@/content/graph/deriveGraph';
import {
  type EdgeVia,
  type EntityId,
  type GraphEdge,
  isCodeOwnedVia,
} from '@/content/graph/types';
import { SongPinLink, songPinOf } from '../../content/graph/SongPinLink';
import { labelOf } from '../model/aggregate';
import type { ChipStyle } from '../model/types';
import { tableHrefForNode } from '../tablePaths';
import type { DraftMark } from './draftEdges';
import type { EdgeGroup, PanelColumn, PanelEntry } from './fullConnections';

/**
 * The row panel's lists: a column in full, and every edge of the row with
 * the fields that state it. The chips follow the mind map's conventions, as
 * the grid's do — solid linked, dashed unconfirmed, dotted guessed, hollow
 * found nowhere — and each says so in words too, for a screen reader and for
 * anyone who cannot tell a dotted border from a dashed one.
 */

/** How many entries a list shows before "Show all". */
export const LIST_LIMIT = 40;

const CHIP_CLASS: Record<ChipStyle, string> = {
  solid: 'border-solid border-white/20 bg-white/[0.06] text-white/85',
  dashed: 'border-dashed border-white/40 text-white/80',
  dotted: 'border-dotted border-white/45 text-white/70',
  hollow: 'border-solid border-white/15 text-white/40',
  ghost: 'border-dashed border-white/15 text-white/35',
};

/** What a style means, said in words; linked says nothing. */
export const STYLE_WORD: Record<ChipStyle, string | null> = {
  solid: null,
  dashed: 'unconfirmed',
  dotted: 'guessed',
  hollow: 'missing',
  ghost: 'suggested',
};

/** A node's local graph in Cortex. */
const mapHref = (node: string) =>
  AdminRoutes.cortex(undefined, { focus: node });

/**
 * One node as a chip: its row in the Table when a table holds it (its local
 * graph in Cortex when none does), and a way to stand on it in Cortex.
 */
export const NodeChip = ({
  node,
  label,
  style,
  muted,
  tag,
  weight,
  title,
}: {
  node: EntityId;
  label: string;
  style: ChipStyle;
  muted?: boolean;
  tag?: string;
  weight?: number;
  title?: string;
}) => {
  const word = STYLE_WORD[style];
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border py-0.5 pl-2 pr-1 text-xs',
        CHIP_CLASS[style],
        muted && 'opacity-60',
      )}
      data-style={style}
      title={title || undefined}
    >
      <Link
        to={tableHrefForNode(node) ?? mapHref(node)}
        className="min-w-0 truncate hover:underline"
      >
        {label}
      </Link>
      {tag && <span className="shrink-0 text-white/45">{tag}</span>}
      {weight !== undefined && weight > 1 && (
        <span className="shrink-0 tabular-nums text-white/45">×{weight}</span>
      )}
      {word && <span className="sr-only">({word})</span>}
      <Link
        to={mapHref(node)}
        aria-label={`${label} in Cortex`}
        title="Open in Cortex"
        className="shrink-0 rounded-full p-0.5 text-white/35 hover:text-white"
      >
        <Network aria-hidden className="size-3" />
      </Link>
    </span>
  );
};

/** A list cut at `LIST_LIMIT`, with a way to see the rest. */
export function Capped<T>({
  items,
  render,
  className,
}: {
  items: readonly T[];
  render(item: T): ReactNode;
  className?: string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, LIST_LIMIT);
  return (
    <>
      <ul className={className}>{shown.map(render)}</ul>
      {items.length > shown.length && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="mt-1.5 text-xs text-white/55 hover:text-white hover:underline"
        >
          Show all {items.length}
        </button>
      )}
    </>
  );
}

const entryKey = (entry: PanelEntry) => entry.node;

/**
 * A connections column in full: its parts in the column's order, each with
 * the nodes it reached by their strongest path. A hint's part is shown as
 * what it is — offered, not the row's value. `action` adds a control after
 * an entry's chip (Confirm, on a guess another item owns).
 */
export const ColumnList = ({
  column,
  action,
}: {
  column: PanelColumn;
  /** Given the entry and the id of the part that reached it. */
  action?: (entry: PanelEntry, part: string) => ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    {column.parts.map((part) => (
      <div key={part.id}>
        {/* One part alone needs no heading: the column's label says it. */}
        {column.parts.length > 1 && (
          <p className="mb-1 text-xs text-white/45">
            {part.label}
            {part.role === 'hint' && ' · offered, not stated'}
            <span className="tabular-nums"> · {part.entries.length}</span>
          </p>
        )}
        <Capped
          items={part.entries}
          className="flex flex-wrap gap-1.5"
          render={(entry) => (
            <li
              key={entryKey(entry)}
              className="inline-flex max-w-full items-center gap-0.5"
            >
              <NodeChip {...entry} />
              {action?.(entry, part.id)}
            </li>
          )}
        />
      </div>
    ))}
  </div>
);

const fileName = (path: string) => path.split('/').pop() ?? path;

/**
 * Who states one edge, as a link to where it is edited: the owning row in
 * the Table, the song pin's own item (`SongPinLink`; two pins for one act
 * are two sources), the file for code.
 */
const ViaLine = ({
  via,
  graph,
  row,
  pins,
}: {
  via: EdgeVia;
  graph: Graph;
  row: EntityId;
  pins: ReadonlyMap<string, string> | undefined;
}) => {
  if (isCodeOwnedVia(via)) {
    return (
      <span className="text-white/45" title={via.code}>
        Code: {fileName(via.code ?? '')}
      </span>
    );
  }
  const pin = songPinOf(via);
  if (pin) {
    return (
      <SongPinLink
        pin={pin}
        path={via.path}
        pins={pins}
        className="text-white/65 hover:text-white hover:underline"
      />
    );
  }
  if (via.item === row) {
    return <span className="text-white/55">its {via.path}</span>;
  }
  const href = tableHrefForNode(via.item);
  const text = (
    <>
      {labelOf(graph, via.item)}{' '}
      <span className="text-white/40">{via.path}</span>
    </>
  );
  return href ? (
    <Link to={href} className="text-white/65 hover:text-white hover:underline">
      {text}
    </Link>
  ) : (
    <span className="text-white/55">{text}</span>
  );
};

/** What an unsaved change does to an edge, said beside it. */
const DraftTag = ({ mark, was }: { mark: DraftMark; was?: ChipStyle }) =>
  mark === 'added' ? (
    <span className="rounded-full bg-emerald-400/[0.12] px-1.5 text-[11px] text-emerald-200/90">
      new<span className="sr-only">: your unsaved changes add it</span>
    </span>
  ) : mark === 'removed' ? (
    <span className="rounded-full bg-red-400/[0.12] px-1.5 text-[11px] text-red-200/90">
      removed
      <span className="sr-only">: your unsaved changes take it away</span>
    </span>
  ) : (
    <span className="text-[11px] text-white/50">
      was {(was && STYLE_WORD[was]) ?? 'linked'}
      <span className="sr-only">, before your unsaved changes</span>
    </span>
  );

/**
 * Every edge touching the row, grouped as the mind map reads them, each
 * with the fields that state it ("Live Aid tags[]", "its genreIds[]",
 * "Code: genreTags.ts") and the song a credit was on. With `marks`, the
 * edges an unsaved draft changes say how (`draftEdges.ts`).
 */
export const EdgeGroups = ({
  groups,
  graph,
  row,
  pins,
  marks,
  was,
}: {
  groups: readonly EdgeGroup[];
  graph: Graph;
  row: EntityId;
  /** A song pin's key → its item's id, for the pins' links (`SongPinLink`). */
  pins?: ReadonlyMap<string, string>;
  /** What the draft does to each edge it changes. */
  marks?: ReadonlyMap<GraphEdge, DraftMark>;
  /** A restyled edge's line as saved. */
  was?: ReadonlyMap<GraphEdge, ChipStyle>;
}) => (
  <div className="flex flex-col gap-4">
    {groups.map((group) => (
      <section key={group.key} aria-label={group.label}>
        <h4 className="mb-1.5 text-xs text-white/55">
          {group.label}
          <span className="tabular-nums text-white/35">
            {' '}
            ·{' '}
            {group.edges.filter((e) => marks?.get(e.edge) !== 'removed').length}
          </span>
        </h4>
        <Capped
          items={group.edges}
          className="flex flex-col gap-1.5"
          render={({ edge, other, label, style }) => {
            const mark = marks?.get(edge);
            return (
              <li
                key={`${edge.from}|${edge.kind}|${edge.to}|${edge.on ?? ''}`}
                data-draft={mark}
                className={cn(
                  'flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs',
                  mark === 'removed' && 'opacity-60 [&_a]:line-through',
                )}
              >
                <NodeChip node={other} label={label} style={style} />
                {mark && <DraftTag mark={mark} was={was?.get(edge)} />}
                {edge.on && edge.on !== row && (
                  <span className="text-white/45">
                    on {labelOf(graph, edge.on)}
                  </span>
                )}
                {edge.via.map((via) => (
                  <ViaLine
                    key={`${via.item}|${via.path}|${via.statedBy?.id ?? ''}`}
                    via={via}
                    graph={graph}
                    row={row}
                    pins={pins}
                  />
                ))}
                {edge.source && (
                  <span className="text-white/40">source: {edge.source}</span>
                )}
              </li>
            );
          }}
        />
      </section>
    ))}
  </div>
);
