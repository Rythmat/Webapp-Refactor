import { useTrackIds, useTrackCount } from '@/daw/store';
import { ChannelStrip, MeterSegments } from './ChannelStrip';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { useMeterLevel } from '@/daw/hooks/useMeterLevel';

// ── Constants ────────────────────────────────────────────────────────────
const STRIP_WIDTH = 72;
const MASTER_WIDTH = 72;
const PADDING = 16; // 8px each side

// ── MixerPanel ──────────────────────────────────────────────────────────
// Dynamically sized, centered mixer panel matching DAW edit Dock reference.
// Subscribes only to track IDs and count — individual ChannelStrips
// subscribe to their own track data via useTrack(id).

export function MixerPanel({ isReady }: { isReady: boolean }) {
  const trackIds = useTrackIds();
  const trackCount = useTrackCount();

  // Master stereo metering
  const [analyserL, analyserR] = isReady
    ? audioEngine.getMasterAnalysers()
    : [null, null];
  const masterLevelL = useMeterLevel(analyserL);
  const masterLevelR = useMeterLevel(analyserR);

  const totalWidth = trackCount * STRIP_WIDTH + MASTER_WIDTH + PADDING;

  return (
    <div
      className="glass-panel mx-auto flex shrink-0 flex-col overflow-hidden rounded-2xl"
      style={{
        width: totalWidth,
        maxWidth: '100vw',
        backgroundColor: 'var(--color-surface-2)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Mixer strip area */}
      <div className="flex overflow-x-auto" style={{ height: 240 }}>
        {/* Channel strips */}
        {trackIds.map((id) => (
          <ChannelStrip key={id} trackId={id} />
        ))}

        {/* Master strip */}
        <div
          className="flex shrink-0 flex-col items-center gap-1 px-2 py-3"
          style={{
            width: MASTER_WIDTH,
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <span
            className="text-[10px] font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            Master
          </span>

          {/* Master meter — live stereo */}
          <div className="flex flex-1 items-center justify-center gap-1">
            <MeterSegments level={masterLevelL} />
            <MeterSegments level={masterLevelR} />
          </div>

          <span
            className="text-[9px]"
            style={{ color: 'var(--color-text-dim)' }}
          >
            0 dB
          </span>

          {/* Master M/S */}
          <div className="flex gap-1">
            <div
              className="flex size-5 items-center justify-center rounded text-[10px] font-bold"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--color-text-dim)',
              }}
            >
              M
            </div>
            <div
              className="flex size-5 items-center justify-center rounded text-[10px] font-bold"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: 'var(--color-text-dim)',
              }}
            >
              S
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
