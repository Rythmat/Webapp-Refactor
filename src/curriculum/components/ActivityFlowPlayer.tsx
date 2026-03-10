/**
 * Phase 13 — Activity Flow Player.
 *
 * Top-level component that orchestrates an activity flow:
 * section navigation (A/B/C/D), step rendering,
 * content generation, and assessment handling.
 */

import React, { useEffect } from 'react';
import type { CurriculumGenreId } from '../bridge/genreIdMap';
import { useActivityFlow } from '../hooks/useActivityFlow';
import type { ActivityFlow } from '../types/activity';
import type { CurriculumLevelId } from '../types/curriculum';
import { ActivityStepComponent } from './ActivityStep';
import { SectionNav } from './SectionNav';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActivityFlowPlayerProps {
  flow: ActivityFlow;
  genre: CurriculumGenreId;
  level: CurriculumLevelId;
  keyRoot: number;
  tempo?: number;
  /** Called when the entire flow is completed */
  onFlowComplete?: () => void;
  /** Called when student submits MIDI input — returns note events for assessment */
  onCaptureInput?: () => import('../engine/melodyPipeline').MidiNoteEvent[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ActivityFlowPlayer: React.FC<ActivityFlowPlayerProps> = ({
  flow,
  genre,
  level,
  keyRoot,
  tempo,
  onFlowComplete,
  onCaptureInput,
}) => {
  const {
    currentSectionId,
    currentSection,
    currentStep,
    currentStepIndex,
    generatedContent,
    isGenerating,
    isFlowComplete,
    sectionProgress,
    stepStates,
    goToSection,
    nextStep,
    prevStep,
    completeStep,
    submitAssessment,
    generateContent,
    getStepStatus,
  } = useActivityFlow(flow, genre, level, keyRoot);

  // Generate content on mount and when key/tempo changes
  useEffect(() => {
    generateContent(tempo);
  }, [generateContent, tempo]);

  // Notify parent when flow is complete
  useEffect(() => {
    if (isFlowComplete && onFlowComplete) {
      onFlowComplete();
    }
  }, [isFlowComplete, onFlowComplete]);

  const availableSections = flow.sections.map((s) => s.id);

  // Handle assessment submission
  const handleSubmit = () => {
    if (!onCaptureInput) return;
    const receivedNotes = onCaptureInput();
    const result = submitAssessment(receivedNotes);
    if (result?.score.passed) {
      // Auto-advance after a short delay for passed assessments
    }
  };

  // Handle non-assessed step completion
  const handleSkip = () => {
    completeStep();
    nextStep();
  };

  // Handle retry after failed assessment
  const handleRetry = () => {
    // Re-generate content for a fresh attempt
    generateContent(tempo);
  };

  // Handle continue after passed assessment
  const handleContinue = () => {
    nextStep();
  };

  // Get step state for the current step
  const currentStepKey = `${currentSectionId}:${currentStepIndex}`;
  const currentStepState = stepStates.get(currentStepKey);
  const currentStatus =
    currentStepState?.status ?? (currentStep ? 'active' : 'locked');

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Flow header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ color: '#eee', margin: '0 0 4px 0', fontSize: '22px' }}>
          {flow.title}
        </h2>
        <div style={{ fontSize: '13px', color: '#888' }}>
          Level {flow.level} &middot; Key: {keyRoot} &middot; Tempo:{' '}
          {generatedContent?.tempo ?? tempo ?? '—'}
        </div>
      </div>

      {/* Section navigation */}
      <SectionNav
        currentSectionId={currentSectionId}
        sectionProgress={sectionProgress}
        onSectionSelect={goToSection}
        availableSections={availableSections}
      />

      {/* Section content */}
      {currentSection && (
        <div style={{ marginTop: '16px' }}>
          {/* Step list / progress indicator */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '16px',
              alignItems: 'center',
            }}
          >
            {currentSection.steps.map((_, i) => {
              const stepStatus = getStepStatus(currentSectionId, i);
              const isCurrent = i === currentStepIndex;
              return (
                <div
                  key={i}
                  style={{
                    width: isCurrent ? '24px' : '16px',
                    height: '6px',
                    borderRadius: '3px',
                    background:
                      stepStatus === 'completed'
                        ? '#4aff4a'
                        : stepStatus === 'failed'
                          ? '#ff4a4a'
                          : isCurrent
                            ? '#4a9eff'
                            : '#333',
                    transition: 'all 0.2s',
                  }}
                />
              );
            })}
            <span
              style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}
            >
              {currentStepIndex + 1}/{currentSection.steps.length}
            </span>
          </div>

          {/* Current step */}
          {currentStep && (
            <ActivityStepComponent
              step={currentStep}
              status={currentStatus}
              assessmentResult={currentStepState?.assessmentResult}
              onSubmit={handleSubmit}
              onRetry={handleRetry}
              onContinue={handleContinue}
              onSkip={handleSkip}
              isGenerating={isGenerating}
            />
          )}

          {/* Navigation arrows */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '16px',
            }}
          >
            <button
              onClick={() => prevStep()}
              disabled={currentStepIndex === 0}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #444',
                borderRadius: '6px',
                color: currentStepIndex === 0 ? '#444' : '#888',
                cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              &#8592; Previous
            </button>

            {isFlowComplete && (
              <div
                style={{
                  padding: '8px 20px',
                  background: '#1a4a2a',
                  border: '1px solid #4aff4a',
                  borderRadius: '8px',
                  color: '#4aff4a',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                Flow Complete!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
