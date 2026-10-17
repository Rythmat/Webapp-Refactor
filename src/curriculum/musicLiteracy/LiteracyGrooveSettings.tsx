import { FixedDigits } from '@/components/common/FixedDigits';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SettingsRow,
  SettingsSection,
  SettingsSlider,
  SettingsSwitchRow,
} from '@/curriculum/guitar/layout/settingsControls';
import { useDrumGrooveSettings } from '@/learn/audio/useDrumGrooveSettings';
import { useLiteracyGrooves } from './literacyGrooves';

// ── Settings → Play along ──────────────────────────────────────────────────
// The drum groove a step plays over, always offered: None (the metronome
// alone) first, then every published 4/4 groove by genre (literacyGrooves.ts).
// Choosing one plays a bar of it (the player does that), and brings in its
// two settings: the click over the drums, off unless asked for, and the
// drums' level.

/** Radix Select can't hold an empty value; this stands for no groove. */
const NONE = '__none';

export interface LiteracyGrooveSettingsProps {
  /** A groove chosen, or null for none. */
  onChoose: (grooveId: string | null) => void;
  /** The lesson is in 4/4, so a groove fits it. */
  fits: boolean;
}

export function LiteracyGrooveSettings({
  onChoose,
  fits,
}: LiteracyGrooveSettingsProps) {
  const groups = useLiteracyGrooves();
  const { grooveId, click, volume, setClick, setVolume } =
    useDrumGrooveSettings();
  // A groove no longer offered (unpublished) plays as none, and reads so.
  const offered =
    grooveId !== null &&
    groups.some((group) => group.grooves.some((g) => g.id === grooveId));
  const value = offered ? grooveId : NONE;
  const percent = Math.round(volume * 100);

  return (
    <SettingsSection
      label="Play along"
      className="mb-5 border-b border-white/[0.08] pb-5"
    >
      <SettingsRow
        label="Drum groove"
        helper={
          fits
            ? 'Plays from the words to a final downbeat. Choose one to hear a bar.'
            : 'The grooves are in 4/4, and this lesson isn’t.'
        }
        stacked
        disabled={!fits}
        forControl={false}
      >
        {({ labelId, helperId }) => (
          <Select
            value={value}
            onValueChange={(next) => onChoose(next === NONE ? null : next)}
            disabled={!fits}
          >
            <SelectTrigger
              data-literacy-groove-select
              aria-labelledby={labelId}
              aria-describedby={helperId}
              className="h-10 rounded-lg border-white/10 bg-white/[0.04] text-[#e8e8f0] focus:ring-white/40 max-sm:h-11"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              data-literacy-groove-list
              className="max-h-[min(26rem,var(--radix-select-content-available-height))] border-white/10 bg-[#1c1c20] text-[#e8e8f0]"
            >
              <SelectItem value={NONE} className={ITEM}>
                None (metronome)
              </SelectItem>
              {groups.map((group) => (
                <SelectGroup key={group.genre}>
                  <SelectLabel className="px-2 pb-1 pt-3 text-xs font-normal uppercase tracking-[0.14em] text-white/45">
                    {group.label}
                  </SelectLabel>
                  {group.grooves.map((groove) => (
                    <SelectItem
                      key={groove.id}
                      value={groove.id}
                      className={ITEM}
                    >
                      {groove.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
      </SettingsRow>
      {fits && offered && (
        <>
          <SettingsSwitchRow
            label="Click with the drums"
            helper="The metronome past the count-in too."
            checked={click}
            onCheckedChange={setClick}
          />
          <SettingsRow
            label="Drums"
            helper="Their level, under the volume."
            forControl={false}
          >
            {({ labelId, helperId }) => (
              <div className="flex items-center gap-3">
                <SettingsSlider
                  value={percent}
                  onValueChange={(next) => setVolume(next / 100)}
                  labelledBy={labelId}
                  describedBy={helperId}
                  valueText={percent === 0 ? 'Muted' : `${percent}%`}
                />
                <FixedDigits
                  aria-hidden
                  text={`${percent}%`}
                  className="w-11 text-right text-sm text-white/55"
                />
              </div>
            )}
          </SettingsRow>
        </>
      )}
    </SettingsSection>
  );
}

const ITEM =
  'text-[#e8e8f0] focus:bg-white/[0.08] focus:text-[#e8e8f0] data-[state=checked]:text-white';
