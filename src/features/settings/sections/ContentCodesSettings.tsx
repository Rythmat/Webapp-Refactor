/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { Hash } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ProfileRoutes } from '@/constants/routes';

const HEADING: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--color-text)',
};

const PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--color-border)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
};

const LABEL: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--color-text-dim)',
  whiteSpace: 'nowrap',
};

const BTN_CONFIRM: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: 'var(--color-text)',
  border: 'none',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

export const ContentCodesSettings = () => {
  const [code, setCode] = useState('');

  const handleConfirm = () => {
    if (!code.trim()) return;
    // Submit code to API (not yet implemented)
    setCode('');
  };

  return (
    <>
      {/* Add Code section */}
      <h2 style={HEADING}>Add Code</h2>
      <div className="glass-panel-sm space-y-4" style={PANEL}>
        <div className="flex items-center gap-4">
          <span style={LABEL}>Enter New Code</span>
          <div className="relative flex-1">
            <Hash
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2"
              style={{ color: 'var(--color-text-dim)' }}
            />
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ENTER A CODE PROVIDED VIA FLYER OR EMAIL"
              className="pl-9 text-sm uppercase tracking-wider"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            />
          </div>
          <button
            type="button"
            disabled={!code.trim()}
            style={{
              ...BTN_CONFIRM,
              opacity: !code.trim() ? 0.4 : 1,
            }}
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
        <p
          className="text-right"
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-dim)',
          }}
        >
          If you have a discount code instead, you can enter it{' '}
          <a
            href={ProfileRoutes.plan()}
            style={{ color: 'var(--color-accent)' }}
            className="hover:underline"
          >
            HERE
          </a>
          .
        </p>
      </div>

      {/* Unlocked Content section */}
      <h2 style={HEADING}>Unlocked Content</h2>
    </>
  );
};
