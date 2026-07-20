import { useMemo, useState } from 'react';
import { GlobeTile } from '@/components/ClassroomLayout/globe/GlobeTile';
import {
  SCALE_TRADITIONS,
  WORLD_SCALES,
  type ScaleTradition,
} from '@/components/ClassroomLayout/globe/data/scales';
import {
  FilterDropdown,
  type FilterOption,
} from '@/components/songLibrary/FilterDropdown';
import { SearchInput } from '@/components/songLibrary/SearchInput';

type TraditionFilter = ScaleTradition | 'all';

const TRADITION_OPTIONS: FilterOption<TraditionFilter>[] = [
  { value: 'all', label: 'All Traditions' },
  ...SCALE_TRADITIONS.map(({ tradition }) => ({
    value: tradition,
    label: tradition,
  })),
];

// Regions are derived from the data so the filter stays in sync with the scales.
const REGION_OPTIONS: FilterOption<string>[] = [
  { value: 'all', label: 'All Regions' },
  ...Array.from(new Set(WORLD_SCALES.map((s) => s.region))).map((region) => ({
    value: region,
    label: region,
  })),
];

/**
 * World Harmony tab (Learn) — the melodic systems of the world grouped by
 * tradition (Maqam, Raga, Gamelan, Pentatonic, Western Modes, …). A sticky
 * filter row (Tradition · Region · Search) mirrors the other Learn tabs.
 */
export const WorldHarmony = () => {
  const [tradition, setTradition] = useState<TraditionFilter>('all');
  const [region, setRegion] = useState<string>('all');
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SCALE_TRADITIONS.filter(
      (t) => tradition === 'all' || t.tradition === tradition,
    )
      .map((t) => ({
        ...t,
        items: WORLD_SCALES.filter(
          (s) =>
            s.tradition === t.tradition &&
            (region === 'all' || s.region === region) &&
            (!q ||
              s.name.toLowerCase().includes(q) ||
              s.character.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [tradition, region, search]);

  return (
    <>
      {/* Sticky filter row — mirrors the Genre/Theory/Technique tabs. */}
      <div
        className="sticky top-0 z-10 pt-1 pb-3"
        style={{ background: '#101012' }}
      >
        <div
          className="flex flex-wrap items-center"
          style={{ gap: 10, marginBottom: 16 }}
        >
          <FilterDropdown
            label="Tradition"
            value={tradition}
            options={TRADITION_OPTIONS}
            onChange={setTradition}
          />
          <FilterDropdown
            label="Region"
            value={region}
            options={REGION_OPTIONS}
            onChange={setRegion}
          />
          <SearchInput
            value={search}
            onChange={setSearch}
            onClear={() => setSearch('')}
            placeholder="Search scales"
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 md:gap-8">
        {groups.map(({ tradition: name, blurb, items }) => (
          <div key={name} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="text-lg font-medium text-white">{name}</h3>
              <span className="text-sm text-white/50">{blurb}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {items.map((scale) => (
                <GlobeTile
                  key={scale.id}
                  title={scale.name}
                  subtitle={scale.character}
                  seed={`scale:${scale.id}`}
                />
              ))}
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <p className="text-sm text-white/50">
            No scales match these filters.
          </p>
        )}
      </div>
    </>
  );
};
