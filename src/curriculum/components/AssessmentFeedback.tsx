/**
 * Phase 13 — Assessment Feedback.
 *
 * Visual results display after a student submits an assessment:
 * correct/incorrect indicators, timing bars, grade badge.
 */

import React from 'react';
import type { AssessmentResult } from '../engine/assessmentEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentFeedbackProps {
  result: AssessmentResult;
  /** Callback to retry the assessment */
  onRetry?: () => void;
  /** Callback to continue to the next step */
  onContinue?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AssessmentFeedback: React.FC<AssessmentFeedbackProps> = ({
  result,
  onRetry,
  onContinue,
}) => {
  const { score, matchResult } = result;
  const gradeColors: Record<string, string> = {
    A: '#4aff4a',
    B: '#8adf4a',
    C: '#dfdf4a',
    retry: '#ff4a4a',
  };

  return (
    <div
      style={{ padding: '16px', background: '#1a1a2e', borderRadius: '12px' }}
    >
      {/* Grade badge */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '48px',
            fontWeight: 700,
            color: gradeColors[score.grade] ?? '#aaa',
          }}
        >
          {score.grade === 'retry' ? 'Retry' : score.grade}
        </span>
        <div style={{ fontSize: '18px', color: '#ccc', marginTop: '4px' }}>
          {Math.round(score.accuracy)}% accuracy
        </div>
        <div style={{ fontSize: '14px', color: '#888', marginTop: '2px' }}>
          {score.correctCount}/{score.totalExpected} notes correct
        </div>
      </div>

      {/* Timing score (if applicable) */}
      {score.timingScore !== undefined && (
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: '#888' }}>
            Timing: {Math.round(score.timingScore)}%
          </div>
          {matchResult.avgTimingDeviationMs !== undefined && (
            <div style={{ fontSize: '12px', color: '#666' }}>
              Avg deviation: {Math.round(matchResult.avgTimingDeviationMs)}ms
            </div>
          )}
        </div>
      )}

      {/* Per-note results */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        {matchResult.noteResults.map((nr, i) => (
          <div
            key={i}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              background: nr.matched ? '#2a5a2a' : '#5a2a2a',
              border: `1px solid ${nr.matched ? '#4aff4a' : '#ff4a4a'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: nr.matched ? '#4aff4a' : '#ff4a4a',
            }}
            title={
              nr.timingDeviationMs !== undefined
                ? `${Math.round(nr.timingDeviationMs)}ms`
                : undefined
            }
          >
            {nr.matched ? '\u2713' : '\u2717'}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {!score.passed && onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '10px 24px',
              background: '#3a3a5e',
              border: '1px solid #555',
              borderRadius: '8px',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try Again
          </button>
        )}
        {score.passed && onContinue && (
          <button
            onClick={onContinue}
            style={{
              padding: '10px 24px',
              background: '#1a4a2a',
              border: '1px solid #4aff4a',
              borderRadius: '8px',
              color: '#4aff4a',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
};
