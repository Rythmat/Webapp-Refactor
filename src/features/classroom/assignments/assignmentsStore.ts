/**
 * Shared assignment types. Split out so useAssignments and the runner can
 * both import without a cycle back through the hook.
 */

export const STORAGE_KEY = 'ma-teacher:assignments:v1';
export const SCHEMA_VERSION = 1;

export type AssignmentKind = 'day' | 'atlas' | 'instructions';
export type AssignmentStatus = 'open' | 'closed';

export interface AtlasAssignmentRef {
  module: 'globe' | 'learn' | 'studio' | 'arcade';
  activityRef: string;
  expects: 'completion' | 'score' | 'artifact';
}

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  instructions?: string | null;
  kind: AssignmentKind;
  publishedDayId?: string | null;
  atlasRef?: AtlasAssignmentRef | null;
  dueAt?: string | null;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface AssignmentStore {
  schemaVersion: number;
  entries: Record<string, Assignment>;
}
