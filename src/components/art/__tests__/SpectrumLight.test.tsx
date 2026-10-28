// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { KEY_RAINBOW_COLORS } from '@/features/landing/rainbow';
import {
  HorizonFlare,
  SPECTRUM_VARS,
  SpectrumBar,
  SpectrumRim,
} from '../light/SpectrumLight';

afterEach(cleanup);

describe('the spectrum light', () => {
  it('is the 12 key colours, closing on C round the rim', () => {
    const rim = (SPECTRUM_VARS as Record<string, string>)['--spectrum'];
    for (const color of KEY_RAINBOW_COLORS) expect(rim).toContain(color);
    expect(rim.endsWith(KEY_RAINBOW_COLORS[0])).toBe(true);
  });

  it('draws a rim only when asked, as decoration', () => {
    const { container, rerender } = render(<SpectrumRim state="off" />);
    expect(container.firstChild).toBeNull();
    rerender(<SpectrumRim state="hover" edge="bottom" />);
    const rim = container.querySelector('[data-spectrum-rim]');
    expect(rim).toHaveAttribute('aria-hidden', 'true');
    expect(rim).toHaveAttribute('data-edge', 'bottom');
  });

  it('says the working bar is working', () => {
    render(<SpectrumBar label="Loading Echo" />);
    expect(
      screen.getByRole('status', { name: 'Loading Echo' }),
    ).toBeInTheDocument();
  });

  it('keeps the flare out of the accessibility tree', () => {
    const { container } = render(<HorizonFlare />);
    expect(container.querySelector('[data-horizon-flare]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
