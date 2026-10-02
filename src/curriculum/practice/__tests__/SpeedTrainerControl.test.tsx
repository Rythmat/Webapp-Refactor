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
    // It opens upward: the control lives in the lesson's bottom bar, where
    // a note hung below the (i) would be cut off by the screen's edge.
    expect(note.className).toMatch(/(^| )bottom-full( |$)/);
    expect(note.className).not.toMatch(/(^| )top-full( |$)/);
    fireEvent.keyDown(info, { key: 'Escape' });
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('says when it has slowed down', () => {
    renderControl({ currentPct: 70, lastStep: 'back' });
    expect(screen.getByText('Slowing to 70% for a few passes.')).toBeTruthy();
  });

  it('is the app’s white switch, with 12px type and nothing blue', () => {
    renderControl();
    const toggle = screen.getByRole('switch', { name: 'Speed trainer' });
    // ui/switch: white when on, drawn by its state.
    expect(toggle.getAttribute('data-state')).toBe('checked');
    expect(toggle.className).toContain('data-[state=checked]:bg-primary');
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/4a9eff|74, 158, 255/i);
    expect(html).not.toMatch(/text-\[(9|10|11)px\]/);
    expect(html).not.toMatch(/font-(semibold|medium)/);
  });

  it('takes taps the row’s height round the 20px switch: 44px on a phone, 36px from sm', () => {
    renderControl();
    const toggle = screen.getByRole('switch', { name: 'Speed trainer' });
    // The switch's 16px inside its 2px border, reached 14px (10px from sm)
    // above and below by its ::before.
    expect(toggle.className).toMatch(/(^| )before:-inset-y-3\.5( |$)/);
    expect(toggle.className).toMatch(/(^| )sm:before:-inset-y-2\.5( |$)/);
    expect(toggle.className).toContain('relative');
    expect(toggle.className).toContain('before:absolute');
    // The label takes the gap between them.
    const label = screen.getByText('Speed trainer');
    expect(label.tagName).toBe('LABEL');
    expect(label.className).toContain('pl-2');
    expect(label.parentElement!.className).not.toMatch(/(^| )gap-/);
  });

  it('switches from its label too', () => {
    const { onToggle } = renderControl({ enabled: false });
    fireEvent.click(screen.getByText('Speed trainer'));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("doesn't mention slowing down after a step up", () => {
    renderControl({ lastStep: 'up' });
    expect(screen.queryByText(/Slowing/)).toBeNull();
  });
});
