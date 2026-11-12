import { eraOfYear, type EraId } from '@/components/atlas/data/musicalEras';

/**
 * What the Globe demo shows, copied from the Atlas content (city ids, their
 * coordinates, event counts and years, the events on the cards and the
 * place-to-place links) so the landing page never loads it. A test
 * (`__tests__/globeModel.test.ts`) keeps every value in step with the real
 * data.
 */

export interface GlobePlace {
  /** The Atlas city id. */
  id: string;
  label: string;
  lat: number;
  lng: number;
  /** Events at the place, all eras. */
  events: number;
  /** Its busiest era: the halo's colour. */
  era: EraId;
}

/** Places lit on the demo's side of the globe (its busiest cities). */
export const PLACES: readonly GlobePlace[] = [
  {
    id: 'new-york',
    label: 'New York City',
    lat: 40.7128,
    lng: -74.006,
    events: 207,
    era: 'postwar',
  },
  {
    id: 'los-angeles',
    label: 'Los Angeles',
    lat: 34.0522,
    lng: -118.2437,
    events: 135,
    era: 'global-digital',
  },
  {
    id: 'london',
    label: 'London',
    lat: 51.5074,
    lng: -0.1278,
    events: 128,
    era: 'postwar',
  },
  {
    id: 'detroit',
    label: 'Detroit',
    lat: 42.3314,
    lng: -83.0458,
    events: 66,
    era: 'postwar',
  },
  {
    id: 'chicago',
    label: 'Chicago',
    lat: 41.8781,
    lng: -87.6298,
    events: 62,
    era: 'postwar',
  },
  {
    id: 'kingston',
    label: 'Kingston',
    lat: 18.0179,
    lng: -76.8099,
    events: 41,
    era: 'postwar',
  },
  {
    id: 'san-francisco',
    label: 'San Francisco',
    lat: 37.7749,
    lng: -122.4194,
    events: 40,
    era: 'postwar',
  },
  {
    id: 'nashville',
    label: 'Nashville',
    lat: 36.1627,
    lng: -86.7816,
    events: 31,
    era: 'global-digital',
  },
  {
    id: 'philadelphia',
    label: 'Philadelphia',
    lat: 39.9526,
    lng: -75.1652,
    events: 27,
    era: 'global-digital',
  },
  {
    id: 'memphis',
    label: 'Memphis',
    lat: 35.1495,
    lng: -90.049,
    events: 24,
    era: 'postwar',
  },
  {
    id: 'new-orleans',
    label: 'New Orleans',
    lat: 29.9511,
    lng: -90.0715,
    events: 21,
    era: 'postwar',
  },
  {
    id: 'atlanta',
    label: 'Atlanta',
    lat: 33.749,
    lng: -84.388,
    events: 19,
    era: 'global-digital',
  },
  {
    id: 'houston',
    label: 'Houston',
    lat: 29.7604,
    lng: -95.3698,
    events: 17,
    era: 'global-digital',
  },
  {
    id: 'paris',
    label: 'Paris',
    lat: 48.8566,
    lng: 2.3522,
    events: 14,
    era: 'electronic-hiphop',
  },
  {
    id: 'seattle',
    label: 'Seattle',
    lat: 47.6062,
    lng: -122.3321,
    events: 13,
    era: 'electronic-hiphop',
  },
  {
    id: 'havana',
    label: 'Havana',
    lat: 23.1136,
    lng: -82.3666,
    events: 12,
    era: 'postwar',
  },
  {
    id: 'miami',
    label: 'Miami',
    lat: 25.7617,
    lng: -80.1918,
    events: 12,
    era: 'global-digital',
  },
  {
    id: 'toronto',
    label: 'Toronto',
    lat: 43.6532,
    lng: -79.3832,
    events: 12,
    era: 'global-digital',
  },
  {
    id: 'minneapolis',
    label: 'Minneapolis',
    lat: 44.9778,
    lng: -93.265,
    events: 10,
    era: 'electronic-hiphop',
  },
  {
    id: 'montreal',
    label: 'Montreal',
    lat: 45.5017,
    lng: -73.5673,
    events: 6,
    era: 'global-digital',
  },
  {
    id: 'macon-us',
    label: 'Macon',
    lat: 32.8403,
    lng: -83.63102857142857,
    events: 7,
    era: 'postwar',
  },
  {
    id: 'kansas-city',
    label: 'Kansas City',
    lat: 39.0997,
    lng: -94.5786,
    events: 4,
    era: 'global-digital',
  },
  {
    id: 'wichita',
    label: 'Wichita',
    lat: 37.6872,
    lng: -97.3301,
    events: 2,
    era: 'early-modern',
  },
  {
    id: 'timbuktu',
    label: 'Timbuktu',
    lat: 16.7735,
    lng: -3.0074,
    events: 1,
    era: 'renaissance',
  },
  {
    id: 'mexico-city',
    label: 'Mexico City',
    lat: 19.4326,
    lng: -99.1332,
    events: 5,
    era: 'postwar',
  },
  {
    id: 'rio',
    label: 'Rio de Janeiro',
    lat: -22.9068,
    lng: -43.1729,
    events: 6,
    era: 'postwar',
  },
];

