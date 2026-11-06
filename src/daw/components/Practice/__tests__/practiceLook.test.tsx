// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChordRegion } from '@/daw/store/prismSlice';
import { ChordChart } from '../ChordChart';
import { SegmentedToggle } from '../SegmentedToggle';

afterEach(cleanup);

const region = (id: string, name: string): ChordRegion =>
  ({ id, name, noteName: name[0] }) as unknown as ChordRegion;

describe('the chord chart', () => {
  const props = {
    regions: [region('a', 'C'), region('b', 'F')],
    nowIndex: 1,
    large: true,
    keyRootPc: 0,
    mode: 'ionian',
    accent: '#D2404A',
  };

  it('lights the chord sounding now in the key’s colour', () => {
    const { container } = render(<ChordChart {...props} isPlaying />);
    const now = container.querySelector<HTMLElement>('[data-now]');
    expect(now?.textContent).toContain('F');
    expect(now?.style.borderColor).toBeTruthy();
    expect(container.querySelectorAll('[data-now]')).toHaveLength(1);
  });

  it('lights nothing while it’s stopped', () => {
    const { container } = render(<ChordChart {...props} isPlaying={false} />);
    expect(container.querySelector('[data-now]')).toBeNull();
  });
});

describe('the pill switch', () => {
  it('marks what’s on, and says what was pressed', () => {
    const onChange = vi.fn();
    render(
      <SegmentedToggle
        label="Scale to show"
        options={[
          { id: 'a', label: 'One' },
          { id: 'b', label: 'Two' },
        ]}
        value="a"
        onChange={onChange}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'One' }).getAttribute('aria-pressed'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Two' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
