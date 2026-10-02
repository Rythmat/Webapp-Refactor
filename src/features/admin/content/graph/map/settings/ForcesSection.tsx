import { SLIDER_RANGES } from '../model/graphSettings';
import { SettingSlider, type GraphForceSettings } from './SettingControls';

/**
 * The Forces section: Obsidian's four layout sliders with Obsidian's
 * ranges. The values are slider positions; the settings model turns them
 * into the strengths the layout uses (centre and link force through
 * Obsidian's curve, so 0.5187 is a pull of 0.1; repel cubed, so 10 is a
 * push of 1000; link distance as it is).
 *
 * Obsidian's sliders here are continuous. The ranges and the pointer's fine
 * steps come from the settings model (`SLIDER_RANGES`); the arrow keys move
 * in hundredths (centre and link force), tenths (repel) or whole units
 * (distance), so a keyboard can cross a slider in a hundred presses or so,
 * and Page Up, Page Down or Shift with an arrow move ten of those.
 */

export interface ForcesSectionProps {
  forces: GraphForceSettings;
  onChange: (patch: Partial<GraphForceSettings>) => void;
}

const formatTwoPlaces = (value: number): string => value.toFixed(2);
const formatOnePlace = (value: number): string =>
  String(Number(value.toFixed(1)));
const formatWhole = (value: number): string => String(Math.round(value));

export function ForcesSection({ forces, onChange }: ForcesSectionProps) {
  return (
    <>
      <SettingSlider
        label="Center force"
        value={forces.center}
        {...SLIDER_RANGES.center}
        keyStep={0.01}
        format={formatTwoPlaces}
        onValueChange={(center) => onChange({ center })}
      />
      <SettingSlider
        label="Repel force"
        value={forces.repel}
        {...SLIDER_RANGES.repel}
        keyStep={0.1}
        format={formatOnePlace}
        onValueChange={(repel) => onChange({ repel })}
      />
      <SettingSlider
        label="Link force"
        value={forces.link}
        {...SLIDER_RANGES.link}
        keyStep={0.01}
        format={formatTwoPlaces}
        onValueChange={(link) => onChange({ link })}
      />
      <SettingSlider
        label="Link distance"
        value={forces.linkDistance}
        {...SLIDER_RANGES.linkDistance}
        format={formatWhole}
        onValueChange={(linkDistance) => onChange({ linkDistance })}
      />
    </>
  );
}
