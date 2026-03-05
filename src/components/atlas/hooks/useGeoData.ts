import type { FeatureCollection, Feature, MultiPolygon } from 'geojson';
import { useState, useEffect } from 'react';
import { GEOJSON_URLS } from '@/components/atlas/data';

// Natural Earth 50m draws Michigan as a single polygon (connecting the two
// peninsulas across the Straits of Mackinac). Replace with a correct
// MultiPolygon sourced from US Census cartographic boundaries.
const MICHIGAN_GEOMETRY: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [-83.454, 41.732],
        [-84.807, 41.694],
        [-84.807, 41.76],
        [-85.99, 41.76],
        [-86.823, 41.76],
        [-86.62, 41.891],
        [-86.483, 42.116],
        [-86.357, 42.253],
        [-86.264, 42.444],
        [-86.209, 42.718],
        [-86.231, 43.014],
        [-86.527, 43.594],
        [-86.434, 43.814],
        [-86.499, 44.076],
        [-86.269, 44.345],
        [-86.22, 44.569],
        [-86.253, 44.69],
        [-86.089, 44.739],
        [-86.067, 44.903],
        [-85.809, 44.947],
        [-85.612, 45.128],
        [-85.629, 44.767],
        [-85.525, 44.75],
        [-85.393, 44.931],
        [-85.388, 45.238],
        [-85.305, 45.314],
        [-85.032, 45.364],
        [-85.119, 45.577],
        [-84.938, 45.758],
        [-84.714, 45.769],
        [-84.462, 45.654],
        [-84.216, 45.637],
        [-84.095, 45.495],
        [-83.909, 45.484],
        [-83.597, 45.353],
        [-83.487, 45.358],
        [-83.317, 45.144],
        [-83.454, 45.029],
        [-83.323, 44.882],
        [-83.273, 44.712],
        [-83.334, 44.339],
        [-83.536, 44.246],
        [-83.586, 44.055],
        [-83.827, 43.989],
        [-83.958, 43.759],
        [-83.909, 43.671],
        [-83.668, 43.589],
        [-83.482, 43.715],
        [-83.263, 43.972],
        [-82.917, 44.071],
        [-82.748, 43.994],
        [-82.644, 43.852],
        [-82.54, 43.436],
        [-82.523, 43.228],
        [-82.414, 42.976],
        [-82.518, 42.614],
        [-82.682, 42.559],
        [-82.687, 42.691],
        [-82.797, 42.652],
        [-82.923, 42.351],
        [-83.126, 42.236],
        [-83.186, 42.006],
        [-83.438, 41.814],
        [-83.454, 41.732],
      ],
    ],
    [
      [
        [-85.508, 45.731],
        [-85.492, 45.61],
        [-85.623, 45.588],
        [-85.568, 45.758],
        [-85.508, 45.731],
      ],
    ],
    [
      [
        [-87.589, 45.095],
        [-87.743, 45.199],
        [-87.65, 45.342],
        [-87.885, 45.364],
        [-87.792, 45.5],
        [-87.781, 45.676],
        [-87.989, 45.796],
        [-88.104, 45.922],
        [-88.531, 46.021],
        [-88.663, 45.988],
        [-89.09, 46.136],
        [-90.12, 46.338],
        [-90.229, 46.508],
        [-90.415, 46.568],
        [-90.027, 46.673],
        [-89.851, 46.793],
        [-89.413, 46.842],
        [-89.128, 46.99],
        [-88.997, 46.996],
        [-88.887, 47.1],
        [-88.575, 47.248],
        [-88.416, 47.374],
        [-88.181, 47.456],
        [-87.956, 47.385],
        [-88.351, 47.078],
        [-88.444, 46.974],
        [-88.438, 46.788],
        [-88.247, 46.93],
        [-87.902, 46.908],
        [-87.633, 46.809],
        [-87.392, 46.536],
        [-87.261, 46.486],
        [-87.009, 46.53],
        [-86.949, 46.47],
        [-86.697, 46.437],
        [-86.16, 46.667],
        [-85.881, 46.689],
        [-85.508, 46.678],
        [-85.256, 46.755],
        [-85.064, 46.76],
        [-85.026, 46.481],
        [-84.829, 46.443],
        [-84.632, 46.486],
        [-84.55, 46.421],
        [-84.418, 46.503],
        [-84.128, 46.53],
        [-84.122, 46.18],
        [-83.991, 46.032],
        [-83.794, 45.993],
        [-83.772, 46.092],
        [-83.58, 46.092],
        [-83.476, 45.988],
        [-83.564, 45.911],
        [-84.111, 45.977],
        [-84.374, 45.933],
        [-84.659, 46.054],
        [-84.741, 45.944],
        [-84.703, 45.851],
        [-84.829, 45.873],
        [-85.015, 46.01],
        [-85.338, 46.092],
        [-85.503, 46.097],
        [-85.661, 45.966],
        [-85.924, 45.933],
        [-86.209, 45.961],
        [-86.324, 45.906],
        [-86.352, 45.796],
        [-86.664, 45.703],
        [-86.647, 45.835],
        [-86.784, 45.862],
        [-86.839, 45.725],
        [-87.069, 45.72],
        [-87.173, 45.659],
        [-87.326, 45.424],
        [-87.611, 45.123],
        [-87.589, 45.095],
      ],
    ],
    [
      [
        [-88.805, 47.976],
        [-89.057, 47.85],
        [-89.189, 47.834],
        [-89.178, 47.938],
        [-88.548, 48.173],
        [-88.668, 48.009],
        [-88.805, 47.976],
      ],
    ],
  ],
};

