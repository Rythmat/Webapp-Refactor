import { cn } from '@/components/utilities';
import type { CellValue } from '../../model/types';
import { GhostChipView } from './ChipView';
import { EmptyNote } from './EmptyNote';

/**
 * A stored field as written — "1939-04-02 · Washington", "1961–1984",
 * "C major" — muted and italic when the value is marked unconfirmed, with
 * its muted hint after it ("events 1964–1983"). Empty, it shows the hint
 * alone if there is one (what a value could be read from), else the note.
 * A suggestion for it — "Born 2 Apr 1939" — shows as a ghost chip, before
 * the hint; nothing is stated until someone accepts it.
 */
export const FieldCell = ({
  cell,
}: {
  cell: Extract<CellValue, { type: 'field' }>;
}) => {
  const ghosts = cell.ghosts ?? [];
  if (cell.text === undefined && ghosts.length) {
    return (
      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {ghosts.map((ghost) => (
          <GhostChipView key={ghost.label} ghost={ghost} />
        ))}
        {cell.hint && (
          <span className="shrink-0 truncate text-[11px] text-white/50">
            {cell.hint}
          </span>
        )}
      </div>
    );
  }
  if (cell.text === undefined) {
    return cell.hint ? (
      <span
        title={[`Nothing stated yet (${cell.hint})`, cell.note]
          .filter(Boolean)
          .join('. ')}
        className="truncate text-xs text-white/35"
      >
        {cell.hint}
      </span>
    ) : (
      <EmptyNote note={cell.note} />
    );
  }
  const shown = cell.hint ? `${cell.text} · ${cell.hint}` : cell.text;
  return (
    <p
      title={cell.unverified ? `${shown} — marked unconfirmed` : shown}
      className="flex min-w-0 items-baseline gap-1.5 truncate text-sm"
    >
      <span
        className={cn(
          'truncate',
          cell.unverified ? 'italic text-white/55' : 'text-white/85',
        )}
      >
        {cell.text}
        {cell.unverified && <span className="sr-only">, unconfirmed</span>}
      </span>
      {cell.hint && (
        <span className="shrink-0 text-[11px] text-white/35">{cell.hint}</span>
      )}
      {ghosts.map((ghost) => (
        <GhostChipView key={ghost.label} ghost={ghost} />
      ))}
    </p>
  );
};
