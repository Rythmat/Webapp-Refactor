import type { PlayAlongResult } from './playAlongGrade';

interface PlayAlongRetryCardProps {
  result: PlayAlongResult;
  onTryAgain: () => void;
  /**
   * Moves on without marking the step complete. Omitted on a lesson's last
   * step: the lesson award needs every step, so the last one must be passed.
   */
  onContinueAnyway?: () => void;
}

/** Shown over a play-along run that didn't reach the pass mark. */
export const PlayAlongRetryCard = ({
  result,
  onTryAgain,
  onContinueAnyway,
}: PlayAlongRetryCardProps) => (
  <div className="absolute inset-0 flex items-center justify-center px-4">
    <div
      className="rounded-2xl px-8 py-6 text-center glass-panel"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text)',
      }}
    >
      <h3 className="text-2xl font-semibold">
        {result.hits === 0 && result.wrongNotes === 0
          ? 'No notes heard'
          : 'Not quite yet'}
      </h3>
      <p className="mt-2 text-sm" style={{ color: 'var(--color-text-dim)' }}>
        You played {result.hits} of {result.total} notes. You need{' '}
        {result.required} to pass.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
          style={{ background: 'var(--color-accent)', color: '#191919' }}
        >
          Try again
        </button>
        {onContinueAnyway && (
          <button
            type="button"
            onClick={onContinueAnyway}
            className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            Continue anyway
          </button>
        )}
      </div>
      <p className="mt-3 text-xs" style={{ color: 'var(--color-text-dim)' }}>
        {onContinueAnyway
          ? 'Continuing won’t mark this step complete.'
          : 'Pass this last step to complete the lesson.'}
      </p>
    </div>
  </div>
);
