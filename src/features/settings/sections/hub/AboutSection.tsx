import { APP_VERSION } from '@/constants/version';
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

export const AboutSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="About"
        description="App version, policies, and legal terms."
      />
      <SettingsCard title="Music Atlas">
        <div className="flex items-center justify-between">
          <span style={LABEL}>Version</span>
          <span
            style={{ fontSize: '0.875rem', color: 'var(--color-text-dim)' }}
          >
            {APP_VERSION}
          </span>
        </div>
      </SettingsCard>
      <SettingsCard
        title="Legal"
        description="Read our privacy and terms documents."
      >
        <div className="flex flex-wrap gap-3">
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
              window.open('https://www.musicatlas.io/policies/terms', '_blank')
            }
          >
            Terms and Conditions
          </button>
        </div>
      </SettingsCard>
    </div>
  );
};
