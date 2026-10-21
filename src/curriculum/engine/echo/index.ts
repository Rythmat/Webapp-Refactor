/**
 * Echo's engine: the Arcade's call-and-response creation game
 * (docs/echo-game.md). Pure TypeScript, no React; the game's screens are
 * built on what this exports.
 *
 *   levels.ts    the Levels table: tiers, zero points, song lengths, base tempos
 *   tempo.ts     the tempo ramp, the boss's tempo, ticks and milliseconds
 *   contours.ts  the contour library and starter set, the zero point rule
 *   rhythm.ts    the owner's melody and comping rhythms, by tier
 *   calls.ts     melody calls, chord calls, the Final Boss's four
 *   strikes.ts   played notes heard as chord strikes, at the tempo
 *   grading.ts   an echo graded by Music Literacy's graders
 *   stats.ts     a game's numbers: sections, streaks, the boss, XP
 *   takes.ts     Make Your Song's takes, and the scaffolding
 *   song.ts      the song from its takes, its chord changes, the Band's chart
 *   pads.ts      the melody pads and the chord pads
 *   random.ts    the seeded random source every call is made with
 *
 * A game, in order:
 *
 *   const rng = echoRandom(seed);                      // or Math.random
 *   let tempo = newEchoTempo(level);                   // the level's base
 *   const call = melodyCall(level, key, rng, { tempo: tempo.bpm }); // Atlas's call
 *   const timeline = echoTimeline(call);               // count-in, call, response, at its tempo
 *   const result = gradeMelodyEcho(call, played, { timeline });
 *   stats = echoGameReducer(stats, { type: 'echo', section: 'melodyEcho', passed: result.passed });
 *   tempo = nextEchoTempo(tempo, level, { passed: result.passed });
 *   …chordCall / gradeChordEcho, then bossCalls(level, key, rng,
 *     { tempo: echoBossTempo(tempo, level) }) / bossTimelines / gradeEcho…
 *   const chords = processTake(played, { kind: 'chords', key, level, scaffolding, tempo });
 *   const melody = processTake(played, { kind: 'melody', key, level, scaffolding });
 *   const song = assembleSong(level, key, chords, melody);
 *   // song.chordChanges (chordAtTick) → the Band; song.chart for a chord a bar
 */

export {
  BAR_TICKS,
  BEAT_TICKS,
  BOSS_CALLS,
  CHORD_CALL_BARS,
  ECHO_LEVELS,
  ECHO_LEVEL_NUMBERS,
  ECHO_TEMPO,
  ECHO_TIME_SIGNATURE,
  MELODY_CALL_BARS,
  SIXTEENTH_TICKS,
  SONG_BARS,
  echoLevel,
  zeroPosition,
  type EchoLevel,
  type EchoLevelNumber,
  type EchoTier,
  type EchoZeroPoint,
} from './levels';
export {
  ECHO_TEMPO_PASSES,
  ECHO_TEMPO_RISE,
  ECHO_TEMPO_STEP,
  clampEchoTempo,
  echoBossTempo,
  echoTempoRange,
  msToTicks,
  newEchoTempo,
  nextEchoTempo,
  ticksToMs,
  type EchoTempo,
} from './tempo';
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
  CHORD_RHYTHMS,
  MELODY_RHYTHMS,
  NEW_RHYTHM_SHARE,
  chordRhythm,
  chordRhythmBars,
  chordRhythmById,
  melodyRhythm,
  melodyRhythmById,
  type ChordRhythm,
  type MelodyRhythm,
  type RhythmHit,
  type RhythmPool,
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
  SLOW_ROLL_SHARE,
  STRIKE_SPREAD_MS,
  STRIKE_SPREAD_SHARE,
  chordStrikes,
  strikeSpreadTicks,
  type ChordStrike,
  type StrikeOptions,
} from './strikes';
export {
  bossTimelines,
  chordEchoNotes,
  echoTimeline,
  gradeChordEcho,
  gradeChordStrikes,
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
  chordAtTick,
  songChordChanges,
  takeBarDegrees,
  type EchoSong,
  type SongChord,
  type SongChordChange,
  type SongNote,
} from './song';
export {
  chordPads,
  melodyPads,
  type ChordPad,
  type MelodyPad,
  type MelodyPads,
} from './pads';
