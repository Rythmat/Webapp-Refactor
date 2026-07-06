import { SettingsSectionHeader } from '../../SettingsSectionHeader';
import { MidiSettings } from '../MidiSettings';

export const MidiSection = () => {
  return (
    <div className="flex flex-col gap-8">
      <SettingsSectionHeader
        title="MIDI"
        description="Connect your instrument, tune hit sensitivity, and manage mappings."
      />
      <div className="flex flex-col gap-6">
        <MidiSettings />
      </div>
    </div>
  );
};
