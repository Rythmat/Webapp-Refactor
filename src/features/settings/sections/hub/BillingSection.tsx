import { SettingsSectionHeader } from '../../SettingsSectionHeader';
import { BillingSettings } from '../BillingSettings';
import { ContentCodesSettings } from '../ContentCodesSettings';

export const BillingSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="Billing"
        description="Manage your subscription, payment method, and content codes."
      />
      <div className="flex flex-col gap-6">
        <BillingSettings />
        <ContentCodesSettings />
      </div>
    </div>
  );
};
