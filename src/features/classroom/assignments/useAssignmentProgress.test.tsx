// @vitest-environment jsdom
/**
 * A student's own progress row, found by their real enrollment.
 *
 * The progress rows `GET /progress` returns carry the server's enrollment id.
 * The student pages used to look their row up by the synthetic
 * `'local-preview'`, so a real student never found it: "Mark Done" posted,
 * the server stored it, and the button never turned into "Done — Undo".
 * These tests pin the lookup to the enrollment the roster resolves.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '@/contexts/AuthContext/AuthContext';
import { MusicAtlasContext } from '@/contexts/MusicAtlasContext/MusicAtlasContext';
import { meQueryKey } from '@/hooks/data/auth/meQueryKey';
import { AssignmentDayRunner } from './AssignmentDayRunner';
import { AssignmentInstructionsPage } from './AssignmentInstructionsPage';
import {
  LOCAL_ENROLLMENT_ID,
  findMyProgress,
  readProgressStoreForUser,
  resolveStudentEnrollmentId,
  useMyAssignmentProgress,
  useStudentEnrollmentId,
  type AssignmentProgress,
} from './useAssignmentProgress';

vi.mock('./useAssignments', () => ({
  useAssignments: () => ({
    getAssignment: (id: string) => ({
      id,
      classroomId: CLASSROOM,
      kind: 'instructions',
      title: 'Listen to Lovely Day',
      instructions: 'Write two sentences about the groove.',
      publishedDayId: 'pd-1',
      dueAt: null,
    }),
  }),
}));

// The Day runner's published Day: one cell with one question.
vi.mock('../publish/usePublishedDays', () => ({
  usePublishedDays: () => ({
    getPublishedDay: () => ({
      id: 'pd-1',
      snapshot: {
        cells: {
          connectRegulate: {
            presentation: {
              title: { en: 'Connect' },
              prompt: { en: 'How are you arriving?' },
              launchTiles: [],
              interactions: [
                {
                  id: 'ix-1',
                  type: 'text',
                  question: { en: 'One word for today?' },
                  shareable: false,
                  text: { maxLen: 40 },
                },
              ],
            },
          },
        },
      },
    }),
  }),
}));
vi.mock('../publish/useRuleOneReadGuard', () => ({
  useSanitizedPublishedDay: (day: unknown) => ({ day }),
}));
// Stands in for the inputs, which key local answers and MSP token mints by
// the enrollment id they are given.
vi.mock('../live/interactions', () => ({
  InteractionInput: (props: { enrollmentId?: string }) => (
    <div data-testid="interaction" data-enrollment={props.enrollmentId} />
  ),
}));

const CLASSROOM = 'class-1';
const ASSIGNMENT = 'asg-1';
const ACCOUNT = 'acct-student';
const REAL = 'enr-real';
const TOKEN = 'test-token';

const enrollment = (id: string, accountId: string) => ({
  id,
  classroomId: CLASSROOM,
  accountId,
  displayName: id,
  status: 'active' as const,
  joinedAt: '2026-09-01T00:00:00.000Z',
  approvedAt: '2026-09-01T00:00:00.000Z',
  removedAt: null,
});

const row = (
  enrollmentId: string,
  status: AssignmentProgress['status'],
): AssignmentProgress => ({
  assignmentId: ASSIGNMENT,
  enrollmentId,
  status,
  artifactRef: null,
  updatedAt: '2026-10-08T12:00:00.000Z',
});

/**
 * The slice of the API these hooks call, backed by one in-memory "server" so
 * a fresh QueryClient (a reload) reads back what an earlier POST stored.
 */
const fakeServer = (opts: {
  rows?: AssignmentProgress[];
  roster?: ReturnType<typeof enrollment>[];
}) => {
  let rows = [...(opts.rows ?? [])];
  return {
    auth: { getAuthMe: vi.fn(async () => ({ id: ACCOUNT })) },
    classrooms: {
      getClassroomsByIdEnrollments: vi.fn(
        async () =>
          opts.roster ?? [
            enrollment('enr-other', 'acct-other'),
            enrollment(REAL, ACCOUNT),
          ],
      ),
      getClassroomsByIdAssignmentsByAssignmentIdProgress: vi.fn(async () =>
        rows.map((r) => ({ ...r })),
      ),
      // The POST carries no enrollment id: the server files it under the
      // signed-in student's enrollment.
      postClassroomsByIdAssignmentsByAssignmentIdProgress: vi.fn(
        async (
          _classroomId: string,
          _assignmentId: string,
          body: { status: AssignmentProgress['status'] },
        ) => {
          const stored = row(REAL, body.status);
          rows = [...rows.filter((r) => r.enrollmentId !== REAL), stored];
          return stored;
        },
      ),
    },
  };
};

const newQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const providers = (
  api: ReturnType<typeof fakeServer>,
  queryClient: QueryClient,
  auth: { token: string | null; isBootstrapLoading: boolean } = {
    token: TOKEN,
    isBootstrapLoading: false,
  },
) => {
  function Providers({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth as never}>
          <MusicAtlasContext.Provider value={api as never}>
            {children}
          </MusicAtlasContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return Providers;
};

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(cleanup);

describe('resolveStudentEnrollmentId', () => {
  it('is undefined while the user or the roster is still loading', () => {
    expect(
      resolveStudentEnrollmentId({ myEnrollmentId: undefined, settled: false }),
    ).toBeUndefined();
  });

  it("is the student's own enrollment once it resolves", () => {
    expect(
      resolveStudentEnrollmentId({ myEnrollmentId: REAL, settled: true }),
    ).toBe(REAL);
    expect(
      resolveStudentEnrollmentId({ myEnrollmentId: REAL, settled: false }),
    ).toBe(REAL);
  });

  it('falls back to the synthetic id only once both lookups found no match', () => {
    expect(
      resolveStudentEnrollmentId({ myEnrollmentId: undefined, settled: true }),
    ).toBe(LOCAL_ENROLLMENT_ID);
  });
});

describe('findMyProgress', () => {
  const rows = [row('enr-other', 'in_progress'), row(REAL, 'done')];

  it("finds the row the server filed under the student's enrollment", () => {
    expect(findMyProgress(rows, REAL)).toEqual(row(REAL, 'done'));
  });

  it('finds nothing by the synthetic id, which no server row carries', () => {
    expect(findMyProgress(rows, LOCAL_ENROLLMENT_ID)).toBeUndefined();
  });

  it('finds nothing while the enrollment is unknown', () => {
    expect(findMyProgress(rows, undefined)).toBeUndefined();
  });
});

describe('useStudentEnrollmentId', () => {
  it("resolves to the roster row of the signed-in student's account", async () => {
    const api = fakeServer({});
    const { result } = renderHook(() => useStudentEnrollmentId(CLASSROOM), {
      wrapper: providers(api, newQueryClient()),
    });
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toBe(REAL));
  });

  it('falls back to the synthetic id when the roster has no row for this account', async () => {
    // A teacher opening the student view of their own assignment.
    const api = fakeServer({ roster: [enrollment('enr-other', 'acct-other')] });
    const { result } = renderHook(() => useStudentEnrollmentId(CLASSROOM), {
      wrapper: providers(api, newQueryClient()),
    });
    await waitFor(() => expect(result.current).toBe(LOCAL_ENROLLMENT_ID));
  });

  it('stays unresolved while sign-in is still bootstrapping', async () => {
    const api = fakeServer({});
    const { result } = renderHook(() => useStudentEnrollmentId(CLASSROOM), {
      wrapper: providers(api, newQueryClient(), {
        token: null,
        isBootstrapLoading: true,
      }),
    });
    await waitFor(() =>
      expect(api.classrooms.getClassroomsByIdEnrollments).toHaveBeenCalled(),
    );
    // The roster has loaded, but whose row it is cannot be known yet.
    await waitFor(() => expect(result.current).toBeUndefined());
    expect(result.current).toBeUndefined();
  });
});

