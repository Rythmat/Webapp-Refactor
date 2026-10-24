import { create } from 'zustand';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import {
  STYLE_OPTIONS,
  styleOptionOf,
  type StyleOption,
} from '@/features/promptSong/styleOptions';
import type { LaneSpot, TimelineSelection } from './promptSpot';

/** What the bar shows above itself. */
export type PromptPhase =
  | { kind: 'idle' }
  | {
      kind: 'working';
      /** Plain progress: "Writing a Funk bass line for bars 5–8…". */
      status: string;
    }
  | { kind: 'error'; message: string; retryable: boolean }
  | {
      /**
       * The part has a track of its own in the song already, with notes in
       * the spot ("Bass already plays in bars 7–8"): update it, or keep it
       * and put the new part on a track of its own?
       */
      kind: 'confirm';
      message: string;
      /** The tracks it would update: "Bass", "Bass and Drums". */
      tracks: string;
      count: number;
    };

interface PromptBarState {
  collapsed: boolean;
  /** A lane right-clicked → "Add a part here…": the next prompt's spot. */
  laneSpot: LaneSpot | null;
  /**
   * The bars dragged out in empty lane space (the timeline's marquee), on
   * the lane it started in: the spot until cleared — the chip's ×, or a
   * click on empty canvas.
   */
  selection: TimelineSelection | null;
  phase: PromptPhase;
  /** The last prompt sent, for Retry. */
  lastText: string | null;
  /**
   * The prompt the session was started from (a Home prompt's song idea):
   * the style the bar's suggestions keep to. Kept with the session's
   * generation, so another project opened doesn't inherit it.
   */
  sessionPrompt: { text: string; generation: number } | null;
  /**
   * The style tag picked for this session (STYLE_OPTIONS' id), or set from
   * the prompt it was generated from; kept with the session's generation.
   */
  style: { id: string; generation: number } | null;
  /** Bumped to ask the input for focus. */
  focusNonce: number;
  expand(): void;
  collapse(): void;
  /** Open the bar on a lane's spot, its input focused. */
  askAt(spot: LaneSpot): void;
  clearLaneSpot(): void;
  select(selection: TimelineSelection): void;
  clearSelection(): void;
  setPhase(phase: PromptPhase): void;
  setLastText(text: string): void;
  /** Remember the prompt this session was started from, and its style. */
  setSessionPrompt(text: string): void;
  /** Pick the session's style tag; null goes back to the song's own. */
  setStyle(id: string | null): void;
}

/**
 * The session's style: the tag picked (or set from the prompt it was
 * generated from), else the style the project's name or genre names, else
 * Pop.
 */
export function currentStyle(
  picked: PromptBarState['style'],
  projectName: string | null | undefined,
  projectGenre: string | null | undefined,
): StyleOption {
  const own =
    picked && picked.generation === getSessionGeneration()
      ? STYLE_OPTIONS.find((s) => s.id === picked.id)
      : undefined;
  return (
    own ??
    styleOptionOf(projectName) ??
    styleOptionOf(projectGenre) ??
    STYLE_OPTIONS[0]
  );
}

/**
 * The words the session's style is read from, for suggestions and parts:
 * the prompt it was generated from while the tag is still its style (so
 * its moods count too: "sad lo-fi"), else the tag's own.
 */
export function sessionStyleText(
  state: Pick<PromptBarState, 'style' | 'sessionPrompt'>,
  projectName: string | null | undefined,
  projectGenre: string | null | undefined,
): string {
  const style = currentStyle(state.style, projectName, projectGenre);
  const prompt = currentSessionPrompt(state.sessionPrompt);
  return prompt && styleOptionOf(prompt)?.id === style.id ? prompt : style.text;
}

/** Whether the style was picked for this session, not read from the song. */
export const stylePicked = (picked: PromptBarState['style']): boolean =>
  !!picked && picked.generation === getSessionGeneration();

/** The prompt the open session started from, if it started from one. */
export function currentSessionPrompt(
  remembered: PromptBarState['sessionPrompt'],
): string | null {
  return remembered && remembered.generation === getSessionGeneration()
    ? remembered.text
    : null;
}

export const usePromptBarStore = create<PromptBarState>()((set) => ({
  collapsed: false,
  laneSpot: null,
  selection: null,
  phase: { kind: 'idle' },
  lastText: null,
  sessionPrompt: null,
  style: null,
  focusNonce: 0,
  expand: () =>
    set((s) => ({ collapsed: false, focusNonce: s.focusNonce + 1 })),
  collapse: () => set({ collapsed: true }),
  askAt: (spot) =>
    set((s) => ({
      collapsed: false,
      laneSpot: spot,
      selection: null,
      focusNonce: s.focusNonce + 1,
    })),
  clearLaneSpot: () => set({ laneSpot: null }),
  select: (selection) => set({ selection, laneSpot: null, collapsed: false }),
  clearSelection: () => set({ selection: null }),
  setPhase: (phase) => set({ phase }),
  setLastText: (lastText) => set({ lastText }),
  setSessionPrompt: (text) => {
    const generation = getSessionGeneration();
    const style = styleOptionOf(text);
    set({
      sessionPrompt: { text, generation },
      style: style ? { id: style.id, generation } : null,
    });
  },
  setStyle: (id) =>
    set({ style: id ? { id, generation: getSessionGeneration() } : null }),
}));
