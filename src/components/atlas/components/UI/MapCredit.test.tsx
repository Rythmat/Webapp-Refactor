// @vitest-environment jsdom
/** The street map's credit names OpenStreetMap and Protomaps, with links. */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MapCredit } from './MapCredit';

afterEach(cleanup);

describe('the map credit', () => {
  it('credits OpenStreetMap and Protomaps with links to each', () => {
    render(<MapCredit />);
    expect(
      screen.getByRole('link', { name: 'OpenStreetMap' }).getAttribute('href'),
    ).toBe('https://www.openstreetmap.org/copyright');
    expect(
      screen.getByRole('link', { name: 'Protomaps' }).getAttribute('href'),
    ).toBe('https://protomaps.com');
    expect(screen.getByText(/©/).textContent).toBe(
      'Protomaps © OpenStreetMap',
    );
  });
});
