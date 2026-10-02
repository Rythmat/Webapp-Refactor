/**
 * What an empty cell says instead of a blank: where its data will come from
 * ("No instrument data yet: the import suggests them"), so an empty
 * column never reads as "none". One quiet line — a column still empty on
 * every row repeats it a thousand times, and it must not outweigh the
 * values — with the whole note as the tooltip. Quiet, not faint: at 11 px
 * it keeps 4.5:1 on the console's background (WCAG AA), as every word the
 * grid shows must.
 */
export const EmptyNote = ({ note }: { note?: string }) =>
  note ? (
    <p
      title={note}
      className="min-w-0 truncate text-[11px] leading-[14px] text-white/50"
    >
      {note}
    </p>
  ) : (
    <span aria-hidden className="text-white/20">
      —
    </span>
  );
