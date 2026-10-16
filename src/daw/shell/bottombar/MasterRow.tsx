import { Activity, Ear, Headphones, Sparkles } from 'lucide-react';
import { memo, useRef } from 'react';
import { cn } from '@/components/utilities';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import {
  useListenMode,
  useStudioListenStore,
} from '@/daw/collab/studioListenStore';
import { meterSource } from '@/daw/engine/meterBus';
import { useMasterVolumeControl } from '@/daw/hooks/useMixControls';
import { useStore } from '@/daw/store';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';
import { IconButton } from '@/daw/ui/IconButton';
import { Meter } from '@/daw/ui/Meter';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';

// ── Master, at the bottom rail's left (2.6; B4a) ───────────────────────────
//
// The whole mix's volume and level, its volume automation lane, and Effects,
// which opens the Mix view, where the master's chain lives (the old pop-out
// copy of it is gone). It sat under the track list until the bottom rail
// (owner, 2026-10-16, after Soundtrap's), where it shows in every view. It
// is everyone's in a session, so it is never locked; with collaborators in
// the room it also switches between hearing all of them and only the tracks
// you pick.

export const MasterRow = memo(function MasterRow() {
  const volume = useMasterVolumeControl();
  const source = useRef(meterSource('master'));
  const fxCount = useStore((s) => s.masteringFxChain.length);
  const automationOpen = useStore(
    (s) => s.automationOpenTrackId === MASTER_AUTOMATION_ID,
  );
  const hasPeers = useStore((s) => s.remoteUsers.size > 0);
  const listenMode = useListenMode();
  const toggleListenMode = useStudioListenStore((s) => s.toggleListenMode);
  const faderPx = hasPeers ? 72 : 96;

  return (
    <div data-testid="master-row" className="flex h-full items-center gap-1.5">
      <span className={cn(TYPE_CLASS.micro, 'shrink-0 text-daw-text-2')}>
        Master
      </span>
      <div
        className="flex flex-col items-start"
        onPointerDownCapture={volume.begin}
      >
        <Fader
          label="Master volume"
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
        <Meter
          label="Master level"
          source={source.current}
          orientation="horizontal"
          length={faderPx}
          channels={1}
        />
      </div>
      <div className="flex items-center">
        <IconButton
          label={
            fxCount > 0
              ? `Master effects (${fxCount}): open the Mix view`
              : 'Master effects: open the Mix view'
          }
          icon={<Sparkles />}
          size="sm"
          onClick={() => useStore.getState().setCurrentView('studio')}
        />
        <Toggle
          label="Master volume automation"
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
