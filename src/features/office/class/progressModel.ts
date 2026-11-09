import type { AssignmentProgressStatus } from '@/features/classroom/assignments/useAssignmentProgress';

// ── A class's Progress map (owner, 2026-11-09) ─────────────────────────────
// Students down the side, the class's assignments across the top, each cell
// how that student stands on that one — the student × work map teachers ask
// for. Pure, so the page and its tests agree on what "missed" means: still
// not done after it closed or came due.

export type CellState = 'done' | 'started' | 'not-yet' | 'missed';

export interface ProgressColumn {
  id: string;
  title: string;
  dueAt: string | null;
  closed: boolean;
  /** Students who've finished it, of the roster. */
  done: number;
}

export interface ProgressRow {
  enrollmentId: string;
  name: string;
  cells: CellState[];
  done: number;
  missed: number;
  /** Ended live sessions they answered something in. */
  sessions: number;
}

export interface ProgressGrid {
  columns: ProgressColumn[];
  rows: ProgressRow[];
  /** Ended live sessions the class had. */
  sessionCount: number;
}

export interface ProgressInput {
  students: readonly { id: string; displayName: string }[];
  assignments: readonly {
    id: string;
    title: string;
    dueAt?: string | null;
    status: 'open' | 'closed';
    createdAt: string;
  }[];
  /** Each assignment's progress rows, by assignment id. */
  progress: (assignmentId: string) => readonly {
    enrollmentId: string;
    status: AssignmentProgressStatus;
  }[];
  /** For each ended session, who answered something (enrollment ids). */
  sessions: readonly (readonly string[])[];
  now: number;
}

const cellState = (
  status: AssignmentProgressStatus | undefined,
  overdueOrClosed: boolean,
): CellState => {
  if (status === 'done') return 'done';
  if (overdueOrClosed) return 'missed';
  return status === 'in_progress' ? 'started' : 'not-yet';
};

export const buildProgressGrid = (input: ProgressInput): ProgressGrid => {
  const assignments = [...input.assignments].sort(
    (a, b) =>
      (a.dueAt ?? a.createdAt).localeCompare(b.dueAt ?? b.createdAt) ||
      a.title.localeCompare(b.title),
  );
  const status = assignments.map(
    (a) => new Map(input.progress(a.id).map((p) => [p.enrollmentId, p.status])),
  );
  const ended = assignments.map((a) => {
    const due = a.dueAt ? new Date(a.dueAt).getTime() : NaN;
    return a.status === 'closed' || (!Number.isNaN(due) && due < input.now);
  });

  const rows = [...input.students]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((s) => {
      const cells = assignments.map((_, i) =>
        cellState(status[i].get(s.id), ended[i]),
      );
      return {
        enrollmentId: s.id,
        name: s.displayName,
        cells,
        done: cells.filter((c) => c === 'done').length,
        missed: cells.filter((c) => c === 'missed').length,
        sessions: input.sessions.filter((who) => who.includes(s.id)).length,
      };
    });

  const columns = assignments.map((a, i) => ({
    id: a.id,
    title: a.title,
    dueAt: a.dueAt ?? null,
    closed: a.status === 'closed',
    done: rows.filter((r) => r.cells[i] === 'done').length,
  }));

  return { columns, rows, sessionCount: input.sessions.length };
};
