import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { ChevronRight, Search, X } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/components/utilities';
import {
  type GlobalFilterSettings,
  type GraphDisplaySettings,
  type GraphForceSettings,
  type GraphMode,
  type LocalFilterSettings,
  QUERY_MAX,
} from '../model/graphSettings';

/**
 * The pieces the graph's settings panel is built from, drawn to match
 * Obsidian's graph controls: a 13 px section header with a turning chevron,
 * a switch row with its name on the left, a slider with its name above it
 * and the value shown over the knob while it is pointed at, a search box,
 * a full-width call-to-action button and a small icon button.
 *
 * Obsidian's dark theme is greys over #1e1e1e. Cortex sits on the app's
 * own background, so the panel takes the console's own surface tokens in
 * their place (src/styles/appTheme.css): the raised popover surface for
 * Obsidian's #262626 card, the hairline border for its #3f3f3f border and
 * #363636 dividers, the muted surface for its #2a2a2a fields, the input
 * outline for slider tracks and switches that are off, and the app's text
 * and muted text colours. Where Obsidian uses its violet accent (a switch
 * that is on, a focused field, the call-to-action button), the panel uses
 * white, the graph's own highlight since the owner chose it on 1 October
 * 2026. Nothing here is yellow, and nothing is tinted navy.
 *
 * The settings come from the settings model (`model/graphSettings.ts`),
 * whose field names are the ones edited here and the ones the renderer's
 * style takes. The panel sees one mode at a time through
 * `GraphPanelSettings`: the filters both modes share, plus the global
 * graph's Orphans or the local graph's Depth and link switches, so the
 * global and the local settings can each be handed in as they are. Forces
 * are where the sliders sit, not the strengths d3 receives: the model maps
 * them (centre force 0.5187 is a pull of 0.1, repel 10 a push of 1000).
 */

// ── The settings the panel edits ───────────────────────────────────────────

/** The filters both modes have. */
type SharedFilterSettings = Omit<GlobalFilterSettings, 'orphans'>;

/**
 * Filters as the panel reads them: the shared ones, plus Orphans (global
 * graph) or Depth, Incoming, Outgoing and Neighbor links (local graph).
 * Either mode's filters fit.
 */
export type GraphFilterSettings = SharedFilterSettings &
  Partial<Pick<GlobalFilterSettings, 'orphans'>> &
  Partial<Omit<LocalFilterSettings, keyof SharedFilterSettings>>;

/** Everything the panel edits for one mode. */
export interface GraphPanelSettings {
  filters: GraphFilterSettings;
  display: GraphDisplaySettings;
  forces: GraphForceSettings;
}

/** A change from the panel: only the fields that changed. */
export interface GraphSettingsPatch {
  filters?: Partial<GraphFilterSettings>;
  display?: Partial<GraphDisplaySettings>;
  forces?: Partial<GraphForceSettings>;
}

export type { GraphDisplaySettings, GraphForceSettings, GraphMode };

/**
 * The longest search or group query the settings model keeps (it drops a
 * longer one when the settings are read back), so the fields stop there.
 */
export const QUERY_MAX_LENGTH = QUERY_MAX;

