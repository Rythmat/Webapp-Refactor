import { ArrowRight, Clock, Globe, Guitar } from 'lucide-react';
import { type FC, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HISTORICAL_MODULES, MUSICAL_ERAS } from '@/components/atlas/data';
import { GlobeSectionHeader } from './GlobeSectionHeader';
import { GlobeTile } from './GlobeTile';
import { RegionsMarquee } from './RegionsMarquee';
import { WORLD_INSTRUMENTS } from './data/instruments';

const Divider = () => (
  <hr className="border-0 border-t border-white/15" role="separator" />
);

const PreviewHeader: FC<{
  icon: ReactNode;
  title: string;
  viewAllLabel: string;
  to: string;
}> = ({ icon, title, viewAllLabel, to }) => (
  <div className="flex items-center justify-between gap-4">
    <GlobeSectionHeader icon={icon} title={title} />
    <Link
      to={to}
      className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white md:text-base"
    >
      <span>{viewAllLabel}</span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  </div>
);

const PreviewShelf: FC<{
  icon: ReactNode;
  title: string;
  viewAllLabel: string;
  to: string;
  children: ReactNode;
}> = ({ icon, title, viewAllLabel, to, children }) => (
  <section aria-label={title} className="flex flex-col gap-4 md:gap-5">
    <PreviewHeader
      icon={icon}
      title={title}
      viewAllLabel={viewAllLabel}
      to={to}
    />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
      {children}
    </div>
  </section>
);

/**
 * Globe home preview shelves — one per non-Explore tab (Regions & Cities /
 * Pathways / Eras / Instruments). Each teases a few of the tab's items; its
 * "View all" pill (and every tile) opens the full tab. Mirrors the Studio
 * dashboard's home preview shelves. Regions & Cities uses the drifting
 * Regions Marquee instead of a static grid.
 */
export const GlobeHomePreviews = () => {
  const navigate = useNavigate();
  // Tiles open the tab, matching the header pill (quick navigation).
  const openTab = (slug: string) => () => navigate(`?tab=${slug}`);

  return (
    <>
      <section
        aria-label="Regions & Cities"
        className="flex flex-col gap-4 md:gap-5"
      >
        <PreviewHeader
          icon={<Globe className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
          title="Regions & Cities"
          viewAllLabel="View Regions & Cities"
          to="?tab=Regions"
        />
        <RegionsMarquee />
      </section>

      <Divider />

      <PreviewShelf
        icon={
          <img
            src="/icons/pathways-icon.svg"
            alt=""
            draggable={false}
            className="h-8 w-8 md:h-10 md:w-10"
          />
        }
        title="Pathways"
        viewAllLabel="View Pathways"
        to="?tab=Pathways"
      >
        {HISTORICAL_MODULES.slice(0, 4).map((mod) => (
          <GlobeTile
            key={mod.id}
            title={mod.title}
            subtitle={mod.description}
            seed={`pathway:${mod.id}`}
            onClick={openTab('Pathways')}
            ariaLabel={`Open ${mod.title} in Pathways`}
          />
        ))}
      </PreviewShelf>

      <Divider />

      <PreviewShelf
        icon={<Clock className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
        title="Eras"
        viewAllLabel="View Eras"
        to="?tab=Eras"
      >
        {MUSICAL_ERAS.slice(0, 4).map((era) => (
          <GlobeTile
            key={era.id}
            title={era.label}
            subtitle={`${era.yearStart}–${era.yearEnd}`}
            seed={`era:${era.id}`}
            onClick={openTab('Eras')}
            ariaLabel={`Open ${era.label} in Eras`}
          />
        ))}
      </PreviewShelf>

      <Divider />

      <PreviewShelf
        icon={<Guitar className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
        title="Instruments"
        viewAllLabel="View Instruments"
        to="?tab=Instruments"
      >
        {WORLD_INSTRUMENTS.slice(0, 4).map((inst) => (
          <GlobeTile
            key={inst.id}
            title={inst.name}
            subtitle={inst.region}
            seed={`instrument:${inst.id}`}
            onClick={openTab('Instruments')}
            ariaLabel={`Open ${inst.name} in Instruments`}
          />
        ))}
      </PreviewShelf>
    </>
  );
};
