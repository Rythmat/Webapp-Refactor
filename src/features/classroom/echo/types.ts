/**
 * Echo in the classroom, connected (docs/echo-classroom.md): the shapes the
 * teacher's computer, the students' devices and the projector share.
 *
 *   EchoClassSettings     the Teacher Settings: what students play on and
 *                         see, what the projector shows, the grading
 *   EchoInteractionConfig an `echo` interaction on a slide: where the class
 *                         starts (level, key, leader) and its settings
 *   SessionEcho           the round, in `SessionState.echo`: teacher-
 *                         authored, fanned out to every role. No student
 *                         identifiers, unless the teacher chose to put
 *                         first names on the projector (`names`)
 *   EchoResponsePayload   a student's rounds so far, posted after each one
 *                         as a `response`: teacher-only (Rule 2)
 *
 * Plain data, no React. Field names stay clear of the publish firewall's
 * forbidden keys (publishDay.ts FORBIDDEN_KEYS) wherever they reach a
 * published snapshot: the interaction's config does, the rest never do.
 */

import type {
  LiteracyMode,
  LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import type { EchoCallWire, EchoLevelNumber } from '@/curriculum/engine/echo';

/** Who makes the calls: Atlas, or the teacher (step 3, not yet connected). */
export type EchoClassLeader = 'atlas' | 'teacher';

/** What a round plays: a melody, chords, or one of the Echo Boss's calls. */
export type EchoClassSection = 'melodyEcho' | 'chordEcho' | 'boss';

/** The Teacher Settings (docs/echo-classroom.md, Teacher Settings). */
export interface EchoClassSettings {
  /** Students play on: their choice, the pads only, or the keyboard only. */
  playOn: 'choice' | 'pads' | 'keyboard';
  /**
   * Headphones: each device plays the call. Room speaker: the teacher's
   * computer does, which needs Tune In (step 3), so it isn't offered yet.
   */
  sound: 'headphones' | 'room';
  /** After each round, students see their own result, or nothing. */
  afterRound: 'result' | 'nothing';
  /** During the call, the pads light (Simon), or not (ears only). */
  lights: 'pads' | 'none';
  /** Students see the class's progress: the Boss's health, the class score. */
  classProgress: boolean;
  /**
   * The projector shows the class only (no names, the default), a
   * first-name leaderboard, or the live grid with first names.
   */
  projector: 'class' | 'leaderboard' | 'grid';
  /** The teacher's own calls snap to the key (step 3). */
  snapCall: boolean;
  /** Quantized grading, or off: just for fun, every echo counts. */
  grading: 'quantized' | 'off';
}

/** The defaults: bold in the spec's table. */
export const DEFAULT_ECHO_CLASS_SETTINGS: EchoClassSettings = {
  playOn: 'choice',
  sound: 'headphones',
  afterRound: 'result',
  lights: 'pads',
  classProgress: true,
  projector: 'class',
  snapCall: true,
  grading: 'quantized',
};

/** A key, as the class plays in it. */
export interface EchoClassKey {
  tonic: LiteracyTonic;
  mode: LiteracyMode;
}

/** An `echo` interaction's setup: where a class's Echo starts. */
export interface EchoInteractionConfig {
  level: EchoLevelNumber;
  key: EchoClassKey;
  leader: EchoClassLeader;
  /** BPM to start at; the level's base when left out. */
  tempo?: number;
  /** The slide's Teacher Settings; a classroom's saved ones win. */
  settings: EchoClassSettings;
}

/** A new `echo` interaction's setup: Level 1, C major, Atlas leading. */
export const DEFAULT_ECHO_INTERACTION: EchoInteractionConfig = {
  level: 1,
  key: { tonic: 'C', mode: 'major' },
  leader: 'atlas',
  settings: DEFAULT_ECHO_CLASS_SETTINGS,
};

/** The Boss, fought by the class: hits and misses so far. */
export interface EchoClassBoss {
  hits: number;
  misses: number;
}

/** How the class did in a round, as counts only. */
export interface EchoClassResult {
  run: number;
  /** Students whose echo was good. */
  good: number;
  /** Students who played anything. */
  answered: number;
  /** Students joined. */
  joined: number;
  /** From the Boss on: the fight so far, this round counted. */
  boss?: EchoClassBoss;
}

/**
 * A first name and a row of the grid, for the projector when the teacher
 * allows names (`settings.projector`). First names only, no ids: a
 * deliberate share, like a featured showcase's.
 */
export interface EchoNameRow {
  name: string;
  /** Good echoes so far. */
  good: number;
  bestStreak: number;
  /** Each round, oldest first: ✓ good, ✗ missed, – no answer, ○ not joined. */
  marks: EchoMark[];
}

/** A cell of the live grid. */
export type EchoMark = 'good' | 'miss' | 'none' | 'out';

/** The round, for every role (`SessionState.echo`). */
export interface SessionEcho {
  slideId: string;
  /** Goes up by one each round. 0 before the first. */
  run: number;
  section: EchoClassSection;
  leader: EchoClassLeader;
  level: EchoLevelNumber;
  key: EchoClassKey;
  /** BPM. */
  tempo: number;
  /** The round's count-in, epoch ms on the SERVER's clock. */
  startsAt: number;
  /** Atlas's call; null before the first round (or while the teacher plays one). */
  call: EchoCallWire | null;
  paused: boolean;
  settings: EchoClassSettings;
  /** The Boss's fight: which of its calls this is (from 0). */
  bossAt?: number;
  /** The class's last round, counts only. */
  classResult?: EchoClassResult;
  /** First names on the projector, only when the teacher allows it. */
  names?: EchoNameRow[];
}

/** One round of a student's echoes, as their device graded it. */
export interface EchoRoundResult {
  run: number;
  passed: boolean;
  /** 0–100: the quantized grade's percent. */
  score: number;
  /** What the call asked: degrees ("1", "♭3") or chords ("4 maj"). */
  asked: string[];
  /** What the student played, the same way. */
  played: string[];
  /** Each asked note: ms early (−) or late (+), null where it was missed. */
  timing?: (number | null)[];
}

/** A student's echoes on one Echo slide: every round so far (teacher-only). */
export interface EchoResponsePayload {
  kind: 'echo';
  slideId: string;
  rounds: EchoRoundResult[];
  bestStreak: number;
  /** Tune In's offset (step 3, the room speaker). */
  tunedInMs?: number;
}