/** The panel's four sections, in order. */
export const SETTINGS_SECTIONS = [
  'filters',
  'groups',
  'display',
  'forces',
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

// ── Shared classes ─────────────────────────────────────────────────────────

/** The focus ring every control in the panel shares: the white highlight. */
export const PANEL_FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';

/** A text field: Obsidian's 30 px input and 13 px text, on the muted surface. */
export const PANEL_FIELD = cn(
  'h-[30px] w-full min-w-0 rounded-[5px] border border-border bg-muted px-2 text-[13px] text-foreground',
  'placeholder:text-muted-foreground hover:border-input focus-visible:border-white/60',
  PANEL_FOCUS_RING,
);

/** A setting's name: Obsidian's 13 px small UI text. */
const SETTING_NAME = 'text-[13px] leading-5 text-foreground';

// ── Section ────────────────────────────────────────────────────────────────

export interface SettingSectionProps {
  id: SettingsSectionId;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * One collapsible section: Filters, Groups, Display or Forces. The header
 * is a button inside a heading, so it can be found by heading and toggled
 * by keyboard; the chevron in its left padding turns when it opens, as
 * Obsidian's tree items do. A collapsed section's controls are not in the
 * page at all.
 */
export function SettingSection({
  id,
  title,
  open,
  onOpenChange,
  children,
}: SettingSectionProps) {
  return (
    <CollapsiblePrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      data-settings-section={id}
      className="border-b border-border px-3 py-1.5 last:border-b-0 [&:last-child_[data-section-body]]:pb-4"
    >
      <h3 className="m-0">
        <CollapsiblePrimitive.Trigger
          className={cn(
            'group relative flex w-full items-center rounded-[4px] py-1 pl-4 pr-16 text-left text-[13px] font-medium leading-5 text-foreground',
            PANEL_FOCUS_RING,
          )}
        >
          <ChevronRight
            aria-hidden
            className="absolute left-0 size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none"
          />
          {title}
        </CollapsiblePrimitive.Trigger>
      </h3>
      <CollapsiblePrimitive.Content data-section-body="" className="py-1">
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

// ── Switch row ─────────────────────────────────────────────────────────────

export interface SettingToggleProps {
  label: string;
  /** Obsidian's tooltip: shown on hover and read as the switch's description. */
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Obsidian's toggle row: the name on the left, the switch on the right.
 * The switch is the app's Radix switch in Obsidian's shape, in the graph's
 * highlight: white with a dark knob when on, the console's input grey with
 * a light knob when off.
 */
export function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: SettingToggleProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  return (
    <div
      className="flex items-center justify-between gap-3 py-1.5"
      title={description}
    >
      <label htmlFor={id} className={cn(SETTING_NAME, 'min-w-0 flex-1')}>
        {label}
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'data-[state=checked]:bg-white data-[state=unchecked]:bg-input',
          '[&>span]:bg-[#f2f2f5] data-[state=checked]:[&>span]:bg-[hsl(var(--ui-background))] motion-reduce:[&>span]:transition-none',
          'focus-visible:ring-white/70 focus-visible:ring-offset-popover',
        )}
      />
      {description ? (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      ) : null}
    </div>
  );
}

// ── Slider ─────────────────────────────────────────────────────────────────

export interface SettingSliderProps {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  /** The pointer's step: how finely a drag places the knob. */
  step: number;
  /**
   * How far one arrow key moves the knob, when that should be coarser than
   * `step`; Shift with an arrow, Page Up and Page Down move ten times as
   * far. Defaults to `step`.
   */
  keyStep?: number;
  onValueChange: (value: number) => void;
  /** How the value is written over the knob and read aloud. */
  format?: (value: number) => string;
}

/** A number as a slider shows it: at most two decimals, no trailing zeros. */
const formatSettingValue = (value: number): string =>
  String(Number(value.toFixed(2)));

const decimalsOf = (n: number): number =>
  (String(n).split('.')[1] ?? '').length;

/**
 * The value an arrow or page key gives: `value` moved by `steps` key steps,
 * on the key step's grid counted from `min`, and kept in range.
 */
export function steppedValue(
  value: number,
  steps: number,
  { min, max, keyStep }: { min: number; max: number; keyStep: number },
): number {
  const onGrid = Math.round((value - min) / keyStep + steps) * keyStep + min;
  const rounded = Number(onGrid.toFixed(decimalsOf(keyStep)));
  return Math.min(max, Math.max(min, rounded));
}

const ARROW_STEPS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  PageUp: 10,
  PageDown: -10,
};

/**
 * Obsidian's slider row: the name on its own line, the slider under it at
 * the panel's full width. Obsidian's sliders have a bare track with no
 * filled part, and show their value in a tooltip over the knob while it is
 * pointed at or moved; this one does the same, and the value is also the
 * slider's spoken value. The thumb, which is the element with the slider
 * role, is named by the row's label.
 *
 * A slider whose drag step is very fine (the forces move in thousandths)
 * takes a coarser `keyStep` for the arrow keys, so the keyboard is not a
 * thousand presses from one end to the other. Home and End are Radix's.
 */
export function SettingSlider({
  label,
  description,
  value,
  min,
  max,
  step,
  keyStep = step,
  onValueChange,
  format = formatSettingValue,
}: SettingSliderProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const text = format(value);
  return (
    <div className="py-1.5" title={description}>
      <div id={labelId} className={SETTING_NAME}>
        {label}
      </div>
      {description ? (
        <span id={descriptionId} className="sr-only">
          {description}
        </span>
      ) : null}
      <SliderPrimitive.Root
        value={[value]}
        onValueChange={([next]) => {
          if (next !== undefined && next !== value) onValueChange(next);
        }}
        onKeyDown={(event) => {
          const steps = ARROW_STEPS[event.key];
          if (steps === undefined || keyStep === step) return;
          // Handled here, so Radix's own (finer) step is skipped.
          event.preventDefault();
          // Shift with an arrow skips ten steps, as Page Up and Down do.
          const skip = event.shiftKey && Math.abs(steps) === 1 ? 10 : 1;
          const next = steppedValue(value, steps * skip, { min, max, keyStep });
          if (next !== value) onValueChange(next);
        }}
        min={min}
        max={max}
        step={step}
        className="group/slider relative mt-3 flex h-4 w-full cursor-pointer touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-[3px] w-full grow rounded-full bg-input" />
        <SliderPrimitive.Thumb
          aria-labelledby={labelId}
          aria-describedby={description ? descriptionId : undefined}
          aria-valuetext={text}
          className={cn(
            'relative block size-4 rounded-full border border-input bg-foreground shadow transition-colors hover:bg-white',
            '[&:focus-visible>span]:opacity-100',
            PANEL_FOCUS_RING,
          )}
        >
          <span
            aria-hidden
            data-slider-tooltip=""
            className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-border bg-popover px-1.5 py-0.5 text-xs tabular-nums text-foreground opacity-0 transition-opacity group-hover/slider:opacity-100 motion-reduce:transition-none"
          >
            {text}
          </span>
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </div>
  );
}

// ── Search ─────────────────────────────────────────────────────────────────

/** How long typing must pause before a search is applied (Obsidian's 250 ms). */
const SEARCH_DEBOUNCE_MS = 250;

export interface SettingSearchProps {
  label: string;
  placeholder: string;
  value: string;
  /** Called with the text once typing pauses, on Enter, and when cleared. */
  onCommit: (value: string) => void;
}

/**
 * Obsidian's search setting: a field with a magnifier and a clear button and
 * no visible name. It keeps what is being typed itself and applies it after
 * a short pause, as Obsidian does, so a search over thousands of items does
 * not rebuild the graph on every key; Enter applies at once. Text the panel
 * is handed from outside (restoring defaults, switching between the global
 * and local graph) replaces what is shown. Anything still waiting when the
 * field goes away (its section collapses or the panel closes) is applied
 * then, so nothing typed is lost.
 */
export function SettingSearch({
  label,
  placeholder,
  value,
  onCommit,
}: SettingSearchProps) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const commit = (next: string) => {
    clearTimeout(timer.current);
    pending.current = null;
    if (next === committed.current) return;
    committed.current = next;
    onCommitRef.current(next);
  };

  // A value from outside wins over anything typed and not yet applied.
  useEffect(() => {
    if (value === committed.current) return;
    clearTimeout(timer.current);
    pending.current = null;
    committed.current = value;
    setDraft(value);
  }, [value]);

  // Apply what is still waiting when the field goes away.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      const next = pending.current;
      if (next !== null && next !== committed.current) {
        committed.current = next;
        onCommitRef.current(next);
      }
    },
    [],
  );

  return (
    <div className="relative py-1.5">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        maxLength={QUERY_MAX_LENGTH}
        placeholder={placeholder}
        value={draft}
        spellCheck={false}
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          pending.current = next;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(next), SEARCH_DEBOUNCE_MS);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            commit(draft);
          }
        }}
        className={cn(
          PANEL_FIELD,
          'pl-7 pr-7 [&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      {draft ? (
        <button
          type="button"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => {
            setDraft('');
            commit('');
            inputRef.current?.focus();
          }}
          className={cn(
            'absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground hover:text-foreground',
            PANEL_FOCUS_RING,
          )}
        >
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────

/**
 * Obsidian's call-to-action button at the panel's full width ("New group",
 * "Animate"), in the graph's white highlight where Obsidian has its violet,
 * with the app's near-black text on it (well over 4.5:1).
 */
export const PanelCtaButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function PanelCtaButton({ className, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'h-[30px] w-full rounded-[5px] bg-white/90 px-3 text-[13px] text-[hsl(var(--ui-background))] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/90',
        PANEL_FOCUS_RING,
        'focus-visible:ring-offset-1 focus-visible:ring-offset-popover',
        className,
      )}
      {...props}
    />
  );
});

/**
 * Obsidian's clickable icon: a bare 18 px icon in the muted text colour that
 * brightens and gains a faint square behind it when pointed at. Its name
 * comes from `aria-label`, and the same words show as its tooltip.
 */
export const PanelIconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { 'aria-label': string }
>(function PanelIconButton(
  { className, type = 'button', title, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      title={title ?? props['aria-label']}
      className={cn(
        'flex items-center justify-center rounded-[4px] p-1 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent [&>svg]:size-[18px]',
        PANEL_FOCUS_RING,
        className,
      )}
      {...props}
    />
  );
});
