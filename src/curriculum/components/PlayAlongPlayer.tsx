/**
 * Phase 17 — Play-Along Player.
 *
 * Full-featured play-along practice component with:
 * - Transport controls (play/pause/stop)
 * - Tempo slider
 * - Per-track mute toggles (drums, bass, chords, melody)
 * - Loop toggle
 * - Visual progress bar
 * - Count-in indicator
 */

import React, { useEffect, useMemo } from 'react';
import type { GeneratedActivity } from '../engine/contentOrchestrator';
import { generatePlayAlongTrack } from '../engine/playAlongGenerator';
import { usePlayAlong } from '../hooks/usePlayAlong';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlayAlongPlayerProps {
  /** Generated activity to create backing track from */
  activity: GeneratedActivity;
  /** Number of bars to loop (default: 4) */
  loopBars?: number;
  /** Callback when playback state changes */
  onPlaybackChange?: (isPlaying: boolean) => void;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const COLORS = {
  bg: '#1a1a2e',
  surface: '#252542',
  accent: '#7c3aed',
  accentHover: '#6d28d9',
  text: '#e2e8f0',
  textDim: '#94a3b8',
  drums: '#f59e0b',
  bass: '#10b981',
  chords: '#3b82f6',
  melody: '#ec4899',
  muted: '#475569',
  border: '#334155',
} as const;

const containerStyle: React.CSSProperties = {
  background: COLORS.bg,
  borderRadius: 12,
  padding: 24,
  maxWidth: 600,
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 20,
};

const transportStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  justifyContent: 'center',
  marginBottom: 20,
};

const btnStyle: React.CSSProperties = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  color: COLORS.text,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  transition: 'background 0.15s',
};

const playBtnStyle: React.CSSProperties = {
  ...btnStyle,
  background: COLORS.accent,
  border: 'none',
  padding: '10px 24px',
  fontSize: 16,
  fontWeight: 600,
  borderRadius: 24,
};

const trackRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 12px',
  borderRadius: 8,
  marginBottom: 4,
};

const progressBarContainerStyle: React.CSSProperties = {
  width: '100%',
  height: 6,
  background: COLORS.surface,
  borderRadius: 3,
  marginBottom: 20,
  overflow: 'hidden',
};

const tempoContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PlayAlongPlayer: React.FC<PlayAlongPlayerProps> = ({
  activity,
  loopBars = 4,
  onPlaybackChange,
}) => {
  // Generate the backing track
  const playAlongTrack = useMemo(
    () => generatePlayAlongTrack(activity, loopBars),
    [activity, loopBars],
  );

  const [state, controls] = usePlayAlong(playAlongTrack, activity.tempo);

  // Notify parent of playback state changes
  useEffect(() => {
    onPlaybackChange?.(state.isPlaying);
  }, [state.isPlaying, onPlaybackChange]);

  // Progress percentage
  const progress =
    playAlongTrack.totalTicks > 0
      ? Math.max(
          0,
          Math.min(100, (state.currentTick / playAlongTrack.totalTicks) * 100),
        )
      : 0;

  // Current bar/beat display
  const currentBar = Math.floor(state.currentTick / 1920) + 1;
  const currentBeat = Math.floor((state.currentTick % 1920) / 480) + 1;

  const trackInfo = [
    {
      key: 'drums' as const,
      label: 'Drums',
      color: COLORS.drums,
      count: playAlongTrack.drums.length,
    },
    {
      key: 'bass' as const,
      label: 'Bass',
      color: COLORS.bass,
      count: playAlongTrack.bass.length,
    },
    {
      key: 'chords' as const,
      label: 'Chords',
      color: COLORS.chords,
      count: playAlongTrack.chords.length,
    },
    {
      key: 'melody' as const,
      label: 'Melody',
      color: COLORS.melody,
      count: playAlongTrack.melody.length,
    },
  ];

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <div style={{ color: COLORS.text, fontSize: 16, fontWeight: 600 }}>
            Play Along
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 13, marginTop: 2 }}>
            {activity.genre} L{activity.level.replace('L', '')} — {loopBars}{' '}
            bars
          </div>
        </div>
        <div
          style={{
            color: COLORS.textDim,
            fontSize: 14,
            fontFamily: 'monospace',
          }}
        >
          {state.isCountingIn
            ? 'Count in...'
            : state.isPlaying
              ? `Bar ${currentBar} · Beat ${currentBeat}`
              : 'Ready'}
        </div>
      </div>

      {/* Progress bar */}
      <div style={progressBarContainerStyle}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: COLORS.accent,
            borderRadius: 3,
            transition: 'width 0.05s linear',
          }}
        />
      </div>

      {/* Transport controls */}
      <div style={transportStyle}>
        <button onClick={controls.stop} style={btnStyle} title="Stop">
          Stop
        </button>
        <button
          onClick={state.isPlaying ? controls.pause : controls.start}
          style={playBtnStyle}
        >
          {state.isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={controls.toggleLoop}
          style={{
            ...btnStyle,
            background: state.loop ? COLORS.accent : COLORS.surface,
            borderColor: state.loop ? COLORS.accent : COLORS.border,
          }}
          title="Toggle loop"
        >
          Loop
        </button>
      </div>

      {/* Tempo control */}
      <div style={tempoContainerStyle}>
        <span style={{ color: COLORS.textDim, fontSize: 13, minWidth: 50 }}>
          Tempo
        </span>
        <input
          type="range"
          min={40}
          max={240}
          value={state.tempo}
          onChange={(e) => controls.setTempo(Number(e.target.value))}
          style={{ flex: 1, accentColor: COLORS.accent }}
        />
        <span
          style={{
            color: COLORS.text,
            fontSize: 14,
            fontFamily: 'monospace',
            minWidth: 60,
            textAlign: 'right',
          }}
        >
          {state.tempo} BPM
        </span>
      </div>

      {/* Track mute controls */}
      <div>
        <div
          style={{
            color: COLORS.textDim,
            fontSize: 12,
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          Tracks
        </div>
        {trackInfo.map((t) => (
          <div
            key={t.key}
            style={{
              ...trackRowStyle,
              background: state.muted[t.key] ? 'transparent' : `${t.color}10`,
            }}
          >
            <button
              onClick={() => controls.toggleMute(t.key)}
              style={{
                width: 40,
                height: 28,
                borderRadius: 6,
                border: 'none',
                background: state.muted[t.key] ? COLORS.muted : t.color,
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {state.muted[t.key] ? 'OFF' : 'ON'}
            </button>
            <span
              style={{
                color: state.muted[t.key] ? COLORS.muted : COLORS.text,
                fontSize: 14,
                fontWeight: 500,
                flex: 1,
              }}
            >
              {t.label}
            </span>
            <span style={{ color: COLORS.textDim, fontSize: 12 }}>
              {t.count} events
            </span>
          </div>
        ))}
      </div>

      {/* Count-in control */}
      <div
        style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span style={{ color: COLORS.textDim, fontSize: 13 }}>Count-in:</span>
        {[0, 1, 2].map((n) => (
          <button
            key={n}
            onClick={() => controls.setCountInBars(n)}
            style={{
              ...btnStyle,
              padding: '4px 12px',
              fontSize: 12,
              background:
                state.countInBars === n ? COLORS.accent : COLORS.surface,
              borderColor:
                state.countInBars === n ? COLORS.accent : COLORS.border,
            }}
          >
            {n === 0 ? 'None' : `${n} bar${n > 1 ? 's' : ''}`}
          </button>
        ))}
      </div>
    </div>
  );
};
