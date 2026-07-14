import { SettingsSectionHeader } from '../../SettingsSectionHeader';
import { AudioSettings } from '../AudioSettings';

export const AudioSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="Audio"
        description="Output device, latency, and volume for the app."
      />
      <div className="flex flex-col gap-6">
        <AudioSettings />
      </div>
    </div>
  );
};
