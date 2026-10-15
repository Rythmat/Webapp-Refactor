// @vitest-environment jsdom
/**
 * A signed-out student who follows a link is sent to sign in, and comes back
 * to the whole link afterwards: its query and hash too. A Studio link is all
 * query (`/studio/editor?project=…`); with only the pathname kept they landed
 * on a bare editor that resumed something else (1.4, P21).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthRoutes } from '@/constants/routes';
import { ProtectedPage } from '../ProtectedPage';

const auth = vi.hoisted(() => ({
  value: {
    appUser: null as { id: string } | null,
    isBootstrapLoading: false,
    isAuth0Loading: false,
    isAuth0Authenticated: false,
    role: 'student' as string | null,
    error: null as string | null,
    signOut: async () => {},
  },
}));

vi.mock('../hooks/useAuthContext', () => ({
  useAuthContext: () => auth.value,
}));

function SignIn() {
  const location = useLocation();
  return (
    <p data-testid="continue">
      {new URLSearchParams(location.search).get('continue')}
    </p>
  );
}

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path={AuthRoutes.signIn.definition} element={<SignIn />} />
        <Route
          path="*"
          element={
            <ProtectedPage>
              <p>the page</p>
            </ProtectedPage>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  auth.value.isAuth0Authenticated = false;
  auth.value.appUser = null;
});

describe('ProtectedPage', () => {
  it('keeps the link’s query and hash for after sign-in', () => {
    renderAt('/studio/editor?project=p1&interactionId=i9&utm_source=x#top');
    expect(screen.getByTestId('continue').textContent).toBe(
      '/studio/editor?project=p1&interactionId=i9&utm_source=x#top',
    );
  });

  it('keeps a bare pathname as it is', () => {
    renderAt('/studio/editor');
    expect(screen.getByTestId('continue').textContent).toBe('/studio/editor');
  });

  it('shows the page to a signed-in user', () => {
    auth.value.isAuth0Authenticated = true;
    auth.value.appUser = { id: 'u1' };
    renderAt('/studio/editor?project=p1');
    expect(screen.getByText('the page')).toBeTruthy();
  });
});
