import { SLIDER_RANGES } from '../model/graphSettings';
import {
  PanelCtaButton,
  SettingSlider,
  SettingToggle,
  type GraphDisplaySettings,
  type GraphMode,
} from './SettingControls';

/**
 * The Display section: how the drawn graph looks, with Obsidian's controls
 * and ranges. Arrows show which way a link runs once zoomed in. The text
 * fade threshold moves the zoom at which labels appear (-3 to 3, in tenths).
 * Node size and link thickness multiply Obsidian's sizes (0.1 to 5); a drag
 * places them in hundredths and the arrow keys move them in twentieths.
 * The ranges come from the settings model (`SLIDER_RANGES`).
 *
 * The Atlas adds "Link confidence", on by default: guessed links are drawn
 * dotted and unconfirmed ones dashed, but only where a line is long enough
 * on screen to show it, so a zoomed-out graph looks like Obsidian's.
 *
 * "Animate" plays the timelapse, the global graph's alone as in Obsidian.
 */

export interface DisplaySectionProps {
  mode: GraphMode;
  display: GraphDisplaySettings;
  onChange: (patch: Partial<GraphDisplaySettings>) => void;
  onAnimate?: () => void;
  /** The timelapse cannot play now, e.g. under reduced motion. */
  animateDisabled?: boolean;
}

/** Text fade is written with one decimal and a true minus sign. */
const formatFade = (value: number): string => {
  const text = Math.abs(value).toFixed(1);
  return value < -0.0001 ? `−${text}` : text;
};

export function DisplaySection({
  mode,
  display,
  onChange,
  onAnimate,
  animateDisabled = false,
}: DisplaySectionProps) {
  return (
    <>
      <SettingToggle
        label="Arrows"
        description="Show arrows when zoomed in"
        checked={display.arrows}
        onCheckedChange={(arrows) => onChange({ arrows })}
      />
      <SettingSlider
        label="Text fade threshold"
        description="Higher keeps labels hidden until you zoom further in"
        value={display.textFade}
        {...SLIDER_RANGES.textFade}
        format={formatFade}
        onValueChange={(textFade) => onChange({ textFade })}
      />
      <SettingSlider
        label="Node size"
        value={display.nodeSize}
        {...SLIDER_RANGES.nodeSize}
        keyStep={0.05}
        onValueChange={(nodeSize) => onChange({ nodeSize })}
      />
      <SettingSlider
        label="Link thickness"
        value={display.lineSize}
        {...SLIDER_RANGES.lineSize}
        keyStep={0.05}
        onValueChange={(lineSize) => onChange({ lineSize })}
      />
      <SettingToggle
        label="Link confidence"
        description="Draw guessed links dotted and unconfirmed links dashed when zoomed in"
        checked={display.confidence}
        onCheckedChange={(confidence) => onChange({ confidence })}
      />
      {mode === 'global' ? (
        <PanelCtaButton
          className="mt-1.5"
          onClick={onAnimate}
          disabled={animateDisabled || !onAnimate}
        >
          Animate
        </PanelCtaButton>
      ) : null}
    </>
  );
}
