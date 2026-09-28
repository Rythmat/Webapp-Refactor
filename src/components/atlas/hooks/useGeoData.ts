import type { FeatureCollection } from 'geojson';
import { useState, useEffect } from 'react';
import {
  loadAdmin1UsCa,
  loadCountries,
} from '@/components/atlas/data/geoLoader';

/**
 * Country and admin-1 polygons for a globe.
 *
 * The fetching, the Michigan fix and the French Guiana split all moved to
 * `data/geoLoader.ts`, which memoises both files at module scope — this hook is
 * now just the React binding, so two globes mounted at once share one download
 * rather than racing for the same 3 MB.
 *
 * The two files resolve independently: `countries` appears as soon as it lands
 * instead of waiting on the much larger admin-1 file, so land is drawn ~1s
 * sooner on a cold load.
 */

interface GeoData {
  countries: FeatureCollection | null;
  adminRegions: FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

interface Options {
  /** Skip the admin-1 (US/CA states) download — for globes that never show states. */
  countriesOnly?: boolean;
}

const collection = (
  features: FeatureCollection['features'],
): FeatureCollection => ({
  type: 'FeatureCollection',
  features,
});

export function useGeoData({ countriesOnly = false }: Options = {}): GeoData {
  const [countries, setCountries] = useState<FeatureCollection | null>(null);
  const [adminRegions, setAdminRegions] = useState<FeatureCollection | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    loadCountries()
      .then((features) => {
        if (!alive) return;
        setCountries(collection(features));
        setLoading(false);
      })
      .catch((err: Error) => {
        if (alive) {
          setError(err.message);
          setLoading(false);
        }
      });

    if (!countriesOnly) {
      loadAdmin1UsCa()
        .then((features) => {
          if (alive) setAdminRegions(collection(features));
        })
        // States are an enhancement below altitude 2.2; losing them must not
        // take the globe down with them.
        .catch(() => undefined);
    }

    return () => {
      alive = false;
    };
  }, [countriesOnly]);

  return { countries, adminRegions, loading, error };
}
