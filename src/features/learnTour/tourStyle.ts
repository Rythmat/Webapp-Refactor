import type { CSSProperties } from 'react';

// The Learn tours' look. Their layer sits on <body>, outside the
// dashboard's scoped tokens (dashboard.css), so it carries the same values.

export const TOUR_ACCENT = '#7ecfcf';
export const TOUR_TEXT = '#e8e8f0';
export const TOUR_TEXT_DIM = 'rgba(232, 232, 240, 0.6)';
export const TOUR_SURFACE = '#151518';
export const TOUR_HAIRLINE = 'rgba(255, 255, 255, 0.1)';
export const TOUR_FONT =
  "'Glacial Indifference', 'Haskoy', system-ui, -apple-system, sans-serif";

/** Above the lesson sheets, popovers and dialogs (z-50) and the Studio's lessons. */
export const TOUR_Z = 80;

export const TOUR_KEYFRAMES = `
@keyframes learnTourPulse {
  0%, 100% { opacity: 0; }
  50%      { opacity: 1; }
}
@keyframes learnTourPuff {
  0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0.9; }
  100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.6); opacity: 0; }
}
`;

export const primaryButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 16px',
  fontSize: 14,
  fontWeight: 700,
  borderRadius: 9999,
  border: 'none',
  background: '#fff',
  color: '#101012',
  cursor: 'pointer',
};

export const secondaryButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 14px',
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 9999,
  border: `1px solid ${TOUR_HAIRLINE}`,
  background: 'transparent',
  color: TOUR_TEXT,
  cursor: 'pointer',
};
