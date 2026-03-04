import React, { useCallback, useRef, useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import * as Slider from '@radix-ui/react-slider';
import { X, Circle, Headphones, Volume2 } from 'lucide-react';
import { useStore } from '@/daw/store';
import type { Track } from '@/daw/store';
import { trackEngineRegistry, getTrackAudioState } from '@/daw/hooks/usePlaybackEngine';
import { useMeterLevel } from '@/daw/hooks/useMeterLevel';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';

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

export const TrackHeader = React.memo(function TrackHeader({ track, index: _index }: TrackHeaderProps) {
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

  // Live audio metering (same pattern as mixer ChannelStrip)
  const analyser = getTrackAudioState(track.id)?.trackEngine.getAnalyserNode() ?? null;
  const liveLevel = useMeterLevel(analyser);

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

  const handleTestSound = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const entry = trackEngineRegistry.get(track.id);
    if (!entry) {
      console.warn(`[Test Sound] No audio engine for track "${track.name}" — audio not initialized yet`);
      return;
    }
    const hasInstrument = entry.trackEngine.getInstrument() !== null;
    if (!hasInstrument) {
      console.warn(`[Test Sound] Instrument not ready for track "${track.name}" — still loading`);
      return;
    }
    console.log(`[Test Sound] Playing C4 on track "${track.name}"`);
    entry.trackEngine.noteOn(60, 100);
    setTimeout(() => entry.trackEngine.noteOff(60), 300);
  }, [track.id, track.name]);

  return (
    <motion.div
      onClick={handleSelect}
      whileHover={{
        backgroundColor: isSelected
          ? 'var(--color-surface-3)'
          : 'var(--color-surface-2)',
      }}
      className="relative flex flex-col justify-between px-3 py-2 border-b cursor-pointer group"
      style={{
        height: 80,
        backgroundColor: isSelected
          ? 'var(--color-surface-2)'
          : 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        borderLeft: `3px solid ${track.color}`,
      }}
    >
      {/* Delete button — top-right corner */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); removeTrack(track.id); }}
        whileTap={{ scale: 0.85 }}
        className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 hover:text-red-400 cursor-pointer z-10"
        style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}
        title="Delete Track"
      >
        <X size={10} strokeWidth={2.5} />
      </motion.button>

      {/* Row 1: Colored dot (color picker trigger) + uppercase name */}
      <div className="flex items-center gap-1.5 min-w-0">
        <Popover.Root open={colorOpen} onOpenChange={setColorOpen}>
          <Popover.Trigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="w-3 h-3 rounded-full shrink-0 cursor-pointer transition-transform hover:scale-125"
              style={{ backgroundColor: track.color, border: 'none', padding: 0 }}
              title="Change track color"
            />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="rounded-lg p-2 z-50 shadow-lg"
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
                    onClick={() => { updateTrack(track.id, { color }); setColorOpen(false); }}
                    className="w-5 h-5 rounded-full cursor-pointer transition-transform hover:scale-125"
                    style={{
                      backgroundColor: color,
                      border: color === track.color ? '2px solid var(--color-text)' : '2px solid transparent',
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
          className="w-full text-[11px] font-bold bg-transparent border-none outline-none truncate uppercase tracking-wide"
          style={{ color: 'var(--color-text)' }}
          spellCheck={false}
        />
      </div>

      {/* Row 2: Monitor toggle + Test Sound */}
      <div className="flex items-center gap-1">
        <motion.button
          onClick={(e) => { e.stopPropagation(); toggleMonitoring(track.id); }}
          whileTap={{ scale: 0.85 }}
          className="flex items-center gap-1 w-fit rounded px-1.5 py-0.5 transition-colors"
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
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: 'var(--color-text-dim)', background: 'none', border: 'none' }}
            title="Test Sound (plays C4)"
          >
            <Volume2 size={10} strokeWidth={2} />
          </motion.button>
        )}
      </div>

      {/* Row 3: M / S buttons + level meter */}
      <div className="flex items-center gap-1">
        <motion.button
          onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }}
          whileTap={{ scale: 0.85 }}
          className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold transition-colors"
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
          onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }}
          whileTap={{ scale: 0.85 }}
          className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold transition-colors"
          style={{
            backgroundColor: track.solo ? '#eab308' : 'transparent',
            color: track.solo ? '#000' : 'var(--color-text-dim)',
            border: `1px solid ${track.solo ? '#eab308' : 'var(--color-border)'}`,
          }}
          title="Solo"
        >
          S
        </motion.button>
        <motion.button
          onClick={(e) => { e.stopPropagation(); toggleRecordArm(track.id); }}
          whileTap={{ scale: 0.85 }}
          className="w-5 h-5 flex items-center justify-center rounded-full transition-colors"
          style={{
            backgroundColor: track.recordArmed ? `${track.color}26` : 'transparent',
            color: track.recordArmed ? track.color : 'var(--color-text-dim)',
            border: `1px solid ${track.recordArmed ? track.color : 'var(--color-border)'}`,
          }}
          title="Record Arm"
        >
          <Circle size={8} fill={track.recordArmed ? 'currentColor' : 'none'} strokeWidth={track.recordArmed ? 0 : 2} />
        </motion.button>

        {/* Live level meter + volume slider */}
        <Slider.Root
          className="relative flex-1 flex items-center ml-1 h-3 touch-none select-none cursor-pointer"
          min={0} max={100} step={1}
          value={[Math.round(track.volume * 100)]}
          onValueChange={([v]) => updateTrack(track.id, { volume: v / 100 })}
          onClick={(e) => e.stopPropagation()}
        >
          <Slider.Track
            className="relative h-1.5 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--color-border)' }}
          >
            {/* Live level fill (visual only, ignores slider value) */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-none"
              style={{
                width: `${liveLevel}%`,
                backgroundColor:
                  liveLevel > 90 ? '#ef4444' : liveLevel > 75 ? '#eab308' : '#22c55e',
              }}
            />
            <Slider.Range className="absolute h-full rounded-full" style={{ backgroundColor: 'transparent' }} />
          </Slider.Track>
          <Slider.Thumb
            className="block w-1.5 h-3 rounded-sm shadow-sm focus:outline-none"
            style={{ backgroundColor: 'var(--color-text-dim)' }}
            aria-label="Volume"
          />
        </Slider.Root>
        <span
          className="text-[9px] font-mono tabular-nums ml-0.5 w-8 text-right shrink-0"
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
