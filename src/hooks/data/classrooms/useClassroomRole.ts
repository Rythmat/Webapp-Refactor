import { useMemo } from 'react';
import { SERVER_CLASSROOM_TEACHERS_ENABLED } from '@/constants/serverEndpoints';
import { useMe } from '../auth';
import type { ClassroomRole } from './classroomTeachers.types';
import { useClassroomTeachers } from './useClassroomTeachers';
import { useClassrooms } from './useClassrooms';

/**
 * The ONE definition of "what am I to this classroom?".
 *
 * Before this hook, seven-plus components each hard-coded
 * `classroom.teacherId === me.id` as the definition of "my class". That is not
 * a role model, it is an owner check wearing one: an accepted co-teacher would
 * be bounced out of every tab they had just been invited into.
 *
 * Resolution order, cheapest first:
 *   1. The classroom is in my OWNED list → 'owner', no extra request.
 *   2. Otherwise ask `GET /classrooms/:id/teachers`, which returns
 *      `{ owner, teachers[] }` and is already shipped. Finding myself in
 *      `teachers` yields the real 'editor' | 'viewer'.
 *   3. Otherwise null — not my classroom.
 *
 * Step 2 is why this works TODAY without the `myRole` field the contract asks
 * for: `myRole` is only needed so a co-taught classroom shows up in
 * `GET /classrooms` at all. See `useMyClassrooms`.
 */
export const useClassroomRole = (
  classroomId?: string,
): {
  role: ClassroomRole | null;
  isLoading: boolean;
  /** True while the role could not be resolved from the server. */
  isDegraded: boolean;
  /**
   * True only when `role` is a CONFIDENT answer — the classroom list loaded,
   * and if a co-teacher lookup was needed it settled too.
   *
   * Guards must key off THIS, not off `role === null`. A failed or unauthorized
   * `GET /classrooms` also yields `role === null`, and treating that as "not
   * your classroom" ejects a teacher from their own room on a transient network
   * error. Absence of evidence is not evidence of absence; never take a
   * destructive action on a missing answer.
   */
  isResolved: boolean;
} => {
  const { data: me, isLoading: meLoading } = useMe();
  const {
    data: owned = [],
    isLoading: ownedLoading,
    isError: ownedError,
    isSuccess: ownedSuccess,
  } = useClassrooms();

  const myId = me?.id ?? null;
  const isOwner = useMemo(
    () =>
      !!myId &&
      !!classroomId &&
      owned.some((c) => c.id === classroomId && c.teacherId === myId),
    [owned, classroomId, myId],
  );

  // Only ask about co-teaching when ownership did not already answer it.
  const needTeachers = !!classroomId && !!myId && !isOwner && !ownedLoading;

  const {
    data: teachers,
    isLoading: teachersLoading,
    isError: teachersError,
  } = useClassroomTeachers(needTeachers ? classroomId : undefined);

  const role = useMemo<ClassroomRole | null>(() => {
    if (!myId || !classroomId) return null;
    if (isOwner) return 'owner';
    if (!teachers) return null;
    if (teachers.owner?.teacherId === myId) return 'owner';
    const mine = teachers.teachers?.find((t) => t.teacherId === myId);
    return mine?.role ?? null;
  }, [myId, classroomId, isOwner, teachers]);

  const isLoading =
    meLoading || ownedLoading || (needTeachers && teachersLoading);

  return {
    role,
    isLoading,
    // A failed teachers lookup means we genuinely do not know — say so rather
    // than silently reporting "not your classroom".
    isDegraded: (needTeachers && teachersError) || ownedError,
    isResolved:
      !isLoading &&
      !!me &&
      ownedSuccess &&
      // Either ownership already answered it, or the co-teacher lookup did.
      (isOwner || !needTeachers || (!teachersLoading && !teachersError)),
  };
};

/**
 * Am I the OWNER of this classroom, judged only from the classrooms I already
 * hold? Deliberately does NOT probe `GET /classrooms/:id/teachers`.
 *
 * Use this on student-facing surfaces (the classroom picker, the classroom
 * home page's "previewing as student" banner). `useClassroomRole` would fire a
 * teachers request for every non-owner, which for an actual student is a
 * guaranteed 403 on every page view — a wasted request and a telemetry row per
 * render, to answer a question the owned list already answers.
 *
 * Teacher surfaces that need editor/viewer resolution use `useClassroomRole`.
 */
export const useIsClassroomOwner = (classroomId?: string): boolean => {
  const { classrooms } = useMyClassrooms();
  return !!classroomId && classrooms.some((c) => c.id === classroomId);
};

/**
 * Can I edit this classroom's LOCAL curriculum — lessons, decks, the annual
 * plan?
 *
 * FAILS OPEN on an unknown role, and that asymmetry is deliberate. These writes
 * land in this browser's own storage, so the worst case of a wrong "yes" is a
 * viewer editing a copy nobody else sees. The worst case of a wrong "no" is a
 * teacher locked out of their own lesson plan because the network blipped — and
 * it would break the offline classroom demo entirely, which is a shipped mode.
 *
 * Only a CONFIDENT `viewer` blocks editing.
 */
export const useCanEditClassroom = (classroomId?: string): boolean => {
  const { role, isResolved } = useClassroomRole(classroomId);
  return !(isResolved && role === 'viewer');
};

/**
 * Can I take a SERVER-backed action that changes someone else's access —
 * approving an enrollment, removing a student, adding a co-teacher?
 *
 * FAILS CLOSED, the opposite of {@link useCanEditClassroom}. These writes are
 * visible to other people and are not undoable from this browser, so an unknown
 * role must mean "no".
 */
export const useCanManageClassroom = (classroomId?: string): boolean => {
  const { role, isResolved } = useClassroomRole(classroomId);
  return isResolved && (role === 'owner' || role === 'editor');
};

/**
 * Every classroom I can teach — owned plus co-taught.
 *
 * `coTaughtAvailable` is false until `GET /classrooms` returns co-taught
 * classes (CONTRACT-DELTAS P1). Until then this returns owned classrooms only,
 * and callers MUST surface that limit rather than implying the list is
 * complete — a co-teacher seeing an empty Office with no explanation is
 * exactly the silent degradation this renovation is removing.
 */
export const useMyClassrooms = () => {
  const { data: me } = useMe();
  const { data: all = [], isLoading } = useClassrooms();
  const myId = me?.id ?? null;

  // `GET /classrooms` is scoped by the auth token, not by ownership — a
  // student's enrolled classes come back on the same endpoint. The owner
  // filter is therefore load-bearing, not redundant, and is exactly the
  // expression the eight call sites each used to inline.
  const classrooms = useMemo(
    () => (myId ? all.filter((c) => c.teacherId === myId) : []),
    [all, myId],
  );

  return {
    classrooms,
    isLoading,
    /**
     * False until `GET /classrooms` returns co-taught classes. While false,
     * `classrooms` is OWNED-ONLY and a co-teacher will see an empty Office —
     * callers must say so rather than implying the list is complete.
     */
    coTaughtAvailable: SERVER_CLASSROOM_TEACHERS_ENABLED,
  };
};
