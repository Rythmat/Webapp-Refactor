/**
 * Teacher-only live progress for an app-route slide: count pills
 * (done · in module · not started) + per-student name chips, sorted
 * done → in_module → not_started. Identified data is fine here (teacher
 * surface, Rule 2); this component is never mounted on the projector.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { SlideProgress, SlideProgressState } from '../buildSlideProgress';

interface Row {
  enrollmentId: string;
  displayName: string;
  state: SlideProgressState;
}

export interface AppRouteProgressStripProps {
  rows: Row[];
  counts: SlideProgress['counts'];
}

const RANK: Record<SlideProgressState, number> = {
  done: 0,
  in_module: 1,
  not_started: 2,
};

const CHIP: Record<SlideProgressState, string> = {
  done: 'border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-200',
  in_module: 'border-amber-300/40 bg-amber-300/[0.08] text-amber-200',
  not_started: 'border-white/10 bg-white/[0.03] text-white/50',
};

const Pill = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${tone}`}
  >
    <span className="font-semibold">{value}</span>
    {label}
  </span>
);

export const AppRouteProgressStrip = ({
  rows,
  counts,
}: AppRouteProgressStripProps) => {
  const reducedMotion = useReducedMotion();
  const sorted = [...rows].sort((a, b) => {
    const rd = RANK[a.state] - RANK[b.state];
    return rd !== 0 ? rd : a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill
          label="done"
          value={counts.done}
          tone="border-emerald-400/40 bg-emerald-400/[0.08] text-emerald-200"
        />
        <Pill
          label="in module"
          value={counts.inModule}
          tone="border-amber-300/40 bg-amber-300/[0.08] text-amber-200"
        />
        <Pill
          label="not started"
          value={counts.notStarted}
          tone="border-white/10 bg-white/[0.03] text-white/50"
        />
      </div>
      {sorted.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((r) => (
            <motion.span
              key={r.enrollmentId}
              layout={!reducedMotion}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${CHIP[r.state]}`}
            >
              {r.displayName}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
};
