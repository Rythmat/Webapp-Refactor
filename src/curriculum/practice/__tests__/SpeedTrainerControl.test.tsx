// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SpeedTrainerControl } from '../SpeedTrainerControl';
import type { SpeedLadderState } from '../useLessonPracticeTools';

afterEach(cleanup);

const LADDER: SpeedLadderState = {
  enabled: true,
  currentPct: 75,
  cleanStreak: 1,
  nonCleanStreak: 0,
  lastStep: null,
};
const TEXT = '75% → 80% after 2 clean passes · 1/2';

function renderControl(ladder: Partial<SpeedLadderState> = {}) {
  const onToggle = vi.fn();
  const onReset = vi.fn();
  render(
    <SpeedTrainerControl
      ladder={{ ...LADDER, ...ladder }}
      text={TEXT}
      onToggle={onToggle}
      onReset={onReset}
    />,
  );
  return { onToggle, onReset };
}

describe('SpeedTrainerControl', () => {
  it('is a switch with the ladder rule beside it', () => {
    const { onToggle } = renderControl({ enabled: false });
    const toggle = screen.getByRole('switch', { name: 'Speed trainer' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText(TEXT)).toBeTruthy();
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
    // Nothing to restart while it's off.
    expect(screen.queryByRole('button', { name: /again/ })).toBeNull();
  });

  it('restarts the climb', () => {
    const { onReset } = renderControl();
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe(
      'true',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Start the speed trainer again' }),
    );
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('explains a clean pass from the (i)', () => {
    renderControl();
    const info = screen.getByRole('button', { name: 'What is a clean pass?' });
    expect(info.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(info);
    expect(info.getAttribute('aria-expanded')).toBe('true');
    const note = screen.getByRole('note');
    expect(info.getAttribute('aria-controls')).toBe(note.id);
    expect(note.textContent).toContain(
      'A clean pass misses no more than one note.',
    );
    fireEvent.keyDown(info, { key: 'Escape' });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('says when it has slowed down', () => {
    renderControl({ currentPct: 70, lastStep: 'back' });
    expect(screen.getByText('Slowing to 70% for a few passes.')).toBeTruthy();
  });

  it("doesn't mention slowing down after a step up", () => {
    renderControl({ lastStep: 'up' });
    expect(screen.queryByText(/Slowing/)).toBeNull();
  });
});
