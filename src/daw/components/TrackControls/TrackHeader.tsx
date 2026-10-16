import {
  type KeyboardEvent,
  type MouseEvent,
  memo,
  useCallback,
  useRef,
  useState,
} from 'react';
import { motion } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import {
  X,
  Circle,
  Headphones,
  Volume2,
  Ear,
  EarOff,
  Activity,
} from 'lucide-react';
import { useStore, useTrack, type Track } from '@/daw/store';
import {
  useListenMode,
  useStudioListenStore,
  useRemoteTrackAudible,
  useRemoteTrackActive,
} from '@/daw/collab/studioListenStore';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { FixedDigits } from '@/components/common/FixedDigits';
import { formatGain } from '@/daw/ui/format';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import type { DawTrackRole } from '@/daw/utils/trackRole';
import { PresenceTrackDots } from '@/daw/collab/ui/PresenceTrackDots';
import { useTrackPresence } from '@/daw/collab/presence';
import { LiveLevelFill } from './LiveLevelFill';
import { sliderGestureProps } from '@/daw/hooks/useContinuousControl';
import { useTrackVolumeControl } from '@/daw/hooks/useMixControls';

// ── Props ────────────────────────────────────────────────────────────────
interface TrackHeaderProps {
  trackId: string;
  index: number;
}

interface TrackHeaderRowProps {
  track: Track;
  index: number;
}

// ── Component ────────────────────────────────────────────────────────────
// Compact inline header (80px tall) matching "DAW MIDI Track 1" reference:
//   • TRACK NAME  (colored dot + uppercase name in track color)
//   1  CHANNEL 1 ▾
//   M  S  ░░░░░░░░  (level meter bar)

// Each header reads its own track by id (useTrack), so an edit to one track
// re-renders that header alone, and the column re-renders only when tracks
// are added, removed or reordered (milestone 1.7).
export const TrackHeader = memo(function TrackHeader({
  trackId,
  index,
}: TrackHeaderProps) {
  const track = useTrack(trackId);
  return track ? <TrackHeaderRow track={track} index={index} /> : null;
});

