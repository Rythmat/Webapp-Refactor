import { describe, expect, it } from 'vitest';
import { pickLocalized, secondaryLine } from './localized';

describe('secondaryLine', () => {
  it('gives the Spanish under the English when both are shown', () => {
    expect(secondaryLine({ en: 'Showcase', es: 'Muestra' }, 'both')).toBe(
      'Muestra',
    );
  });

  it('skips a missing translation, and one that reads the same (a name)', () => {
    expect(secondaryLine({ en: 'Showcase' }, 'both')).toBeNull();
    expect(
      secondaryLine({ en: 'Marvin Gaye', es: 'Marvin Gaye' }, 'both'),
    ).toBeNull();
  });

  it('has no second line in one language', () => {
    expect(secondaryLine({ en: 'Showcase', es: 'Muestra' }, 'es')).toBeNull();
    expect(pickLocalized({ en: 'Showcase', es: 'Muestra' }, 'es')).toBe(
      'Muestra',
    );
  });
});
