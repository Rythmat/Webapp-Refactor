import {
  AudioTimingRow,
  MetronomeRow,
  VolumeRow,
} from '@/curriculum/guitar/layout/GuitarSettingsSheet';
import {
  GuitarSheet,
  SettingsSection,
} from '@/curriculum/guitar/layout/settingsControls';

// ── PianoSettingsSheet ─────────────────────────────────────────────────────
// The gear's sheet on piano: the Sound rows guitar has (the metronome, the
// volume and audio timing). The piano screen keeps them here, as guitar
// does, so the keyboard gets the full width.

export interface PianoSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outputLatencyMs: number;
  openAudioTiming: () => void;
}

export function PianoSettingsSheet({
  open,
  onOpenChange,
  outputLatencyMs,
  openAudioTiming,
}: PianoSettingsSheetProps) {
  return (
    <GuitarSheet
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      name="settings"
      title="Lesson settings"
      width={400}
    >
      <SettingsSection label="Sound">
        <MetronomeRow />
        <VolumeRow />
        <AudioTimingRow
          latencyMs={outputLatencyMs}
          onOpen={() => {
            onOpenChange(false);
            openAudioTiming();
          }}
        />
      </SettingsSection>
    </GuitarSheet>
  );
}
