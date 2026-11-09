import type { SetListsBlob } from '@/features/setlists/types';
import type { Targets, TourElement } from './targets';

/**
 * The Learn tours (Peter, 2026-10-21):
 *  - 'lesson': a first Learn lesson's controls, into its Practice Track and
 *    back, offered the first time a player opens a genre or Theory lesson.
 *  - 'navigate': How to Navigate, the whole of Learn page by page, for a
 *    first visit to Learn and from the compass on the Learn dashboard.
 *  - one part of it per Learn page, from the compass on that page.
 */
export type TourId = 'lesson' | 'navigate' | LearnSectionTourId;

/** A Learn page's own part of How to Navigate. */
export type LearnSectionTourId = 'startHere' | 'songs' | 'genre' | 'theory';

export interface TourContext {
  /** Where the tour started: for the lesson tour, the lesson to come back to. */
  returnTo: string;
  /** The player has Premium of their own (not the tour's preview). */
  premium: boolean;
}

export interface TourPlace {
  pathname: string;
  search: string;
}

/** What a step's functions can see and do. */
export interface TourApi {
  ctx: TourContext;
  place: TourPlace;
  reducedMotion: boolean;
  navigate: (to: string) => void;
  find: (targets: Targets) => TourElement[];
  /** Clicks the first element the targets find; false when there's none. */
  click: (targets: Targets) => boolean;
  wait: (ms: number) => Promise<void>;
}

export interface TourStep {
  id: string;
  /** The part of the tour it belongs to, shown over the card's words. */
  chapter: string;
  /** The card's words; **bold** for the control's name. */
  text: string | ((api: TourApi) => string);
  /** What the spotlight lights; none for a card on its own. */
  target?: Targets | ((api: TourApi) => Targets | undefined);
  /** Whether the player is where the step happens. */
  at: (place: TourPlace, ctx: TourContext) => boolean;
  /** Where to go when they aren't (and the way back from elsewhere). */
  href?: (ctx: TourContext) => string;
  /** Show the step only when this holds as it starts. */
  when?: (api: TourApi) => boolean;
  /** Set up as the step starts; runs again if the page remounts. */
  enter?: (api: TourApi) => void;
  /**
   * What Next does before moving on: 'click' clicks the target, as the
   * player would. Without it Next only moves on.
   */
  next?: 'click' | ((api: TourApi) => void | Promise<void>);
  /** Moves on by itself once the player has done it themselves. */
  doneWhen?: 'click' | ((api: TourApi) => boolean);
  /** Glides the page down and back up while the card is up. */
  scroll?: Targets;
  /** How long to look for the target before passing the step by (ms). */
  wait?: number;
  /** The Set Lists practice copy is on for the step. */
  sandbox?: boolean;
  /** Premium courses are open to a free player for the step. */
  preview?: boolean;
  /**
   * Picked up later (after a reload, or from "Pick up where you left off"),
   * the tour starts again at this earlier step: the one that opens what this
   * step needs (a popover, a tab, the Practice Track, the practice copy).
   */
  resumeFrom?: string;
}

export interface TourDefinition {
  id: TourId;
  /** The card's heading. */
  title: string;
  steps: readonly TourStep[];
  /** The last word before "Have Fun Learning!". */
  finale: { heading: string; line: string };
  /** Readies the Set Lists practice copy as it is made. */
  prepareSandbox?: (blob: SetListsBlob) => SetListsBlob;
}
