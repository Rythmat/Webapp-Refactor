import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  EDGE_KINDS,
  EDGE_LABELS,
  type EdgeKind,
  type EdgeVia,
  type GraphEdge,
  type GraphNode,
  isCodeOwnedVia,
} from '@/content/graph/types';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { CONSOLE_TABLE_HEAD } from '../../ui/styles';
import { SongPinLink, songPinOf } from './SongPinLink';
import { editorFor, kindColor, kindLabel } from './graphVocabulary';

/**
 * Every connection of the focus, as a table: the mind map's accessible twin,
 * and the place to see which field states each one.
 *
 * One row per edge touching the focus, in the map's arc order. "Stated by"
 * names the item and field behind the edge (`via`), linked to that item's
 * row in the Table (`editorFor`); a connection code states (the globe's
 * influence arcs and pathways, the Teach year, a subgenre's parent) names
 * that file instead — there is no field to edit. A song pin names its own
 * `artist_location` item (`SongPinLink`), not the artist it is filed under:
 * the pins are where the globe shows the act's songs, never the act's City.
 */

interface ConnectionsTableProps {
  focus: GraphNode;
  edges: readonly GraphEdge[];
  nodes: ReadonlyMap<string, GraphNode>;
  onFocus(id: string): void;
  /** A song pin's key → its item's id (`useWorkingGraph().pins`). */
  pins?: ReadonlyMap<string, string>;
  /**
   * The colour of each item's dot. The Mind Map passes its colour groups, so
   * a dot here matches the same item's dot in the graph; the kind's colour
   * when absent.
   */
  colorOf?: (node: { id: string; kind: string }) => string;
}

interface Row {
  edge: GraphEdge;
  other: GraphNode | undefined;
  otherId: string;
  label: string;
  order: number;
}

export const ConnectionsTable = ({
  focus,
  edges,
  nodes,
  onFocus,
  pins,
  colorOf,
}: ConnectionsTableProps) => {
  const rows: Row[] = edges
    .filter((e) => e.from === focus.id || e.to === focus.id)
    .map((edge) => {
      const forward = edge.from === focus.id;
      const otherId = forward ? edge.to : edge.from;
      const kind = edge.kind as EdgeKind;
      return {
        edge,
        otherId,
        other: nodes.get(otherId),
        label: EDGE_LABELS[kind][forward ? 'forward' : 'inverse'],
        order: EDGE_KINDS.indexOf(kind) * 2 + (forward ? 0 : 1),
      };
    })
    .sort(
      (a, b) =>
        a.order - b.order ||
        (a.other?.label ?? a.otherId).localeCompare(
          b.other?.label ?? b.otherId,
        ),
    );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-white/45">
        Nothing connects to {focus.label} with the filters on.
      </p>
    );
  }

  return (
    <Table>
      <caption className="sr-only">
        Connections of {focus.label}, {rows.length} in all
      </caption>
      <TableHeader className={CONSOLE_TABLE_HEAD}>
        <TableRow>
          <TableHead>Connection</TableHead>
          <TableHead>To</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead>Stated by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ edge, other, otherId, label }) => (
          <TableRow
            key={`${edge.from}|${edge.kind}|${edge.to}|${edge.on ?? ''}`}
          >
            <TableCell className="whitespace-nowrap text-white/60">
              {label}
              {edge.on && edge.on !== focus.id && (
                <span className="text-white/40">
                  {' '}
                  on {nodes.get(edge.on)?.label ?? edge.on}
                </span>
              )}
            </TableCell>
            <TableCell>
              <button
                type="button"
                onClick={() => onFocus(otherId)}
                className="inline-flex items-center gap-2 text-left text-white hover:underline"
              >
                <span
                  aria-hidden
                  className="inline-block size-2 shrink-0 rounded-full"
                  style={{
                    background: colorOf
                      ? colorOf({ id: otherId, kind: other?.kind ?? '' })
                      : kindColor(other?.kind ?? ''),
                  }}
                />
                <span>{other?.label ?? otherId}</span>
                <span className="text-xs text-white/40">
                  {kindLabel(other?.kind ?? '')}
                </span>
              </button>
            </TableCell>
            <TableCell>
              <Confidence edge={edge} other={other} />
            </TableCell>
            <TableCell className="text-xs">
              <ul className="flex flex-col gap-0.5">
                {edge.via.map((via) => (
                  <li key={`${via.item}|${via.path}|${via.statedBy?.id ?? ''}`}>
                    <Via via={via} nodes={nodes} pins={pins} />
                  </li>
                ))}
              </ul>
              {edge.source && (
                <p className="mt-0.5 text-white/40">Source: {edge.source}</p>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const Confidence = ({
  edge,
  other,
}: {
  edge: GraphEdge;
  other: GraphNode | undefined;
}) => (
  <span className="flex flex-wrap gap-1">
    {edge.inferred ? (
      <ConsoleBadge
        tone="muted"
        title={
          edge.via.some((via) => songPinOf(via) !== null)
            ? "Guessed from where the globe pins the act's songs, not its City"
            : 'Guessed from a display name, not linked by id'
        }
      >
        Guessed
      </ConsoleBadge>
    ) : edge.unverified ? (
      <ConsoleBadge tone="warning" title="Marked unconfirmed">
        Unconfirmed
      </ConsoleBadge>
    ) : (
      <ConsoleBadge tone="neutral">Linked</ConsoleBadge>
    )}
    {other?.status === 'missing' && (
      <ConsoleBadge
        tone="danger"
        title="Something points here; nothing defines it"
      >
        Missing
      </ConsoleBadge>
    )}
  </span>
);

const Via = ({
  via,
  nodes,
  pins,
}: {
  via: EdgeVia;
  nodes: ReadonlyMap<string, GraphNode>;
  pins: ReadonlyMap<string, string> | undefined;
}) => {
  const item = nodes.get(via.item)?.label ?? via.item;
  if (isCodeOwnedVia(via)) {
    return (
      <span className="text-white/45" title={via.code}>
        Code: {via.code?.split('/').pop()}
      </span>
    );
  }
  // A song pin is filed under the act it pins, but it is its own item: name
  // it as the pins, and open the pin rather than the artist.
  const pin = songPinOf(via);
  if (pin) return <SongPinLink pin={pin} path={via.path} pins={pins} />;
  const to = editorFor(via.item);
  const text = (
    <>
      {item} <span className="text-white/40">{via.path}</span>
    </>
  );
  return to ? (
    <Link to={to} className="text-white/75 hover:text-white hover:underline">
      {text}
    </Link>
  ) : (
    <span className="text-white/60">{text}</span>
  );
};
