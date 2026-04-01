// ── CalibrationWizard ─────────────────────────────────────────────────────
// Optional 3-step calibration flow for acoustic piano detection.
//
// Steps:
//   1. Silence (3s) — "Don't play" → captures room noise floor
//   2. Single note (5s) — "Play and hold middle C" → tuning, dynamics, decay
//   3. Chord (5s) — "Play C major chord" → validates detection, harmonic weights
//
// Works without calibration. Calibrate for best results.

import { Mic, Music, Piano, CheckCircle, X, Loader } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { LearnAudioCapture } from '@/learn/audio/LearnAudioCapture';
import {
  PianoCalibrationRunner,
  loadCalibrationProfile,
  clearCalibrationProfile,
  type CalibrationProgress,
  type CalibrationStep,
  type PianoCalibrationProfile,
} from '@/learn/audio/PianoCalibration';
import { AudioLevelMeter } from './AudioLevelMeter';

// ── Types ────────────────────────────────────────────────────────────────

interface CalibrationWizardProps {
  /** The active audio capture instance (must be started). */
  capture: LearnAudioCapture;
  /** Device ID of the active audio device. */
  deviceId: string;
  /** Called when calibration completes successfully. */
  onComplete: (profile: PianoCalibrationProfile) => void;
  /** Called when wizard is dismissed. */
  onClose: () => void;
}

type WizardState = 'intro' | 'running' | 'complete' | 'error';

// ── Step config ──────────────────────────────────────────────────────────

const STEP_CONFIG: Record<
  CalibrationStep,
  { title: string; instruction: string; icon: typeof Mic }
> = {
  silence: {
    title: 'Room Noise',
    instruction: "Don't play anything. Stay quiet.",
    icon: Mic,
  },
  'single-note': {
    title: 'Single Note',
    instruction: 'Play and hold middle C (C4).',
    icon: Music,
  },
  chord: {
    title: 'Chord',
    instruction: 'Play a C major chord (C-E-G).',
    icon: Piano,
  },
};

const STEP_ORDER: CalibrationStep[] = ['silence', 'single-note', 'chord'];

// ── Component ────────────────────────────────────────────────────────────

export const CalibrationWizard = memo(function CalibrationWizard({
  capture,
  deviceId,
  onComplete,
  onClose,
}: CalibrationWizardProps) {
  const [wizardState, setWizardState] = useState<WizardState>('intro');
  const [progress, setProgress] = useState<CalibrationProgress | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const runnerRef = useRef<PianoCalibrationRunner | null>(null);
  const levelRafRef = useRef(0);
  const hasExistingProfile = loadCalibrationProfile() !== null;

  // Level metering
  useEffect(() => {
    if (wizardState !== 'running') return;

    const tick = () => {
      if (capture.isActive) {
        setInputLevel(capture.updateLevel());
      }
      levelRafRef.current = requestAnimationFrame(tick);
    };
    levelRafRef.current = requestAnimationFrame(tick);

    return () => {
      if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    };
  }, [wizardState, capture]);

  const startCalibration = useCallback(async () => {
    const onsetAnalyser = capture.getOnsetAnalyser();
    const chromaAnalyser = capture.getChromaAnalyser();

    if (!onsetAnalyser || !chromaAnalyser) {
      setErrorMsg('Audio capture not active');
      setWizardState('error');
      return;
    }

    const runner = new PianoCalibrationRunner();
    runnerRef.current = runner;
    setWizardState('running');

    const profile = await runner.run(
      onsetAnalyser,
      chromaAnalyser,
      deviceId,
      (p) => setProgress(p),
    );

    if (profile) {
      setWizardState('complete');
      onComplete(profile);
    } else {
      setErrorMsg('Calibration was cancelled');
      setWizardState('error');
    }
  }, [capture, deviceId, onComplete]);

  const handleAbort = useCallback(() => {
    runnerRef.current?.abort();
    onClose();
  }, [onClose]);

  const handleClearProfile = useCallback(() => {
    clearCalibrationProfile();
    onClose();
  }, [onClose]);

  // Current step index for progress display
  const currentStepIdx = progress ? STEP_ORDER.indexOf(progress.step) : -1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 380,
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'var(--color-surface, #1a1a2e)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-text)',
            }}
          >
            Piano Calibration
          </span>
          <button
            onClick={handleAbort}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Intro state */}
        {wizardState === 'intro' && (
          <>
            <p
              style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              This optional calibration improves detection accuracy for your
              specific piano and room. It takes about 15 seconds.
            </p>

            {/* Step preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STEP_ORDER.map((step, i) => {
                const cfg = STEP_CONFIG[step];
                const Icon = cfg.icon;
                return (
                  <div
                    key={step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 11,
                      color: 'rgba(255, 255, 255, 0.6)',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {i + 1}
                    </span>
                    <Icon size={12} />
                    <span>{cfg.title}</span>
                    <span style={{ opacity: 0.5 }}>— {cfg.instruction}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={startCalibration}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#4ade80',
                  color: '#000',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Start Calibration
              </button>
              {hasExistingProfile && (
                <button
                  onClick={handleClearProfile}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  Clear Saved
                </button>
              )}
            </div>
          </>
        )}

        {/* Running state */}
        {wizardState === 'running' && progress && (
          <>
            {/* Step indicators */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              {STEP_ORDER.map((step, i) => (
                <div
                  key={step}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background:
                      i < currentStepIdx
                        ? '#4ade80'
                        : i === currentStepIdx
                          ? '#60a5fa'
                          : 'rgba(255, 255, 255, 0.15)',
                    transition: 'background 0.3s',
                  }}
                />
              ))}
            </div>

            {/* Current step info */}
            <div
              style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Loader
                size={20}
                style={{
                  color: '#60a5fa',
                  animation: 'spin 1.5s linear infinite',
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                {STEP_CONFIG[progress.step].title}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'rgba(255, 255, 255, 0.7)',
                }}
              >
                {STEP_CONFIG[progress.step].instruction}
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(progress.elapsed / progress.total) * 100}%`,
                  height: '100%',
                  borderRadius: 2,
                  background: '#60a5fa',
                  transition: 'width 100ms linear',
                }}
              />
            </div>

            {/* Level meter */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                Input:
              </span>
              <AudioLevelMeter level={inputLevel} width={120} height={6} />
            </div>

            {/* Detected note/chord */}
            {(progress.detectedNote || progress.detectedChord) && (
              <div
                style={{
                  textAlign: 'center',
                  fontSize: 11,
                  color: '#4ade80',
                }}
              >
                Detected: {progress.detectedNote ?? progress.detectedChord}
              </div>
            )}

            <button
              onClick={handleAbort}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: 11,
                cursor: 'pointer',
                alignSelf: 'center',
              }}
            >
              Cancel
            </button>
          </>
        )}

        {/* Complete state */}
        {wizardState === 'complete' && (
          <>
            <div
              style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <CheckCircle size={28} style={{ color: '#4ade80' }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                Calibration Complete
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'rgba(255, 255, 255, 0.6)',
                }}
              >
                Detection has been optimized for your piano.
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: 'none',
                background: '#4ade80',
                color: '#000',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </>
        )}

        {/* Error state */}
        {wizardState === 'error' && (
          <>
            <div
              style={{
                textAlign: 'center',
                fontSize: 12,
                color: '#f87171',
              }}
            >
              {errorMsg ?? 'Calibration failed'}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setWizardState('intro')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'transparent',
                  color: 'var(--color-text)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
