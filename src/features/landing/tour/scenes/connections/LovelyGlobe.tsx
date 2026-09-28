import {
  GlobeCdn,
  type GlobeArc,
  type GlobeMarker,
} from '@/components/ui/cobe-globe-cdn';
import { DETROIT, FLIGHT_FROM, INFLUENCES } from './connectionsData';
import { FLIGHT_MS } from './connectionsScript';

// Neutral markers/arcs (cobe RGB 0–1): color here would read as a key center.
const GREY: [number, number, number] = [0.8, 0.8, 0.82];
const LIGHT: [number, number, number] = [1, 1, 1];

const at = (i: number): [number, number] => [
  INFLUENCES[i].location.lat,
  INFLUENCES[i].location.lng,
];
const LOS_ANGELES = at(1);

const MARKERS: GlobeMarker[] = [
  // A page-unique id: cobe's label anchors are global CSS names.
  {
    id: 'connected-detroit',
    location: DETROIT,
    label: 'Detroit',
    color: LIGHT,
    size: 0.06,
  },
  { location: LOS_ANGELES, label: '', color: GREY, size: 0.035 },
];

/** The Globe's influence arc into Detroit (Superstition is Detroit's own). */
const ARCS: GlobeArc[] = [{ from: LOS_ANGELES, to: DETROIT, color: GREY }];
const NO_ARCS: GlobeArc[] = [];

/**
 * The "Connected" demo's globe (lazy chunk — pulls in cobe): what "Open in
 * Globe" does for a song — it flies to the song's city, Detroit, and draws
 * the influences in. `still` (reduced motion) jumps there and holds.
 */
const LovelyGlobe = ({
  focused,
  arcs,
  paused,
  still,
}: {
  focused: boolean;
  arcs: boolean;
  paused: boolean;
  still: boolean;
}) => (
  <GlobeCdn
    markers={MARKERS}
    arcs={arcs ? ARCS : NO_ARCS}
    arcHeight={0.3}
    arcAnimationMs={1400}
    speed={still ? 0 : 0.0025}
    paused={paused}
    focus={focused ? DETROIT : null}
    focusFrom={FLIGHT_FROM}
    focusMs={still ? 0 : FLIGHT_MS}
  />
);

export default LovelyGlobe;
