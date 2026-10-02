import type { CellValue } from '../../model/types';
import { fitChips } from '../fitChips';
import { ChipView } from './ChipView';
import { EmptyNote } from './EmptyNote';

/**
 * A song's credits: a chip per person — linked solid, unconfirmed dashed, a
 * name alone dotted, each tagged with what they did — and the summary under
 * them, "7 · 3 performers, 2 vocals". The chips keep the credits' billing
 * order.
 */
export const CreditsCell = ({
  cell,
  width,
}: {
  cell: Extract<CellValue, { type: 'credits' }>;
  width: number;
}) => {
  if (cell.chips.length === 0) return <EmptyNote note={cell.note} />;
  const shown = fitChips(cell.chips, width);
  const hidden = cell.chips.length - shown;
  return (
    <div
      className="flex min-w-0 flex-col justify-center gap-0.5"
      title={cell.summary}
    >
      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {cell.chips.slice(0, shown).map((chip) => (
          <ChipView key={chip.node} chip={chip} />
        ))}
        {hidden > 0 && (
          <span className="shrink-0 text-[11px] tabular-nums text-white/45">
            +{hidden}
          </span>
        )}
      </div>
      {cell.summary && (
        <p className="truncate text-[10px] leading-3 text-white/40">
          {cell.summary}
        </p>
      )}
    </div>
  );
};
