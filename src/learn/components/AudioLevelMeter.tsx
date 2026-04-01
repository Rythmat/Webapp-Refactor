// ── AudioLevelMeter ──────────────────────────────────────────────────────
// VU-style input level meter for acoustic piano audio input.
// Displays a horizontal bar with green/yellow/red zones.

import { memo } from 'react';

interface AudioLevelMeterProps {
  /** RMS level from 0 to 1. */
  level: number;
  /** Width in pixels (default 80). */
  width?: number;
  /** Height in pixels (default 6). */
  height?: number;
}

export const AudioLevelMeter = memo(function AudioLevelMeter({
  level,
  width = 80,
  height = 6,
}: AudioLevelMeterProps) {
  const clamped = Math.max(0, Math.min(1, level));
  const fillWidth = clamped * width;

  // Color zones: green (0-0.6), yellow (0.6-0.85), red (0.85-1.0)
  let color: string;
  if (clamped < 0.6) {
    color = '#4ade80'; // green
  } else if (clamped < 0.85) {
    color = '#facc15'; // yellow
  } else {
    color = '#f87171'; // red
  }

  return (
    <div
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: fillWidth,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
          transition: 'width 50ms linear',
        }}
      />
    </div>
  );
});
