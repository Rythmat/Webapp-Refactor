/**
 * CurriculumCoveragePanel (Phase 4) — teacher-only panel listing the curriculum
 * lessons the current deck covers, with a completion bar per lesson.
 *
 * HONESTY NOTE: `useProgressSummary` is per-account (the signed-in teacher's own
 * token) — the backend exposes no per-student or classroom-scoped curriculum
 * progress. The panel states this plainly; the coverage LIST (what the deck
 * touches) is useful regardless, and the % fills in as the backend gains a
 * teacher-visible per-student endpoint.
 *
 * Teacher surface only — never mounted on the projector or student views (the
 * progress numbers are identified per-account data).
 */
import { GraduationCap } from 'lucide-react';
import { useProgressSummary } from '@/hooks/data/progress/useProgressSummary';
import type { DaySnapshot } from '../publish/publishDay';
import {
  buildCurriculumCoverage,
  collectDeckLessonRefs,
} from './buildCurriculumCoverage';

export interface CurriculumCoveragePanelProps {
  snapshot: DaySnapshot | undefined;
}

export const CurriculumCoveragePanel = ({
  snapshot,
}: CurriculumCoveragePanelProps) => {
  const { data: summary } = useProgressSummary();
  const refs = collectDeckLessonRefs(snapshot);
  if (refs.length === 0) return null;
  const rows = buildCurriculumCoverage(refs, summary?.lessons ?? []);

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-col gap-0.5">
        <h2 className="inline-flex items-center gap-2 text-base font-medium">
          <GraduationCap className="h-4 w-4 text-[#7ecfcf]" />
          Curriculum coverage
        </h2>
        <p className="text-xs text-white/40">
          Lessons this deck routes into. Percentages reflect your own progress
          (per account) — per-student mastery needs a backend endpoint that
          isn't live yet.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={`${row.lessonId}|${row.mode ?? ''}|${row.root ?? ''}`}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center justify-between text-sm text-white/80">
              <span>{row.label}</span>
              <span className="text-xs text-white/50">
                {row.totalCount != null
                  ? `${row.completedCount}/${row.totalCount} · ${row.pct}%`
                  : 'not started'}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[#7ecfcf]"
                style={{ width: `${row.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
