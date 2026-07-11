import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MUSICAL_ERAS } from '@/components/atlas/data';
import { AtlasRoutes } from '@/constants/routes';
import { GlobeSectionHeader } from './GlobeSectionHeader';

// Each era card deep-links to the Main Globe with that era's filter applied.
const eraHref = (id: string) => `${AtlasRoutes.globe()}?era=${id}`;

const CARD_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7ecfcf]/50';

/**
 * Eras tab — a launcher for the globe's musical timeline. The 7 `MUSICAL_ERAS`
 * are ordered chronologically; clicking one opens the Main Globe at
 * `/atlas/globe?era=<id>`, where the region timeline is filtered to that era's
 * year range. (Re-homes the era filter that used to live on the globe.)
 */
export const GlobeEras = () => (
  <section aria-label="Musical Eras" className="flex flex-col gap-4 md:gap-6">
    <div className="flex flex-col gap-2">
      <GlobeSectionHeader
        icon={<Clock className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
        title="Musical Eras"
      />
      <p className="text-sm text-white/60 md:text-base">
        Move through music history one age at a time. Pick an era to explore its
        events on the globe.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {MUSICAL_ERAS.map((era) => (
        <Link
          key={era.id}
          to={eraHref(era.id)}
          aria-label={`Explore the ${era.label} era on the globe`}
          className={`group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.05] ${CARD_FOCUS}`}
        >
          <span
            className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${era.activeBg} ${era.activeText} ${era.activeBorder}`}
          >
            {era.yearStart}–{era.yearEnd}
          </span>
          <h3 className="mt-3 text-lg font-medium text-white">{era.label}</h3>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#7ecfcf]">
            Explore on the globe
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </Link>
      ))}
    </div>
  </section>
);
