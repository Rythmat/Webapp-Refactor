// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LessonTabStrip, type LessonTab } from '../LessonTabStrip';

afterEach(cleanup);

const tabs = (onSelect = vi.fn()): LessonTab[] => [
  { id: 'scale', label: 'Scale', sub: 'C Lydian', active: true, onSelect },
  {
    id: 'chords',
    label: 'Chords',
    sub: 'Triads, 7ths and inversions',
    active: false,
    onSelect,
  },
  { id: 'practice-track', label: 'Practice Track', active: false, onSelect },
];

describe('LessonTabStrip', () => {
  it('names each tab with its line under it, the open one marked', () => {
    render(
      <LessonTabStrip label="Overview" keyColor="#D2404A" tabs={tabs()} />,
    );
    const group = screen.getByRole('group', { name: 'Overview' });
    const buttons = [...group.querySelectorAll('button')];
    expect(buttons.map((b) => b.textContent)).toEqual([
      'ScaleC Lydian',
      'ChordsTriads, 7ths and inversions',
      'Practice Track',
    ]);
    expect(buttons[0]).toHaveAttribute('aria-current', 'true');
    expect(buttons[1]).not.toHaveAttribute('aria-current');
  });

  it('draws the key colour’s bar under the open tab only', () => {
    const { container } = render(
      <LessonTabStrip label="Overview" keyColor="#D2404A" tabs={tabs()} />,
    );
    const bars = container.querySelectorAll<HTMLElement>(
      '[data-lesson-tab-bar]',
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].closest('[data-lesson-tab]')).toHaveAttribute(
      'data-lesson-tab',
      'scale',
    );
    expect(bars[0].style.backgroundColor).toBe('rgb(210, 64, 74)');
  });

  it('chooses a tab when it is pressed', () => {
    const onSelect = vi.fn();
    render(
      <LessonTabStrip
        label="Overview"
        keyColor="#D2404A"
        tabs={tabs(onSelect)}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Chords/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('carries a step line instead of the bar, each segment opening its step', () => {
    const open = vi.fn();
    render(
      <LessonTabStrip
        label="Melody"
        keyColor="#D2404A"
        tabs={[
          {
            id: 'ascend',
            label: '1',
            name: '1. Ascend',
            active: true,
            onSelect: vi.fn(),
            steps: [
              {
                status: 'passed',
                current: false,
                label: 'Ascend Hold, passed',
                onSelect: vi.fn(),
              },
              {
                status: 'todo',
                current: true,
                label: 'Ascend Play Along',
                onSelect: open,
              },
            ],
          },
        ]}
      />,
    );
    expect(document.querySelector('[data-lesson-tab-bar]')).toBeNull();
    expect(screen.getByRole('button', { name: '1. Ascend' })).toBeTruthy();
    const steps = screen.getByRole('group', { name: '1. Ascend: steps' });
    expect(
      [...steps.querySelectorAll('[data-segment]')].map(
        (b) => (b as HTMLElement).dataset.segment,
      ),
    ).toEqual(['passed', 'current']);
    fireEvent.click(screen.getByRole('button', { name: 'Ascend Play Along' }));
    expect(open).toHaveBeenCalledTimes(1);
  });
});
