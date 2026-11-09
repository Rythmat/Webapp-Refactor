/**
 * How many have answered, in one line: "12 checked in · 12 conectados". For a
 * band that also shows what to answer with (a feelings check-in's faces), where
 * the participation ring has no room. A count only — never who.
 */
export const AnsweredCount = ({ n }: { n: number }) => (
  <span
    aria-live="polite"
    className="inline-flex items-baseline gap-[0.5em] text-white/70"
    style={{ fontSize: 'var(--slide-body-fz)' }}
  >
    <span className="font-bold tabular-nums text-white">{n}</span>
    checked in
    <span className="text-white/40">
      · {n === 1 ? 'conectado' : 'conectados'}
    </span>
  </span>
);
