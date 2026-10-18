import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from 'react';
import {
  ContextMenu as KitContextMenu,
  ContextMenuCheckboxItem as KitContextMenuCheckboxItem,
  ContextMenuContent as KitContextMenuContent,
  ContextMenuGroup as KitContextMenuGroup,
  ContextMenuItem as KitContextMenuItem,
  ContextMenuLabel as KitContextMenuLabel,
  ContextMenuSeparator as KitContextMenuSeparator,
  ContextMenuTrigger as KitContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { Kbd } from './Kbd';
import { FLOATING_SURFACE, TYPE_CLASS } from './styles';

/**
 * Menus on the shared Radix kit: the drop-down Menu (a '⋯' button, the
 * Project menu) and its right-click twin, ContextMenu. Arrow keys move,
 * typing jumps, Enter chooses, Escape closes and focus returns to the
 * trigger. Items are 28 px with 13 px text and an optional shortcut; the
 * danger item is red text for actions that destroy work. A setting's item
 * takes a `description`: a second, quieter line saying what it does (the
 * item grows to 40 px and the line describes it to a screen reader).
 */

const SURFACE = cn(FLOATING_SURFACE, 'min-w-44 p-1');

const ITEM =
  'h-7 gap-2 rounded-[var(--daw-radius-sm)] px-2 py-0 text-daw-text outline-none focus:bg-daw-hover focus:text-daw-text data-[state=open]:bg-daw-hover data-[disabled]:opacity-40 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-daw-text-2';

const DANGER =
  'text-daw-danger-text focus:bg-daw-danger-subtle focus:text-daw-danger-text [&>svg]:text-daw-danger-text';

/** An item with a description line grows to fit its two lines. */
const DESCRIBED = 'h-auto min-h-10 py-1';

/** Check and radio items keep room on the left for their mark. */
const INDENTED = 'pl-8';

const LABEL = cn(TYPE_CLASS.micro, 'px-2 pb-1 pt-2 text-daw-text-3');

const SEPARATOR = '-mx-1 my-1 h-px bg-daw-hairline';

interface ItemExtras {
  /** A leading icon, 16 px. */
  icon?: ReactNode;
  /** The shortcut, shown at the end ('⌘D'). */
  shortcut?: string;
  /** Red text: the action destroys something. */
  danger?: boolean;
  /**
   * One plain line under the label on what it does (settings: 'Clips and
   * notes jump to the grid lines'). Wraps rather than cuts off.
   */
  description?: string;
}

/**
 * What an item with a description adds to its props: the line's id as
 * `aria-describedby` (after any the caller gave), the 40 px class, and the
 * label alone as Radix's typeahead text, so typing still finds it by name.
 */
function useDescribed(
  description: string | undefined,
  children: ReactNode,
  props: { 'aria-describedby'?: string; textValue?: string },
) {
  const id = useId();
  if (!description) return { descriptionId: undefined, described: {} };
  const descriptionId = `${id}-description`;
  return {
    descriptionId,
    described: {
      'aria-describedby': [props['aria-describedby'], descriptionId]
        .filter(Boolean)
        .join(' '),
      textValue:
        props.textValue ??
        (typeof children === 'string' ? children : undefined),
    },
  };
}

function ItemFace({
  icon,
  shortcut,
  description,
  descriptionId,
  children,
}: {
  icon?: ReactNode;
  shortcut?: string;
  description?: string;
  descriptionId?: string;
  children?: ReactNode;
}) {
  return (
    <>
      {icon}
      {description ? (
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{children}</span>
          {/* Hidden from the item's name (it is the item's description,
              by aria-describedby, which still reads it). */}
          <span
            aria-hidden
            data-menu-description
            id={descriptionId}
            className={cn(TYPE_CLASS.label, 'text-daw-text-3')}
          >
            {description}
          </span>
        </span>
      ) : (
        <span className="min-w-0 flex-1 truncate">{children}</span>
      )}
      {shortcut && <Kbd className="ml-4">{shortcut}</Kbd>}
    </>
  );
}

// ── Drop-down menu ─────────────────────────────────────────────────────────

export const Menu = DropdownMenu;
export const MenuTrigger = DropdownMenuTrigger;
export const MenuGroup = DropdownMenuGroup;
export const MenuSub = DropdownMenuSub;

export const MenuContent = forwardRef<
  ElementRef<typeof DropdownMenuContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuContent>
>(function MenuContent({ className, ...props }, ref) {
  return (
    <DropdownMenuContent
      ref={ref}
      collisionPadding={8}
      className={cn(SURFACE, className)}
      {...props}
    />
  );
});

/**
 * A pick-one setting. Given a `label`, the group gets its heading (the
 * menu's small capitals) and, with a `description`, the line under it; the
 * group is named (unless it has an `aria-label` of its own) and described
 * by them. Without one it is the bare group (named with `aria-label`).
 */
export const MenuRadioGroup = forwardRef<
  ElementRef<typeof DropdownMenuRadioGroup>,
  ComponentPropsWithoutRef<typeof DropdownMenuRadioGroup> & {
    label?: string;
    description?: string;
  }
>(function MenuRadioGroup({ label, description, ...props }, ref) {
  const id = useId();
  if (!label) return <DropdownMenuRadioGroup ref={ref} {...props} />;
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  return (
    <>
      <DropdownMenuLabel id={labelId} className={LABEL}>
        {label}
      </DropdownMenuLabel>
      {description ? (
        <p
          data-menu-description
          id={descriptionId}
          className={cn(TYPE_CLASS.label, '-mt-0.5 px-2 pb-1 text-daw-text-3')}
        >
          {description}
        </p>
      ) : null}
      <DropdownMenuRadioGroup
        ref={ref}
        aria-labelledby={props['aria-label'] ? undefined : labelId}
        aria-describedby={description ? descriptionId : undefined}
        {...props}
      />
    </>
  );
});

export const MenuItem = forwardRef<
  ElementRef<typeof DropdownMenuItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuItem> & ItemExtras
>(function MenuItem(
  { icon, shortcut, danger, description, className, children, ...props },
  ref,
) {
  const { descriptionId, described } = useDescribed(
    description,
    children,
    props,
  );
  return (
    <DropdownMenuItem
      ref={ref}
      data-danger={danger || undefined}
      className={cn(
        ITEM,
        TYPE_CLASS.body,
        danger && DANGER,
        description && DESCRIBED,
        className,
      )}
      {...props}
      {...described}
    >
      <ItemFace
        icon={icon}
        shortcut={shortcut}
        description={description}
        descriptionId={descriptionId}
      >
        {children}
      </ItemFace>
    </DropdownMenuItem>
  );
});

export const MenuCheckboxItem = forwardRef<
  ElementRef<typeof DropdownMenuCheckboxItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuCheckboxItem> &
    Omit<ItemExtras, 'icon' | 'danger'>
>(function MenuCheckboxItem(
  { shortcut, description, className, children, ...props },
  ref,
) {
  const { descriptionId, described } = useDescribed(
    description,
    children,
    props,
  );
  return (
    <DropdownMenuCheckboxItem
      ref={ref}
      className={cn(
        ITEM,
        INDENTED,
        TYPE_CLASS.body,
        description && DESCRIBED,
        className,
      )}
      {...props}
      {...described}
    >
      <ItemFace
        shortcut={shortcut}
        description={description}
        descriptionId={descriptionId}
      >
        {children}
      </ItemFace>
    </DropdownMenuCheckboxItem>
  );
});

export const MenuRadioItem = forwardRef<
  ElementRef<typeof DropdownMenuRadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuRadioItem> &
    Pick<ItemExtras, 'description'>
>(function MenuRadioItem({ description, className, children, ...props }, ref) {
  const { descriptionId, described } = useDescribed(
    description,
    children,
    props,
  );
  return (
    <DropdownMenuRadioItem
      ref={ref}
      className={cn(
        ITEM,
        INDENTED,
        TYPE_CLASS.body,
        description && DESCRIBED,
        className,
      )}
      {...props}
      {...described}
    >
      {description ? (
        <ItemFace description={description} descriptionId={descriptionId}>
          {children}
        </ItemFace>
      ) : (
        children
      )}
    </DropdownMenuRadioItem>
  );
});

export const MenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuLabel>,
  ComponentPropsWithoutRef<typeof DropdownMenuLabel>
>(function MenuLabel({ className, ...props }, ref) {
  return (
    <DropdownMenuLabel ref={ref} className={cn(LABEL, className)} {...props} />
  );
});

export const MenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuSeparator>,
  ComponentPropsWithoutRef<typeof DropdownMenuSeparator>
>(function MenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuSeparator
      ref={ref}
      className={cn(SEPARATOR, className)}
      {...props}
    />
  );
});

