// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppliedTheoryFundamentalsKeyPicker } from '@/curriculum/components/AppliedTheoryFundamentalsKeyPicker';

const navigate = vi.fn();
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigate,
}));

describe('AppliedTheoryFundamentalsKeyPicker', () => {
  afterEach(() => {
    cleanup();
    navigate.mockReset();
  });

  it('keeps the piano picker as it was', () => {
    render(<AppliedTheoryFundamentalsKeyPicker />);
    expect(
      screen.getByRole('heading', { name: 'Applied Theory Fundamentals' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'F♯ Major' }));
    expect(navigate).toHaveBeenCalledWith(
      '/curriculum/applied-theory-fundamentals/fsharp',
    );
  });
});
