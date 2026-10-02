import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITIES } from '@/components/atlas/data/cities';
import {
  canonicalId,
  isWellFormedSlug,
  SLUG_PATTERN,
  toEntityId,
} from '../ids';
import {
  countryRegionOf,
  placeSlugFor,
  resolvePlace,
  resolvePlaceName,
} from '../places';
import { artistSlug, keySlug } from '../slugs';
import { ENTITY_KINDS, type EntityKind } from '../types';

describe('the id grammar', () => {
  it('has a rule for every kind', () => {
    for (const kind of ENTITY_KINDS) {
      expect(SLUG_PATTERN[kind], kind).toBeInstanceOf(RegExp);
    }
    // …and the kind list is every kind, once (the compiler checks it too).
    expect(new Set(ENTITY_KINDS).size).toBe(ENTITY_KINDS.length);
    expect([...ENTITY_KINDS].sort()).toEqual(Object.keys(SLUG_PATTERN).sort());
  });

  it('spells a year one way, and a decade by its first year', () => {
    for (const slug of ['1982', '590', '1', '9999']) {
      expect(isWellFormedSlug('year', slug), slug).toBe(true);
    }
    for (const slug of ['0590', '0', '10000', '1982s', '1982.5', '-5']) {
      expect(isWellFormedSlug('year', slug), slug).toBe(false);
    }
    for (const slug of ['1980s', '590s', '10s']) {
      expect(isWellFormedSlug('decade', slug), slug).toBe(true);
    }
    for (const slug of ['1982s', '1980', '0s', '01980s', '1980S', '19800s']) {
      expect(isWellFormedSlug('decade', slug), slug).toBe(false);
    }
  });

  it('never allows a colon in a slug', () => {
    for (const kind of ENTITY_KINDS) {
      expect(isWellFormedSlug(kind, 'a:b'), kind).toBe(false);
    }
  });

  it('is idempotent: an id built from a slug is that slug', () => {
    const cases: [EntityKind, string][] = [
      ['artist', 'marvin-gaye'],
      ['song', 'aint_no_mountain_high_enough'],
      ['event', 'song-100_days_100_nights'],
      ['event', 'evt-motown-founded'],
      ['progression', '409'],
      ['key', 'e-flat'],
      ['place', 'los-angeles'],
      ['year', '1982'],
      ['decade', '1980s'],
    ];
    for (const [kind, slug] of cases) {
      expect(toEntityId(kind, slug)).toBe(`${kind}:${slug}`);
      expect(isWellFormedSlug(kind, slug), `${kind}:${slug}`).toBe(true);
    }
  });

  it('folds a song-derived event onto its song', () => {
    expect(canonicalId('event:song-100_days_100_nights')).toBe(
      'song:100_days_100_nights',
    );
    expect(canonicalId('event:evt-motown-founded')).toBe(
      'event:evt-motown-founded',
    );
    expect(canonicalId('song:africa')).toBe('song:africa');
  });

  it('folds a second recording with its own pin onto the song it is', () => {
    // songEventAliases.ts: the BBC live Valerie is the chart `valerie`.
    expect(canonicalId('event:song-valerie_bbc_live_version')).toBe(
      'song:valerie',
    );
    expect(canonicalId('song:valerie_bbc_live_version')).toBe(
      'song:valerie_bbc_live_version',
    );
  });
});

describe('key slugs', () => {
  it('spells every accidental the library uses', () => {
    // The nine accidental tonics in the song library, 153 songs between them.
    const spelled: Record<string, string> = {
      'E♭': 'e-flat',
      'B♭': 'b-flat',
      'A♭': 'a-flat',
      'F♯': 'f-sharp',
      'D♭': 'd-flat',
      'C♯': 'c-sharp',
      'G♯': 'g-sharp',
      'G♭': 'g-flat',
      'D♯': 'd-sharp',
    };
    for (const [tonic, slug] of Object.entries(spelled)) {
      expect(keySlug(tonic), tonic).toBe(slug);
    }
  });

  it('accepts ASCII accidentals and its own output', () => {
    expect(keySlug('Eb')).toBe('e-flat');
    expect(keySlug('F#')).toBe('f-sharp');
    expect(keySlug('e-flat')).toBe('e-flat');
    expect(keySlug('C')).toBe('c');
  });

  it('refuses what is not a tonic', () => {
    expect(keySlug('H')).toBeNull();
    expect(keySlug('major')).toBeNull();
    expect(keySlug('')).toBeNull();
  });
});

describe('artist slugs', () => {
  it('fold ampersands, accents and apostrophes', () => {
    expect(artistSlug('Earth, Wind & Fire')).toBe('earth-wind-and-fire');
    expect(artistSlug('Cesária Évora')).toBe('cesaria-evora');
    expect(artistSlug("Sinead O'Connor")).toBe('sinead-oconnor');
  });
});

