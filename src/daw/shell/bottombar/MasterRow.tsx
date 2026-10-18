import { Activity, ChevronUp, Ear, Headphones } from 'lucide-react';
import { memo, useRef } from 'react';
import { cn } from '@/components/utilities';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import {
  useListenMode,
  useStudioListenStore,
} from '@/daw/collab/studioListenStore';
import { meterSource } from '@/daw/engine/meterBus';
import { useMasterVolumeControl } from '@/daw/hooks/useMixControls';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';
import { Meter } from '@/daw/ui/Meter';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';

// ── Master, at the bottom rail's left (2.6; B4a; 2.9) ──────────────────────
//
// The whole mix's volume and level, and its volume automation lane. The
// Master button opens Master in the dock's slot (2.9, after Soundtrap's
// Master ▾): its gain, the master chain and the output, in Create, from
// any view but Mix, where it opens the master's rack under the mixer
// (2.10). It sat under the track list
// until the bottom rail (owner, 2026-10-16), where it shows in every view.
// It is everyone's in a session, so it is never locked; with collaborators
// in the room it also switches between hearing all of them and only the
// tracks you pick.

export const MasterRow = memo(function MasterRow() {
  const volume = useMasterVolumeControl();
  const source = useRef(meterSource('master'));
  const fxCount = useStore((s) => s.masteringFxChain.length);
  // Open where the student is: the dock's Master in Create, the master's
  // rack under the mixer in Mix (2.10).
  const inDock = useStore(
    (s) =>
      (s.dockMaster && s.currentView === 'arrange') ||
      (s.currentView === 'studio' && s.mixRack?.kind === 'master'),
  );
  const automationOpen = useStore(
    (s) => s.automationOpenTrackId === MASTER_AUTOMATION_ID,
  );
  const hasPeers = useStore((s) => s.remoteUsers.size > 0);
  const listenMode = useListenMode();
  const toggleListenMode = useStudioListenStore((s) => s.toggleListenMode);
  const faderPx = hasPeers ? 72 : 96;

  return (
    <div data-testid="master-row" className="flex h-full items-center gap-1.5">
      <button
        type="button"
        aria-pressed={inDock}
        aria-label={
          fxCount > 0
            ? `Master (${fxCount} effect${fxCount > 1 ? 's' : ''}): show it in the dock`
            : 'Master: show it in the dock'
        }
        data-hint={hintText(
          'Master',
          inDock
            ? 'Give the dock back to the selected track'
            : 'Show the whole mix’s volume and effects in the dock',
        )}
        data-testid="master-open"
        onClick={() => {
          const s = useStore.getState();
          if (s.currentView === 'studio') {
            s.setMixRack(inDock ? null : { kind: 'master' });
            return;
          }
          if (inDock) {
            // Back to the selected track, or shut if Master opened the dock.
            s.setDockMaster(false);
            return;
          }
          // The dock is Create's.
          if (s.currentView !== 'arrange') s.setCurrentView('arrange');
          s.setDockMaster(true);
        }}
        className={cn(
          TYPE_CLASS.label,
          'inline-flex h-7 shrink-0 items-center gap-1 rounded-[var(--daw-radius-sm)] px-2 font-bold [&_svg]:size-3.5',
          inDock
            ? 'bg-daw-selected text-daw-text'
            : 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        Master
        <ChevronUp
          aria-hidden
          className={cn(TRANSITION, inDock && 'rotate-180')}
        />
      </button>
      <div
        className="flex flex-col-reverse items-start"
        onPointerDownCapture={volume.begin}
      >
        {/* The meter comes first, so the fader is drawn over it: its 24 px
            target tucks 10 px under the fader's, and the pair fits the 44 px
            rail (it stood 48 px, and the shell scrolled by the difference). */}
        <Meter
          label="Master level"
          data-hint={hintText(
            'Master level',
            'How loud the whole mix is; click to clear the red light',
          )}
          source={source.current}
          orientation="horizontal"
          length={faderPx}
          channels={1}
          className="-mt-2.5"
        />
        <Fader
          label="Master volume"
          data-hint={hintText(
            'Master volume',
            'The volume of the whole mix; double-click to reset',
          )}
          orientation="horizontal"
          length={faderPx}
          min={0}
          max={1}
          step={0.01}
          resetValue={0.8}
          value={volume.value}
          format={(v) => formatGain(v)}
          onChange={volume.change}
          onCommit={volume.end}
          showValue={false}
          hideLabel
        />
      </div>
      <div className="flex items-center">
        <Toggle
          label="Master volume automation"
          data-hint={hintText(
            'Master volume automation',
            'Draw how the whole mix’s volume changes over time',
          )}
          icon={<Activity />}
          size="sm"
          pressed={automationOpen}
          onPressedChange={(on) => {
            const s = useStore.getState();
            // The lane is Create's, under the tracks.
            if (on && s.currentView !== 'arrange') s.setCurrentView('arrange');
            if (on) s.setAutomationParamId('volume');
            s.setAutomationOpenTrackId(on ? MASTER_AUTOMATION_ID : null);
          }}
        />
        {hasPeers ? (
          <Toggle
            label={
              listenMode === 'all'
                ? 'You hear every collaborator: listen to chosen tracks only'
                : 'You hear chosen tracks: hear every collaborator'
            }
            icon={listenMode === 'all' ? <Ear /> : <Headphones />}
            size="sm"
            pressed={listenMode === 'all'}
            onPressedChange={toggleListenMode}
          />
        ) : null}
      </div>
    </div>
  );
});
