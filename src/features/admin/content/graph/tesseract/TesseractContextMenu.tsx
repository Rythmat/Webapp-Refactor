import {
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  useState,
} from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { chordsOfOpening } from '@/curriculum/engine/openingTree';
import { openedFromKeyboard } from '../map/GraphContextMenu';
import type { TesseractModel } from './tesseractModel';

/**
 * Tesseract's right-click menu, on Radix's ContextMenu like Cortex's
 * (`map/GraphContextMenu.tsx`).
 *
 * On an opening:
 *
 * - where a progression ends: Open row (its row beside the map) and Show in
 *   Cortex (its local graph, with its songs, vibes and genres); a duplicate
 *   pair ends on one opening, so each of the two is offered by its number;
 * - where chords follow: Open or Fold, and Open everything below;
 * - New progression from here: the Table's New flow with the opening's
 *   chords filled in.
 *
 * On empty background: Fit.
 *
 * Opened from the keyboard (Shift+F10 or the Menu key on the focused map),
 * there is no pointer to test, so the menu is for the keyboard's current
 * opening when there is one, as Cortex's is.
 */

export interface TesseractContextMenuProps {
  /** The map's region: right-clicking it opens the menu. Must take a ref. */
  children: ReactElement;
  /** The opening under a point (client pixels), or null for the background. */
  hitTest(clientX: number, clientY: number): string | null;
  model: TesseractModel;
  /** The keyboard's current opening, for a menu opened from the keyboard. */
  currentId: string | null;
  /** The opening shows what follows it. */
  isOpen(id: string): boolean;
  /** An opening's name in the key and notation showing. */
  nameOf(id: string): string;
  onToggle(id: string, all?: boolean): void;
  onOpenRow(progressionId: number, endingHere: readonly number[]): void;
  onShowInCortex?(progressionId: number): void;
  onNewFromHere?(chords: string[]): void;
  onFit(): void;
  /** No menu: the list shows, or the map is not drawn. */
  disabled?: boolean;
}

const ITEM = 'text-sm text-white/85 focus:bg-white/10 focus:text-white';

export const TesseractContextMenu = ({
  children,
  hitTest,
  model,
  currentId,
  isOpen,
  nameOf,
  onToggle,
  onOpenRow,
  onShowInCortex,
  onNewFromHere,
  onFit,
  disabled,
}: TesseractContextMenuProps) => {
  const [target, setTarget] = useState<string | null>(null);

  // Runs before Radix opens the menu, so the menu opens on its target.
  const onContextMenu = (e: ReactMouseEvent) => {
    const fromKeyboard = openedFromKeyboard(e);
    setTarget(
      fromKeyboard && currentId ? currentId : hitTest(e.clientX, e.clientY),
    );
  };

  const node = target ? model.forest.nodes.get(target) : undefined;
  const ends = node?.endIds ?? [];
  const pair = ends.length > 1;

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        disabled={disabled}
        onContextMenu={onContextMenu}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent
        aria-label={node ? nameOf(node.id) : 'Tesseract'}
        className="w-60 border-border bg-popover text-foreground"
      >
        {node ? (
          <>
            {ends.map((id) => (
              <ContextMenuItem
                key={`row-${id}`}
                className={ITEM}
                onSelect={() => onOpenRow(id, ends)}
              >
                {pair ? `Open row ${id}` : 'Open row'}
              </ContextMenuItem>
            ))}
            {onShowInCortex
              ? ends.map((id) => (
                  <ContextMenuItem
                    key={`cortex-${id}`}
                    className={ITEM}
                    onSelect={() => onShowInCortex(id)}
                  >
                    {pair ? `Show ${id} in Cortex` : 'Show in Cortex'}
                  </ContextMenuItem>
                ))
              : null}
            {node.childIds.length > 0 ? (
              <>
                {ends.length > 0 ? (
                  <ContextMenuSeparator className="bg-white/10" />
                ) : null}
                <ContextMenuItem
                  className={ITEM}
                  onSelect={() => onToggle(node.id)}
                >
                  {isOpen(node.id) ? 'Fold' : 'Open'}
                </ContextMenuItem>
                <ContextMenuItem
                  className={ITEM}
                  onSelect={() => onToggle(node.id, true)}
                >
                  Open everything below
                </ContextMenuItem>
              </>
            ) : null}
            {onNewFromHere ? (
              <>
                <ContextMenuSeparator className="bg-white/10" />
                <ContextMenuItem
                  className={ITEM}
                  onSelect={() => onNewFromHere(chordsOfOpening(node.id))}
                >
                  New progression from here
                </ContextMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <ContextMenuItem className={ITEM} onSelect={onFit}>
            Fit
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};
