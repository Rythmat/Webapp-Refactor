import { LegalRoutes } from '@/constants/routes';
import { APP_VERSION } from '@/constants/version';
import {
  ACCOUNT_PILL,
  AccountPage,
  AccountSection,
  SettingsGroup,
  SettingsRow,
} from '../../ui/accountKit';

/** About, in the Account area's look (owner, 2026-11-10): no teal. */
export const AboutSection = () => (
  <AccountPage title="About">
    <AccountSection
      title="Music Atlas"
      description="App version, policies, and legal terms."
      spacing="cards"
    >
      <SettingsGroup>
        <SettingsRow
          plain
          title="Version"
          action={
            <span className="text-[0.795rem] text-white/70">{APP_VERSION}</span>
          }
        />
      </SettingsGroup>
      <SettingsGroup>
        <SettingsRow
          plain
          title="Privacy Policy"
          action={
            <button
              type="button"
              className={ACCOUNT_PILL}
              onClick={() => window.open(LegalRoutes.privacyPolicy(), '_blank')}
            >
              Read
            </button>
          }
        />
        <SettingsRow
          plain
          title="Terms and Conditions"
          action={
            <button
              type="button"
              className={ACCOUNT_PILL}
              onClick={() =>
                window.open(LegalRoutes.termsOfService(), '_blank')
              }
            >
              Read
            </button>
          }
        />
      </SettingsGroup>
    </AccountSection>
  </AccountPage>
);
