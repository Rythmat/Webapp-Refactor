import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { REGIONS, regionTourId } from '@/components/atlas/data';
import { AtlasRoutes } from '@/constants/routes';
import { GlobeTile } from './GlobeTile';
import { RegionPolygonThumb, useCountryFeatures } from './RegionPolygonThumb';
import { REGION_HINTS } from './data/regionHints';
import './regions-marquee.css';

/**
 * A drifting horizontal strip of all 18 world regions — each card opens that
 * region's globe tour. Card size matches the Regions & Cities grid tiles
 * (measured off the content container). Used by the Globe home page's
 * "Regions & Cities" shelf.
 */
export const RegionsMarquee = () => {
  const navigate = useNavigate();
  // Loaded once and shared by every thumbnail (see RegionPolygonThumb).
  const countries = useCountryFeatures();

  // Size the marquee cards to match the Regions & Cities grid tiles (grid-cols-2
  // / md:grid-cols-4). Measured off the content container so it tracks the real
  // available width (sidebar-safe) and the breakpoint's column count + gap.
  const contentRef = useRef<HTMLDivElement>(null);
  const [tileWidth, setTileWidth] = useState<number>();
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => {
      const isMd = window.matchMedia('(min-width: 768px)').matches;
      const cols = isMd ? 4 : 2;
      const gap = isMd ? 20 : 16; // matches md:gap-5 / gap-4
      setTileWidth((el.clientWidth - gap * (cols - 1)) / cols);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goToRegion = (regionId: string) =>
    navigate(AtlasRoutes.globe(undefined, { tour: regionTourId(regionId) }));

  // Cards doubled for the seamless marquee loop — see regions-marquee.css.
  const marqueeRegions = [...REGIONS, ...REGIONS];

  return (
    <div ref={contentRef}>
      <div className="regions-marquee -mx-6 overflow-hidden md:-mx-10">
        <div className="regions-marquee-track flex w-max gap-4 px-6 md:gap-5 md:px-10">
          {marqueeRegions.map((region, i) => (
            <div
              key={i}
              // GlobeTile is a <button> that shrink-fits in a flex row, so force
              // it to fill a wrapper sized to the measured grid tile width.
              className="flex-shrink-0 [&>button]:w-full"
              style={{ width: tileWidth }}
            >
              <GlobeTile
                title={region.label}
                subtitle={REGION_HINTS[region.id]}
                seed={`region:${region.id}`}
                onClick={() => goToRegion(region.id)}
                ariaLabel={`Tour ${region.label} on the globe`}
                art={
                  <RegionPolygonThumb
                    features={countries}
                    center={region.center}
                    zoom={region.zoom}
                  />
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
