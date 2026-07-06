import { SettingsSectionHeader } from '../../SettingsSectionHeader';
import { LookAndFeelSettings } from '../LookAndFeelSettings';

export const LookAndFeelSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="Look & Feel"
        description="App sounds, preview behaviour, contrast, and note streaks."
      />
      <div className="flex flex-col gap-6">
        <LookAndFeelSettings />
      </div>
    </div>
  );
};
