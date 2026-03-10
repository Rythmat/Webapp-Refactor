/**
 * Phase 24 — Live Feedback Overlay.
 *
 * Renders real-time note feedback over the piano keyboard during
 * play-along activities. Shows correct/wrong/timing indicators
 * and a running score counter.
 */

import React from 'react';
import type {
  LiveFeedbackState,
  FeedbackStatus,
} from '../hooks/useLiveFeedback';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LiveFeedbackOverlayProps {
  state: LiveFeedbackState;
}

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  correct: '#10b981',
  wrong: '#ef4444',
  early: '#f59e0b',
  late: '#f59e0b',
};

const STATUS_LABELS: Record<FeedbackStatus, string> = {
  correct: 'Correct',
  wrong: 'Wrong',
  early: 'Early',
  late: 'Late',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LiveFeedbackOverlay: React.FC<LiveFeedbackOverlayProps> = ({
  state,
}) => {
  const lastFeedback = state.feedbackEvents[state.feedbackEvents.length - 1];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '8px 16px',
        background: '#1e1e3a',
        borderRadius: 8,
        minHeight: 40,
      }}
    >
      {/* Last note feedback */}
      {lastFeedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: STATUS_COLORS[lastFeedback.status],
              boxShadow: `0 0 8px ${STATUS_COLORS[lastFeedback.status]}`,
            }}
          />
          <span
            style={{
              color: STATUS_COLORS[lastFeedback.status],
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {STATUS_LABELS[lastFeedback.status]}
          </span>
          {lastFeedback.status !== 'wrong' &&
            Math.abs(lastFeedback.deviationMs) < 5000 && (
              <span style={{ color: '#94a3b8', fontSize: 11 }}>
                {lastFeedback.deviationMs > 0 ? '+' : ''}
                {Math.round(lastFeedback.deviationMs)}ms
              </span>
            )}
        </div>
      )}

      {/* Accuracy */}
      <div style={{ color: '#e2e8f0', fontSize: 14, fontFamily: 'monospace' }}>
        {state.accuracy}%
      </div>

      {/* Streak */}
      {state.streak > 1 && (
        <div
          style={{
            color: '#10b981',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {state.streak} streak
        </div>
      )}

      {/* Progress */}
      <div style={{ color: '#64748b', fontSize: 12, marginLeft: 'auto' }}>
        {state.totalEvaluated} notes
      </div>
    </div>
  );
};
