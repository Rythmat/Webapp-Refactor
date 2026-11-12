import type { ReactNode } from 'react';
import { MicroLabel } from '@/components/kit';

/** The Inspector's scrolling body. */
export const InspectorBody = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 [scrollbar-width:thin]">
    {children}
  </div>
);

/** A row of figures in the console's hairline bento. */
export const Facts = ({
  facts,
}: {
  facts: { label: string; value: ReactNode }[];
}) => (
  <div
    className="grid gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06]"
    style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}
  >
    {facts.map((f) => (
      <div
        key={f.label}
        className="flex flex-col gap-0.5 bg-daw-surface-1 px-3 py-2.5"
      >
        <MicroLabel>{f.label}</MicroLabel>
        <span className="text-[1.125rem] tabular-nums text-daw-text">
          {f.value}
        </span>
      </div>
    ))}
  </div>
);

/** A titled block inside the Inspector. */
export const InspectorSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-2">
    <MicroLabel className="px-0.5">{title}</MicroLabel>
    {children}
  </section>
);