describe('useMyAssignmentProgress', () => {
  it("finds the student's row by their real enrollment id", async () => {
    const api = fakeServer({
      rows: [row('enr-other', 'in_progress'), row(REAL, 'done')],
    });
    const { result } = renderHook(
      () => useMyAssignmentProgress(ASSIGNMENT, REAL, CLASSROOM),
      { wrapper: providers(api, newQueryClient()) },
    );
    await waitFor(() => expect(result.current.myProgress?.status).toBe('done'));
    expect(result.current.myProgress?.enrollmentId).toBe(REAL);
  });

  it('has no row until the enrollment id arrives, then finds it', async () => {
    const api = fakeServer({ rows: [row(REAL, 'in_progress')] });
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) =>
        useMyAssignmentProgress(ASSIGNMENT, id, CLASSROOM),
      {
        wrapper: providers(api, newQueryClient()),
        initialProps: { id: undefined as string | undefined },
      },
    );
    await waitFor(() =>
      expect(
        api.classrooms.getClassroomsByIdAssignmentsByAssignmentIdProgress,
      ).toHaveBeenCalled(),
    );
    expect(result.current.myProgress).toBeUndefined();
    rerender({ id: REAL });
    await waitFor(() =>
      expect(result.current.myProgress?.status).toBe('in_progress'),
    );
  });

  it('shows Done right after marking it, and again after a reload', async () => {
    const api = fakeServer({ rows: [] });
    const { result } = renderHook(
      () => useMyAssignmentProgress(ASSIGNMENT, REAL, CLASSROOM),
      { wrapper: providers(api, newQueryClient()) },
    );
    await waitFor(() =>
      expect(
        api.classrooms.getClassroomsByIdAssignmentsByAssignmentIdProgress,
      ).toHaveBeenCalled(),
    );
    expect(result.current.myProgress).toBeUndefined();

    await act(async () => {
      await result.current.setMyProgress({ status: 'done' });
    });
    expect(result.current.myProgress?.status).toBe('done');

    // A reload: a fresh cache reads the row back from the server.
    const reloaded = renderHook(
      () => useMyAssignmentProgress(ASSIGNMENT, REAL, CLASSROOM),
      { wrapper: providers(api, newQueryClient()) },
    );
    await waitFor(() =>
      expect(reloaded.result.current.myProgress?.status).toBe('done'),
    );
  });

  it('records answers under the real enrollment, and none before it resolves', async () => {
    const api = fakeServer({});
    const queryClient = newQueryClient();
    const { result, rerender } = renderHook(
      ({ id }: { id: string | undefined }) =>
        useMyAssignmentProgress(ASSIGNMENT, id, CLASSROOM),
      {
        wrapper: providers(api, queryClient),
        initialProps: { id: undefined as string | undefined },
      },
    );
    // Answers are stored per signed-in user; wait for the user to load.
    await waitFor(() =>
      expect(queryClient.getQueryData(meQueryKey(TOKEN))).toBeTruthy(),
    );

    act(() => {
      result.current.recordMyResponse({
        interactionId: 'ix-1',
        payload: { kind: 'text', text: 'too early' },
      });
    });
    expect(readProgressStoreForUser(ACCOUNT).responses).toEqual({});

    rerender({ id: REAL });
    act(() => {
      result.current.recordMyResponse({
        interactionId: 'ix-1',
        payload: { kind: 'text', text: 'the groove' },
      });
    });
    expect(readProgressStoreForUser(ACCOUNT).responses).toEqual({
      [ASSIGNMENT]: {
        [REAL]: { 'ix-1': { kind: 'text', text: 'the groove' } },
      },
    });
    expect(result.current.myResponses).toEqual({
      'ix-1': { kind: 'text', text: 'the groove' },
    });
  });
});

describe('AssignmentInstructionsPage', () => {
  const renderPage = (
    api: ReturnType<typeof fakeServer>,
    queryClient: QueryClient,
  ) => {
    const Providers = providers(api, queryClient);
    return render(
      <Providers>
        <MemoryRouter
          initialEntries={[
            `/classrooms/${CLASSROOM}/assignments/${ASSIGNMENT}`,
          ]}
        >
          <Routes>
            <Route
              path="/classrooms/:classroomId/assignments/:assignmentId"
              element={<AssignmentInstructionsPage />}
            />
          </Routes>
        </MemoryRouter>
      </Providers>,
    );
  };

  it('turns Mark Done into "Done — Undo" at once, and keeps it after a reload', async () => {
    const api = fakeServer({ rows: [] });
    const first = renderPage(api, newQueryClient());

    const markDone = await screen.findByRole('button', { name: /Mark Done/ });
    // Enabled once the student's enrollment has resolved.
    await waitFor(() => expect(markDone).toBeEnabled());
    fireEvent.click(markDone);
    expect(
      await screen.findByRole('button', { name: /Done — Undo/ }),
    ).toBeInTheDocument();
    expect(
      api.classrooms.postClassroomsByIdAssignmentsByAssignmentIdProgress,
    ).toHaveBeenCalledWith(CLASSROOM, ASSIGNMENT, {
      status: 'done',
      artifactRef: undefined,
    });

    first.unmount();
    renderPage(api, newQueryClient());
    expect(
      await screen.findByRole('button', { name: /Done — Undo/ }),
    ).toBeInTheDocument();
  });
});

describe('AssignmentDayRunner', () => {
  it("hands the student's real enrollment id to every interaction", async () => {
    const api = fakeServer({});
    const Providers = providers(api, newQueryClient());
    render(
      <Providers>
        <MemoryRouter
          initialEntries={[
            `/classrooms/${CLASSROOM}/assignments/${ASSIGNMENT}/run`,
          ]}
        >
          <Routes>
            <Route
              path="/classrooms/:classroomId/assignments/:assignmentId/run"
              element={<AssignmentDayRunner />}
            />
          </Routes>
        </MemoryRouter>
      </Providers>,
    );
    // Nothing is answerable until the enrollment is known.
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading your assignment…',
    );
    const input = await screen.findByTestId('interaction');
    expect(input).toHaveAttribute('data-enrollment', REAL);
  });
});
