import { useEffect } from 'react';
import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import { tickToPixel } from '@/daw/utils/timelineScale';

// ── seekTo ──────────────────────────────────────────────────────────────
// Seek playhead to a specific tick position. Syncs both Tone.Transport and
// the Zustand store so the timeline playhead jumps immediately.

export function seekTo(tick: number) {
  const t = Math.max(0, Math.round(tick));
  Tone.getTransport().ticks = t;
  useStore.getState().setPosition(t);
  useStore.getState().setLastSeekPosition(t);
}

// ── useTransport ────────────────────────────────────────────────────────
// Two-way sync between Zustand transport state and Tone.Transport.
//   - BPM changes propagate to Tone.Transport.bpm
//   - Play / pause toggles Tone.Transport start / pause
//   - During playback, a rAF loop pushes Transport ticks into the store
//     at ~60 fps so the Timeline playhead animates smoothly.

export function useTransport() {
  const isPlaying = useStore((s) => s.isPlaying);
  const bpm = useStore((s) => s.bpm);
  const setPosition = useStore((s) => s.setPosition);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const loopStart = useStore((s) => s.loopStart);
  const loopEnd = useStore((s) => s.loopEnd);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);

  // Sync BPM → Tone.Transport
  useEffect(() => {
    Tone.getTransport().bpm.value = bpm;
  }, [bpm]);

  // Sync time signature → Tone.Transport
  useEffect(() => {
    Tone.getTransport().timeSignature = [tsNum, tsDen];
  }, [tsNum, tsDen]);

  // Sync loop state → Tone.Transport
  useEffect(() => {
    const transport = Tone.getTransport();
    transport.loop = loopEnabled;
    transport.loopStart = `${loopStart}i`;
    transport.loopEnd = `${loopEnd}i`;
  }, [loopEnabled, loopStart, loopEnd]);

  // Sync play / pause → Tone.Transport
  useEffect(() => {
    const transport = Tone.getTransport();
    if (isPlaying) {
      transport.ticks = useStore.getState().position;
      transport.start();
    } else {
      transport.pause();
      // Sync Tone position with store (critical after stop() resets to 0)
      transport.ticks = useStore.getState().position;
    }
  }, [isPlaying]);

  // Push Tone.Transport ticks → store position during playback (~30fps)
  useEffect(() => {
    if (!isPlaying) return;

    let rafId: number;
    let lastUpdate = 0;

    const updatePosition = (now: number) => {
      // Throttle to ~30fps (33ms intervals)
      if (now - lastUpdate >= 33) {
        const ticks = Math.round(Tone.getTransport().ticks);
        const state = useStore.getState();
        // Skip if position hasn't actually changed
        if (ticks !== state.position) {
          setPosition(ticks);

          // Auto-scroll: keep playhead visible during playback
          const zoom = state.timelineZoom;
          const sl = state.timelineScrollLeft;
          const playheadPx = tickToPixel(ticks, zoom, sl);
          // Estimate viewport width from scroll constraints
          const viewportWidth = 800; // reasonable fallback
          if (playheadPx > viewportWidth * 0.85) {
            state.setTimelineScrollLeft(sl + viewportWidth * 0.7);
          } else if (playheadPx < 0) {
            // Playhead scrolled off left (e.g. loop jumped back)
            const newSl = tickToPixel(ticks, zoom, 0) - viewportWidth * 0.15;
            state.setTimelineScrollLeft(Math.max(0, newSl));
          }
        }
        lastUpdate = now;
      }
      rafId = requestAnimationFrame(updatePosition);
    };

    rafId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, setPosition]);
}
