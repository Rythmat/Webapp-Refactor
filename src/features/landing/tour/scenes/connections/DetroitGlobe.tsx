import { EraRail } from '../globe/GlobeChrome';
import { MiniGlobe } from '../globe/MiniGlobe';
import { DETROIT_STORY } from '../globe/globeData';
import { FLIGHT_MS } from './connectionsScript';

/**
 * The "Connected" demo's Globe (lazy chunk — carries the map art): what
 * "Open in Globe" does for a song — it flies to the song's city, Detroit,
 * lifts Michigan and draws in where its music came from (Los Angeles, the
 * strongest link in). `still` (reduced motion) jumps there and holds.
 */
const DetroitGlobe = ({
  focused,
  arcs,
  paused,
  still,
  rail,
}: {
  focused: boolean;
  arcs: boolean;
  paused: boolean;
  still: boolean;
  /** The era rail at the foot (not on phones' short strip). */
  rail: boolean;
}) => (
  <MiniGlobe
    story={DETROIT_STORY}
    focused={focused}
    links={arcs}
    still={still}
    paused={paused}
    flightMs={FLIGHT_MS}
    zoom={4}
    focusAt={[0.5, 0.56]}
  >
    {rail && <EraRail story={focused ? DETROIT_STORY : null} still={still} />}
  </MiniGlobe>
);

export default DetroitGlobe;
