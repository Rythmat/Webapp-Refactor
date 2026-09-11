import { SettingsSectionHeader } from '../../SettingsSectionHeader';
import { ChordNotationSettings } from '../ChordNotationSettings';
import { LookAndFeelSettings } from '../LookAndFeelSettings';

export const LookAndFeelSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="Look & Feel"
        description="App sounds, preview behaviour, contrast, note streaks, and how chord symbols are written."
      />
      <div className="flex flex-col gap-6">
        <LookAndFeelSettings />
        <ChordNotationSettings />
      </div>
    </div>
  );
};
