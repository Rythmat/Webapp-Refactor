import { Info } from 'lucide-react';
import { useId, useState } from 'react';
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

/** OpenStreetMap's copyright page, which its licence asks the credit to link. */
const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';

/**
 * The credit for a selected city's outline, which is © OpenStreetMap
 * contributors (ODbL), at the right of the bottom rail (on a phone, over the
 * map's bottom-right corner). It reads "© OpenStreetMap", linked, when the
 * map first appears, and folds up behind its ⓘ button at the viewer's first
 * press, scroll or key on the map (`mapTouched`), as MapLibre's own credit
 * does. The ⓘ opens and closes it after that, and the viewer's choice
 * stands. It has a place of its own (the bottom rail; AtlasZones on a
 * phone), so no panel, bar or sheet covers it.
 */
export function MapCredit() {
  const touched = useAtlasSelector((s) => s.mapTouched);
  // null until the viewer uses the ⓘ: open until the map is first touched.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? !touched;
  const id = useId();
  return (
    <div className="flex items-center gap-1 rounded-full bg-atlas-pill p-0.5 text-xs leading-5 text-atlas-pill-text [box-shadow:var(--daw-shadow-float)]">
      {open && (
        <p className="whitespace-nowrap pl-2" id={id}>
          ©{' '}
          <a
            className={LINK}
            href={OSM_COPYRIGHT}
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
        size="sm"
        variant="pill"
        title={open ? 'Hide the map credits' : 'Map data © OpenStreetMap'}
        onClick={() => setChosen(!open)}
      >
        <Info aria-hidden className="size-3.5" />
      </AtlasIconButton>
    </div>
  );
}
