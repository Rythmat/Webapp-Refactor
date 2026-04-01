import { Lock, LockOpen } from 'lucide-react';
import { type FC, type ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileRoutes } from '@/constants/routes';

interface LockedFeatureOverlayProps {
  /** When true the overlay is shown and the content is greyed out. */
  locked: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps any feature tile/card to apply a premium-lock treatment for free users.
 *
 * Visual spec:
 * - Content is desaturated to a muted light grey (still visible).
 * - A semi-transparent dark-grey circle with a lock icon is centered over it.
 * - On hover the lock opens and "Subscribe to unlock content" tooltip appears.
 * - Clicking the lock navigates to `/home/user/plan`.
 *
 * When `locked` is false, renders children with zero overhead.
 */
export const LockedFeatureOverlay: FC<LockedFeatureOverlayProps> = ({
  locked,
  children,
  className = '',
}) => {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  if (!locked) {
    return className ? (
      <div className={className}>{children}</div>
    ) : (
      <>{children}</>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Greyed-out content — pointer-events disabled so clicks fall through to overlay */}
      <div
        style={{
          filter: 'grayscale(100%) brightness(0.55)',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          navigate(ProfileRoutes.plan.definition);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Dark circle backdrop */}
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-full transition-all duration-200"
          style={{
            width: 72,
            height: 72,
            background: hovered
              ? 'rgba(60, 60, 60, 0.92)'
              : 'rgba(50, 50, 50, 0.85)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          {hovered ? (
            <LockOpen size={24} color="#bbb" />
          ) : (
            <Lock size={24} color="#999" />
          )}
        </div>

        {/* Tooltip on hover */}
        {hovered && (
          <div
            className="absolute px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none"
            style={{
              bottom: 'calc(50% - 56px)',
              background: 'rgba(30, 30, 30, 0.95)',
              color: '#ccc',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}
          >
            Subscribe to unlock content
          </div>
        )}
      </div>
    </div>
  );
};
