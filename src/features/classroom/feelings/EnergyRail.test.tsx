// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InteractionBand } from '../slides/parts/InteractionBand';
import type { Interaction } from '../types';
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
    expect(screen.getByText('Sad')).toBeTruthy();
    expect(
      container.querySelector('[data-energy-emotion="sad"] svg'),
    ).not.toBeNull();
    rerender(<EnergyRail value={95} onChange={() => {}} language="es" />);
    expect(screen.getByText('Enojado')).toBeTruthy();
    expect(screen.queryByText('Sad')).toBeNull();
  });

  it('leaves the arrow keys to the lesson when asked (Present)', () => {
    const onChange = vi.fn();
    render(<EnergyRail value={50} onChange={onChange} keyboard={false} />);
    fireEvent.keyDown(screen.getByRole('slider'), { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('the check-in on Present', () => {
  afterEach(cleanup);
  const energy = {
    id: 'ck',
    type: 'check-in',
    question: { en: 'How are you feeling today?' },
    shareable: false,
    checkIn: { style: 'feelings', level: 'energy' },
  } as unknown as Interaction;
  const band = (surface: 'present' | 'projector') =>
    render(
      <InteractionBand
        interactions={[energy]}
        surface={surface}
        language="en"
        teacherOnly
        hero
        compact
      />,
    );

  it('gives the teacher a grip to slide, nothing shown until they do', () => {
    const { container } = band('present');
    expect(screen.getByRole('slider')).toBeTruthy();
    expect(container.querySelector('[data-energy-emotion]')).toBeNull();
  });

  it('is a picture on the room’s screen', () => {
    band('projector');
    expect(screen.queryByRole('slider')).toBeNull();
  });
});
