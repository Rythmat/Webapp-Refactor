import { AccountPage, AccountSection } from '../../ui/accountKit';
import { HelpPanel } from '../HelpPanel';

export const HelpSection = () => (
  <AccountPage title="Help">
    <AccountSection
      title="Need help?"
      description="Answers to common questions and shortcuts to the support center."
      spacing="cards"
    >
      <HelpPanel />
    </AccountSection>
  </AccountPage>
);
