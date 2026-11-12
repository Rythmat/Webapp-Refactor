// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerStudentPreviewContext } from '@/components/ui/PerStudent';
import { CortexCard } from '../CortexCard';

vi.mock('@/features/cortex/CortexPanel', () => ({
  default: () => <div data-testid="cortex" />,
}));

afterEach(cleanup);

describe('the Cortex on the User page', () => {
  it('shows the student’s map', async () => {
    render(<CortexCard />);
    expect(await screen.findByTestId('cortex')).toBeInTheDocument();
  });

  it('never mounts in the console’s mirror, which has no student', () => {
    render(
      <PerStudentPreviewContext.Provider
        value={({ label }) => <div data-testid="placeholder">{label}</div>}
      >
        <CortexCard />
      </PerStudentPreviewContext.Provider>,
    );
    expect(screen.queryByTestId('cortex')).toBeNull();
    expect(screen.getByTestId('placeholder').textContent).toBe('Your Cortex');
  });
});
