import { SongRoutes } from '@/constants/routes';
import { ConnectionsScene } from '../tour/scenes/ConnectionsScene';
import { CONNECTED_TOUR } from '../tour/tourSteps';
import { DemoSection, OpenLink } from './ModuleBlock';
import { appIcon } from './moduleIcons';

/** Learn, Studio and Globe — the three modules the demo runs through. */
const ICONS = (
  <span className="flex items-center gap-1.5">
    {appIcon('/icons/learn-icon.svg', 'size-7')}
    {appIcon('/icons/studio-icon.svg', 'size-7')}
    {appIcon('/icons/globe-icon.svg', 'size-7')}
  </span>
);

/**
 * "Connected", after the module sections: one song followed through Learn,
 * the Globe, the Studio and back to theory (`ConnectionsScene`). Laid out on
 * the module sections' grid — an empty rail continues the table of contents'
 * hairline — so the demo keeps their width and scale. Not in the table of
 * contents: it isn't a module.
 */
export const ConnectionsSection = () => (
  <div className="lg:grid lg:grid-cols-[200px_1fr]">
    <div
      aria-hidden
      className="hidden border-b border-r border-white/[0.08] lg:block"
    />
    <div className="min-w-0">
      <DemoSection
        id="connected"
        title={{ label: 'Connected', icon: ICONS }}
        statement={{
          lead: 'It all connects.',
          rest: 'Follow a song to the city it came from, play its chords in the Studio, and learn the sound behind them.',
        }}
        aside={
          <OpenLink path={SongRoutes.song({ songId: 'isnt_she_lovely' })} />
        }
        script={CONNECTED_TOUR}
        Scene={ConnectionsScene}
        bleed
      />
    </div>
  </div>
);
