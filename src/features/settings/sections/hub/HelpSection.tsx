import { SettingsSectionHeader } from '../../SettingsSectionHeader';
import { HelpPanel } from '../HelpPanel';

export const HelpSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="Help"
        description="Answers to common questions and shortcuts to the support center."
      />
      <div className="flex flex-col gap-6">
        <HelpPanel />
      </div>
    </div>
  );
};
