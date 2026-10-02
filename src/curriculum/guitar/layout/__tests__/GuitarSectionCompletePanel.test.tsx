// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuitarSectionCompletePanel } from '../GuitarSectionCompletePanel';
import { makeOffer } from './fixtures';

afterEach(cleanup);

describe('GuitarSectionCompletePanel', () => {
  it('the offer’s heading and blurb, word for word, and no buttons (the bar has them)', () => {
    const offer = makeOffer();
    render(<GuitarSectionCompletePanel offer={offer} />);
    const region = screen.getByRole('region', { name: 'Melody complete!' });
    expect(
      screen.getByRole('heading', { level: 2, name: 'Melody complete!' }),
    ).toBeInTheDocument();
    expect(region).toHaveTextContent(offer.blurb);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
