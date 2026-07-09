/**
 * Shared enrollment types + state-machine table. Split so useEnrollments and
 * tests can both import without a cycle back through the hook.
 *
 * Sprint 7 note: matches Ryan's REST shape — three timestamps only
 * (approvedAt / removedAt / joinedAt), and reactivate rewrites approvedAt.
 * The extra deniedAt / reactivatedAt columns from Sprint 3 were retired per
 * product decision; deny and kick both produce status='removed'.
 */

export const STORAGE_KEY = 'ma-teacher:enrollments:v1';
export const SCHEMA_VERSION = 1;

export type EnrollmentStatus = 'pending' | 'active' | 'removed';

export interface Enrollment {
  id: string;
  classroomId: string;
  accountId: string;
  displayName: string;
  status: EnrollmentStatus;
  joinedAt: string;
  approvedAt: string | null;
  removedAt: string | null;
}

export interface EnrollmentStore {
  schemaVersion: number;
  entries: Record<string, Enrollment>;
}

export const ENROLLMENT_TRANSITIONS: Record<
  EnrollmentStatus,
  EnrollmentStatus[]
> = {
  pending: ['active', 'removed'],
  active: ['removed'],
  removed: ['active'],
};

export const isValidTransition = (
  from: EnrollmentStatus,
  to: EnrollmentStatus,
): boolean => ENROLLMENT_TRANSITIONS[from].includes(to);
