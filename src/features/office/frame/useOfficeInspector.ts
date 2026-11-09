import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// ── What the Inspector shows, in the URL (owner, 2026-11-09) ───────────────
// `?inspect=lesson:<classroomId>/<dayId>`, `student:<cid>/<enrollmentId>`,
// `assignment:<cid>/<assignmentId>`: a selection is a link a teacher can
// share or reload, and Back closes what was opened, as a drawer in Linear
// or Common Planner does.

export const INSPECT_KINDS = [
  'lesson',
  'student',
  'assignment',
  // The Library's items belong to no class: their `classroomId` is
  // LIBRARY_SCOPE.
  'seed',
  'activity',
  'theme',
  'goal',
  'idea',
] as const;
export type InspectKind = (typeof INSPECT_KINDS)[number];

export interface InspectTarget {
  kind: InspectKind;
  classroomId: string;
  /** The lesson's day id, the student's enrollment id, the assignment's id. */
  id: string;
}

export const INSPECT_PARAM = 'inspect';

/** The scope Library items carry in place of a class id. */
export const LIBRARY_SCOPE = 'library';

export const formatInspect = (target: InspectTarget): string =>
  `${target.kind}:${target.classroomId}/${target.id}`;

const isKind = (value: string): value is InspectKind =>
  (INSPECT_KINDS as readonly string[]).includes(value);

export const parseInspect = (
  value: string | null | undefined,
): InspectTarget | null => {
  if (!value) return null;
  const colon = value.indexOf(':');
  if (colon < 0) return null;
  const kind = value.slice(0, colon);
  const rest = value.slice(colon + 1);
  const slash = rest.indexOf('/');
  if (!isKind(kind) || slash <= 0 || slash === rest.length - 1) return null;
  return { kind, classroomId: rest.slice(0, slash), id: rest.slice(slash + 1) };
};

/** The search string for a page with the Inspector opened on a target. */
export const inspectSearch = (target: InspectTarget): string =>
  `?${new URLSearchParams({ [INSPECT_PARAM]: formatInspect(target) })}`;

/** `search` with the Inspector opened on `target`, keeping its other params. */
export const withInspect = (search: string, target: InspectTarget): string => {
  const p = new URLSearchParams(search);
  p.set(INSPECT_PARAM, formatInspect(target));
  return `?${p}`;
};

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
