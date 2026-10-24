// @vitest-environment jsdom
/**
 * Two students the teacher pairs land in one Studio room, without reading a
 * code aloud, and the live-session tab stays where it is.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StudioCollabAction } from './StudioCollabAction';
import type { SessionPair } from './sessionsStore';
import { pairRoomCode } from './studioPairRoom';

const ROSTER: Record<string, { displayName: string; accountId: string }> = {
  'enr-ana': { displayName: 'Ana', accountId: 'acct-ana' },
  'enr-ben': { displayName: 'Ben', accountId: 'acct-ben' },
  'enr-cy': { displayName: 'Cy', accountId: 'acct-cy' },
};

vi.mock('../enrollments', () => ({
  useEnrollments: () => ({
    getEnrollment: (id: string) => ROSTER[id],
  }),
}));

const SESSION = 'sess-42';
const PAIRS: SessionPair[] = [
  {
    id: 'pair-0',
    enrollmentIds: ['enr-ana', 'enr-ben'],
    hostEnrollmentId: 'enr-ana',
  },
];
const CODE = pairRoomCode(SESSION, ['enr-ana', 'enr-ben']);

let openSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  openSpy = vi
    .spyOn(window, 'open')
    .mockImplementation(() => ({ opener: window }) as unknown as Window);
});
afterEach(() => {
  cleanup();
  openSpy.mockRestore();
});

const renderAs = (
  myEnrollmentId: string | undefined,
  overrides: Partial<Parameters<typeof StudioCollabAction>[0]> = {},
) =>
  render(
    <StudioCollabAction
      grouping="pairs"
      pairs={PAIRS}
      myEnrollmentId={myEnrollmentId}
      sessionId={SESSION}
      classroomId="class-1"
      language="en"
      {...overrides}
    />,
  );

describe('StudioCollabAction', () => {
  it("opens the host's Studio as the owner of the pair's room, in a new tab", () => {
    renderAs('enr-ana');
    expect(
      screen.getByText(
        /You're hosting\. Open your shared Studio, and Ben will join you there\./,
      ),
    ).toBeInTheDocument();
    // Nobody is moved without a click.
    expect(openSpy).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: /Open our shared Studio/ }),
    );
    expect(openSpy).toHaveBeenCalledWith(
      `/studio?collab=${CODE}&host=1`,
      '_blank',
    );
  });

  it('sends the partner into the same room, named after the host', () => {
    renderAs('enr-ben');
    expect(
      screen.getByText(/Ana is hosting\. Open the Studio to join their room\./),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Join Ana's Studio/ }));
    expect(openSpy).toHaveBeenCalledWith(
      `/studio?collab=${CODE}&pair=1`,
      '_blank',
    );
  });

  it('shows the room code as a backup', () => {
    renderAs('enr-ben');
    expect(screen.getByText(`Room code: ${CODE}`)).toBeInTheDocument();
  });

  it('puts a trio in one room and names both partners to the host', () => {
    const trio: SessionPair[] = [
      {
        id: 'pair-0',
        enrollmentIds: ['enr-ana', 'enr-ben', 'enr-cy'],
        hostEnrollmentId: 'enr-ana',
      },
    ];
    renderAs('enr-ana', { pairs: trio });
    expect(
      screen.getByText(/Ben and Cy will join you there/),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Open our shared Studio/ }),
    );
    const trioCode = pairRoomCode(SESSION, ['enr-cy', 'enr-ana', 'enr-ben']);
    expect(openSpy).toHaveBeenLastCalledWith(
      `/studio?collab=${trioCode}&host=1`,
      '_blank',
    );
  });

  it('waits for the teacher when there are no pairs yet', () => {
    renderAs('enr-ana', { pairs: null });
    expect(
      screen.getByText('Your teacher is setting up the groups…'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('opens a fresh project for solo work', () => {
    renderAs('enr-ana', { grouping: 'solo' });
    fireEvent.click(screen.getByRole('button', { name: /Open the Studio/ }));
    expect(openSpy).toHaveBeenCalledWith('/studio?new=1', '_blank');
  });

  it('offers a link in this tab when the browser blocks the new one', () => {
    openSpy.mockImplementation(() => null);
    renderAs('enr-ben');
    fireEvent.click(screen.getByRole('button', { name: /Join Ana's Studio/ }));
    expect(
      screen.getByRole('link', { name: /open here instead/ }),
    ).toHaveAttribute('href', `/studio?collab=${CODE}&pair=1`);
  });
});
