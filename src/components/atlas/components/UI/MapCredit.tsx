import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import {
  HAS_STREET_MAP,
  MAP_CREDIT,
} from '@/components/atlas/components/Globe/basemapConfig';
import {
  ATLAS_FOCUS,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { cn } from '@/lib/utils';

const LINK = cn(
  'rounded-sm underline-offset-2 hover:text-atlas-text hover:underline',
  ATLAS_FOCUS,
);

/**
 * The street map's credit, in the map's bottom-right corner: its data is
 * © OpenStreetMap contributors (ODbL), drawn as Protomaps' tiles. It reads
 * "Protomaps © OpenStreetMap", with a link to each, when the map first
 * appears, and folds up behind its ⓘ button at the viewer's first press,
 * scroll or key on the map (`mapTouched`), as MapLibre's own credit does.
 * The ⓘ opens and closes it after that, and the viewer's choice stands. The
 * page places it in a zone of its own (AtlasZones), so no panel, bar or
 * sheet covers it. Shown whenever the map draws OpenStreetMap's data
 * (SHOWS_OSM_DATA): the street map, or a city's outline. Without the street
 * map it reads "© OpenStreetMap" alone.
 */
export function MapCredit({
  streetMap = HAS_STREET_MAP,
}: {
  /** Whether Protomaps' street map is drawn, so is credited too. */
  streetMap?: boolean;
}) {
  const touched = useAtlasSelector((s) => s.mapTouched);
  // null until the viewer uses the ⓘ: open until the map is first touched.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? !touched;
  const id = useId();
  return (
    <div className="flex items-center gap-1 rounded-full border border-atlas-panel-border bg-atlas-panel/95 p-0.5 text-xs leading-5 text-atlas-text-2 shadow-2xl">
      {open && (
        <p className="whitespace-nowrap pl-2" id={id}>
          {streetMap && (
            <>
              <a
                className={LINK}
                href={MAP_CREDIT.protomaps}
                rel="noopener noreferrer"
                target="_blank"
              >
                Protomaps
              </a>{' '}
            </>
          )}
          ©{' '}
          <a
            className={LINK}
            href={MAP_CREDIT.openStreetMap}
            rel="noopener noreferrer"
            target="_blank"
          >
            OpenStreetMap
          </a>
        </p>
      )}
      <AtlasIconButton
        aria-controls={open ? id : undefined}
        aria-expanded={open}
        aria-label="Map credits"
        size="xs"
        title={open ? 'Hide the map credits' : 'Map data © OpenStreetMap'}
        onClick={() => setChosen(!open)}
      >
        <Info aria-hidden className="size-3.5" />
      </AtlasIconButton>
    </div>
  );
}
