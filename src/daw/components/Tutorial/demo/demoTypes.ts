import type { AllSlices } from '@/daw/store';
import type { AnchorRack, Target } from '../anchorRegistry';

// ── A step's "watch me" demo ───────────────────────────────────────────────
// A lesson step can show before it asks: its `demo` is a short list of
// beats, played when the step arrives. An animated cursor glides to each
// beat's target, a callout beside it says what is happening, and the cursor
// does the beat's action on the real Studio (a click, a double-click, a
// hover, a key press, or store actions for what can't be clicked). Then the
// coach card says "Your turn", and only then is the step's check armed, so
// nothing the demo does can pass the step for the student. The student can't
// click the Studio while it plays (the coach card's Skip and Quit still
// work), and "Show me again" plays it over.
//
// Conventions for authors:
//
// - Leave the Studio as you found it. A demo runs on the student's own song,
//   so what it changes it changes back: mute the bass, then unmute it; open
//   a menu, then close it; switch to Mix, then back to Create. Skip doesn't
//   break this: it runs the beats left at once, without the glide or the
//   pauses, so a skipped demo ends where a watched one does. (Quitting the
//   lesson mid-demo stops it where it is.)
// - A demo's edits to the song go through the store as the student's do, so
//   they enter Undo's history (a mute and its unmute are two steps there),
//   even when the song ends as it began. Where the lesson allows, show what
//   isn't the song itself: views, panels, menus, selections.
// - Don't do the student's task for them. The check is armed only after the
//   demo, against the Studio as the demo left it, so a demo that leaves the
//   task done (a demo that leaves Mix open, for a step that asks to open
//   Mix) makes the step pass the moment the student's turn starts.
// - Captions are short and in sentence case, a few words a beginner can read
//   while the cursor waits ("Mix shows every track side by side"). They
//   support **bold**, as instructions do.
// - Point at anchors (data-tutorial-id), as a step's `target` does. A beat
//   whose target isn't on screen after MISSING_TARGET_MS is passed over: the
//   cursor stays put and nothing is clicked. A `run` action (and a key press
//   on the document) still happens then, as neither needs the element, so a
//   demo's restoring beat is never lost.
// - Under reduced motion the cursor jumps instead of gliding and there is no
//   click ripple; the captions and their pauses stay.

/**
 * A key press, sent as keydown then keyup. `key` is KeyboardEvent.key ('l',
 * ' ', 'Escape', 'ArrowLeft'); `code` defaults from it ('KeyL', 'Space',
 * 'Digit1', or the key itself). `mod` is ⌘ on a Mac and Ctrl elsewhere, as
 * the editor's shortcuts read it.
 */
export interface DemoKeyPress {
  key: string;
  code?: string;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  /**
   * Where the press goes: the document (the default: a shortcut, which the
   * editor's one keyboard listener answers) or the beat's target, focused
   * first (a field, a focused control). An Escape that should close a menu
   * or picker goes to an element inside it: on the document the editor takes
   * it as Stop and deselect before the menu ever sees it.
   */
  on?: 'document' | 'element';
}

/**
 * Store actions for what the cursor can't click (a drag, a step the Studio
 * has no control for). Called with the store as it is at that moment; it may
 * return a promise, which the demo waits for (at most RUN_TIMEOUT_MS).
 */
export type DemoRun = (store: AllSlices) => void | Promise<void>;

/**
 * What the cursor does on its target:
 * - 'click' and 'doubleClick' send the whole pointer and mouse sequence
 *   (pointerdown, mousedown, pointerup, mouseup, click; twice and a dblclick
 *   for a double-click) at the element's center, since some Studio controls
 *   act on pointerdown and others on click;
 * - 'contextMenu' opens its right-click menu: a contextmenu event at its
 *   center and nothing else, since a right press on the timeline would also
 *   move the playhead or start a drag;
 * - 'hover' moves the pointer over it (and off again when the cursor moves
 *   on), for a tooltip or a hover state;
 * - a DemoKeyPress presses a key;
 * - a DemoRun runs store actions.
 *
 * A pointer action lands on what a real pointer would hit there: the
 * innermost element at the center inside the target, or, for a target that
 * lets the pointer through (the boxes over the timeline's canvas), what is
 * under it.
 */
export type DemoAction =
  | 'click'
  | 'doubleClick'
  | 'contextMenu'
  | 'hover'
  | DemoKeyPress
  | DemoRun;

/**
 * Marks the blocker a demo plays behind (DemoStage.tsx), which a pointer
 * action looks past to find what is under a pointer-transparent target.
 */
export const DEMO_BLOCKER_ATTR = 'data-demo-blocker';

/** One beat of a demo. */
export interface DemoBeat {
  /**
   * The anchor id(s) the cursor goes to, resolved as a step's `target`: the
   * first id on screen wins, and renamed ids resolve through ANCHOR_ALIASES.
   * Omit it for a caption with no move (the cursor stays where it is).
   */
  target?: Target;
  /** The effect rack an `fx-add-*` target means, as for a step. */
  rack?: AnchorRack;
  /** The callout beside the cursor: short, sentence case. */
  caption: string;
  /** What the cursor does once there. Omit it to only point. */
  action?: DemoAction;
  /**
   * Pacing: how long the cursor waits on the target, its callout showing,
   * before the action (default: long enough to read the caption, see
   * readingMs), and how long the beat stays after it (AFTER_MS).
   */
  holdMs?: number;
  afterMs?: number;
}

// ── Pacing ─────────────────────────────────────────────────────────────────

/** The cursor's glide to a target (it jumps under reduced motion). */
export const GLIDE_MS = 800;
/** How long a beat stays after its action, by default. */
export const AFTER_MS = 800;
/** How long a beat waits for its target to come on screen. */
export const MISSING_TARGET_MS = 1500;
/** The longest a `run` action's promise is waited for. */
export const RUN_TIMEOUT_MS = 4000;
/** Skipping: the beats left run with this pause between them (a render). */
export const FAST_BEAT_MS = 60;
/** Skipping: how long a beat's target is waited for. */
export const FAST_TARGET_MS = 400;

/** Time to read a caption before the cursor acts: 0.9 to 2.4 s. */
export const readingMs = (caption: string): number =>
  Math.min(2400, Math.max(900, 400 + caption.length * 35));
