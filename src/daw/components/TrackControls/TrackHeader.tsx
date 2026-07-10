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
import { X, Circle, Headphones, Volume2, Ear, EarOff } from 'lucide-react';
import { useStore, type Track } from '@/daw/store';
import {
  useListenMode,
  useStudioListenStore,
  useRemoteTrackAudible,
  useRemoteTrackActivity,
} from '@/daw/collab/studioListenStore';
import {
  trackEngineRegistry,
  getTrackAudioState,
} from '@/daw/hooks/usePlaybackEngine';
import { useMeterLevel } from '@/daw/hooks/useMeterLevel';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import type { DawTrackRole } from '@/daw/utils/trackRole';
import { deriveChordRegionsFromSession } from '@/daw/store/prismSlice';
import { PresenceTrackDots } from '@/daw/collab/ui/PresenceTrackDots';
import { useTrackPresence } from '@/daw/collab/presence';

// ── Props ────────────────────────────────────────────────────────────────
interface TrackHeaderProps {
  track: Track;
  index: number;
}

// ── Component ────────────────────────────────────────────────────────────
// Compact inline header (80px tall) matching "DAW MIDI Track 1" reference:
//   • TRACK NAME  (colored dot + uppercase name in track color)
//   1  CHANNEL 1 ▾
//   M  S  ░░░░░░░░  (level meter bar)

export const TrackHeader = memo(function TrackHeader({
  track,
  index: _index,
}: TrackHeaderProps) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [colorOpen, setColorOpen] = useState(false);

  const updateTrack = useStore((s) => s.updateTrack);
  const toggleMute = useStore((s) => s.toggleMute);
  const toggleSolo = useStore((s) => s.toggleSolo);
  const toggleRecordArm = useStore((s) => s.toggleRecordArm);
  const toggleMonitoring = useStore((s) => s.toggleMonitoring);
  const removeTrack = useStore((s) => s.removeTrack);

  const selectedTrackId = useStore((s) => s.selectedTrackId);
  const setSelectedTrackId = useStore((s) => s.setSelectedTrackId);
  const isSelected = selectedTrackId === track.id;

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

  // Collaborative listen state for a track another user is driving live.
  const listenMode = useListenMode();
  const remoteAudible = useRemoteTrackAudible(track.id);
  const remoteActivity = useRemoteTrackActivity(track.id);
  const toggleTrackAudible = useStudioListenStore((s) => s.toggleTrackAudible);
  // Pulse the remote owner's border while their live signal is audibly flowing.
  const pulsing = lockedByRemote && remoteAudible && remoteActivity > 0.08;

  // Live audio metering (same pattern as mixer ChannelStrip)
  const analyser =
    getTrackAudioState(track.id)?.trackEngine.getAnalyserNode() ?? null;
  const liveLevel = useMeterLevel(analyser);

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      const newRole = e.target.value as DawTrackRole;
      updateTrack(track.id, { trackRole: newRole });
      // Re-derive chord regions with updated role
      const {
        rootNote,
        mode,
        setChordRegions,
        tracks: allTracks,
      } = useStore.getState();
      const updated = allTracks.map((t) =>
        t.id === track.id ? { ...t, trackRole: newRole } : t,
      );
      const regions = deriveChordRegionsFromSession(
        updated,
        (rootNote ?? 0) + 48,
        mode,
      );
      setChordRegions(regions);
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
          ? 'var(--color-surface-3)'
          : 'var(--color-surface-2)',
      }}
      className="group relative flex cursor-pointer flex-col justify-between border-b px-3 py-2"
      style={{
        height: 80,
        backgroundColor: isSelected
          ? 'var(--color-surface-2)'
          : 'var(--color-surface)',
        borderColor: 'var(--color-border)',
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
            color: 'var(--color-text-dim)',
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
              className="z-50 rounded-lg p-2 shadow-lg"
              style={{
                backgroundColor: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
              sideOffset={6}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-1">
                {TRACK_PALETTES.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      updateTrack(track.id, { color });
                      setColorOpen(false);
                    }}
                    className="size-5 cursor-pointer rounded-full transition-transform hover:scale-125"
                    style={{
                      backgroundColor: color,
                      border:
                        color === track.color
                          ? '2px solid var(--color-text)'
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
          style={{ color: 'var(--color-text)' }}
          spellCheck={false}
        />
        <PresenceTrackDots trackId={track.id} />
        <select
          value={track.trackRole}
          onChange={handleRoleChange}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 cursor-pointer rounded border-none bg-transparent text-[9px] uppercase tracking-wide outline-none"
          style={{
            color: 'var(--color-text-dim)',
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
                ? (lockOwner?.color ?? 'var(--color-text)')
                : 'var(--color-text-dim)',
              border: `1px solid ${
                remoteAudible
                  ? (lockOwner?.color ?? 'var(--color-border)')
                  : 'var(--color-border)'
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
              color: track.monitoring ? '#fff' : 'var(--color-text-dim)',
              border: `1px solid ${track.monitoring ? track.color : 'var(--color-border)'}`,
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
                color: 'var(--color-text-dim)',
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
                color: 'var(--color-text-dim)',
                border: '1px solid var(--color-border)',
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
            backgroundColor: track.mute ? 'var(--color-record)' : 'transparent',
            color: track.mute ? '#fff' : 'var(--color-text-dim)',
            border: `1px solid ${track.mute ? 'var(--color-record)' : 'var(--color-border)'}`,
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
              ? 'var(--color-meter-yellow)'
              : 'transparent',
            color: track.solo ? '#000' : 'var(--color-text-dim)',
            border: `1px solid ${track.solo ? 'var(--color-meter-yellow)' : 'var(--color-border)'}`,
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
            color: track.recordArmed ? track.color : 'var(--color-text-dim)',
            border: `1px solid ${track.recordArmed ? track.color : 'var(--color-border)'}`,
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

        {/* Live level meter + volume slider. Volume syncs to collaborators, so
            it stays lock-protected. */}
        <Slider.Root
          className="relative ml-1 flex h-3 flex-1 cursor-pointer touch-none select-none items-center"
          style={lockedStyle}
          min={0}
          max={100}
          step={1}
          value={[Math.round(track.volume * 100)]}
          onValueChange={([v]) => updateTrack(track.id, { volume: v / 100 })}
          onClick={(e) => e.stopPropagation()}
        >
          <Slider.Track
            className="relative h-1.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            {/* Live level fill (visual only, ignores slider value) */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-none"
              style={{
                width: `${liveLevel}%`,
                backgroundColor:
                  liveLevel > 90
                    ? 'var(--color-meter-red)'
                    : liveLevel > 75
                      ? 'var(--color-meter-yellow)'
                      : 'var(--color-meter-green)',
              }}
            />
            <Slider.Range
              className="absolute h-full rounded-full"
              style={{ backgroundColor: 'transparent' }}
            />
          </Slider.Track>
          <Slider.Thumb
            className="block h-3 w-1.5 rounded-sm shadow-sm focus:outline-none"
            style={{ backgroundColor: 'var(--color-text-dim)' }}
            aria-label="Volume"
          />
        </Slider.Root>
        <span
          className="ml-0.5 w-8 shrink-0 text-right font-mono text-[9px] tabular-nums"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {track.volume === 0
            ? '-\u221E'
            : `${(20 * Math.log10(track.volume)).toFixed(1)}`}
        </span>
      </div>
    </motion.div>
  );
});
