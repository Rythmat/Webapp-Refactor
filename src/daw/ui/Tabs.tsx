import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from 'react';
import {
  Tabs as KitTabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from './styles';
import { Tooltip } from './Tooltip';

/** The values of the tabs that are disabled with a reason. */
const DisabledTabs = createContext<Set<string> | null>(null);

export interface TabsProps
  extends Omit<
    ComponentPropsWithoutRef<typeof KitTabs>,
    'value' | 'defaultValue' | 'onValueChange'
  > {
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
}

/**
 * Tabs on the shared Radix kit: arrow keys move between tabs and activate
 * them, Home and End go to the ends. A tab that does not apply stays in the
 * list, disabled with a reason (`Tab disabledReason`), and this root turns
 * away every route to it: click, Enter or Space, and arrowing onto it.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { value, defaultValue, onValueChange, ...props },
  ref,
) {
  const [own, setOwn] = useState(defaultValue);
  const disabled = useRef(new Set<string>()).current;
  const controlled = value !== undefined;
  const change = useCallback(
    (next: string) => {
      if (disabled.has(next)) return;
      if (!controlled) setOwn(next);
      onValueChange?.(next);
    },
    [controlled, disabled, onValueChange],
  );
  return (
    <DisabledTabs.Provider value={disabled}>
      <KitTabs
        ref={ref}
        // Always controlled, so a disabled tab is turned away even before
        // the first choice ('' selects none).
        value={(controlled ? value : own) ?? ''}
        onValueChange={change}
        {...props}
      />
    </DisabledTabs.Provider>
  );
});

export const TabList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsList>
>(function TabList({ className, ...props }, ref) {
  return (
    <TabsList
      ref={ref}
      className={cn(
        'h-auto justify-start gap-1 rounded-none bg-transparent p-0 text-daw-text-3',
        className,
      )}
      {...props}
    />
  );
});

export interface TabProps
  extends Omit<ComponentPropsWithoutRef<typeof TabsTrigger>, 'disabled'> {
  /**
   * Why this tab does not apply right now ('Notes needs a MIDI clip'). The
   * tab stays visible and focusable, reads as disabled, and says why in a
   * tooltip and to screen readers. A dock tab is never hidden (plan 2.9).
   */
  disabledReason?: string;
  size?: 'md' | 'lg';
}

/**
 * One tab: 28 px (or 32 px) high, bold so its width holds when it becomes
 * active, which is marked by white/10 plus a 2 px underline (a cue that is
 * not colour alone).
 */
export const Tab = forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, disabledReason, size = 'md', className, children, ...props },
  ref,
) {
  const disabled = useContext(DisabledTabs);
  const reasonId = useId();
  useLayoutEffect(() => {
    if (!disabledReason || !disabled) return;
    disabled.add(value);
    return () => {
      disabled.delete(value);
    };
  }, [disabled, disabledReason, value]);

  const trigger = (
    <TabsTrigger
      ref={ref}
      value={value}
      aria-disabled={disabledReason ? true : undefined}
      aria-describedby={disabledReason ? reasonId : undefined}
      className={cn(
        'relative rounded-[var(--daw-radius-sm)] px-3 py-0 font-bold text-daw-text-3 hover:text-daw-text',
        'focus-visible:ring-0 focus-visible:ring-offset-0',
        'data-[state=active]:bg-daw-selected data-[state=active]:text-daw-text data-[state=active]:shadow-none',
        'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent data-[state=active]:after:bg-daw-text',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:text-daw-text-3',
        size === 'lg' ? 'h-8' : 'h-7',
        TYPE_CLASS.label,
        TRANSITION,
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      {children}
    </TabsTrigger>
  );

  if (!disabledReason) return trigger;
  return (
    <>
      <Tooltip content={disabledReason}>{trigger}</Tooltip>
      <span id={reasonId} hidden>
        {disabledReason}
      </span>
    </>
  );
});

export const TabPanel = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsContent>
>(function TabPanel({ className, ...props }, ref) {
  return (
    <TabsContent
      ref={ref}
      className={cn(
        'mt-0 focus-visible:ring-0 focus-visible:ring-offset-0',
        FOCUS_RING,
        className,
      )}
      {...props}
    />
  );
});
