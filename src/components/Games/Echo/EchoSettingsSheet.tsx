import { TriangleAlert } from 'lucide-react';
import { SavedRollViewSwitch } from '@/components/notation/RollViewToggle';
import type { EchoLevelNumber } from '@/curriculum/engine/echo';
import {
  GuitarSheet,
  SegmentedControl,
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from '@/curriculum/guitar/layout/settingsControls';
import { inputFor, useEchoSettings, type EchoInputMode } from './echoSettings';

// ── Game Settings ──────────────────────────────────────────────────────────
// The lessons' settings sheet (GuitarSheet, the landing look), holding:
//
//   Play          Pads or Keyboard
//   View          the roll, the staff or falling notes (the keyboard's view)
//   Sound         the drum groove under the music
//   Scaffolding   Make Your Song's training wheels, all off unless turned
//                 on, under a short warning: they make creating easy but
//                 can encourage random pressing
//
// Everything is remembered on this device (echoSettings.ts).

const INPUT_OPTIONS = [
  { value: 'pads', label: 'Pads' },
  { value: 'keyboard', label: 'Keyboard' },
] as const;

export interface EchoSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The level being set up or played: its default input. */
  level: EchoLevelNumber;
}

export function EchoSettingsSheet({
  open,
  onOpenChange,
  level,
}: EchoSettingsSheetProps) {
  const [settings, update] = useEchoSettings();
  const input = inputFor(settings, level);
  return (
    <GuitarSheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      name="echo-settings"
      eyebrow="Echo"
      title="Game Settings"
      width={400}
    >
      <div className="flex flex-col gap-5">
        <SettingsSection label="Play">
          <SettingsRow
            label="Play with"
            helper="Pads to start at Level 1, the keyboard from Level 2. Switch any time."
            stacked
            forControl={false}
          >
            {({ labelId }) => (
              <SegmentedControl<EchoInputMode>
                options={INPUT_OPTIONS}
                value={input}
                onChange={(value) => update({ input: value })}
                labelledBy={labelId}
              />
            )}
          </SettingsRow>
        </SettingsSection>

        <SettingsSection label="View">
          <SettingsRow
            label="Notes on the keyboard screen"
            helper="The call and your answer as a roll, on the staff, or falling into the keys."
            stacked
            forControl={false}
          >
            <SavedRollViewSwitch />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection label="Sound">
          <SettingsSwitchRow
            label="Drum groove"
            helper="A beat under Atlas’s calls and your answers."
            checked={settings.groove}
            onCheckedChange={(groove) => update({ groove })}
          />
        </SettingsSection>

        <SettingsSection label="Scaffolding">
          <p
            data-echo-scaffolding-warning
            className="mb-1 flex gap-2 rounded-lg border border-[#fea92a]/30 bg-[#fea92a]/10 p-3 text-xs leading-5 text-[#f6d39b]"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            Training wheels for Make Your Song. They make it easy to create, but
            they can make random button pressing sound good, and that’s not a
            habit you want to develop long term. So put the guardrails on if you
            have a good reason to, but don’t keep them up for long. Above all,
            have fun!
          </p>
          <SettingsSwitchRow
            label="Auto-Tune Melody"
            helper="Notes snap to the nearest note in your key."
            checked={settings.scaffolding.autoTune}
            onCheckedChange={(autoTune) =>
              update({ scaffolding: { autoTune } })
            }
          />
          <SettingsSwitchRow
            label="Roots Only Chords"
            helper="Play one note and get its chord."
            checked={settings.scaffolding.rootsOnly}
            onCheckedChange={(rootsOnly) =>
              update({ scaffolding: { rootsOnly } })
            }
          />
          <SettingsSwitchRow
            label="Auto Fill Bars"
            helper="Keeps your take in the lines: chords on the bar line, notes on the beat."
            checked={settings.scaffolding.autoFill}
            onCheckedChange={(autoFill) =>
              update({ scaffolding: { autoFill } })
            }
          />
        </SettingsSection>
      </div>
    </GuitarSheet>
  );
}
