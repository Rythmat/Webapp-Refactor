import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/data';
import { EditAccountModal } from '../../EditAccountModal';
import { SettingsCard } from '../../SettingsCard';
import { SettingsSectionHeader } from '../../SettingsSectionHeader';

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

export const AccountSection = () => {
  const { data: user } = useMe();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="Account"
        description="Email, sign-in, and account access."
      />
      <SettingsCard
        title="Account details"
        description="Update your credentials or sign out."
      >
        <div className="flex items-center justify-between">
          <span style={LABEL}>Email</span>
          <span
            style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}
          >
            {user?.email ?? '—'}
          </span>
        </div>
        <div className="flex gap-3 pt-2">
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
      </SettingsCard>

      <EditAccountModal
        open={editOpen}
        onOpenChange={setEditOpen}
        currentEmail={user?.email ?? ''}
        currentName={user?.fullName ?? ''}
      />
    </div>
  );
};
