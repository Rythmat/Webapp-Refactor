/**
 * Echo's engine: the Arcade's call-and-response creation game
 * (docs/echo-game.md). Pure TypeScript, no React; the game's screens are
 * built on what this exports.
 *
 *   levels.ts    the Levels table: tiers, zero points, song lengths
 *   contours.ts  the contour library and starter set, the zero point rule
 *   rhythm.ts    the rhythm flashcards, and calls' rhythms from them
 *   calls.ts     melody calls, chord calls, the Final Boss's four
 *   grading.ts   an echo graded by Music Literacy's graders
 *   stats.ts     a game's numbers: sections, streaks, the boss, XP
 *   takes.ts     Make Your Song's takes, and the scaffolding
 *   song.ts      the song from its takes, and the Band's chart
 *   pads.ts      the melody pads and the chord pads
 *   random.ts    the seeded random source every call is made with
 *
 * A game, in order:
 *
 *   const rng = echoRandom(seed);                      // or Math.random
 *   const call = melodyCall(level, key, rng);          // Atlas's call
 *   const timeline = echoTimeline(call);               // count-in, call, response
 *   const result = gradeMelodyEcho(call, played, { timeline });
 *   stats = echoGameReducer(stats, { type: 'echo', section: 'melodyEcho', passed: result.passed });
 *   …chordCall / gradeChordEcho, then bossCalls / bossTimelines / gradeEcho…
 *   const chords = processTake(played, { kind: 'chords', key, level, scaffolding });
 *   const melody = processTake(played, { kind: 'melody', key, level, scaffolding });
 *   const song = assembleSong(level, key, chords, melody); // song.chart → the Band
 */

export {
  BAR_TICKS,
  BEAT_TICKS,
  BOSS_CALLS,
  BOSS_RHYTHM_TIER,
  CALL_BARS,
  ECHO_LEVELS,
  ECHO_LEVEL_NUMBERS,
  ECHO_TEMPO,
  ECHO_TIME_SIGNATURE,
  SIXTEENTH_TICKS,
  SONG_BARS,
  echoLevel,
  zeroPosition,
  type EchoLevel,
  type EchoLevelNumber,
  type EchoTier,
  type EchoZeroPoint,
} from './levels';
export { echoRandom, pickOne, type EchoRandom } from './random';
export {
  CONTOUR_LIBRARY,
  ECHO_CONTOURS,
  PAD_WINDOW,
  contourMotion,
  contourPositions,
  contoursOfLevel,
  fitsWindow,
  levelContours,
  levelSpan,
  libraryContour,
  positionNote,
  positionSemitones,
  zeroPointsFor,
  type ContourMotion,
  type ContourTag,
  type EchoContour,
  type LibraryContour,
  type PositionSpan,
} from './contours';
export {
  QUARTER_REST,
  RHYTHM_CARDS,
  cardHits,
  cardNotes,
  cardsOfTiers,
  chordPlayable,
  rhythmCard,
  rhythmHits,
  startsOnBeat,
  type RhythmCard,
  type RhythmHit,
} from './rhythm';
export {
  NEW_CONTOUR_SHARE,
  bossCalls,
  chordAttacks,
  chordCall,
  echoChordDegrees,
  echoTonic,
  melodyCall,
  positionChromatic,
  type ChordCall,
  type ChordCallOptions,
  type EchoCall,
  type EchoNote,
  type MelodyCall,
  type MelodyCallOptions,
} from './calls';
export {
  bossTimelines,
  chordEchoNotes,
  echoTimeline,
  gradeChordEcho,
  gradeEcho,
  gradeMelodyEcho,
  melodyEchoNotes,
  type EchoGradeOptions,
  type EchoTimelineOptions,
  type PlayedNote,
} from './grading';
export {
  BOSS_GOOD_TO_WIN,
  ECHO_SECTIONS,
  ECHO_XP,
  XP_BOSS_DEFEATED,
  XP_ROUND_PASSED,
  XP_SONG_FINISHED,
  echoGameReducer,
  echoGameSummary,
  newEchoGame,
  sectionPercent,
  type BossFight,
  type EchoGameEvent,
  type EchoGameStats,
  type EchoSection,
  type EchoXpEvent,
  type SectionStats,
  type SectionSummary,
} from './stats';
export {
  NO_SCAFFOLDING,
  processTake,
  recognizeChord,
  rootChord,
  snapToKey,
  type ChordTake,
  type EchoScaffolding,
  type EchoTake,
  type MelodyTake,
  type TakeChord,
  type TakeFlag,
  type TakeFlagReason,
  type TakeKind,
  type TakeNote,
  type TakeOptions,
} from './takes';
export {
  assembleSong,
  takeBarDegrees,
  type EchoSong,
  type SongChord,
  type SongNote,
} from './song';
export {
  chordPads,
  melodyPads,
  type ChordPad,
  type MelodyPad,
  type MelodyPads,
} from './pads';
