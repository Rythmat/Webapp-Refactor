import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { X } from 'lucide-react';
import {
  useId,
  useRef,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Sheet,
  SheetClose,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/components/utilities';
import { useMediaQuery } from '@/hooks/useMediaQuery';

// ── Guitar lesson sheets: the shared parts ─────────────────────────────────
// The side sheet both guitar sheets are built on (right on a wide screen,
// from the bottom on a phone), and the rows, group labels, switches and
// segmented control the Settings sheet is made of, in the landing look:
// Glacial 400, #e8e8f0 / white/55 / white/45 text, white/8 hairlines, the
// white pill for what is chosen. No key colour: nothing here is "now".

/** Where the sheet stops coming up from the bottom and sits on the right. */
export const SHEET_SIDE_QUERY = '(min-width: 640px)';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

// ── The sheet ──────────────────────────────────────────────────────────────

/** A lesson button whose sheet is open (the header's gear and About). */
const OPEN_TRIGGER = '[aria-haspopup="dialog"][aria-expanded="true"]';

/**
 * As a sheet opens: what had focus (to give it back), and the button that
 * opened it. Safari, and Firefox on a Mac, leave focus on the page when a
 * button is clicked; the page is then neither, and the opener is the
 * trigger the lesson marks as expanded.
 */
function openerOf(): {
  focused: HTMLElement | null;
  trigger: HTMLElement | null;
} {
  const active = document.activeElement;
  const focused =
    active instanceof HTMLElement &&
    active !== document.body &&
    active !== document.documentElement
      ? active
      : null;
  const trigger =
    focused?.closest<HTMLElement>('button, [role="button"]') ??
    document.querySelector<HTMLElement>(OPEN_TRIGGER);
  return { focused, trigger };
}

export interface GuitarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Modal (About): dims the lesson and holds focus. Not modal (Settings):
   * the lesson stays live beside it, so a change shows as it is made.
   */
  modal: boolean;
  /** 'settings' or 'about', as data-guitar-sheet. */
  name: string;
  title: ReactNode;
  /** The small uppercase line over the title. */
  eyebrow?: string;
  /** Width on a wide screen, in px. */
  width: 400 | 440;
  /** Where focus goes on open; the title when this returns null. */
  initialFocus?: () => HTMLElement | null;
  /**
   * Set to true just before closing when a dialog opens next: focus is then
   * left to it rather than returned to the button that opened the sheet.
   */
  handoffRef?: MutableRefObject<boolean>;
  children: ReactNode;
}

export function GuitarSheet({
  open,
  onOpenChange,
  modal,
  name,
  title,
  eyebrow,
  width,
  initialFocus,
  handoffRef,
  children,
}: GuitarSheetProps) {
  const side = useMediaQuery(SHEET_SIDE_QUERY) ? 'right' : 'bottom';
  const titleRef = useRef<HTMLHeadingElement>(null);
  // The lesson opens the sheet from its own button, outside the sheet's
  // Radix root, so the sheet keeps what had focus to return it there, and
  // that button, so a press on it is not a press outside.
  const returnTo = useRef<HTMLElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const leftOutside = useRef(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={modal}>
      <SheetPortal>
        {modal && (
          <SheetOverlay className="bg-black/60 data-[state=closed]:duration-150 data-[state=open]:duration-200" />
        )}
        <DialogPrimitive.Content
          data-guitar-sheet={name}
          data-side={side}
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            const { focused, trigger } = openerOf();
            returnTo.current = focused ?? trigger;
            opener.current = trigger;
            leftOutside.current = false;
            if (handoffRef) handoffRef.current = false;
            event.preventDefault();
            (initialFocus?.() ?? titleRef.current)?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const handedOff = handoffRef?.current ?? false;
            if (handoffRef) handoffRef.current = false;
            if (handedOff || leftOutside.current) return;
            returnTo.current?.focus();
          }}
          onInteractOutside={(event) => {
            // The button that opened the sheet also closes it: a press on
            // it is not a press outside.
            const target = event.target;
            if (target instanceof Node && opener.current?.contains(target)) {
              event.preventDefault();
              return;
            }
            // Not modal, a press on the lesson, or focus moving to it
            // (Shift+Tab), closes the sheet and leaves focus where it went.
            if (!modal) leftOutside.current = true;
          }}
          className={cn(
            'fixed z-50 flex flex-col bg-[#151518] text-[#e8e8f0] shadow-2xl outline-none',
            'data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-150 data-[state=open]:duration-200',
            side === 'right'
              ? cn(
                  'inset-y-0 right-0 h-full w-full border-l border-white/[0.08] motion-safe:data-[state=closed]:slide-out-to-right motion-safe:data-[state=open]:slide-in-from-right',
                  width === 440 ? 'max-w-[440px]' : 'max-w-[400px]',
                )
              : 'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-white/[0.08] motion-safe:data-[state=closed]:slide-out-to-bottom motion-safe:data-[state=open]:slide-in-from-bottom',
          )}
        >
          <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] py-2 pl-6 pr-3 max-sm:pl-4">
            <SheetTitle
              ref={titleRef}
              tabIndex={-1}
              className="min-w-0 text-xl font-normal leading-7 text-[#e8e8f0] outline-none"
            >
              {eyebrow && (
                <span className="block text-xs uppercase leading-4 tracking-[0.14em] text-white/45">
                  {eyebrow}
                  <span className="sr-only">: </span>
                </span>
              )}
              {title}
            </SheetTitle>
            <SheetClose
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/[0.06] hover:text-[#e8e8f0] max-sm:size-11',
                FOCUS_RING,
              )}
            >
              <X aria-hidden className="size-4" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 max-sm:px-4 max-sm:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </DialogPrimitive.Content>
      </SheetPortal>
    </Sheet>
  );
}