describe('resolving a session city to a globe city', () => {
  it('finds the globe id for the cities the pilot sessions name', () => {
    expect(resolvePlace('Detroit', 'USA')).toBe('detroit');
    expect(resolvePlace('Los Angeles', 'USA')).toBe('los-angeles');
    expect(resolvePlace('London', 'UK')).toBe('london');
  });

  it('knows New York by the name people write', () => {
    // The registry says 'New York City'; sessions say 'New York'.
    expect(resolvePlace('New York', 'USA')).toBe('new-york');
  });

  it('uses the country to tell same-named cities apart', () => {
    // A plain slug of 'Birmingham' is neither registered Birmingham's id.
    expect(resolvePlace('Birmingham', 'UK')).toBe('birmingham-uk');
    expect(resolvePlace('Birmingham', 'USA')).toBe('birmingham-al');
  });

  it('will not guess when the name picks out more than one city', () => {
    expect(resolvePlace('Portland')).toBeNull();
    // Two Portlands (OR, ME) and two Charlestons (SC, WV) share a country.
    expect(resolvePlace('Portland', 'USA')).toBeNull();
    expect(resolvePlace('Charleston', 'USA')).toBeNull();
  });

  it('will not pin a city to the wrong country', () => {
    expect(resolvePlace('London', 'Canada')).toBeNull();
    expect(resolvePlaceName('London', 'Canada')).toEqual({
      status: 'refused',
    });
    expect(resolvePlaceName('Muscle Shoals', 'USA')).toEqual({
      status: 'unknown',
    });
  });

  it('reads a country written as its ISO code', () => {
    // The song events inherited ISO-2 codes from artistLocations.json; the
    // registry spells the country out.
    expect(resolvePlaceName('Oslo', 'NO')).toEqual({
      status: 'resolved',
      id: 'oslo',
    });
    expect(resolvePlace('Kingston', 'JM')).toBe('kingston');
    expect(resolvePlace('Birmingham', 'GB')).toBe('birmingham-uk');
    expect(resolvePlace('Detroit', 'U.S.')).toBe('detroit');
  });

  it('still folds accents and punctuation in a country', () => {
    expect(resolvePlace('São Tomé', 'Sao Tome and Principe')).toBe(
      resolvePlace('São Tomé', 'São Tomé and Príncipe'),
    );
    expect(resolvePlace('São Tomé', 'Sao Tome & Principe')).not.toBeNull();
    expect(resolvePlace('Abidjan', 'Cote dIvoire')).toBe('abidjan');
    expect(resolvePlace('Abidjan', 'CÔTE D’IVOIRE')).toBe('abidjan');
  });
});

describe('the region a country is filed under', () => {
  it('is the region its registered cities share', () => {
    expect(countryRegionOf('Norway')).toBe('north-europe');
    expect(countryRegionOf('NO')).toBe('north-europe');
    expect(countryRegionOf('USA')).toBe('north-america');
    expect(countryRegionOf('Jamaica')).toBe('central-america');
  });

  it('is not guessed for a country with no cities or cities in two regions', () => {
    expect(countryRegionOf('Atlantis')).toBeNull();
    // Moscow is Eastern Europe; the Siberian cities are North Asia.
    expect(countryRegionOf('Russia')).toBeNull();
  });

  it('agrees with every registered city in a country it answers for', () => {
    const wrong = CITIES.filter((city) => {
      const region = countryRegionOf(city.country);
      return region !== null && region !== city.region;
    }).map((c) => `${c.name}, ${c.country}`);
    expect(wrong).toEqual([]);
  });
});

describe('the place slug a session city gets', () => {
  it('is the registry id when the city resolves', () => {
    expect(placeSlugFor('Birmingham', 'UK')).toBe('birmingham-uk');
  });

  it('is a plain slug for a city the registry does not know', () => {
    expect(placeSlugFor('Muscle Shoals', 'USA')).toBe('muscle-shoals');
  });

  it('never lands on a registered city it was refused', () => {
    const registered = new Set(CITIES.map((c) => c.id));
    // Slugged plainly, each of these IS a registered id — of another city.
    for (const [city, country] of [
      ['London', 'Canada'],
      ['Portland', undefined],
      ['Portland', 'USA'],
      ['Charleston', 'USA'],
    ] as const) {
      const slug = placeSlugFor(city, country);
      expect(registered.has(slug), `${city}, ${country} → ${slug}`).toBe(false);
    }
    expect(placeSlugFor('London', 'Canada')).toBe('london-canada');
    expect(placeSlugFor('Portland')).toBe('portland-unplaced');
  });
});

describe('the pure graph modules', () => {
  // Bug 6: graph code once pulled the content store (and its CDN loader) in
  // through the globe's artist index. These stay free of it.
  it('keep the slug helpers import-free', () => {
    const source = readFileSync('src/content/graph/slugs.ts', 'utf8');
    expect(source).not.toMatch(/^import /m);
  });

  it('never import the content store or the globe artist index', () => {
    for (const file of [
      'deriveEdges',
      'ids',
      'types',
      'places',
      'slugs',
      'time',
    ]) {
      const source = readFileSync(`src/content/graph/${file}.ts`, 'utf8');
      expect(source, file).not.toMatch(
        /from '@\/(content\/contentStore|components\/atlas\/data\/artists)'/,
      );
    }
  });
});
