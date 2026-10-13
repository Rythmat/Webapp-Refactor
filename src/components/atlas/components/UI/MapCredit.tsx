import { MAP_CREDIT } from '@/components/atlas/components/Globe/basemapConfig';
import { ATLAS_FOCUS } from '@/components/atlas/components/UI/primitives';
import { cn } from '@/lib/utils';

const LINK = cn(
  'rounded-sm underline-offset-2 hover:text-atlas-text hover:underline',
  ATLAS_FOCUS,
);

/**
 * The street map's credit: its data is © OpenStreetMap contributors (ODbL),
 * whose licence asks for the credit to stay visible on the map, drawn as
 * Protomaps' tiles. The page places it in a zone of its own (AtlasZones), so
 * no panel, bar or sheet ever covers it, and never folds it into an icon.
 * Shown only when there is a street map (HAS_STREET_MAP).
 */
export function MapCredit() {
  return (
    <p className="rounded-full border border-atlas-panel-border bg-atlas-panel/95 px-2.5 py-0.5 text-xs leading-5 text-atlas-text-2 shadow-2xl">
      <a
        className={LINK}
        href={MAP_CREDIT.protomaps}
        rel="noopener noreferrer"
        target="_blank"
      >
        Protomaps
      </a>{' '}
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
  );
}