// ── Groups and rows ────────────────────────────────────────────────────────

export interface SettingsSectionProps {
  label: string;
  /** The group heading, for opening the sheet at this group. */
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
  className?: string;
}

/** A group of rows under its label (Display, Sound, Input). */
export function SettingsSection({
  label,
  headingRef,
  children,
  className,
}: SettingsSectionProps) {
  const headingId = useId();
  return (
    <section
      data-settings-group={label.toLowerCase()}
      aria-labelledby={headingId}
      className={cn('flex flex-col', className)}
    >
      <SettingsGroupLabel id={headingId} headingRef={headingRef}>
        {label}
      </SettingsGroupLabel>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

/** A group's label: small, uppercase, white/45. Focusable, to open at it. */
export function SettingsGroupLabel({
  id,
  headingRef,
  children,
}: {
  id?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}) {
  return (
    <h3
      id={id}
      ref={headingRef}
      tabIndex={-1}
      className="scroll-mt-4 pb-1 text-xs uppercase leading-4 tracking-[0.14em] text-white/45 outline-none"
    >
      {children}
    </h3>
  );
}

export interface SettingsRowIds {
  /** For the control: its label names it (label[for]). */
  controlId: string;
  /** For controls a label cannot name (aria-labelledby). */
  labelId: string;
  /** For aria-describedby; undefined without a helper. */
  helperId: string | undefined;
}

export interface SettingsRowProps {
  label: ReactNode;
  /** One short line under the label. */
  helper?: ReactNode;
  /** The control on the right, or under the label when `stacked`. */
  children: ReactNode | ((ids: SettingsRowIds) => ReactNode);
  /** Wide controls go under the label. */
  stacked?: boolean;
  /** Dims the label with the control (the helper says why). */
  disabled?: boolean;
  /**
   * The label names the control by label[for]. False for a control a label
   * cannot name (a radio group): it is named by labelId or its own label.
   */
  forControl?: boolean;
  className?: string;
}

/** A setting: its label (and helper) on the left, its control on the right. */
export function SettingsRow({
  label,
  helper,
  children,
  stacked = false,
  disabled = false,
  forControl = true,
  className,
}: SettingsRowProps) {
  const Label = forControl ? 'label' : 'span';
  const controlId = useId();
  const labelId = useId();
  const helperId = useId();
  const ids: SettingsRowIds = {
    controlId,
    labelId,
    helperId: helper ? helperId : undefined,
  };
  return (
    <div
      data-settings-row
      className={cn(
        'flex min-h-[52px] py-2',
        stacked
          ? 'flex-col items-stretch gap-2'
          : 'items-center justify-between gap-4',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label
          id={labelId}
          htmlFor={forControl ? controlId : undefined}
          className={cn(
            'text-sm leading-5 text-[#e8e8f0]',
            disabled && 'opacity-40',
          )}
        >
          {label}
        </Label>
        {helper && (
          <p id={helperId} className="text-xs leading-4 text-white/55">
            {helper}
          </p>
        )}
      </div>
      <div className={cn('flex shrink-0 items-center', stacked && 'min-w-0')}>
        {typeof children === 'function' ? children(ids) : children}
      </div>
    </div>
  );
}

// ── Controls ───────────────────────────────────────────────────────────────

/**
 * ui/switch, white when on. Its hit area reaches past the track to the row's
 * height (36 px, 44 px on a phone). Under reduced motion its knob jumps
 * rather than slides.
 */
export const SWITCH_CLASS = cn(
  'relative after:absolute after:-inset-x-1 after:-inset-y-2 max-sm:after:-inset-y-3',
  'data-[state=unchecked]:bg-white/15 disabled:opacity-40',
  '[&>span[data-state=checked]]:bg-[#101012] [&>span[data-state=unchecked]]:bg-white/70',
  'motion-reduce:[&>span]:transition-none',
  FOCUS_RING,
);

export interface SettingsSwitchRowProps {
  label: string;
  helper?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** A row whose control is an on/off switch, named by the row's label. */
export function SettingsSwitchRow({
  label,
  helper,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingsSwitchRowProps) {
  return (
    <SettingsRow label={label} helper={helper} disabled={disabled}>
      {({ controlId, helperId }) => (
        <Switch
          id={controlId}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          aria-describedby={helperId}
          className={SWITCH_CLASS}
        />
      )}
    </SettingsRow>
  );
}

export interface SegmentedOption<T extends string> {
  value: T;
  /** What the segment shows. */
  label: ReactNode;
  /** Its spoken name when the label is short ('TAB' → 'Tablature'). */
  name?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** The group's name; or name it with `labelledBy`. */
  label?: string;
  labelledBy?: string;
  className?: string;
}

/**
 * One choice of a few, the landing look: a white/10 outline, the chosen
 * segment a white pill. A radio group: arrow keys move the choice, Tab
 * enters at it.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  labelledBy,
  className,
}: SegmentedControlProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = options.findIndex((o) => o.value === value);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (at + 1) % options.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (at - 1 + options.length) % options.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = options.length - 1;
    }
    if (next < 0) return;
    event.preventDefault();
    onChange(options[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-white/10 p-0.5',
        className,
      )}
    >
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.name}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-9 min-w-9 shrink-0 whitespace-nowrap rounded-full px-3 text-sm font-normal transition-colors max-sm:h-11',
              FOCUS_RING,
              checked
                ? 'bg-white text-[#101012]'
                : 'text-white/55 hover:text-[#e8e8f0]',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SettingsSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** The row label's id: names the thumb, which is the slider. */
  labelledBy: string;
  describedBy?: string;
  /** Spoken value, e.g. '80%'. */
  valueText?: string;
  className?: string;
}

/**
 * ui/slider's parts with a white/10 track, a #e8e8f0 range and thumb, and a
 * name on the thumb (the element with the slider role), which ui/slider
 * cannot pass. The whole 36 px (44 px on a phone) height takes a press.
 */
export function SettingsSlider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  labelledBy,
  describedBy,
  valueText,
  className,
}: SettingsSliderProps) {
  return (
    <SliderPrimitive.Root
      value={[value]}
      onValueChange={([next]) => onValueChange(next)}
      min={min}
      max={max}
      step={step}
      className={cn(
        'relative flex h-9 w-32 cursor-pointer touch-none select-none items-center max-sm:h-11',
        className,
      )}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderPrimitive.Range className="absolute h-full bg-[#e8e8f0]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-valuetext={valueText}
        className={cn(
          'block size-4 rounded-full bg-[#e8e8f0] shadow transition-colors',
          FOCUS_RING,
        )}
      />
    </SliderPrimitive.Root>
  );
}
