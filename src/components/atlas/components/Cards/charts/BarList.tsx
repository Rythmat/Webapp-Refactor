import {
  ATLAS_FOCUS_INSET,
  ATLAS_TRANSITION,
} from '@/components/atlas/components/UI/primitives';
import { cn } from '@/lib/utils';

export interface BarRow {
  key: string;
  label: string;
  /** A second line, quieter. */
  detail?: string;
  value: number;
  /** The bar's colour; white when none. */
  color?: string;
}

/**
 * Rows of text with a bar under each for its share of the largest: a real
 * list, so readers get the words; the bars are only drawn. A row opens what
 * it names when `onSelect` is given, and points it out on the map while
 * hovered (`onHover`).
 */
export function BarList({
  rows,
  label,
  onSelect,
  onHover,
}: {
  rows: BarRow[];
  label: string;
  onSelect?: (key: string) => void;
  onHover?: (key: string | null) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul aria-label={label} className="-mx-2 flex flex-col">
      {rows.map((row, i) => {
        const body = (
          <>
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-atlas-text">
                {row.label}
                {row.detail && (
                  <span className="ml-1.5 text-xs text-atlas-text-2">
                    {row.detail}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-atlas-text-2">
                {row.value.toLocaleString('en')}
              </span>
            </span>
            <span
              aria-hidden
              className="mt-1 block h-1 rounded-full bg-white/[0.06]"
            >
              <span
                className="atlas-grow-x block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                style={
                  {
                    width: `${(row.value / max) * 100}%`,
                    backgroundColor: row.color ?? 'rgb(255 255 255 / 0.75)',
                    '--i': i,
                  } as React.CSSProperties
                }
              />
            </span>
          </>
        );
        return (
          <li key={row.key}>
            {onSelect ? (
              <button
                className={cn(
                  'block w-full rounded-lg px-2 py-1.5 text-left hover:bg-white/[0.06]',
                  ATLAS_TRANSITION,
                  ATLAS_FOCUS_INSET,
                )}
                type="button"
                onBlur={() => onHover?.(null)}
                onClick={() => onSelect(row.key)}
                onFocus={() => onHover?.(row.key)}
                onPointerEnter={() => onHover?.(row.key)}
                onPointerLeave={() => onHover?.(null)}
              >
                {body}
              </button>
            ) : (
              <div className="px-2 py-1.5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
