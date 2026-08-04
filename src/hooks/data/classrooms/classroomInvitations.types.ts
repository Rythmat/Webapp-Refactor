/**
 * Classroom-scoped co-teacher invitation shapes.
 *
 * These mirror a *pending* backend contract on the external Music Atlas API
 * (`/classrooms/:classroomId/invitations`) that grants an invited Teacher User
 * access to a specific classroom as a co-teacher. Until that spec is regenerated
 * into `musicAtlas.generated.ts`, the hooks in this folder call
 * `musicAtlas.http.request(...)` directly against these local types. Once the
 * generated client exposes typed `musicAtlas.classrooms.*Invitations` methods,
 * swap the hooks over and delete this file.
 */

/** The membership role granted when the invitation is accepted. */
export type ClassroomInvitationRole = 'co_teacher';

export type ClassroomInvitationStatus =
  | 'all'
  | 'active'
  | 'expired'
  | 'consumed';

/** Response of `POST /classrooms/:classroomId/invitations`. */
export interface ClassroomInvitation {
  id: string;
  code: string;
  email: string;
  classroomId: string;
  createdAt: Date;
  expiresAt?: Date | null;
}

/** One row of `GET /classrooms/:classroomId/invitations`. */
export interface ClassroomInvitationListItem {
  id: string;
  code: string;
  email: string;
  createdAt: Date;
  consumedAt?: Date | null;
  expiresAt?: Date | null;
}
