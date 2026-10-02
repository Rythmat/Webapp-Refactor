import { describe, expect, it } from 'vitest';
import { closeEnough, samePlace } from '../samePlace';

/**
 * One rule for "the same place" (C33), shared by the planners' place book,
 * the importer's and the mock's create-only check.
 */

const tottenham = {
  name: 'Tottenham',
  country: 'UK',
  coordinates: [51.5975, -0.0681] as const,
};

describe('the same place', () => {
  it('is the same name, folded, within 25 km in one country', () => {
    expect(
      samePlace(tottenham, {
        name: 'tottenham',
        country: 'United Kingdom',
        coordinates: [51.6, -0.07],
      }),
    ).toBe(true);
    expect(
      samePlace(
        { name: 'São Paulo', country: 'Brazil', coordinates: [-23.55, -46.63] },
        { name: 'Sao Paulo', country: 'Brazil', coordinates: [-23.6, -46.7] },
      ),
    ).toBe(true);
    // Another name at the same spot is another place.
    expect(samePlace(tottenham, { ...tottenham, name: 'Haringey' })).toBe(
      false,
    );
  });

  it('is within 5 km whatever country each says, and never across 25 km', () => {
    const border = {
      name: 'Bayamón',
      country: 'US',
      coordinates: [18.3985, -66.1557] as const,
    };
    expect(
      samePlace(border, {
        ...border,
        country: 'Puerto Rico',
        coordinates: [18.41, -66.16],
      }),
    ).toBe(true);
    expect(
      samePlace(border, {
        ...border,
        country: 'Puerto Rico',
        coordinates: [18.2, -66.16],
      }),
    ).toBe(false);
    expect(
      samePlace(border, { ...border, coordinates: [18.3985, -65.6] }),
    ).toBe(false);
  });

  it('takes an unsaid country as unknown, unless the caller says otherwise', () => {
    const unsaid = { country: null, coordinates: [51.68, -0.0681] as const };
    expect(closeEnough(tottenham, unsaid)).toBe(false);
    expect(
      closeEnough(tottenham, unsaid, { sameCountry: 'unless-unsaid' }),
    ).toBe(true);
  });
});
