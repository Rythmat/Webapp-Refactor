import {
  forwardRef,
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
 * danger item is red text for actions that destroy work.
 */

const SURFACE = cn(FLOATING_SURFACE, 'min-w-44 p-1');

const ITEM =
  'h-7 gap-2 rounded-[var(--daw-radius-sm)] px-2 py-0 text-daw-text outline-none focus:bg-daw-hover focus:text-daw-text data-[state=open]:bg-daw-hover data-[disabled]:opacity-40 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-daw-text-2';

const DANGER =
  'text-daw-danger-text focus:bg-daw-danger-subtle focus:text-daw-danger-text [&>svg]:text-daw-danger-text';

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
}

function ItemFace({
  icon,
  shortcut,
  children,
}: {
  icon?: ReactNode;
  shortcut?: string;
  children?: ReactNode;
}) {
  return (
    <>
      {icon}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut && <Kbd className="ml-4">{shortcut}</Kbd>}
    </>
  );
}

// ── Drop-down menu ─────────────────────────────────────────────────────────

export const Menu = DropdownMenu;
export const MenuTrigger = DropdownMenuTrigger;
export const MenuGroup = DropdownMenuGroup;
export const MenuRadioGroup = DropdownMenuRadioGroup;
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

export const MenuItem = forwardRef<
  ElementRef<typeof DropdownMenuItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuItem> & ItemExtras
>(function MenuItem(
  { icon, shortcut, danger, className, children, ...props },
  ref,
) {
  return (
    <DropdownMenuItem
      ref={ref}
      data-danger={danger || undefined}
      className={cn(ITEM, TYPE_CLASS.body, danger && DANGER, className)}
      {...props}
    >
      <ItemFace icon={icon} shortcut={shortcut}>
        {children}
      </ItemFace>
    </DropdownMenuItem>
  );
});

export const MenuCheckboxItem = forwardRef<
  ElementRef<typeof DropdownMenuCheckboxItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuCheckboxItem> &
    Omit<ItemExtras, 'icon' | 'danger'>
>(function MenuCheckboxItem({ shortcut, className, children, ...props }, ref) {
  return (
    <DropdownMenuCheckboxItem
      ref={ref}
      className={cn(ITEM, INDENTED, TYPE_CLASS.body, className)}
      {...props}
    >
      <ItemFace shortcut={shortcut}>{children}</ItemFace>
    </DropdownMenuCheckboxItem>
  );
});

export const MenuRadioItem = forwardRef<
  ElementRef<typeof DropdownMenuRadioItem>,
  ComponentPropsWithoutRef<typeof DropdownMenuRadioItem>
>(function MenuRadioItem({ className, ...props }, ref) {
  return (
    <DropdownMenuRadioItem
      ref={ref}
      className={cn(ITEM, INDENTED, TYPE_CLASS.body, className)}
      {...props}
    />
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
  { icon, shortcut, danger, className, children, ...props },
  ref,
) {
  return (
    <KitContextMenuItem
      ref={ref}
      data-danger={danger || undefined}
      className={cn(ITEM, TYPE_CLASS.body, danger && DANGER, className)}
      {...props}
    >
      <ItemFace icon={icon} shortcut={shortcut}>
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
