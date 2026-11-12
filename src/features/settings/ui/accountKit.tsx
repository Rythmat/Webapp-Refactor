import type { ComponentProps, ReactNode } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { OFFICE_PAGE_TITLE } from '@/features/office/ui/styles';

// ── The Account area's pieces, as samply.app/profile's (owner, 2026-11-10) ──
// Measured there in the DOM and set in our rem (Samply's px over our 17.6px
// root): a 700px column with the page's title at its top (ours in the
// Classroom page's regular weight, as Learn's); blocks 48px apart; field
// labels 14px semibold, 48% white, 8px over 36px fields whose row is 512px
// with its pill; sections titled 20px semibold over a 14px grey line, 16px
// then a 10% rule, then 32px; settings grouped in cards with 4px corners, a
// 5% fill and an 8% edge, cards 24px apart, rows 16px in with a 6% hairline
// between, the title 14px over a 12px grey line, the action at the right.

/** Samply's pill: 36px, 16px in, 14px semibold, on an 8% fill. */
export const ACCOUNT_PILL = cn(
  'inline-flex h-[2.045rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-white/[0.08] px-[0.909rem] text-[0.795rem] font-semibold leading-[1.136rem] text-white hover:bg-white/[0.14] disabled:pointer-events-none disabled:opacity-40',
  TRANSITION,
  FOCUS_RING,
);
/** The one you can't undo: Samply's red. */
export const ACCOUNT_PILL_DANGER =
  'bg-[rgb(181_34_34)] hover:bg-[rgb(200_45_45)]';
/** The page's one call: white. */
export const ACCOUNT_PILL_PRIMARY = 'bg-white text-[#101012] hover:bg-white/90';

/** A field's box: 36px, a 5% fill and an 8% edge, corners of 8. */
export const ACCOUNT_INPUT =
  'h-[2.045rem] w-full min-w-0 rounded-[0.455rem] border border-white/[0.08] bg-white/[0.05] px-[0.511rem] text-[0.795rem] text-white placeholder:text-white/35 read-only:cursor-default focus:border-white/25 focus:outline-none';

const GREY = 'text-white/[0.48]';

export function AccountPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="mx-auto flex w-full max-w-[39.77rem] flex-col gap-[2.727rem]"
      data-account-page={title}
    >
      <h1 className={OFFICE_PAGE_TITLE}>{title}</h1>
      {children}
    </div>
  );
}

/**
 * A titled section. Its blocks sit 16px apart when they're fields, 24px
 * when they're cards (`spacing`).
 */
export function AccountSection({
  id,
  title,
  description,
  spacing = 'fields',
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  spacing?: 'fields' | 'cards';
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="flex scroll-mt-4 flex-col"
    >
      <h2
        id={id ? `${id}-title` : undefined}
        className="text-[1.136rem] font-semibold leading-[1.364rem] text-white"
      >
        {title}
      </h2>
      {description && (
        <p className={cn('mt-0.5 text-[0.795rem] leading-[1.136rem]', GREY)}>
          {description}
        </p>
      )}
      <hr className="mb-[1.818rem] mt-[0.909rem] border-0 border-t border-white/10" />
      <div
        className={cn(
          'flex flex-col',
          spacing === 'cards' ? 'gap-[1.364rem]' : 'gap-[0.909rem]',
        )}
      >
        {children}
      </div>
    </section>
  );
}

/** A group's own heading over its card: Samply's 16px semibold. */
export function AccountSubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-[-0.455rem] text-[0.909rem] font-semibold leading-[1.364rem] text-white">
      {children}
    </h3>
  );
}

/** A labelled field, 512px with its action beside it. */
export function AccountField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex max-w-[29.09rem] flex-col gap-[0.455rem]">
      <label
        htmlFor={htmlFor}
        className={cn('text-[0.795rem] font-semibold leading-[1.136rem]', GREY)}
      >
        {label}
      </label>
      <div className="flex items-center gap-[0.455rem]">{children}</div>
    </div>
  );
}

/** Settings grouped in one card, a hairline between its rows. */
export function SettingsGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-[0.227rem] border border-white/[0.08] bg-white/[0.05]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A row: what it is over one grey line, its action at the right. Profile's
 * titles are semibold, Preferences' regular (`plain`), as Samply's are.
 */
export function SettingsRow({
  title,
  description,
  action,
  plain = false,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  plain?: boolean;
  /** Anything under the row's line, full width (a slider, a panel). */
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[0.682rem] p-[0.909rem]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-[0.227rem]">
          <span
            className={cn(
              'text-[0.795rem] leading-[1.136rem] text-white',
              plain ? 'font-normal' : 'font-semibold',
            )}
          >
            {title}
          </span>
          {description && (
            <span className={cn('text-[0.682rem] leading-[0.909rem]', GREY)}>
              {description}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/**
 * Samply's switch: a 48 × 28 track, 30% black with an 8% edge, its 20px
 * thumb light grey at the right when on, dark at the left when off.
 */
export function AccountSwitch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex h-[1.591rem] w-[2.727rem] shrink-0 items-center rounded-full border border-white/[0.08] bg-black/30 px-[0.227rem]',
        FOCUS_RING,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-[1.136rem] rounded-full border border-white/[0.08] transition-transform duration-150 motion-reduce:transition-none',
          checked
            ? 'translate-x-[1.023rem] bg-[#d4d4d4]'
            : 'translate-x-0 bg-white/[0.12]',
        )}
      />
    </button>
  );
}

/** A slider in the app's own greys (owner, 2026-11-10: no teal, no yellow):
 *  a 10% track, the filled part and the thumb white. */
export function AccountSlider(props: ComponentProps<typeof Slider>) {
  return (
    <Slider
      trackClassName="bg-white/10"
      rangeClassName="bg-white/80"
      thumbClassName="border-white/40 bg-white"
      {...props}
    />
  );
}

/** A small tag on a card: what's current, say. */
export function AccountChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[1.364rem] shrink-0 items-center rounded-[0.227rem] border border-white/[0.02] bg-white/10 px-[0.455rem] text-[0.682rem] leading-[0.909rem] text-white">
      {children}
    </span>
  );
}
