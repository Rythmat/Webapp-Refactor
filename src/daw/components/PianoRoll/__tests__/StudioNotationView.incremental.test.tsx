// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffViewProps } from '@/components/notation/StaffView';

// ── The piano roll's notation opts into incremental engraving (score-06) ───
// studioNotationIncremental.test.tsx checks the staff draws the clip the
// same either way; this checks the view asks for it.

const h = vi.hoisted(() => ({ staff: null as StaffViewProps | null }));
vi.mock('@/components/notation/StaffView', () => ({
  StaffView: (props: StaffViewProps) => {
    h.staff = props;
    return null;
  },
}));

import { StudioNotationView } from '../StudioNotationView';

afterEach(cleanup);

describe('StudioNotationView', () => {
  it('engraves incrementally', () => {
    render(
      <StudioNotationView
        events={[
          {
            note: 60,
            startTick: 0,
            durationTicks: 480,
            velocity: 100,
            channel: 0,
          },
        ]}
        timelineStartTick={0}
        clipStartTick={0}
      />,
    );
    expect(h.staff!.incremental).toBe(true);
    expect(h.staff!.parts).toHaveLength(1);
  });
});
