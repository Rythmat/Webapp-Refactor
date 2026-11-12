// ── A path through a sub category ──────────────────────────────────────────
// What every path page draws, whatever teaches it: an Audio course, a Theory
// family or a genre. An adapter for each turns its own catalog and progress into
// this, and PathPage knows nothing about any of them.

/** A scale in a key, drawn as the key wheel draws it: its colour and its star. */
export interface PathFigure {
  /** The scale above its tonic. */
  pcs: readonly number[];
  /** The scale in thirds. */
  stars: readonly (readonly number[])[];
  /** The key's pitch class. */
  tonic: number;
  /** The notes dotted in its colour, above its tonic. */
  marked: readonly number[];
  accent: string;
  /** "D Dorian". */
  label: string;
  /** Its notes as spelled in that key. */
  notes?: readonly string[];
}

/** A choice made in the bottom card before opening a stop: a mode's key. */
export interface PathOption {
  label: string;
  route: string;
  figure?: PathFigure;
}

export interface PathRow {
  id: string;
  title: string;
  /** The line under its title in the bottom card. */
  blurb?: string;
  /** The interval its disc draws, without a figure of its own. */
  ratio: readonly [number, number];
  /** What it draws instead: a key's star, in that key's colour. */
  figure?: PathFigure;
  /** The level it's listed under. */
  levelId: string;
  route: string;
  /** 0 to 100. */
  percent: number;
  /**
   * False where there's no progress of its own to show, such as a Relative disc
   * that only links to other lessons: it never turns into a coin.
   */
  tracked: boolean;
  /** Free students can see it, and the card offers the upgrade. */
  locked: boolean;
  /** Not written yet: shown on the path, but it doesn't open (and isn't
   *  tracked). */
  soon?: boolean;
  /** Choices in the card; the first is opened if none is chosen. */
  options?: readonly PathOption[];
  optionsLabel?: string;
  /** A lesson that hangs off this one, such as an Anatomy lesson. */
  side?: { title: string; route: string };
}

export interface PathLevel {
  id: string;
  /** "Level 1". */
  kicker: string;
  title: string;
  /** What it teaches, in its popup. */
  goals: readonly string[];
}

export interface PathCourse {
  id: string;
  title: string;
  description: string;
  accent: string;
  /** The figure on its description card. */
  ratio: readonly [number, number];
  /** "3 lessons", "42 steps". */
  stats: readonly string[];
  back: { label: string; to: string };
  levels: readonly PathLevel[];
  rows: readonly PathRow[];
  /** What comes after this sub category. */
  upNext?: { title: string; blurb: string; to: string };
}