export const MenuSubTrigger = forwardRef<
  ElementRef<typeof DropdownMenuSubTrigger>,
  ComponentPropsWithoutRef<typeof DropdownMenuSubTrigger> &
    Pick<ItemExtras, 'icon'>
>(function MenuSubTrigger({ icon, className, children, ...props }, ref) {
  return (
    <DropdownMenuSubTrigger
      ref={ref}
      className={cn(ITEM, TYPE_CLASS.body, className)}
      {...props}
    >
      <ItemFace icon={icon}>{children}</ItemFace>
    </DropdownMenuSubTrigger>
  );
});

export const MenuSubContent = forwardRef<
  ElementRef<typeof DropdownMenuSubContent>,
  ComponentPropsWithoutRef<typeof DropdownMenuSubContent>
>(function MenuSubContent({ className, ...props }, ref) {
  return (
    <DropdownMenuSubContent
      ref={ref}
      collisionPadding={8}
      className={cn(SURFACE, className)}
      {...props}
    />
  );
});

// ── Context menu ───────────────────────────────────────────────────────────

export const ContextMenu = KitContextMenu;
/** The region that opens the menu on right-click (or the context-menu key). */
export const ContextMenuTrigger = KitContextMenuTrigger;
export const ContextMenuGroup = KitContextMenuGroup;

