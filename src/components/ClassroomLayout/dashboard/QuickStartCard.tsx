import type { FC } from 'react';

interface QuickStartCardProps {
  onContinue: () => void;
  onNewSession: () => void;
}

const Icon: FC<{ src: string; style?: React.CSSProperties }> = ({
  src,
  style,
}) => (
  <img
    src={src}
    alt=""
    draggable={false}
    className="flex-shrink-0 opacity-100"
    style={style}
  />
);

export const QuickStartCard: FC<QuickStartCardProps> = ({
  onContinue,
  onNewSession,
}) => {
  return (
    <div
      className="glass-panel-sm flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(20, 20, 20, 0.78)',
        padding: 'clamp(0.75rem, 1.5vw, 1.25rem)',
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Icon
          src="/icons/quick-start-icon.svg"
          style={{
            width: 'clamp(0.875rem, 1.3vw, 1.15rem)',
            height: 'clamp(0.875rem, 1.3vw, 1.15rem)',
          }}
        />
        <span
          className="font-medium text-white"
          style={{ fontSize: 'clamp(0.75rem, 1.05vw, 1rem)' }}
        >
          Quick Start
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onContinue}
          className="flex flex-1 items-center gap-2 rounded-xl font-medium text-white transition-colors hover:bg-white/5"
          style={{
            background: 'rgba(30, 30, 30, 0.6)',
            padding:
              'clamp(0.55rem, 1vw, 0.85rem) clamp(0.6rem, 1.1vw, 0.9rem)',
            fontSize: 'clamp(0.7rem, 1vw, 0.875rem)',
          }}
        >
          <Icon
            src="/icons/continue-learning-icon.svg"
            style={{
              width: 'clamp(0.875rem, 1.15vw, 1.1rem)',
              height: 'clamp(0.875rem, 1.15vw, 1.1rem)',
            }}
          />
          Continue Learning
        </button>
        <button
          type="button"
          onClick={onNewSession}
          className="flex flex-1 items-center gap-2 rounded-xl font-medium text-white transition-colors hover:bg-white/5"
          style={{
            background: 'rgba(30, 30, 30, 0.6)',
            padding:
              'clamp(0.55rem, 1vw, 0.85rem) clamp(0.6rem, 1.1vw, 0.9rem)',
            fontSize: 'clamp(0.7rem, 1vw, 0.875rem)',
          }}
        >
          <Icon
            src="/icons/new-session-icon.svg"
            style={{
              width: 'clamp(0.875rem, 1.15vw, 1.1rem)',
              height: 'clamp(0.875rem, 1.15vw, 1.1rem)',
            }}
          />
          New Session
        </button>
      </div>
    </div>
  );
};
