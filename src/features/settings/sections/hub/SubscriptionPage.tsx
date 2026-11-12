import { PlanPage } from '../../PlanPage';
import { AccountPage, AccountSection } from '../../ui/accountKit';
import { BillingSettings } from '../BillingSettings';
import { ContentCodesSettings } from '../ContentCodesSettings';

// ── Account › Subscription (owner, 2026-11-10: samply.app/subscription's) ──
// The plan first (its tiers and credits, the old Plan page's), then how it's
// paid for and the codes that unlock content, each a titled section. The old
// addresses (/home/user/plan, /settings/billing) land here.

export const SubscriptionPage = () => (
  <AccountPage title="Subscription">
    <PlanPage embedded />
    <AccountSection
      title="Billing"
      description="Your payment method and invoices."
      spacing="cards"
    >
      <BillingSettings />
    </AccountSection>
    <AccountSection
      title="Codes"
      description="Content codes from your school or a gift."
      spacing="cards"
    >
      <ContentCodesSettings />
    </AccountSection>
  </AccountPage>
);