export const placeById = (id: string): GlobePlace | undefined =>
  PLACES.find((p) => p.id === id);

/** A place-to-place link: how many influences ran along it. */
export interface GlobeLink {
  /** The other end's Atlas city id. */
  place: string;
  label: string;
  n: number;
}

export interface GlobeEventCopy {
  id: string;
  year: number;
  title: string;
}

/** A place the demo picks: its events, the state it lifts, its links. */
export interface GlobeStory {
  place: string;
  /** The Inspector's subtitle: "Louisiana, US". */
  where: string;
  /** The state that lifts off the map (`STATE_PATHS` key). */
  lift: 'louisiana' | 'michigan';
  /** Every event's year, oldest first (the lid's and the rail's colours). */
  years: readonly number[];
  /** The Events card's tiles. */
  events: readonly GlobeEventCopy[];
  /** Where its music came from and went to, strongest first. */
  cameFrom: readonly GlobeLink[];
  wentTo: readonly GlobeLink[];
}

/** The Globe section's story: New Orleans. */
export const NEW_ORLEANS: GlobeStory = {
  place: 'new-orleans',
  where: 'Louisiana, US',
  lift: 'louisiana',
  years: [
    1819, 1819, 1885, 1890, 1917, 1923, 1967, 1968, 1969, 1969, 1969, 1971,
    1974, 1974, 1974, 1975, 1989, 1994, 2003, 2008, 2019,
  ],
  events: [
    {
      id: 'evt-jazz-congo-square-nola-1819',
      year: 1819,
      title: 'Congo Square: African drumming and dance in New Orleans',
    },
    {
      id: 'evt-jazz-origins-nola-1890',
      year: 1890,
      title: 'Brass bands, blues, and ragtime converge in New Orleans',
    },
    {
      id: 'evt-jazz-recording-nola-1917',
      year: 1917,
      title: 'Original Dixieland Jass Band makes the first jazz recording',
    },
    {
      id: 'evt-meters-neworleans-1969',
      year: 1969,
      title: 'The Meters pioneer New Orleans funk',
    },
  ],
  cameFrom: [
    { place: 'macon-us', label: 'Macon', n: 1 },
    { place: 'timbuktu', label: 'Timbuktu', n: 1 },
  ],
  wentTo: [
    { place: 'addis-ababa', label: 'Addis Ababa', n: 1 },
    { place: 'chicago', label: 'Chicago', n: 1 },
    { place: 'kansas-city', label: 'Kansas City', n: 1 },
    { place: 'los-angeles', label: 'Los Angeles', n: 1 },
    { place: 'minneapolis', label: 'Minneapolis', n: 1 },
    { place: 'montreal', label: 'Montreal', n: 1 },
    { place: 'new-york', label: 'New York City', n: 1 },
    { place: 'paris', label: 'Paris', n: 1 },
    { place: 'toronto', label: 'Toronto', n: 1 },
    { place: 'wichita', label: 'Wichita', n: 1 },
  ],
};

/** The Connections demo's story: Detroit, where Isn't She Lovely began. */
export const DETROIT_STORY: GlobeStory = {
  place: 'detroit',
  where: 'Michigan, US',
  lift: 'michigan',
  years: [
    1948, 1963, 1964, 1964, 1965, 1965, 1965, 1965, 1966, 1966, 1966, 1966,
    1967, 1967, 1967, 1969, 1970, 1971, 1971, 1971, 1972, 1972, 1973, 1973,
    1973, 1973, 1974, 1974, 1974, 1975, 1976, 1976, 1976, 1976, 1976, 1976,
    1976, 1976, 1976, 1976, 1976, 1976, 1976, 1976, 1976, 1976, 1976, 1976,
    1976, 1976, 1979, 1980, 1980, 1980, 1981, 1982, 1985, 1989, 1990, 2000,
    2000, 2000, 2000, 2003, 2003, 2019,
  ],
  events: [],
  cameFrom: [{ place: 'los-angeles', label: 'Los Angeles', n: 10 }],
  wentTo: [],
};

/** Events per era across the whole Atlas: the era rail's segment widths. */
export const ERA_TOTALS: Readonly<Record<EraId, number>> = {
  ancient: 12,
  renaissance: 23,
  'classical-romantic': 42,
  'early-modern': 78,
  postwar: 637,
  'electronic-hiphop': 426,
  'global-digital': 531,
};

/** A story's events per era, oldest era first (the lid's gradient). */
export const eraCounts = (years: readonly number[]): [EraId, number][] => {
  const counts = new Map<EraId, number>();
  for (const y of years) {
    const id = eraOfYear(y).id;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return (Object.keys(ERA_TOTALS) as EraId[])
    .filter((id) => counts.has(id))
    .map((id) => [id, counts.get(id)!]);
};
