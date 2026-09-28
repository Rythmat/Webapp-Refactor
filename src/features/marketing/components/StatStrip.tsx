import type { Stat } from '../content/types';

/**
 * Row of real catalog stats (no fabricated metrics) in hairline cells, like
 * the landing's bento row. Pages give three.
 */
export const StatStrip = ({ items }: { items: Stat[] }) => {
  return (
    <section
      aria-label="At a glance"
      className="relative z-10 grid grid-cols-1 gap-px border-y border-white/[0.08] bg-white/[0.08] sm:grid-cols-3"
    >
      {items.map((s) => (
        <div
          key={s.label}
          className="bg-[#101012] px-6 py-10 md:px-10 md:py-12"
        >
          <div className="text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl lg:text-5xl">
            {s.value}
          </div>
          <div className="mt-1 text-[15px] text-white/50">{s.label}</div>
        </div>
      ))}
    </section>
  );
};