export const ContextMenuContent = forwardRef<
  ElementRef<typeof KitContextMenuContent>,
  ComponentPropsWithoutRef<typeof KitContextMenuContent>
>(function ContextMenuContent({ className, ...props }, ref) {
  return (
    <KitContextMenuContent
      ref={ref}
      collisionPadding={8}
      className={cn(SURFACE, className)}
      {...props}
    />
  );
});

export const ContextMenuItem = forwardRef<
  ElementRef<typeof KitContextMenuItem>,
  ComponentPropsWithoutRef<typeof KitContextMenuItem> & ItemExtras
>(function ContextMenuItem(
  { icon, shortcut, danger, description, className, children, ...props },
  ref,
) {
  const { descriptionId, described } = useDescribed(
    description,
    children,
    props,
  );
  return (
    <KitContextMenuItem
      ref={ref}
      data-danger={danger || undefined}
      className={cn(
        ITEM,
        TYPE_CLASS.body,
        danger && DANGER,
        description && DESCRIBED,
        className,
      )}
      {...props}
      {...described}
    >
      <ItemFace
        icon={icon}
        shortcut={shortcut}
        description={description}
        descriptionId={descriptionId}
      >
        {children}
      </ItemFace>
    </KitContextMenuItem>
  );
});

export const ContextMenuCheckboxItem = forwardRef<
  ElementRef<typeof KitContextMenuCheckboxItem>,
  ComponentPropsWithoutRef<typeof KitContextMenuCheckboxItem>
>(function ContextMenuCheckboxItem({ className, ...props }, ref) {
  return (
    <KitContextMenuCheckboxItem
      ref={ref}
      className={cn(ITEM, INDENTED, TYPE_CLASS.body, className)}
      {...props}
    />
  );
});

export const ContextMenuLabel = forwardRef<
  ElementRef<typeof KitContextMenuLabel>,
  ComponentPropsWithoutRef<typeof KitContextMenuLabel>
>(function ContextMenuLabel({ className, ...props }, ref) {
  return (
    <KitContextMenuLabel
      ref={ref}
      className={cn(LABEL, className)}
      {...props}
    />
  );
});

export const ContextMenuSeparator = forwardRef<
  ElementRef<typeof KitContextMenuSeparator>,
  ComponentPropsWithoutRef<typeof KitContextMenuSeparator>
>(function ContextMenuSeparator({ className, ...props }, ref) {
  return (
    <KitContextMenuSeparator
      ref={ref}
      className={cn(SEPARATOR, className)}
      {...props}
    />
  );
});
