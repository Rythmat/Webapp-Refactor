import type {
  CellValue,
  ChipStyle,
  ColumnDef,
  PartRole,
} from '../../model/types';
import { fitChips } from '../fitChips';
import { ChipView, GhostChipView, STYLE_WORD } from './ChipView';
import { EmptyNote } from './EmptyNote';

/**
 * A connections cell: its chips on one line, as many as fit, then "+N"; and
 * under them, when the count comes from more than one source or through a
 * second step, where it comes from — "stated 2 · via songs 12 · via events
 * 3". A rolled-up chip carries how many things it came through, and takes
 * the style of the weakest step on its strongest path (the model decides
 * that; the chip only draws it).
 *
 * With no chip at all it shows the text no chip came from ("Gary?": an
 * event's city the registry cannot place) or, failing that, the column's
 * note on where the data will come from.
 *
 * A suggestion for the row's own field shows too: a guess it would store
 * (an event's matched artists) carries the suggestions' sparkle, and a
 * value the cell does not show at all follows the chips as a ghost.
 */

type ConnectionsCell = Extract<CellValue, { type: 'connections' }>;

const NO_ROLES: ReadonlyMap<string, PartRole> = new Map();
const roleMaps = new WeakMap<ColumnDef, ReadonlyMap<string, PartRole>>();

/**
 * Each part's role in the column, by part id — worked out once per column,
 * not once per cell drawn.
 */
function rolesOf(column: ColumnDef): ReadonlyMap<string, PartRole> {
  const { source } = column;
  if (source.type !== 'connections' && source.type !== 'years') {
    return NO_ROLES;
  }
  let roles = roleMaps.get(column);
  if (!roles) {
    roles = new Map(source.parts.map((p) => [p.id, p.role]));
    roleMaps.set(column, roles);
  }
  return roles;
}

/**
 * The provenance line, when there is more to say than the chips: a count
 * from several sources, or through a second step. Null for a plain one-step
 * list, whose chips say it all.
 */
export function provenanceOf(
  cell: Pick<ConnectionsCell, 'parts'>,
  column: ColumnDef,
): string | null {
  const roles = rolesOf(column);
  const rolledUp = cell.parts.some((p) => roles.get(p.part) === 'rollup');
  if (cell.parts.length < 2 && !rolledUp) return null;
  return cell.parts.map((p) => `${p.label} ${p.count}`).join(' · ');
}

const STYLE_ORDER: readonly ChipStyle[] = [
  'dashed',
  'dotted',
  'hollow',
  'ghost',
];

/** The whole cell as its tooltip: "14 in all · stated 2 · via songs 12 · 3 guessed". */
function cellTitle(cell: ConnectionsCell, provenance: string | null): string {
  const styles = STYLE_ORDER.filter((s) => cell.styles[s] > 0).map(
    (s) => `${cell.styles[s]} ${STYLE_WORD[s]}`,
  );
  return [`${cell.total} in all`, provenance, ...styles]
    .filter(Boolean)
    .join(' · ');
}

/** Text written in the body that no chip came from, as a question. */
const Unlinked = ({ texts }: { texts: readonly string[] }) => (
  <>
    {texts.map((text) => (
      <span
        key={text}
        title={`Written as “${text}”; nothing it names is linked yet`}
        className="shrink-0 truncate text-[11px] italic text-white/35"
      >
        {text}?
      </span>
    ))}
  </>
);

export const ConnectionCell = ({
  cell,
  column,
  width,
}: {
  cell: ConnectionsCell;
  column: ColumnDef;
  /** The room inside the cell, in px. */
  width: number;
}) => {
  const shownNodes = new Set(cell.chips.map((chip) => chip.node));
  const ghostOf = new Map(
    (cell.ghosts ?? []).flatMap((ghost) =>
      ghost.node ? [[ghost.node, ghost] as const] : [],
    ),
  );
  const ghosts = (cell.ghosts ?? []).filter(
    (ghost) => !ghost.node || !shownNodes.has(ghost.node),
  );

  if (cell.total === 0) {
    return cell.unlinked?.length || ghosts.length ? (
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
        {ghosts.map((ghost) => (
          <GhostChipView key={ghost.node ?? ghost.label} ghost={ghost} />
        ))}
        {cell.unlinked && <Unlinked texts={cell.unlinked} />}
      </div>
    ) : (
      <EmptyNote note={cell.note} />
    );
  }

  const roles = rolesOf(column);
  const counted = cell.chips.map((chip) => ({
    chip,
    count:
      roles.get(chip.part) === 'rollup' && chip.weight > 1
        ? chip.weight
        : undefined,
  }));
  const shown = fitChips(
    counted.map(({ chip, count }) => ({
      label: chip.label,
      tag: chip.tag,
      count,
    })),
    width,
    cell.total,
  );
  const hidden = cell.total - shown;
  const provenance = provenanceOf(cell, column);

  return (
    <div
      className="flex min-w-0 flex-col justify-center gap-0.5"
      title={cellTitle(cell, provenance)}
    >
      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {counted.slice(0, shown).map(({ chip, count }) => (
          <ChipView
            key={chip.node}
            chip={chip}
            count={count}
            suggested={ghostOf.get(chip.node)}
          />
        ))}
        {hidden > 0 && (
          <span className="shrink-0 text-[11px] tabular-nums text-white/45">
            +{hidden}
          </span>
        )}
        {ghosts.map((ghost) => (
          <GhostChipView key={ghost.node ?? ghost.label} ghost={ghost} />
        ))}
        {cell.unlinked && <Unlinked texts={cell.unlinked} />}
      </div>
      {provenance && (
        <p className="truncate text-[10px] leading-3 text-white/40">
          {provenance}
        </p>
      )}
    </div>
  );
};
