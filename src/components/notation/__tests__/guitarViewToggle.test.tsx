// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GuitarViewToggle } from '../GuitarViewToggle';

describe('GuitarViewToggle', () => {
  afterEach(cleanup);

  it('offers TAB and notation, and no piano roll', () => {
    render(<GuitarViewToggle view="tab" onChange={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: 'Guitar note view' });
    expect(group).toBeInTheDocument();
    expect(
      screen.getAllByRole('radio').map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Tablature', 'Notation']);
    expect(screen.getByRole('radio', { name: 'Tablature' })).toHaveTextContent(
      'TAB',
    );
  });

  it('marks the chosen view and only that one', () => {
    render(<GuitarViewToggle view="notation" onChange={() => {}} />);
    expect(
      screen.getAllByRole('radio').map((b) => b.getAttribute('aria-checked')),
    ).toEqual(['false', 'true']);
  });

  it('reports the view that was clicked', () => {
    const onChange = vi.fn();
    render(<GuitarViewToggle view="tab" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Notation' }));
    expect(onChange).toHaveBeenCalledWith('notation');
  });
});
