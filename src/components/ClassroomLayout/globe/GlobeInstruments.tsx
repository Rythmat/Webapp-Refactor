import { Guitar } from 'lucide-react';
import { GlobeSectionHeader } from './GlobeSectionHeader';
import { GlobeTile } from './GlobeTile';
import { INSTRUMENT_FAMILIES, WORLD_INSTRUMENTS } from './data/instruments';

/**
 * Instruments tab — world instruments grouped by the Hornbostel–Sachs family
 * (Chordophones / Aerophones / Membranophones / Idiophones / Electrophones),
 * the standard ethnomusicological classification by sound-production.
 */
export const GlobeInstruments = () => (
  <section
    aria-label="Instruments of the World"
    className="flex flex-col gap-6 md:gap-8"
  >
    <div className="flex flex-col gap-2">
      <GlobeSectionHeader
        icon={<Guitar className="h-7 w-7 text-white/85 md:h-8 md:w-8" />}
        title="Instruments of the World"
      />
      <p className="text-sm text-white/60 md:text-base">
        Grouped by the Hornbostel–Sachs classification — how each instrument
        actually makes its sound.
      </p>
    </div>

    {INSTRUMENT_FAMILIES.map(({ family, blurb }) => {
      const items = WORLD_INSTRUMENTS.filter((i) => i.family === family);
      if (items.length === 0) return null;
      return (
        <div key={family} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-lg font-medium text-white">{family}</h3>
            <span className="text-sm text-white/50">{blurb}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
            {items.map((inst) => (
              <GlobeTile
                key={inst.id}
                title={inst.name}
                subtitle={inst.region}
                seed={`instrument:${inst.id}`}
              />
            ))}
          </div>
        </div>
      );
    })}
  </section>
);
