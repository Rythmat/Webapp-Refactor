import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { kindLabel } from '../graphVocabulary';

/**
 * What the Mind Map says out loud (design §9): one polite live region for
 * the whole page, so a screen reader hears the graph change without the
 * page taking the reader's place away from them.
 *
 * It announces what moved by keyboard or by choice: the node made current
 * with the keys or from the List view ("Rosanna, song, 12 links"), a
 * selection, and "Layout settled" when the layout comes to rest. Pointer
 * hover is never announced: it changes many times a second and says nothing
 * a sighted pointer user does not already see.
 *
 * The page renders one region and keeps a handle to it; anything that wants
 * to speak calls `announce(text)` through that handle (`useGraphAnnouncer`
 * pairs the two). The region itself is visually hidden.
 */

export interface GraphLiveRegionHandle {
  /** Say this, politely: after whatever the screen reader is saying now. */
  announce(text: string): void;
}

/**
 * A screen reader says nothing when a live region's text is set to what it
 * already holds, so a repeat (stepping back onto the same node) ends in an
 * invisible no-break space to make it new text.
 */
const REPEAT_MARK = ' ';

export const GraphLiveRegion = forwardRef<GraphLiveRegionHandle>(
  function GraphLiveRegion(_props, ref) {
    const [message, setMessage] = useState('');
    const last = useRef('');

    useImperativeHandle(
      ref,
      () => ({
        announce(text: string) {
          const words = text.trim();
          if (!words) return;
          const repeat =
            last.current === words || last.current === `${words}${REPEAT_MARK}`;
          const next =
            repeat && !last.current.endsWith(REPEAT_MARK)
              ? `${words}${REPEAT_MARK}`
              : words;
          last.current = next;
          setMessage(next);
        },
      }),
      [],
    );

    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="graph-live-region"
      >
        {message}
      </div>
    );
  },
);

/**
 * The page's announcer: a ref for the one `GraphLiveRegion` it renders, and
 * an `announce` that is safe to call before the region has mounted (it then
 * says nothing).
 */
export function useGraphAnnouncer() {
  const ref = useRef<GraphLiveRegionHandle>(null);
  const announce = useCallback((text: string) => {
    ref.current?.announce(text);
  }, []);
  return { ref, announce };
}

/**
 * How a node made current is announced: its name, its kind and how many
 * links it has in the graph on screen, and, when it was reached by stepping
 * through another node's neighbours, where it sits among them:
 * "Rosanna, song, 12 links, 2 of 9 neighbours of Toto".
 */
export function currentNodeAnnouncement(
  node: { label: string; kind: string },
  links: number,
  step?: { index: number; of: number; from: string },
): string {
  const words = [
    node.label,
    kindLabel(node.kind).toLowerCase(),
    `${links} ${links === 1 ? 'link' : 'links'}`,
  ];
  if (step) {
    words.push(
      `${step.index} of ${step.of} ${step.of === 1 ? 'neighbour' : 'neighbours'} of ${step.from}`,
    );
  }
  return words.join(', ');
}
