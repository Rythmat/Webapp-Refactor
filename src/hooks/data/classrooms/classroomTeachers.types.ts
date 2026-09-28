/**
 * Co-teacher types, re-exported from the GENERATED client so there is exactly
 * one definition of the role union in the app.
 *
 * Replaces the hand-rolled `classroomInvitations.types.ts`, which described a
 * `/classrooms/:id/invitations` route that was never registered and carried its
 * own invented `'co_teacher'` role the server has never accepted.
 */
import type { GetClassroomsByIdTeachersData } from '@/contexts/MusicAtlasContext/musicAtlas.generated';

/** The roles the server actually accepts. */
export type ClassroomTeacherRole = 'viewer' | 'editor';

/** The classroom owner, as returned by `GET /classrooms/:id/teachers`. */
export type ClassroomOwner = GetClassroomsByIdTeachersData['owner'];

/** One co-teacher row. */
export type ClassroomTeacher =
  GetClassroomsByIdTeachersData['teachers'][number];

/** The full role model, owner included. */
export type ClassroomRole = 'owner' | ClassroomTeacherRole;