const TrackHeaderRow = memo(function TrackHeaderRow({
  track,
  index: _index,
}: TrackHeaderRowProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [colorOpen, setColorOpen] = useState(false);

  const updateTrack = useStore((s) => s.updateTrack);
  const toggleMute = useStore((s) => s.toggleMute);
  const toggleSolo = useStore((s) => s.toggleSolo);
  const toggleRecordArm = useStore((s) => s.toggleRecordArm);
  const toggleMonitoring = useStore((s) => s.toggleMonitoring);
  const removeTrack = useStore((s) => s.removeTrack);
  const automationOpen = useStore((s) => s.automationOpenTrackId === track.id);
  const setAutomationOpen = useStore((s) => s.setAutomationOpenTrackId);

  // Only this header's own selected state, so a selection change re-renders
  // the two headers it moves between, not every header.
  const isSelected = useStore((s) => s.selectedTrackId === track.id);
  const setSelectedTrackId = useStore((s) => s.setSelectedTrackId);

  // The remote collaborator (if any) who currently has this track selected.
  // Their selection locks the track: it's bordered in their presence colour
  // (matching their icon in the Connected list) and all of its controls become
  // read-only (the store also blocks any change). Clicks fall through to the
  // row, whose handler toasts "Track locked".
  const lockOwner = useTrackPresence(track.id)[0] ?? null;
  const lockedByRemote = lockOwner !== null;
  const lockedStyle = lockedByRemote
    ? ({ pointerEvents: 'none', opacity: 0.6 } as const)
    : undefined;
  // The fader previews while it moves and writes the store once on release.
  const volume = useTrackVolumeControl(track);

  // Collaborative listen state for a track another user is driving live.
  const listenMode = useListenMode();
  const remoteAudible = useRemoteTrackAudible(track.id);
  const remoteActive = useRemoteTrackActive(track.id);
  const toggleTrackAudible = useStudioListenStore((s) => s.toggleTrackAudible);
  // Pulse the remote owner's border while their live signal is audibly flowing.
  const pulsing = lockedByRemote && remoteAudible && remoteActive;

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      const newRole = e.target.value as DawTrackRole;
      updateTrack(track.id, { trackRole: newRole });
    },
    [track.id, updateTrack],
  );

  const handleNameBlur = useCallback(() => {
    const value = nameRef.current?.value.trim();
    if (value && value !== track.name) {
      updateTrack(track.id, { name: value });
    }
  }, [track.id, track.name, updateTrack]);

  const handleNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') e.currentTarget.blur();
    },
    [],
  );

  const handleSelect = useCallback(() => {
    setSelectedTrackId(track.id);
  }, [track.id, setSelectedTrackId]);

  const handleTestSound = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const entry = trackEngineRegistry.get(track.id);
      if (!entry) {
        console.warn(
          `[Test Sound] No audio engine for track "${track.name}" — audio not initialized yet`,
        );
        return;
      }
      const hasInstrument = entry.trackEngine.getInstrument() !== null;
      if (!hasInstrument) {
        console.warn(
          `[Test Sound] Instrument not ready for track "${track.name}" — still loading`,
        );
        return;
      }
      console.log(`[Test Sound] Playing C4 on track "${track.name}"`);
      entry.trackEngine.noteOn(60, 100);
      setTimeout(() => entry.trackEngine.noteOff(60), 300);
    },
    [track.id, track.name],
  );

  return (
    <motion.div
      onClick={handleSelect}
      whileHover={{
        backgroundColor: isSelected
          ? 'var(--daw-hover)'
          : 'var(--daw-surface-2)',
      }}
      className="group relative flex cursor-pointer flex-col justify-between border-b px-3 py-2"
      style={{
        height: 80,
        backgroundColor: isSelected
          ? 'var(--daw-surface-2)'
          : 'var(--daw-surface-1)',
        borderColor: 'var(--daw-hairline)',
        borderLeft: `3px solid ${track.color}`,
      }}
    >
      {/* Selection highlight overlay — pointer-events-none so it never shifts
          layout or steals clicks. A track locked by a remote collaborator is
          bordered in that user's colour; your own selection gets a white
          border. */}
      {lockOwner ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            border: `2px solid ${lockOwner.color}`,
            borderRadius: 4,
          }}
          animate={
            pulsing
              ? {
                  boxShadow: [
                    `0 0 4px ${lockOwner.color}, inset 0 0 3px ${lockOwner.color}`,
                    `0 0 16px ${lockOwner.color}, inset 0 0 9px ${lockOwner.color}`,
                    `0 0 4px ${lockOwner.color}, inset 0 0 3px ${lockOwner.color}`,
                  ],
                }
              : {
                  boxShadow: `0 0 6px ${lockOwner.color}, inset 0 0 4px ${lockOwner.color}`,
                }
          }
          transition={
            pulsing
              ? { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
      ) : (
        isSelected && (
          <div
            className="pointer-events-none absolute inset-0 z-20"
            style={{ border: '2px solid #fff', borderRadius: 4 }}
          />
        )
      )}

      {/* Delete button — top-right corner (hidden while remote-locked) */}
      {!lockedByRemote && (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            removeTrack(track.id);
          }}
          whileTap={{ scale: 0.85 }}
          className="absolute right-1.5 top-1.5 z-10 flex size-4 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
          style={{
            color: 'var(--daw-text-3)',
            background: 'none',
            border: 'none',
          }}
          title="Delete Track"
        >
          <X size={10} strokeWidth={2.5} />
        </motion.button>
      )}

      {/* Row 1: Colored dot (color picker trigger) + uppercase name */}
      <div className="flex min-w-0 items-center gap-1.5" style={lockedStyle}>
        <Popover.Root open={colorOpen} onOpenChange={setColorOpen}>
          <Popover.Trigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="size-3 shrink-0 cursor-pointer rounded-full transition-transform hover:scale-125"
              style={{
                backgroundColor: track.color,
                border: 'none',
                padding: 0,
              }}
              title="Change track color"
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              data-testid="track-colour-popover"
              className="z-50 rounded-lg p-2 shadow-lg"
              style={{
                backgroundColor: 'var(--daw-popover)',
                border: '1px solid var(--daw-hairline)',
              }}
              sideOffset={6}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-1">
                {TRACK_PALETTES.map((color) => (
                  <button
                    key={color}
                    data-meaning="track-colour"
                    onClick={() => {
                      updateTrack(track.id, { color });
                      setColorOpen(false);
                    }}
                    className="size-5 cursor-pointer rounded-full transition-transform hover:scale-125"
                    style={{
                      backgroundColor: color,
                      border:
                        color === track.color
                          ? '2px solid var(--daw-text)'
                          : '2px solid transparent',
                      padding: 0,
                    }}
                    title={color}
                  />
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <input
          ref={nameRef}
          defaultValue={track.name}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          className="min-w-0 flex-1 truncate border-none bg-transparent text-[11px] font-bold uppercase tracking-wide outline-none"
          style={{ color: 'var(--daw-text)' }}
          spellCheck={false}
        />
        <PresenceTrackDots trackId={track.id} />
        <select
          value={track.trackRole}
          onChange={handleRoleChange}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-pointer rounded border-none bg-transparent text-[9px] uppercase tracking-wide outline-none"
          style={{
            color: 'var(--daw-text-3)',
            padding: '0 2px',
          }}
          title="Track role for chord analysis"
        >
          <option value="auto">Auto</option>
          <option value="chords">Chords</option>
          <option value="melody">Melody</option>
          <option value="bass">Bass</option>
          <option value="drums">Drums</option>
        </select>
      </div>

      {/* Row 2: Monitor toggle + Test Sound — OR, when another collaborator is
          driving this track, the local Mute/Listen control for their live
          signal. The control stays interactive despite the remote lock. */}
      {lockedByRemote ? (
        <div className="flex items-center gap-1">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              toggleTrackAudible(track.id);
            }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors"
            style={{
              color: remoteAudible
                ? (lockOwner?.color ?? 'var(--daw-text)')
                : 'var(--daw-text-3)',
              border: `1px solid ${
                remoteAudible
                  ? (lockOwner?.color ?? 'var(--daw-hairline)')
                  : 'var(--daw-hairline)'
              }`,
              background: 'none',
            }}
            title={
              listenMode === 'all'
                ? remoteAudible
                  ? `Mute ${lockOwner?.userName ?? 'this user'}'s live audio`
                  : `Unmute ${lockOwner?.userName ?? 'this user'}'s live audio`
                : remoteAudible
                  ? `Stop listening to ${lockOwner?.userName ?? 'this user'}`
                  : `Listen to ${lockOwner?.userName ?? 'this user'}`
            }
          >
            {remoteAudible ? (
              <Ear size={10} strokeWidth={2} />
            ) : (
              <EarOff size={10} strokeWidth={2} />
            )}
            {listenMode === 'all'
              ? remoteAudible
                ? 'Mute'
                : 'Unmute'
              : remoteAudible
                ? 'Unlisten'
                : 'Listen'}
          </motion.button>
        </div>
      ) : (
        <div className="flex items-center gap-1" style={lockedStyle}>
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              toggleMonitoring(track.id);
            }}
            whileTap={{ scale: 0.85 }}
            className="flex w-fit items-center gap-1 rounded px-1.5 py-0.5 transition-colors"
            style={{
              backgroundColor: track.monitoring ? track.color : 'transparent',
              color: track.monitoring ? '#fff' : 'var(--daw-text-3)',
              border: `1px solid ${track.monitoring ? track.color : 'var(--daw-hairline)'}`,
            }}
            title="Monitor"
          >
            <Headphones size={10} strokeWidth={2} />
            <span className="text-[9px] font-medium">MON</span>
          </motion.button>
          {track.type === 'midi' && (
            <motion.button
              onClick={handleTestSound}
              whileTap={{ scale: 0.85 }}
              className="flex size-5 items-center justify-center rounded transition-colors"
              style={{
                color: 'var(--daw-text-3)',
                background: 'none',
                border: 'none',
              }}
              title="Test Sound (plays C4)"
            >
              <Volume2 size={10} strokeWidth={2} />
            </motion.button>
          )}

          {/* Release — deselect your own track (frees the lock for others) */}
          {isSelected && (
            <motion.button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTrackId(null);
              }}
              whileTap={{ scale: 0.9 }}
              className="ml-auto flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors hover:bg-white/10"
              style={{
                color: 'var(--daw-text-3)',
                border: '1px solid var(--daw-hairline)',
                background: 'none',
              }}
              title="Release this track so others can select it"
            >
              Release
            </motion.button>
          )}
        </div>
      )}

      {/* Row 3: M / S buttons + level meter. M/S are per-user-local settings,
          so they stay interactive even when the track is remote-locked; the
          remaining controls (record-arm, volume) keep the lock. */}
      <div className="flex items-center gap-1">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute(track.id);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex size-5 items-center justify-center rounded text-[10px] font-bold transition-colors"
          style={{
            backgroundColor: track.mute ? 'var(--daw-record)' : 'transparent',
            color: track.mute ? '#fff' : 'var(--daw-text-3)',
            border: `1px solid ${track.mute ? 'var(--daw-record)' : 'var(--daw-hairline)'}`,
          }}
          title="Mute"
        >
          M
        </motion.button>
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            toggleSolo(track.id);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex size-5 items-center justify-center rounded text-[10px] font-bold transition-colors"
          style={{
            backgroundColor: track.solo
              ? 'var(--daw-meter-hot)'
              : 'transparent',
            color: track.solo ? '#000' : 'var(--daw-text-3)',
            border: `1px solid ${track.solo ? 'var(--daw-meter-hot)' : 'var(--daw-hairline)'}`,
          }}
          title="Solo"
        >
          S
        </motion.button>
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            toggleRecordArm(track.id);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex size-5 items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: track.recordArmed
              ? `${track.color}26`
              : 'transparent',
            color: track.recordArmed ? track.color : 'var(--daw-text-3)',
            border: `1px solid ${track.recordArmed ? track.color : 'var(--daw-hairline)'}`,
            ...lockedStyle,
          }}
          title="Record Arm"
        >
          <Circle
            size={8}
            fill={track.recordArmed ? 'currentColor' : 'none'}
            strokeWidth={track.recordArmed ? 0 : 2}
          />
        </motion.button>
        <motion.button
          data-tutorial-id="automation-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setAutomationOpen(automationOpen ? null : track.id);
          }}
          whileTap={{ scale: 0.85 }}
          className="flex size-5 items-center justify-center rounded transition-colors"
          style={{
            backgroundColor: automationOpen
              ? 'var(--daw-selected)'
              : 'transparent',
            color: automationOpen ? 'var(--daw-text)' : 'var(--daw-text-3)',
            border: `1px solid ${automationOpen ? 'var(--daw-outline)' : 'var(--daw-hairline)'}`,
          }}
          title="Automation"
        >
          <Activity size={11} strokeWidth={2} />
        </motion.button>

        {/* Live level meter + volume slider. Volume syncs to collaborators, so
            it stays lock-protected. */}
        <Slider.Root
          className="relative ml-1 flex h-3 flex-1 cursor-pointer touch-none select-none items-center"
          style={lockedStyle}
          min={0}
          max={100}
          step={1}
          value={[Math.round(volume.value * 100)]}
          onValueChange={([v]) => volume.change(v / 100)}
          {...sliderGestureProps(volume)}
          onClick={(e) => e.stopPropagation()}
        >
          <Slider.Track
            className="relative h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--daw-hairline)' }}
          >
            {/* Painted from the meter bus by key, which finds this track's
                engine again after a rebuild: the header never re-renders
                for the level. */}
            <LiveLevelFill meterKey={`track:${track.id}`} />
            <Slider.Range
              className="absolute h-full rounded-full"
              style={{ backgroundColor: 'transparent' }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block h-3 w-1.5 rounded-sm shadow-sm focus:outline-none"
            style={{ backgroundColor: 'var(--daw-text-3)' }}
            aria-label="Volume"
          />
        </Slider.Root>
        <FixedDigits
          text={formatGain(volume.value, { unit: '' })}
          className="ml-0.5 w-8 shrink-0 text-right text-[9px]"
          style={{ color: 'var(--daw-text-3)' }}
        />
      </div>
    </motion.div>
  );
});
