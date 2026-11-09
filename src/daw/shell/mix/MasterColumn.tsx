import { useRef } from 'react';
import { cn } from '@/components/utilities';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { InsertList } from './InsertList';
import { MasterBypass } from './master/MasterBypass';
import { MasterVolumePill } from './master/MasterGainFader';
import { MIX_STRIP_PX, STRIP_ROWS } from './MixStrip';
import { allMuted, toggleMuteAll } from './muteAll';
import { openRack } from './rackTarget';
import { useFaderLength } from './useFaderLength';

// ── The Mix view's Master strip (milestone 2.10; a strip, 2026-10-21) ──────
//
// Pinned at the right, after Send A and B, and built as a strip (owner,
// 2026-10-21): 96 px, under a neutral edge its name (a click opens the
// master rack in the RackDock), its mastering chain (the effects' names
// with their power dots), Bypass and Mute All where a track has its knobs
// and Mute and Solo, then its volume pill over the mix's level, at the
// tracks' height. The spectrum and the separate peak meter are gone: the
// pill draws the level, as a track's does.

/** The value's line under the volume pill. */
const VALUE_PX = 16;

export function MasterColumn() {
  const open = useStore((s) => s.mixRack?.kind === 'master');
  const box = useRef<HTMLDivElement>(null);
  const length = useFaderLength(box, { reserve: VALUE_PX + 8 });
  const show = () => openRack({ kind: 'master' });

  return (
    <aside
      data-testid="master-column"
      data-tutorial-id="master-strip"
      aria-label="Master"
      className={cn(
        'flex min-h-fit shrink-0 flex-col',
        open ? 'bg-daw-selected' : 'bg-daw-surface-1',
        TRANSITION,
      )}
      style={{ width: MIX_STRIP_PX }}
    >
      <div
        className="flex shrink-0 flex-col"
        style={{ height: STRIP_ROWS.header }}
      >
        <span aria-hidden className="h-1 shrink-0 bg-daw-outline" />
        <button
          type="button"
          aria-expanded={open}
          aria-label="Master: show its mastering effects"
          data-hint={hintText('Master', 'Show the mastering effects')}
          data-testid="master-strip-name"
          onClick={show}
          className={cn(
            TYPE_CLASS.label,
            'mx-1 mt-0.5 h-6 truncate rounded-[var(--daw-radius-sm)] px-1 text-left font-bold text-daw-text hover:bg-daw-hover',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          Master
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-1 pb-2 pt-1">
        <section
          data-tutorial-id="mastering-section"
          aria-label="Mastering"
          className="flex min-h-0 flex-col"
        >
          {/* The R&B lesson's way back to the master's rack when it is shut. */}
          <div data-tutorial-id="mastering-chain">
            <InsertList target={{ kind: 'master' }} owner="Master" />
          </div>
        </section>
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ height: STRIP_ROWS.knobs }}
        >
          <MasterBypass testId="master-bypass" />
        </div>
        <div
          className="flex shrink-0 items-center justify-center"
          style={{ height: STRIP_ROWS.toggles }}
        >
          <MuteAll />
        </div>
        <div
          ref={box}
          data-testid="master-strip-fader"
          className="flex min-h-[100px] flex-1 flex-col items-center overflow-hidden pt-1"
        >
          <MasterVolumePill length={length} valueHeight={VALUE_PX} />
        </div>
      </div>
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
