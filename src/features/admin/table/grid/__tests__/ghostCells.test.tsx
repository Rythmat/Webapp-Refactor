// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TABLES } from '../../model/categories';
import type { CellValue, Chip } from '../../model/types';
import { ConnectionCell } from '../cells/ConnectionCell';
import { FieldCell } from '../cells/FieldCell';

/**
 * A suggestion in the grid: a ghost chip in the empty field it is for, and
 * the sparkle on a guess it would store — drawn apart from what the row
 * states, which the cell still says as before.
 */

afterEach(cleanup);

const city = TABLES.artists.columns.find((c) => c.id === 'city')!;

const connections = (
  over: Partial<Extract<CellValue, { type: 'connections' }>> = {},
): Extract<CellValue, { type: 'connections' }> => ({
  type: 'connections',
  sort: null,
  filled: false,
  total: 0,
  parts: [],
  styles: { solid: 0, dashed: 0, dotted: 0, hollow: 0, ghost: 0 },
  chips: [],
  note: 'No city yet.',
  ...over,
});

const pinned: Chip = {
  node: 'place:washington-dc',
  label: 'Washington D.C.',
  style: 'dotted',
  part: 'pins',
  weight: 1,
  tag: 'song pins',
};

describe('ghosts in the grid', () => {
  it('shows a suggested value in an empty field instead of its note', () => {
    const { container } = render(
      <FieldCell
        cell={{
          type: 'field',
          sort: null,
          filled: false,
          note: 'No birth date yet.',
          ghosts: [
            {
              label: 'Born 2 Apr 1939',
              title:
                'Born 2 Apr 1939 — suggested by an outside source · Sure · 100%',
            },
          ],
        }}
      />,
    );
    const ghost = container.querySelector('[data-style="ghost"]')!;
    expect(ghost.textContent).toBe('Born 2 Apr 1939, suggestion');
    expect(ghost.getAttribute('title')).toContain(
      'suggested by an outside source',
    );
    expect(container.textContent).not.toContain('No birth date yet.');
  });

  it('shows a suggested node in an empty connections cell', () => {
    const { container } = render(
      <ConnectionCell
        column={city}
        width={220}
        cell={connections({
          ghosts: [
            { node: 'place:detroit', label: 'Detroit', title: 'City: Detroit' },
          ],
        })}
      />,
    );
    expect(
      container.querySelector('[data-style="ghost"]')!.textContent,
    ).toContain('Detroit');
    expect(container.textContent).not.toContain('No city yet.');
  });

  it('marks a guess a suggestion would store, and adds what the cell lacks', () => {
    const { container } = render(
      <ConnectionCell
        column={city}
        width={400}
        cell={connections({
          total: 1,
          parts: [{ part: 'pins', label: 'song pins', count: 1 }],
          styles: { solid: 0, dashed: 0, dotted: 1, hollow: 0, ghost: 0 },
          chips: [pinned],
          ghosts: [
            {
              node: 'place:washington-dc',
              label: 'Washington D.C.',
              title: 'City: Washington D.C. (song pins)',
            },
            { node: 'place:detroit', label: 'Detroit', title: 'City: Detroit' },
          ],
        })}
      />,
    );
    const guess = container.querySelector('[data-style="dotted"]')!;
    expect(guess.hasAttribute('data-suggested')).toBe(true);
    expect(guess.getAttribute('title')).toContain(
      'Suggested to store: City: Washington D.C. (song pins)',
    );
    // Washington is not drawn twice; Detroit, which the cell lacks, is a ghost.
    const ghosts = container.querySelectorAll('[data-style="ghost"]');
    expect([...ghosts].map((g) => g.textContent)).toEqual([
      'Detroit, suggestion',
    ]);
  });
});
