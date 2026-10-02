/**
 * Stands in for a part of a page that shows a student's own data — their
 * streak, their recent activity, their projects. It is not content, so the
 * mirror does not render it (or call the per-user APIs it would need), but it
 * keeps the space so the layout around it is still the one students see.
 */
export const PerStudentPlaceholder = ({
  label,
  minHeight = 96,
}: {
  label: string;
  minHeight?: number;
}) => (
  <div
    className="flex items-center justify-center rounded-xl border border-dashed border-white/15 px-4 text-center text-xs text-white/40"
    style={{ minHeight }}
  >
    {label} · shown per student, not content
  </div>
);
