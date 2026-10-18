import { useRef } from 'react';
import { cn } from '@/components/utilities';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { InsertList } from './InsertList';
import { MasterBypass } from './master/MasterBypass';
import { MasterGainFader } from './master/MasterGainFader';
import { MasterOutputMeter } from './master/MasterOutputMeter';
import { Spectrum } from './master/Spectrum';
import { allMuted, toggleMuteAll } from './muteAll';
import { MIN_FADER_PX, useFaderLength } from './useFaderLength';

// ── The Mix view's master column (milestone 2.10) ──────────────────────────
//
// 240 px, pinned at the right of the strips. At the top, the master's gain
// beside its output peak (the same parts as the dock's Master), filling
// what the column has left; then Bypass and Mute All; then Mastering: the
// master chain's names with their power dots (a click opens the master
// rack in the RackDock) and the spectrum of the output. Gain Match stays
// hidden until it does something.

export const MASTER_COLUMN_PX = 240;

/** The value and caption lines under the fader and the meter. */
const UNDER_PX = 36;
/** The micro heading's line. */
const HEADING_PX = 14;

export function MasterColumn({ isReady }: { isReady: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const length = useFaderLength(box, { reserve: UNDER_PX });

  return (
    <aside
      data-testid="master-column"
      aria-label="Master"
      className="flex min-h-0 shrink-0 flex-col gap-2 overflow-y-auto border-l border-daw-hairline bg-daw-surface-1 px-3 pb-3 pt-2"
      style={{ width: MASTER_COLUMN_PX }}
    >
      <div
        data-tutorial-id="master-strip"
        className="flex flex-1 flex-col gap-1"
        // Never shorter than its heading and the shortest fader with its
        // value: a short window scrolls the column instead of cutting Peak.
        style={{ minHeight: HEADING_PX + 4 + MIN_FADER_PX + UNDER_PX }}
      >
        <h3 className={cn(TYPE_CLASS.micro, 'shrink-0 text-daw-text-3')}>
          Master
        </h3>
        <div
          ref={box}
          className="flex min-h-0 flex-1 items-start justify-center gap-4 overflow-hidden"
        >
          <MasterGainFader length={length} />
          <MasterOutputMeter length={length} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <MasterBypass testId="master-bypass" />
        <MuteAll />
      </div>

      <section
        data-tutorial-id="mastering-section"
        aria-label="Mastering"
        className="flex shrink-0 flex-col gap-1 border-t border-daw-hairline pt-2"
      >
        <h3 className={cn(TYPE_CLASS.micro, 'text-daw-text-3')}>Mastering</h3>
        <InsertList target={{ kind: 'master' }} owner="Master" />
        <Spectrum isReady={isReady} />
      </section>
    </aside>
  );
}

/** Mutes every track, and again unmutes the ones it muted (muteAll.ts). */
function MuteAll() {
  const pressed = useStore((s) => allMuted(s.tracks));
  const none = useStore((s) => s.tracks.length === 0);
  return (
    <Toggle
      label="Mute all tracks"
      size="sm"
      pressed={pressed}
      disabled={none}
      onPressedChange={toggleMuteAll}
      data-hint={hintText(
        'Mute all tracks',
        'Silence every track; press again to bring them back',
      )}
      data-testid="mute-all"
    >
      Mute All
    </Toggle>
  );
}
