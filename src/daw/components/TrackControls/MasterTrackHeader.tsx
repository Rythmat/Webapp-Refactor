import { useState } from 'react';
import { motion } from 'framer-motion';
import * as Slider from '@radix-ui/react-slider';
import { Sparkles, Ear, Headphones } from 'lucide-react';
import { useStore } from '@/daw/store';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { useMeterLevel } from '@/daw/hooks/useMeterLevel';
import { PopOutOverlay } from '@/daw/components/ChannelStrip/PopOutOverlay';
import { MasterFxPanel } from '@/daw/components/Effects/MasterFxPanel';
import {
  useListenMode,
  useStudioListenStore,
} from '@/daw/collab/studioListenStore';
import { useRemoteUsers } from '@/daw/collab/presence';

// ── MasterTrackHeader ──────────────────────────────────────────────────────
// The "Master" track section: master output volume for the whole mix plus
// whole-mix effects. Unlike a regular TrackHeader it is intentionally stripped
// down — no solo / mute / record, no audio-style (role) dropdown, and it never
// participates in collaborative track selection or locking (the master bus is
// shared by everyone, so it must stay editable for all collaborators).

const MASTER_COLOR = 'var(--color-accent)';

export function MasterTrackHeader({ isReady }: { isReady: boolean }) {
  const masterVolume = useStore((s) => s.masterVolume);
  const setMasterVolume = useStore((s) => s.setMasterVolume);
  const fxCount = useStore((s) => s.masteringFxChain.length);

  const listenMode = useListenMode();
  const toggleListenMode = useStudioListenStore((s) => s.toggleListenMode);
  // The listen toggle only matters when collaborators are present.
  const hasPeers = useRemoteUsers().length > 0;

  const [fxOpen, setFxOpen] = useState(false);

  // Live stereo master metering (averaged), same source as the mixer master.
  const [analyserL, analyserR] = isReady
    ? audioEngine.getMasterAnalysers()
    : [null, null];
  const levelL = useMeterLevel(analyserL);
  const levelR = useMeterLevel(analyserR);
  const liveLevel = (levelL + levelR) / 2;

  return (
    <div
      className="flex flex-col justify-between border-b px-3 py-2"
      style={{
        height: 80,
        backgroundColor: 'var(--color-surface-2)',
        borderColor: 'var(--color-border)',
        borderLeft: `3px solid ${MASTER_COLOR}`,
      }}
    >
      {/* Row 1: label + FX */}
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: MASTER_COLOR }}
        />
        <span
          className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-wide"
          style={{ color: 'var(--color-text)' }}
        >
          Master
        </span>
        <motion.button
          onClick={() => setFxOpen(true)}
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors"
          style={{
            color: fxCount > 0 ? MASTER_COLOR : 'var(--color-text-dim)',
            border: `1px solid ${
              fxCount > 0 ? MASTER_COLOR : 'var(--color-border)'
            }`,
            background: 'none',
          }}
          title="Mix effects — applied to the whole mix"
        >
          <Sparkles size={10} strokeWidth={2} />
          <span className="text-[9px] font-medium">
            FX{fxCount > 0 ? ` ${fxCount}` : ''}
          </span>
        </motion.button>
      </div>

      {/* Row 2: caption + collaborative listen-mode toggle. This sits where a
          normal selected track shows its "Release" button. The label is the
          mode you switch TO: in Listen-All it reads "Solo Listen", and vice
          versa. */}
      <div className="flex items-center gap-1">
        <span
          className="text-[9px] uppercase tracking-wide"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Master Bus
        </span>
        {hasPeers && (
          <motion.button
            onClick={toggleListenMode}
            whileTap={{ scale: 0.9 }}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors"
            style={{
              color:
                listenMode === 'all' ? MASTER_COLOR : 'var(--color-text-dim)',
              border: `1px solid ${listenMode === 'all' ? MASTER_COLOR : 'var(--color-border)'}`,
              background: 'none',
            }}
            title={
              listenMode === 'all'
                ? 'You hear all collaborators. Switch to listening to chosen tracks only.'
                : 'You listen to chosen tracks. Switch to hearing all collaborators.'
            }
          >
            {listenMode === 'all' ? (
              <Ear size={10} strokeWidth={2} />
            ) : (
              <Headphones size={10} strokeWidth={2} />
            )}
            {listenMode === 'all' ? 'Solo Listen' : 'Listen All'}
          </motion.button>
        )}
      </div>

      {/* Row 3: master volume + live level meter (no M/S/Rec) */}
      <div className="flex items-center gap-1">
        <Slider.Root
          className="relative flex h-3 flex-1 cursor-pointer touch-none select-none items-center"
          min={0}
          max={100}
          step={1}
          value={[Math.round(masterVolume * 100)]}
          onValueChange={([v]) => setMasterVolume(v / 100)}
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
            aria-label="Master Volume"
          />
        </Slider.Root>
        <span
          className="ml-0.5 w-8 shrink-0 text-right font-mono text-[9px] tabular-nums"
          style={{ color: 'var(--color-text-dim)' }}
        >
          {masterVolume === 0
            ? '-∞'
            : `${(20 * Math.log10(masterVolume)).toFixed(1)}`}
        </span>
      </div>

      {/* Whole-mix effects editor */}
      <PopOutOverlay
        isOpen={fxOpen}
        onClose={() => setFxOpen(false)}
        title="Master  Mix Effects"
        trackColor={MASTER_COLOR}
      >
        <MasterFxPanel isReady={isReady} />
      </PopOutOverlay>
    </div>
  );
}
