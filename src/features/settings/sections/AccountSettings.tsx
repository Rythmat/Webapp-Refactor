/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/data';
import { EditAccountModal } from '../EditAccountModal';

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
};

const BTN_OUTLINE: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--color-accent)',
  border: '1px solid var(--color-accent)',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

const BTN_ACCENT: React.CSSProperties = {
  background: 'var(--color-accent)',
  color: '#111',
  border: 'none',
  borderRadius: '9999px',
  padding: '0.375rem 1rem',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
};

export const AccountSettings = () => {
  const { data: user } = useMe();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      {/* Account section */}
      <h2 style={HEADING}>Account</h2>
      <div className="glass-panel-sm space-y-4" style={PANEL}>
        <div className="flex items-center justify-between">
          <span style={LABEL}>Account</span>
          <span
            style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}
          >
            {user?.email ?? '—'}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            style={BTN_OUTLINE}
            onClick={() => setEditOpen(true)}
          >
            Edit Account
          </button>
          <button
            type="button"
            style={BTN_ACCENT}
            onClick={() => {
              signOut();
              navigate('/');
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* About section */}
      <h2 style={HEADING}>About</h2>
      <div className="glass-panel-sm space-y-4" style={PANEL}>
        <div className="flex items-center justify-between">
          <span style={LABEL}>Version</span>
          <span
            style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}
          >
            1.0.0
          </span>
        </div>
        <div className="flex items-start justify-between">
          <span style={{ ...LABEL, paddingTop: '0.5rem' }}>Legal</span>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              style={BTN_OUTLINE}
              onClick={() =>
                window.open(
                  'https://www.musicatlas.io/policies/privacy',
                  '_blank',
                )
              }
            >
              Privacy Policy
            </button>
            <button
              type="button"
              style={BTN_OUTLINE}
              onClick={() =>
                window.open(
                  'https://www.musicatlas.io/policies/terms',
                  '_blank',
                )
              }
            >
              Terms and Conditions
            </button>
          </div>
        </div>
      </div>

      <EditAccountModal
        open={editOpen}
        onOpenChange={setEditOpen}
        currentEmail={user?.email ?? ''}
        currentName={user?.fullName ?? ''}
      />
    </>
  );
};
