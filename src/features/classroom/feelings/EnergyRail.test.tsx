// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EnergyRail } from './EnergyRail';

/**
 * No words on the slider (owner, 2026-11-10): a feeling's face and name are
 * revealed only as a student slides onto it.
 */
describe('the energy slider', () => {
  afterEach(cleanup);

  it('shows no words as a picture (the room, the editor)', () => {
    const { container } = render(<EnergyRail />);
    expect(container.textContent).toBe('');
  });

  it('shows no words before a student moves it', () => {
    const { container } = render(
      <EnergyRail value={null} onChange={() => {}} />,
    );
    expect(container.textContent).toBe('');
    expect(container.querySelector('[data-energy-emotion]')).toBeNull();
  });

  it('reveals the feeling, face and name, where the student puts it', () => {
    const { container, rerender } = render(
      <EnergyRail value={6} onChange={() => {}} />,
    );
    expect(screen.getByText('Tired')).toBeTruthy();
    expect(
      container.querySelector('[data-energy-emotion="tired"] svg'),
    ).not.toBeNull();
    rerender(<EnergyRail value={95} onChange={() => {}} language="es" />);
    expect(screen.getByText('Enojado')).toBeTruthy();
    expect(screen.queryByText('Tired')).toBeNull();
  });
});
