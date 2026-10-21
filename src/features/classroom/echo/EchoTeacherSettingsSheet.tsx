import {
  GuitarSheet,
  SegmentedControl,
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from '@/curriculum/guitar/layout/settingsControls';
import type { EchoClassSettings } from './types';

// ── Teacher Settings: what students see ────────────────────────────────────
// The spec's table (docs/echo-classroom.md, Teacher Settings), in the
// lessons' settings sheet. Saved for the classroom (classSettings.ts); a
// change goes out to every device with the round.
//
// Two rows wait on step 3 and say so: the room speaker needs Tune In, and
// snapping the teacher's call matters once the teacher leads.

const PLAY_ON = [
  { value: 'choice', label: 'Their choice' },
  { value: 'pads', label: 'Pads only' },
  { value: 'keyboard', label: 'Keyboard only' },
] as const;

const AFTER_ROUND = [
  { value: 'result', label: 'Their own result' },
  { value: 'nothing', label: 'Nothing' },
] as const;

const LIGHTS = [
  { value: 'pads', label: 'The pads light' },
  { value: 'none', label: 'No lights' },
] as const;

const PROJECTOR = [
  { value: 'class', label: 'The class only' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'grid', label: 'Live grid' },
] as const;

const GRADING = [
  { value: 'quantized', label: 'Quantized' },
  { value: 'off', label: 'Off' },
] as const;

export interface EchoTeacherSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: EchoClassSettings;
  onChange: (patch: Partial<EchoClassSettings>) => void;
}

/** The Teacher Settings sheet (above). */
export function EchoTeacherSettingsSheet({
  open,
  onOpenChange,
  settings,
  onChange,
}: EchoTeacherSettingsSheetProps) {
  return (
    <GuitarSheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      name="echo-class-settings"
      eyebrow="Echo"
      title="Teacher Settings"
      width={440}
    >
      <div className="flex flex-col gap-5" data-echo-teacher-settings>
        <p className="text-xs leading-5 text-white/50">
          Saved for this class on this computer. Changes reach every device with
          the next update.
        </p>
        <SettingsSection label="Students">
          <SettingsRow
            label="Students play on"
            helper="iPads have no MIDI: there, students play the pads or the on-screen piano."
            stacked
            forControl={false}
          >
            {({ labelId }) => (
              <SegmentedControl
                options={PLAY_ON}
                value={settings.playOn}
                onChange={(playOn) => onChange({ playOn })}
                labelledBy={labelId}
              />
            )}
          </SettingsRow>
          <SettingsRow
            label="Sound"
            helper="Each device plays the call in its student's headphones. The room speaker comes with Tune In."
            stacked
            forControl={false}
          >
            <span className="inline-flex h-9 w-fit items-center rounded-full bg-white px-3 text-sm text-[#101012]">
              Headphones
            </span>
          </SettingsRow>
          <SettingsRow
            label="After each round, students see"
            stacked
            forControl={false}
          >
            {({ labelId }) => (
              <SegmentedControl
                options={AFTER_ROUND}
                value={settings.afterRound}
                onChange={(afterRound) => onChange({ afterRound })}
                labelledBy={labelId}
              />
            )}
          </SettingsRow>
          <SettingsRow
            label="On their screens during the call"
            helper="No lights trains the ears: the cues go on, but the pads stay dark."
            stacked
            forControl={false}
          >
            {({ labelId }) => (
              <SegmentedControl
                options={LIGHTS}
                value={settings.lights}
                onChange={(lights) => onChange({ lights })}
                labelledBy={labelId}
              />
            )}
          </SettingsRow>
          <SettingsSwitchRow
            label="Students see the class's progress"
            helper="The Echo Boss's health and the class's score."
            checked={settings.classProgress}
            onCheckedChange={(classProgress) => onChange({ classProgress })}
          />
        </SettingsSection>

        <SettingsSection label="Projector">
          <SettingsRow
            label="The projector shows"
            helper="No names unless you choose them, and then first names only."
            stacked
            forControl={false}
          >
            {({ labelId }) => (
              <SegmentedControl
                options={PROJECTOR}
                value={settings.projector}
                onChange={(projector) => onChange({ projector })}
                labelledBy={labelId}
              />
            )}
          </SettingsRow>
        </SettingsSection>

        <SettingsSection label="Calls">
          <SettingsSwitchRow
            label="Snap my calls to the key"
            helper="For when you lead (coming next): a note outside the key moves to the nearest key note."
            checked={settings.snapCall}
            onCheckedChange={(snapCall) => onChange({ snapCall })}
          />
        </SettingsSection>

        <SettingsSection label="Grading">
          <SettingsRow
            label="Grading"
            helper="Quantized: the right notes, each within half the call's subdivision. Off: just for fun, every echo counts."
            stacked
            forControl={false}
          >
            {({ labelId }) => (
              <SegmentedControl
                options={GRADING}
                value={settings.grading}
                onChange={(grading) => onChange({ grading })}
                labelledBy={labelId}
              />
            )}
          </SettingsRow>
        </SettingsSection>
      </div>
    </GuitarSheet>
  );
}
