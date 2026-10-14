// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { MindMapBoard } from '@/content/graph/mindMapBoard';
import { AppRouteProgressStrip } from './AppRouteProgressStrip';

const BOARD: MindMapBoard = {
  focus: 'artist:ana-lux',
  goal: 1,
  nodes: [
    {
      id: 'artist:ana-lux',
      kind: 'artist',
      label: 'Ana Lux',
      stop: { artist: 'Ana Lux' },
    },
    {
      id: 'place:motor-city',
      kind: 'place',
      label: 'Motor City',
      stop: { place: 'city:motor-city' },
    },
  ],
  edges: [{ from: 'artist:ana-lux', to: 'place:motor-city', kind: 'born_in' }],
};

afterEach(cleanup);

describe('AppRouteProgressStrip', () => {
  it("opens a student's submitted mind map for the teacher", () => {
    render(
      <AppRouteProgressStrip
        board={BOARD}
        counts={{ done: 1, inModule: 1, notStarted: 0, total: 2 }}
        rows={[
          {
            enrollmentId: 'enr-1',
            displayName: 'Sam',
            state: 'done',
            mindMap: {
              focus: 'artist:ana-lux',
              nodeIds: ['place:motor-city'],
              edgeCount: 1,
            },
          },
          { enrollmentId: 'enr-2', displayName: 'Lee', state: 'in_module' },
        ]}
      />,
    );
    // Only a student who handed in a map has one to open.
    expect(
      screen.queryByRole('button', { name: "View Lee's mind map" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: "View Sam's mind map" }),
    );
    expect(screen.getByRole('dialog')).toHaveTextContent('Sam');
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '1 connected to Ana Lux · 1 links',
    );
    expect(
      screen.getByText('Ana Lux — born in — Motor City'),
    ).toBeInTheDocument();
  });
});
