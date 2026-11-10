/**
 * The class's step on the room's screen (owner, 2026-11-10): "Step 4 of 12"
 * and what it is. Numbers and the activity's own words only: who finished
 * the step is the teacher's to see (Rule 2).
 */
export const ClassStepChip = ({
  step,
  total,
  title,
}: {
  step: number;
  total?: number;
  title?: string;
}) => (
  <div
    data-class-step=""
    className="flex flex-col items-center gap-[0.25em] text-center"
    style={{ fontSize: 'var(--slide-body-fz)' }}
  >
    <span
      className="font-bold uppercase tracking-[0.08em] text-white/50"
      style={{ fontSize: 'var(--slide-label-fz)' }}
    >
      Together · Juntos
    </span>
    <span className="text-[2em] font-semibold tabular-nums text-white">
      Step {step + 1}
      {total ? <span className="text-white/40"> of {total}</span> : null}
    </span>
    {title && <span className="max-w-[28em] text-white/70">{title}</span>}
  </div>
);
