import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// ── What the Inspector shows, in the URL (owner, 2026-11-09) ───────────────
// `?inspect=lesson:<classroomId>/<dayId>` and the like: a selection is a
// link a teacher can share or reload, and Back closes what was opened, as
// a drawer in Linear or Common Planner does.

export type InspectTarget = {
  kind: 'lesson';
  classroomId: string;
  dayId: string;
};

export const INSPECT_PARAM = 'inspect';

// One kind so far; students, assignments and submissions join it in later
// phases, each with its own `kind:` prefix.
export const formatInspect = (target: InspectTarget): string =>
  `lesson:${target.classroomId}/${target.dayId}`;

export const parseInspect = (
  value: string | null | undefined,
): InspectTarget | null => {
  if (!value) return null;
  const colon = value.indexOf(':');
  if (colon < 0) return null;
  const kind = value.slice(0, colon);
  const rest = value.slice(colon + 1);
  if (kind === 'lesson') {
    const slash = rest.indexOf('/');
    if (slash <= 0 || slash === rest.length - 1) return null;
    return {
      kind,
      classroomId: rest.slice(0, slash),
      dayId: rest.slice(slash + 1),
    };
  }
  return null;
};

/** The search string for a page with the Inspector opened on a target. */
export const inspectSearch = (target: InspectTarget): string =>
  `?${new URLSearchParams({ [INSPECT_PARAM]: formatInspect(target) })}`;

export const useOfficeInspector = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get(INSPECT_PARAM);
  const target = useMemo(() => parseInspect(raw), [raw]);

  const open = useCallback(
    (next: InspectTarget) =>
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set(INSPECT_PARAM, formatInspect(next));
        return p;
      }),
    [setParams],
  );

  const close = useCallback(
    () =>
      setParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete(INSPECT_PARAM);
        return p;
      }),
    [setParams],
  );

  return { target, open, close };
};
