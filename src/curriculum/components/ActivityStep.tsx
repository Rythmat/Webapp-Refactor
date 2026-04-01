/**
 * Phase 13 — Activity Step.
 *
 * Renders a single step within an activity flow section:
 * direction text, assessment indicator, status badge,
 * and action buttons (submit / skip / retry).
 */

import React from 'react';
import type { AssessmentResult } from '../engine/assessmentEngine';
import type { StepStatus } from '../hooks/useActivityFlow';
import type {
  ActivityStep as ActivityStepType,
  AssessmentType,
} from '../types/activity';
import { AssessmentFeedback } from './AssessmentFeedback';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityStepProps {
  step: ActivityStepType;
  status: StepStatus;
  assessmentResult?: AssessmentResult;
  /** Callback when the student submits their performance */
  onSubmit?: () => void;
  /** Callback to retry the current step */
  onRetry?: () => void;
  /** Callback to continue to the next step */
  onContinue?: () => void;
  /** Callback to skip this step (non-assessed steps) */
  onSkip?: () => void;
  /** Whether content is being generated */
  isGenerating?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ASSESSMENT_LABELS: Record<AssessmentType, string> = {
  pitch_only: 'Pitch Only',
  pitch_order: 'Pitch + Order',
  pitch_order_timing: 'Pitch + Order + Timing',
  pitch_order_timing_duration: 'Pitch + Order + Timing + Duration',
};

const STATUS_COLORS: Record<StepStatus, string> = {
  locked: '#555',
  active: '#4a9eff',
  completed: '#4aff4a',
  failed: '#ff4a4a',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ActivityStepComponent: React.FC<ActivityStepProps> = ({
  step,
  status,
  assessmentResult,
  onSubmit,
  onRetry,
  onContinue,
  onSkip,
  isGenerating,
}) => {
  const hasAssessment = step.assessment !== null;
  const showFeedback =
    assessmentResult && (status === 'completed' || status === 'failed');

  return (
    <div
      style={{
        padding: '20px',
        background: '#1a1a2e',
        borderRadius: '12px',
        border: `1px solid ${STATUS_COLORS[status]}`,
        opacity: status === 'locked' ? 0.5 : 1,
      }}
    >
      {/* Step header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: '#2a2a4e',
              color: '#888',
            }}
          >
            {step.subsection}
          </span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#ddd' }}>
            {step.activity}
          </span>
        </div>

        {/* Status badge */}
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: `${STATUS_COLORS[status]}22`,
            color: STATUS_COLORS[status],
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {status}
        </span>
      </div>

      {/* Direction text */}
      <p
        style={{
          fontSize: '15px',
          color: '#ccc',
          lineHeight: 1.5,
          margin: '0 0 16px 0',
        }}
      >
        {step.direction}
      </p>

      {/* Assessment type indicator */}
      {hasAssessment && (
        <div
          style={{
            fontSize: '12px',
            color: '#888',
            padding: '6px 10px',
            background: '#222',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'inline-block',
          }}
        >
          Assessment: {ASSESSMENT_LABELS[step.assessment!]}
        </div>
      )}

      {/* Style reference */}
      {step.styleRef && (
        <div
          style={{
            fontSize: '12px',
            color: '#666',
            marginBottom: '16px',
            fontStyle: 'italic',
          }}
        >
          Style ref: {step.styleRef}
        </div>
      )}

      {/* Assessment feedback (post-submission) */}
      {showFeedback && (
        <div style={{ marginBottom: '16px' }}>
          <AssessmentFeedback
            result={assessmentResult!}
            onRetry={status === 'failed' ? onRetry : undefined}
            onContinue={status === 'completed' ? onContinue : undefined}
          />
        </div>
      )}

      {/* Success feedback text */}
      {status === 'completed' && step.successFeedback && (
        <div
          style={{
            fontSize: '14px',
            color: '#4aff4a',
            padding: '10px',
            background: '#1a3a1a',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          {step.successFeedback}
        </div>
      )}

      {/* Action buttons */}
      {status === 'active' && !showFeedback && (
        <div style={{ display: 'flex', gap: '12px' }}>
          {hasAssessment && onSubmit && (
            <button
              onClick={onSubmit}
              disabled={isGenerating}
              style={{
                padding: '10px 24px',
                background: '#1a4a6a',
                border: '1px solid #4a9eff',
                borderRadius: '8px',
                color: '#4a9eff',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              {isGenerating ? 'Generating...' : 'Submit'}
            </button>
          )}

          {!hasAssessment && onSkip && (
            <button
              onClick={onSkip}
              style={{
                padding: '10px 24px',
                background: '#2a2a4e',
                border: '1px solid #555',
                borderRadius: '8px',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Mark Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
