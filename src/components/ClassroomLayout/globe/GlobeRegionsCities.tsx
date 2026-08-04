import { ArrowRight, MapPinned } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  REGIONS,
  cityTourId,
  getTour,
  regionTourId,
} from '@/components/atlas/data';
import { AtlasRoutes } from '@/constants/routes';
import { GlobeSectionHeader } from './GlobeSectionHeader';
import { GlobeTile } from './GlobeTile';
import {
  CityPolygonThumb,
  useCountryFeatures,
  useStateFeatures,
} from './RegionPolygonThumb';
import { regionCities } from './data/regionCities';
import { REGION_HINTS } from './data/regionHints';

/**
 * "Regions & Cities" tab — one section per region listing that region's curated
 * music cities. (The Regions Marquee now leads the Globe home page instead.)
 */
export const GlobeRegionsCities = () => {
  const navigate = useNavigate();
  // Country + admin-1 state polygons for the city cap thumbnails (loaded once,
  // shared by every city tile).
  const countries = useCountryFeatures();
  const states = useStateFeatures();

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      {/* ── One section per region, with its cities ─────────────────────── */}
      {REGIONS.map((region) => {
        const cities = regionCities(region.id);
        if (cities.length === 0) return null;
        return (
          <section
            key={region.id}
            aria-label={`${region.label} music cities`}
            className="flex flex-col gap-4 md:gap-5"
          >
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <GlobeSectionHeader
                  icon={
                    <MapPinned className="h-7 w-7 text-white/85 md:h-8 md:w-8" />
                  }
                  title={region.label}
                />
                <Link
                  to={AtlasRoutes.globe(undefined, {
                    tour: regionTourId(region.id),
                  })}
                  aria-label={`Tour ${region.label} on the globe`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]/50 md:text-base"
                >
                  <span>Explore region</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="text-sm text-white/60">{REGION_HINTS[region.id]}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {cities.map((city) => {
                const tourId = cityTourId(city.id);
                const hasTour = Boolean(getTour(tourId));
                return (
                  <GlobeTile
                    key={city.id}
                    title={city.name}
                    subtitle={city.genres.slice(0, 3).join(' · ')}
                    seed={`city:${city.id}`}
                    art={
                      <CityPolygonThumb
                        countries={countries}
                        states={states}
                        center={city.coordinates}
                      />
                    }
                    onClick={() =>
                      navigate(
                        hasTour
                          ? AtlasRoutes.globe(undefined, { tour: tourId })
                          : AtlasRoutes.globe(),
                      )
                    }
                    ariaLabel={
                      hasTour
                        ? `Tour ${city.name} on the globe`
                        : `Explore ${city.name} on the globe`
                    }
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
