import {
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { AdminRoutes } from '@/constants/routes';
import type { EntityId, GraphNode } from '@/content/graph/types';
import { tableHrefForNode } from '../../../table/tablePaths';
import { appPageFor, kindLabel } from '../graphVocabulary';

/**
 * The Mind Map's right-click menu (design §5), on Radix's ContextMenu.
 *
 * What it offers depends on what was under the pointer, which the canvas
 * works out (`hitTest`, from the screen point to a node id, or null for
 * empty background):
 *
 * - on a dot: Open in Table (its row, when a table holds it), Open page
 *   (its page in the console's copy of the app, when it has one and the
 *   item exists: a missing item, one that is linked to but defined nowhere,
 *   has no page to open), Local graph, Copy link (an absolute link to its
 *   local graph, to paste into a message) and Copy id;
 * - on a progression's dot, first: Open in Tesseract (where a plain click
 *   goes) and Open row here (its row beside this graph, as Cmd-click
 *   opens it), when the page offers them (`tesseractHref`, `onOpenRow`);
 * - on empty background: Fit, and Reset zoom.
 *
 * Opened from the keyboard (Shift+F10 or the Menu key on the focused
 * graph), there is no pointer to test, so the menu is for the keyboard's
 * current node when there is one (`currentId`), and for the background
 * otherwise. A Mac's Control-click is a pointer, not the keyboard: it
 * arrives as the main button held down, and is hit-tested like a
 * right-click.
 *
 * Copying says so in a toast, which is announced to screen readers too.
 */

/** What the menu was opened on. */
type Target =
  | { kind: 'node'; node: Pick<GraphNode, 'id' | 'kind' | 'label' | 'status'> }
  | { kind: 'background' };

/**
 * Whether a `contextmenu` event came from the keyboard rather than a
 * pointer. Chrome reports a keyboard menu as button -1; Firefox as button 0
 * with no button held. A right-click is button 2 (held or, on Windows,
 * already released), and a Mac's Control-click is button 0 held down. A
 * touch or pen long-press is always a pointer.
 */
export const openedFromKeyboard = (e: {
  button: number;
  buttons: number;
  nativeEvent?: Event;
}): boolean => {
  const pointerType = (e.nativeEvent as PointerEvent | undefined)?.pointerType;
  if (pointerType === 'touch' || pointerType === 'pen') return false;
  return e.button < 0 || (e.buttons === 0 && e.button !== 2);
};

export interface GraphContextMenuProps {
  /** The stage: right-clicking it opens the menu. Must take a ref. */
  children: ReactElement;
  /** The node under a screen point (client pixels), or null for background. */
  hitTest(clientX: number, clientY: number): string | null;
  /** Every node, to name the one under the pointer. */
  nodes: ReadonlyMap<string, GraphNode> | undefined;
  /** The keyboard's current node, for a menu opened from the keyboard. */
  currentId?: string | null;
  /** Open the node's local graph. */
  onLocalGraph(id: string): void;
  /**
   * Where a dot whose plain click leaves the graph goes instead (a
   * progression's, to Tesseract), or null for one whose click opens its
   * row here. Given, such a dot's menu offers Open in Tesseract and Open
   * row here.
   */
  tesseractHref?(id: string): string | null;
  /** Open the node's row beside this graph (Open row here). */
  onOpenRow?(id: string): void;
  /** Fit the whole graph on screen. */
  onFit(): void;
  /** Back to zoom 1, keeping the centre. */
  onResetZoom(): void;
  /** No menu at all: the graph is not drawn yet. */
  disabled?: boolean;
}

/** An absolute link to a node's local graph, for pasting elsewhere. */
export const localGraphLink = (id: string): string => {
  const path = AdminRoutes.cortex(undefined, { focus: id });
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(path, origin).href;
};

const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error(`Could not copy the ${what.toLowerCase()}`);
  }
};

const ITEM = 'text-sm text-white/85 focus:bg-white/10 focus:text-white';

export const GraphContextMenu = ({
  children,
  hitTest,
  nodes,
  currentId,
  onLocalGraph,
  tesseractHref,
  onOpenRow,
  onFit,
  onResetZoom,
  disabled,
}: GraphContextMenuProps) => {
  const [target, setTarget] = useState<Target>({ kind: 'background' });

  const nodeFor = (id: string): Target => {
    const node = nodes?.get(id as EntityId);
    return {
      kind: 'node',
      // Not in the graph at all: as good as missing, so no page is offered.
      node: node ?? {
        id: id as EntityId,
        kind: kindOf(id),
        label: id,
        status: 'missing',
      },
    };
  };

  // Runs before Radix opens the menu, so the menu opens on its target.
  const onContextMenu = (e: ReactMouseEvent) => {
    const fromKeyboard = openedFromKeyboard(e);
    const id =
      fromKeyboard && currentId ? currentId : hitTest(e.clientX, e.clientY);
    setTarget(id ? nodeFor(id) : { kind: 'background' });
  };

  const node = target.kind === 'node' ? target.node : null;
  const row = node ? tableHrefForNode(node.id) : null;
  // A missing item has no page, as in the row and node panels.
  const page = node && node.status !== 'missing' ? appPageFor(node) : null;
  const tesseract = node ? (tesseractHref?.(node.id) ?? null) : null;

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
        aria-label={
          node ? `${node.label}, ${kindLabel(node.kind)}` : 'The graph'
        }
        className="w-56 border-border bg-popover text-foreground"
      >
        {node ? (
          <>
            {tesseract && (
              <>
                <ContextMenuItem asChild className={ITEM}>
                  <Link to={tesseract}>Open in Tesseract</Link>
                </ContextMenuItem>
                {onOpenRow && (
                  <ContextMenuItem
                    className={ITEM}
                    onSelect={() => onOpenRow(node.id)}
                  >
                    Open row here
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator className="bg-white/10" />
              </>
            )}
            {row && (
              <ContextMenuItem asChild className={ITEM}>
                <Link to={row}>Open in Table</Link>
              </ContextMenuItem>
            )}
            {page && (
              <ContextMenuItem asChild className={ITEM}>
                <Link to={page}>Open page</Link>
              </ContextMenuItem>
            )}
            <ContextMenuItem
              className={ITEM}
              onSelect={() => onLocalGraph(node.id)}
            >
              Local graph
            </ContextMenuItem>
            <ContextMenuSeparator className="bg-white/10" />
            <ContextMenuItem
              className={ITEM}
              onSelect={() => void copy(localGraphLink(node.id), 'Link')}
            >
              Copy link
            </ContextMenuItem>
            <ContextMenuItem
              className={ITEM}
              onSelect={() => void copy(node.id, 'Id')}
            >
              Copy id
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem className={ITEM} onSelect={onFit}>
              Fit
            </ContextMenuItem>
            <ContextMenuItem className={ITEM} onSelect={onResetZoom}>
              Reset zoom
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

const kindOf = (id: string) =>
  (id.includes(':') ? id.slice(0, id.indexOf(':')) : '') as GraphNode['kind'];
