import type {
  ArtifactRef,
  AssignmentProgressStatus,
} from '@/features/classroom/assignments/useAssignmentProgress';

// ── Review: the work waiting on the teacher, across classes ────────────────
// (owner, 2026-11-09) As Canvas's SpeedGrader queue and Flat's Reviews tab:
// every piece of turned-in work from every class, newest first. Pure, so
// the queue, its counts and its tests agree on what's "to review" — done
// work the teacher hasn't marked reviewed since it was last turned in.

export interface ReviewSource {
  classroomId: string;
  className: string;
  assignments: readonly {
    id: string;
    title: string;
    kind: string;
  }[];
  progress: (assignmentId: string) => readonly {
    enrollmentId: string;
    status: AssignmentProgressStatus;
    updatedAt: string;
    artifactRef?: ArtifactRef | null;
  }[];
  /** Display names by enrollment id. */
  names: Readonly<Record<string, string>>;
}

export interface ReviewItem {
  /** `<classroomId>/<assignmentId>/<enrollmentId>`: the URL's `?item=`. */
  key: string;
  classroomId: string;
  className: string;
  assignmentId: string;
  assignmentTitle: string;
  kind: string;
  enrollmentId: string;
  studentName: string;
  turnedInAt: string;
  artifactRef: ArtifactRef | null;
  reviewed: boolean;
}

/** When each item was marked reviewed, by its key. */
export type ReviewedMarks = Readonly<Record<string, string>>;

export const reviewKey = (cid: string, aid: string, eid: string) =>
  `${cid}/${aid}/${eid}`;

export const parseReviewKey = (key: string | null) => {
  const parts = key?.split('/') ?? [];
  if (parts.length !== 3 || parts.some((p) => !p)) return null;
  const [classroomId, assignmentId, enrollmentId] = parts;
  return { classroomId, assignmentId, enrollmentId };
};

export const buildReviewQueue = (
  sources: readonly ReviewSource[],
  marks: ReviewedMarks,
): ReviewItem[] => {
  const items: ReviewItem[] = [];
  for (const s of sources) {
    for (const a of s.assignments) {
      for (const p of s.progress(a.id)) {
        if (p.status !== 'done') continue;
        const key = reviewKey(s.classroomId, a.id, p.enrollmentId);
        const markedAt = marks[key];
        items.push({
          key,
          classroomId: s.classroomId,
          className: s.className,
          assignmentId: a.id,
          assignmentTitle: a.title,
          kind: a.kind,
          enrollmentId: p.enrollmentId,
          studentName: s.names[p.enrollmentId] ?? 'A student',
          turnedInAt: p.updatedAt,
          artifactRef: p.artifactRef ?? null,
          // Turned in again after it was reviewed: back in the queue.
          reviewed: Boolean(markedAt && markedAt >= p.updatedAt),
        });
      }
    }
  }
  return items.sort(
    (a, b) =>
      b.turnedInAt.localeCompare(a.turnedInAt) ||
      a.studentName.localeCompare(b.studentName),
  );
};
