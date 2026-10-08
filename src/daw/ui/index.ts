/**
 * The Studio editor's UI primitives (overhaul plan, milestone 2.2), built on
 * the shared Radix kit in src/components/ui and the tokens in ./tokens.
 * New editor chrome (src/daw/shell) is made from these; see the DEV gallery
 * at /dev/studio/ui-gallery for every one in every state.
 *
 * Code outside the editor's chunk (the Studio dashboard) imports the one
 * file it needs, not this index, so it does not pull in the whole kit.
 */
export { Button, buttonVariants } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';
export { Chip } from './Chip';
export type { ChipProps, ChipTone } from './Chip';
export { contrastRatio, onColor, parseColor, relativeLuminance } from './color';
export { ConfirmDialog } from './ConfirmDialog';
export type { ConfirmDialogProps } from './ConfirmDialog';
export { DawDialog, Sheet } from './DawDialog';
export type {
  DawDialogProps,
  DawDialogSize,
  SheetProps,
  SheetSide,
} from './DawDialog';
export { confirmDialog, DialogHost, promptDialog } from './DialogHost';
export type { ConfirmOptions, PromptOptions } from './DialogHost';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { Fader } from './Fader';
export type { FaderProps } from './Fader';
export {
  dbToGain,
  formatDb,
  formatGain,
  formatValue,
  gainToDb,
  MINUS,
  MINUS_INFINITY,
} from './format';
export type { FormatDbOptions } from './format';
export { IconButton } from './IconButton';
export type {
  IconButtonProps,
  IconButtonSize,
  IconButtonVariant,
} from './IconButton';
export { Kbd } from './Kbd';
export { Knob } from './Knob';
export type { KnobProps, KnobSize } from './Knob';
export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from './Menu';
export { Meter } from './Meter';
export type { MeterLevels, MeterProps, MeterSource } from './Meter';
export {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from './Popover';
export { PremiumBadge } from './PremiumBadge';
export { PromptDialog } from './PromptDialog';
export type { PromptDialogProps } from './PromptDialog';
export { Readout } from './Readout';
export type { ReadoutProps, ReadoutTone } from './Readout';
export { Segmented } from './Segmented';
export type { SegmentedOption, SegmentedProps } from './Segmented';
export { Select } from './Select';
export type { SelectOption, SelectOptionGroup, SelectProps } from './Select';
export type { SliderScale, ValueMapping } from './sliderMath';
export { useSliderControl } from './useSliderControl';
export type { SliderControlOptions } from './useSliderControl';
export { FOCUS_RING, TYPE_CLASS } from './styles';
export { Tab, TabList, TabPanel, Tabs } from './Tabs';
export type { TabProps, TabsProps } from './Tabs';
export { Toggle } from './Toggle';
export type { ToggleProps, ToggleSize, ToggleTone } from './Toggle';
export {
  COLOR,
  dawVar,
  DAW_PALETTE_EVENT,
  getDawPalette,
  installDawTokens,
  invalidateDawPalette,
  MOTION,
  RADIUS,
  SIZE,
  SPACE,
  TYPE,
  Z,
} from './tokens';
export type { DawColorName, DawLayer, DawPalette } from './tokens';
export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';
