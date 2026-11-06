// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { PerStudentPreviewContext } from '@/components/ui/PerStudent';
import { useWelcomeRedirect } from '../useWelcomeGate';

// An account that has answered and was never welcomed.
vi.mock('@/features/learn/profile/useLearnProfile', () => ({
  useLearnProfile: () => ({ profile: {}, answered: true }),
}));

const at = (inMirror: boolean) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={['/home']}>
        <PerStudentPreviewContext.Provider value={inMirror ? () => null : null}>
          {children}
        </PerStudentPreviewContext.Provider>
      </MemoryRouter>
    );
  };

describe('useWelcomeRedirect', () => {
  it('sends a student never welcomed to /welcome first', () => {
    const { result } = renderHook(useWelcomeRedirect, { wrapper: at(false) });
    expect(result.current).toBe('/welcome?continue=%2Fhome');
  });

  it('stays put in the console’s mirror: an admin is no student', () => {
    const { result } = renderHook(useWelcomeRedirect, { wrapper: at(true) });
    expect(result.current).toBeNull();
  });
});
