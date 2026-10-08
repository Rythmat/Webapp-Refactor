import type { MindMapBoard } from '@/content/graph/mindMapBoard';
import type { LocalizedText } from '../types';

/**
 * The Promoter's board, handed from the student's live-session tab to the
 * Globe tab it opens.
 *
 * The board rides on the slide's interaction (`atlas.board`), which the Globe
 * cannot read: the Globe only gets the launch params on its URL. So the
 * launcher (`AppRouteLaunch`) writes the board here just before it opens the
 * Globe, and the Globe's mind-map panel reads it back by the interaction id
 * in those params. localStorage is shared by every tab of the origin, so this
 * works offline and without a minted token, like the MSP inbox.
 *
 * A board is the same for every student (ids, names, edge kinds), so it is
 * not kept per user.
 */

const STORAGE_KEY = 'ma:globe-mindmap:v1';

export interface MindMapHandoff {
  interactionId: string;
  board: MindMapBoard;
  /** The challenge, as the slide asks it. */
  question: LocalizedText;
}

const keyFor = (interactionId: string): string =>
  `${STORAGE_KEY}:${interactionId}`;

export const writeMindMapHandoff = (handoff: MindMapHandoff): void => {
  try {
    window.localStorage.setItem(
      keyFor(handoff.interactionId),
      JSON.stringify(handoff),
    );
  } catch {
    // Storage full or blocked: the panel says the board did not arrive.
  }
};

export const readMindMapHandoff = (
  interactionId: string,
): MindMapHandoff | null => {
  try {
    const raw = window.localStorage.getItem(keyFor(interactionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MindMapHandoff>;
    const board = parsed.board;
    if (
      parsed.interactionId !== interactionId ||
      !board ||
      typeof board.focus !== 'string' ||
      !Array.isArray(board.nodes) ||
      !Array.isArray(board.edges)
    )
      return null;
    return {
      interactionId,
      board,
      question: parsed.question ?? { en: '' },
    };
  } catch {
    return null;
  }
};
