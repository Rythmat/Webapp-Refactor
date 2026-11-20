// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChartLight } from '../SongPageEditor';
import { makeEmptySong } from '../songDefaults';

/**
 * The chart's light in the song editor (owner, 2026-11-12): one click
 * turns it; red is `comingSoon: true` on the song, green its absence.
 */

const caps = vi.hoisted(() => ({
  capabilities: {} as object | null,
  songSchemaLevel: 3,
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => caps,
}));
const repo = vi.hoisted(() => ({ on: false }));
vi.mock('../../repo/useRepoMode', () => ({ useRepoMode: () => repo.on }));

afterEach(() => {
  cleanup();
  caps.capabilities = {};
  caps.songSchemaLevel = 3;
  repo.on = false;
});

const light = () => screen.getByRole('button', { name: /^Chart light/ });

describe('the chart’s light', () => {
  it('turns a green chart red', () => {
    const onChange = vi.fn();
    render(<ChartLight body={{ id: 'x', title: 'X' }} onChange={onChange} />);
    expect(light()).toHaveAttribute('data-chart-light', 'green');
    expect(light()).toHaveTextContent('Ready for students');
    fireEvent.click(light());
    expect(onChange).toHaveBeenCalledWith({
      id: 'x',
      title: 'X',
      comingSoon: true,
    });
  });

  it('turns a red chart green by taking the key away', () => {
    const onChange = vi.fn();
    render(
      <ChartLight
        body={{ id: 'x', title: 'X', comingSoon: true }}
        onChange={onChange}
      />,
    );
    expect(light()).toHaveAttribute('data-chart-light', 'red');
    expect(light()).toHaveTextContent('Not ready · Coming soon');
    fireEvent.click(light());
    const sent = onChange.mock.calls[0][0] as Record<string, unknown>;
    expect(sent).toEqual({ id: 'x', title: 'X' });
    expect('comingSoon' in sent).toBe(false);
  });

  it('starts a new song red', () => {
    expect(makeEmptySong().comingSoon).toBe(true);
  });

  it('says so when the content API is too old to take a red light', () => {
    caps.songSchemaLevel = 2;
    render(<ChartLight body={{ comingSoon: true }} onChange={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'song schema v2, and a red light needs v3',
    );
    cleanup();
    // Green is no key at all, which any server takes.
    render(<ChartLight body={{}} onChange={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
    cleanup();
    // Repo mode writes the repo's files, which take it.
    repo.on = true;
    render(<ChartLight body={{ comingSoon: true }} onChange={vi.fn()} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
