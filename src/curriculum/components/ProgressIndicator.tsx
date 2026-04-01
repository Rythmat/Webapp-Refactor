/**
 * Phase 19 — Progress Indicator.
 *
 * Compact completion badge showing percentage and status for a
 * curriculum genre/level combination.
 */

import React from 'react';

interface ProgressIndicatorProps {
  /** Completion percentage (0-100) */
  percentage: number;
  /** Optional size variant */
  size?: 'small' | 'medium';
}

const STATUS_COLORS = {
  notStarted: '#475569',
  inProgress: '#3b82f6',
  completed: '#10b981',
} as const;

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  percentage,
  size = 'medium',
}) => {
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const color =
    clampedPct >= 100
      ? STATUS_COLORS.completed
      : clampedPct > 0
        ? STATUS_COLORS.inProgress
        : STATUS_COLORS.notStarted;

  const isSmall = size === 'small';
  const diameter = isSmall ? 28 : 36;
  const strokeWidth = isSmall ? 2.5 : 3;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedPct / 100) * circumference;

  return (
    <div
      style={{
        position: 'relative',
        width: diameter,
        height: diameter,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={diameter} height={diameter}>
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          fontSize: isSmall ? 8 : 10,
          fontWeight: 600,
          color: '#e2e8f0',
          fontFamily: 'monospace',
        }}
      >
        {clampedPct >= 100 ? '\u2713' : `${Math.round(clampedPct)}`}
      </span>
    </div>
  );
};
