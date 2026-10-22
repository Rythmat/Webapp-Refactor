import {
  Activity,
  ChevronUp,
  Ear,
  Headphones,
  Volume2,
  VolumeX,
} from 'lucide-react';
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
import { createShows } from '@/daw/shell/mix/rackTarget';
import { useStore } from '@/daw/store';
import { Fader } from '@/daw/ui/Fader';
import { formatGain } from '@/daw/ui/format';
import { Meter } from '@/daw/ui/Meter';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { VolumePill } from '@/daw/ui/VolumePill';

// ── Master (2.6; B4a; 2.9; the floating frame) ─────────────────────────────
//
// Since 2026-10-21 it is the Master strip at the foot of the track column,
// where the floating frame keeps it (owner: "match Suno's placement"):
// layout 'strip'. The 'rail' layout is the bottom rail's one-row form.
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

/**
 * The strip's volume pill: the 260 px track column less its padding, as wide
 * as a track's pill and pan dial together (the master has no pan).
 */
const STRIP_PILL_PX = 232;

export const MasterRow = memo(function MasterRow({
  layout = 'rail',
}: {
  /**
   * 'rail': one 44 px row (Master, the fader over its meter, automation).
   * 'strip': the floating frame's Master strip at the foot of the track column
   * (2026-10-21): the name and its switches above, the fader full width.
   */
  layout?: 'rail' | 'strip';
}) {
  const volume = useMasterVolumeControl();
  const source = useRef(meterSource('master'));
  const fxCount = useStore((s) => s.masteringFxChain.length);
  // Open where the student is: the dock's Master in Create, the master's
  // rack under the mixer in Mix (2.10).
  const inDock = useStore(
    (s) =>
      (s.dockMaster && createShows(s)) ||
      (s.currentView === 'studio' && s.mixRack?.kind === 'master'),
  );
  const automationOpen = useStore(
    (s) => s.automationOpenTrackId === MASTER_AUTOMATION_ID,
  );
  const hasPeers = useStore((s) => s.remoteUsers.size > 0);
  const listenMode = useListenMode();
  const toggleListenMode = useStudioListenStore((s) => s.toggleListenMode);
  const strip = layout === 'strip';
  const muted = useStore((s) => s.masterMuted);
  const faderPx = hasPeers ? 72 : 96;

  return (
    <div
      data-testid="master-row"
      data-layout={layout}
      className={
        strip
          ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1 gap-y-1.5'
          : 'flex h-full items-center gap-1.5'
      }
    >
      <button
        type="button"
        aria-pressed={inDock}
        aria-label={
          strip
            ? `Master${fxCount > 0 ? ` (${fxCount} effect${fxCount > 1 ? 's' : ''})` : ''}`
            : fxCount > 0
              ? `Master (${fxCount} effect${fxCount > 1 ? 's' : ''}): show it in the dock`
              : 'Master: show it in the dock'
        }
        data-hint={hintText(
          'Master',
          strip
            ? 'Select Master: the whole mix’s volume and effects in the dock'
            : inDock
              ? 'Give the dock back to the selected track'
              : 'Show the whole mix’s volume and effects in the dock',
        )}
        data-testid="master-open"
        onClick={(e) => {
          // In the strip it is a name in the track list: a click selects
          // Master, as a track's does, and a track's click gives it back.
          if (strip) {
            e.stopPropagation();
            selectMaster();
            return;
          }
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
          if (!createShows(s)) s.setCurrentView('arrange');
          s.setDockMaster(true);
        }}
        className={cn(
          TYPE_CLASS.label,
          strip
            ? // The name as a track's reads (TrackRow): no box, no chevron;
              // the strip behind it shows the selection.
              'h-6 min-w-0 justify-self-start truncate rounded-[var(--daw-radius-sm)] text-left font-bold text-daw-text'
            : cn(
                'inline-flex h-7 shrink-0 items-center gap-1 rounded-[var(--daw-radius-sm)] px-2 font-bold [&_svg]:size-3.5',
                inDock
                  ? 'bg-daw-selected text-daw-text'
                  : 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
              ),
          TRANSITION,
          FOCUS_RING,
        )}
      >
        Master
        {strip ? null : (
          <ChevronUp
            aria-hidden
            className={cn(TRANSITION, inDock && 'rotate-180')}
          />
        )}
      </button>
      {strip ? (
        // The floating frame's Main: the volume pill over the mix's stereo
        // meter, as a track's header has it (Suno, 2026-10-21).
        <div className="order-last col-span-2">
          <VolumePill
            label="Master volume"
            data-hint={hintText(
              'Master volume',
              'The volume of the whole mix, over its level; double-click to reset',
            )}
            data-testid="master-volume"
            value={volume.value}
            onBegin={volume.begin}
            onChange={(gain) => volume.change(Math.min(1, gain))}
            onEnd={volume.end}
            resetValue={0.8}
            meter={source.current}
            color="var(--daw-text-2)"
            width={STRIP_PILL_PX}
            dimmed={muted}
            // The strip sits at the window's foot: its level shows above.
            chipSide="above"
          />
        </div>
      ) : (
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
      )}
      <div className="flex items-center">
        {strip ? <MasterMute /> : null}
        {/* The Master strip has no automation switch: the bottom rail's
            Automation opens Master's lane while the dock shows Master
            (owner, 2026-10-21). */}
        {strip ? null : (
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
              if (on && s.currentView !== 'arrange')
                s.setCurrentView('arrange');
              if (on) s.setAutomationParamId('volume');
              s.setAutomationOpenTrackId(on ? MASTER_AUTOMATION_ID : null);
            }}
          />
        )}
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

/**
 * Selects Master in the track list (its strip, 2026-10-22): the whole mix's
 * volume and effects in the dock in Create, its rack under the mixer in Mix.
 * It stays selected until a track is (TrackRow).
 */
export function selectMaster(): void {
  const s = useStore.getState();
  if (s.currentView === 'studio') {
    if (s.mixRack?.kind !== 'master') s.setMixRack({ kind: 'master' });
    return;
  }
  // The dock is Create's.
  if (!createShows(s)) s.setCurrentView('arrange');
  if (!useStore.getState().dockMaster) useStore.getState().setDockMaster(true);
}

/** Whether Master is the track list's selection. */
export function useMasterSelected(): boolean {
  return useStore(
    (s) =>
      (s.dockMaster && createShows(s)) ||
      (s.currentView === 'studio' && s.mixRack?.kind === 'master'),
  );
}

/** The strip's mute, as a track's header has it (TrackRow). */
function MasterMute() {
  const muted = useStore((s) => s.masterMuted);
  return (
    <button
      type="button"
      aria-label="Mute Master"
      aria-pressed={muted}
      data-testid="master-mute"
      data-hint={hintText('Mute Master', 'Silence the whole mix')}
      className={cn(
        'flex h-8 w-7 shrink-0 items-center justify-center rounded-[var(--daw-radius-sm)] text-daw-pill-text hover:text-daw-text [&_svg]:size-3.5',
        TRANSITION,
        FOCUS_RING,
      )}
      onClick={(e) => {
        e.stopPropagation();
        useStore.getState().toggleMasterMute();
      }}
    >
      <span
        className={cn(
          'flex size-6 items-center justify-center rounded-full',
          muted && 'bg-daw-pill-on text-daw-text',
        )}
      >
        {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
      </span>
    </button>
  );
}
