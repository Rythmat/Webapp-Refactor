// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CymaticsCover } from '../CymaticsCover';
import { parseRgb } from '../cymaticsRenderer';

afterEach(cleanup);

describe('a cymatic cover', () => {
  it('falls back to the drawn figure where the GPU is not to hand', () => {
    const { container } = render(
      <CymaticsCover seed="t" mode={{ n: 3, m: 1, sign: 1 }} color="#fff" />,
    );
    expect(container.querySelector('canvas')).toBeNull();
    expect(
      container.querySelector('[data-art-cover="chladni"]'),
    ).not.toBeNull();
  });

  it('reads its colour from computed CSS', () => {
    expect(parseRgb('rgb(255, 0, 51)')).toEqual([1, 0, 0.2]);
    expect(parseRgb('rgba(0, 255, 0, 0.5)')).toEqual([0, 1, 0]);
    expect(parseRgb('nonsense')).toBeNull();
  });
});