function fixMichigan(features: Feature[]): Feature[] {
  return features.map((f) => {
    if (f.properties?.name === 'Michigan' && f.properties?.iso_a2 === 'US') {
      return { ...f, geometry: MICHIGAN_GEOMETRY };
    }
    return f;
  });
}

// Natural Earth bundles French Guiana into France's MultiPolygon.
// Split it out as its own feature so it renders with South American colors.
function splitFrenchGuiana(features: Feature[]): Feature[] {
  const result: Feature[] = [];
  for (const f of features) {
    const adm = f.properties?.ADM0_A3;
    if (adm === 'FRA' && f.geometry.type === 'MultiPolygon') {
      const metro: number[][][][] = [];
      const guf: number[][][][] = [];
      for (const poly of (f.geometry as MultiPolygon).coordinates) {
        // French Guiana centroid is ~3.5°N, -53°W — any polygon west of -50° is GUF
        const avgLng = poly[0].reduce((s, c) => s + c[0], 0) / poly[0].length;
        if (avgLng < -50) guf.push(poly);
        else metro.push(poly);
      }
      if (guf.length > 0 && metro.length > 0) {
        // Metropolitan France (keep original properties)
        result.push({
          ...f,
          geometry: { type: 'MultiPolygon', coordinates: metro },
        });
        // French Guiana as its own feature
        result.push({
          type: 'Feature',
          properties: {
            ...f.properties,
            NAME: 'French Guiana',
            ADMIN: 'French Guiana',
            ISO_A3: 'GUF',
            ISO_A3_EH: 'GUF',
            ADM0_A3: 'GUF',
          },
          geometry: { type: 'MultiPolygon', coordinates: guf },
        });
        continue;
      }
    }
    result.push(f);
  }
  return result;
}

interface GeoData {
  countries: FeatureCollection | null;
  adminRegions: FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

export function useGeoData(): GeoData {
  const [countries, setCountries] = useState<FeatureCollection | null>(null);
  const [adminRegions, setAdminRegions] = useState<FeatureCollection | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetch(GEOJSON_URLS.countries, { signal: controller.signal }).then((r) =>
        r.json(),
      ),
      fetch(GEOJSON_URLS.admin1, { signal: controller.signal }).then((r) =>
        r.json(),
      ),
    ])
      .then(([countriesData, admin1Data]) => {
        const raw = countriesData as FeatureCollection;
        setCountries({
          ...raw,
          features: splitFrenchGuiana(raw.features),
        });

        // Filter admin-1 features to US states + Canadian provinces
        const allAdmin1 = admin1Data as FeatureCollection;
        const filtered: FeatureCollection = {
          type: 'FeatureCollection',
          features: fixMichigan(
            allAdmin1.features.filter(
              (f) =>
                f.properties?.iso_a2 === 'US' || f.properties?.iso_a2 === 'CA',
            ),
          ),
        };
        setAdminRegions(filtered);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  return { countries, adminRegions, loading, error };
}
