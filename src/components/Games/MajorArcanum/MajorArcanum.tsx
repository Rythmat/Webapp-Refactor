// ── Major Arcanum ───────────────────────────────────────────────────────────
// Notes fall onto the keys; the player plays them in time. Four modes of six
// levels, each level's keys cleared with a streak in Melody and in Chords
// (curriculum/engine/majorArcanum). A run is generated phrase by phrase from
// the owner's melodies, rhythms and progressions, with a band under it; a
// phrase played without a miss adds to the streak, a miss starts it over,
// and a won streak clears the part, saves it to the player's account and
// offers what's next.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileRoutes } from '@/constants/routes';
import {
  MODES,
  type ArcanumLevel,
  type ArcanumMode,
} from '@/curriculum/engine/majorArcanum/levels';
import {
  levelAfter,
  levelCleared,
  levelTasks,
  modeCleared,
  nextTask,
  type ArcanumTask,
} from '@/curriculum/engine/majorArcanum/progress';
import {
  buildRun,
  type BackingNote,
} from '@/curriculum/engine/majorArcanum/song';
import { useIsPremium } from '@/hooks/useIsPremium';
import { ArcadeStreakContext } from '../scoring/ArcadeStreak';
import { useArcadeStreakReward } from '../scoring/useArcadeStreakReward';
import { useGameScore } from '../scoring/useGameScore';
import { useGameAudio, type GameAudioEngine } from '../useGameAudio';
import { AudioEngine } from './AudioEngine';
import { CircleOfFifthsSelector } from './CircleOfFifthsSelector';
import { GameHeader } from './GameHeader';
import { GameToolbar } from './GameToolbar';
import { LevelMap, taskTitle } from './LevelMap';
import { RunResult, type RunOutcome } from './RunResult';
import {
  getNoteColor,
  drawCountIn,
  drawGameFrame,
  drawPauseOverlay,
} from './canvasRenderer';
import {
  PIANO_HEIGHT,
  INPUT_WINDOW,
  HOLD_SCORE_INTERVAL,
  DRUM_PATTERNS,
} from './constants';
import {
  DEFAULT_DISPLAY,
  getKeyGeometry,
  keyLook,
  runKeyboard,
} from './keyMapping';
import type { Note, Particle, GameState } from './types';
import { useArcanumProgress } from './useArcanumProgress';
import { useMidiKeyboard } from './useMidiKeyboard';

// Hoisted so the warm-up effect isn't restarted by a new array each render.
const JAM_SYNTH_ONLY: GameAudioEngine[] = ['jam-synth'];

/** After a phrase's last note, how long before it's judged. */
const PHRASE_SETTLE_S = INPUT_WINDOW + 0.1;

interface MajorArcanumProps {
  onComplete?: (result: { score: number; maxStreak: number }) => void;
}

type Screen = 'map' | 'playing' | 'result';

/** How the run's phrases are going, for the streak. */
interface PhraseTrack {
  /** Each phrase's end, in song seconds. */
  ends: number[];
  failed: Set<number>;
  judged: Set<number>;
  /** Phrases in a row without a miss, and the most this run. */
  run: number;
  best: number;
}

const freshTrack = (): PhraseTrack => ({
  ends: [],
  failed: new Set(),
  judged: new Set(),
  run: 0,
  best: 0,
});

export default function MajorArcanum({ onComplete }: MajorArcanumProps) {
  // Warm the shared soundfont from the first render instead of waiting for the
  // AudioEngine that `initGame` builds. Not gated on: the engine's oscillator
  // fallback covers the gap, so the game is never silent while it loads.
  useGameAudio(JAM_SYNTH_ONLY);
  const navigate = useNavigate();
  const { isPremium } = useIsPremium();
  const { progress, loading, saveFailed, clear } = useArcanumProgress();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const requestRef = useRef<number>();
  const activeMidiNotes = useRef<Set<number>>(new Set());
  const notesRef = useRef<Note[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const drumPatternRef = useRef({ patternIndex: 0, lastBarChanged: -1 });
  const backingRef = useRef<{ notes: BackingNote[]; next: number }>({
    notes: [],
    next: 0,
  });
  const trackRef = useRef<PhraseTrack>(freshTrack());

  // Shared scoring integration — destructure to get individually stable refs
  const {
    hit: scoringHit,
    miss: scoringMiss,
    addScore: scoringAddScore,
    resetScore: scoringReset,
  } = useGameScore('majorArcanum');

  // The part being played, and whether it's free play on the Circle.
  const [task, setTask] = useState<ArcanumTask>({
    mode: 'novice',
    level: 1,
    keyPc: 0,
    part: 'melody',
  });
  const taskRef = useRef(task);
  const freeRef = useRef(false);
  const [free, setFree] = useState(false);
  const target = MODES[task.mode].streakPhrases[task.part];
  const reward = useArcadeStreakReward('major_arcanum', target);
  const rewardRef = useRef(reward);
  rewardRef.current = reward;
  /** The streak's last win before this run: a later one is this run's. */
  const runWinFromRef = useRef(0);

  const [screen, setScreen] = useState<Screen>('map');
  const screenRef = useRef<Screen>('map');
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [mapFocus, setMapFocus] = useState<{
    mode: ArcanumMode;
    level: ArcanumLevel;
  } | null>(null);
  const [showCircle, setShowCircle] = useState(false);

  // Game state (refs for performance in render loop)
  const gameState = useRef<GameState>({
    isPlaying: false,
    isCountingIn: false,
    countInNumber: 0,
    startTime: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    multiplier: 1,
    songDuration: 0,
    currentScaleNotes: [],
    currentKeyColor: '#fff',
    keyRootVal: 0,
    keyboardMapping: {},
    keyLabels: {},
    display: DEFAULT_DISPLAY,
    chordLabels: [],
    canvasWidth: 0,
    canvasHeight: 0,
    lastBeatScheduled: -1,
    metronomeEnabled: true,
    gameMode: 'melody',
    bpm: 80,
    totalNotes: 0,
    hits: 0,
    misses: 0,
    holdCompletions: 0,
    holdAttempts: 0,
    uiDirty: false,
    missFlashTime: 0,
    isPaused: false,
    pauseStartTime: 0,
    totalPausedDuration: 0,
  });

  const [uiState, setUiState] = useState({
    score: 0,
    streak: 0,
    multiplier: 1,
    keyColor: keyLook(0).keyColor,
    countInNumber: 0,
    feedbackText: '',
    feedbackColor: '#fff',
    feedbackVisible: false,
    metronomeEnabled: true,
    bpm: 80,
    showVolumePanel: false,
    isPaused: false,
    melodyVolume: 1.0,
    drumVolume: 1.0,
    metronomeVolume: 1.0,
    backingVolume: 1.0,
  });

  // Ref-based showFeedback to avoid stale closure in renderFrame
  const showFeedbackRef = useRef<(text: string, color: string) => void>(
    () => {},
  );
  showFeedbackRef.current = (text: string, color: string) => {
    setUiState((prev) => ({
      ...prev,
      feedbackText: text,
      feedbackColor: color,
      feedbackVisible: true,
    }));
    setTimeout(() => {
      setUiState((prev) => ({ ...prev, feedbackVisible: false }));
    }, 300);
  };

  const spawnParticles = useCallback((midi: number) => {
    const st = gameState.current;
    const geom = getKeyGeometry(midi, st.canvasWidth, st.display);
    if (!geom) return;
    const x = geom.x + geom.width / 2;
    const y = st.canvasHeight - PIANO_HEIGHT;
    const color = getNoteColor(midi, st.currentScaleNotes, st.currentKeyColor);

    for (let i = 0; i < 6; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 1) * 6,
        life: 1.0,
        color,
      });
    }
  }, []);

  /** A phrase with a miss in it: the streak starts over. */
  const failPhrase = useCallback((phrase: number) => {
    const track = trackRef.current;
    if (track.failed.has(phrase)) return;
    track.failed.add(phrase);
    track.run = 0;
    rewardRef.current.registerWrong();
  }, []);

  const handleNoteOn = useCallback(
    (midi: number) => {
      if (!audioRef.current) return;
      audioRef.current.startTone(midi);
      if (!gameState.current.isPlaying || gameState.current.isPaused) return;

      const songTime =
        audioRef.current.ctx.currentTime - gameState.current.startTime;
      const noteIdx = notesRef.current.findIndex(
        (n) =>
          n.midi === midi &&
          !n.hit &&
          !n.missed &&
          Math.abs(n.time - songTime) < INPUT_WINDOW,
      );

      if (noteIdx > -1) {
        const note = notesRef.current[noteIdx];
        note.hit = true;
        note.isHolding = true;
        note.lastHoldScoreTime = songTime;

        const st = gameState.current;
        st.hits += 1;

        const scoreState = scoringHit(10);
        st.score = scoreState.score;
        st.streak = scoreState.streak;
        st.maxStreak = scoreState.maxStreak;
        st.multiplier = scoreState.multiplier;
        st.uiDirty = true;

        const currentBeatTime = 60 / st.bpm;
        if (note.duration * currentBeatTime >= 0.3) {
          st.holdAttempts += 1;
        }

        spawnParticles(midi);
        const color = getNoteColor(
          midi,
          st.currentScaleNotes,
          st.currentKeyColor,
        );
        showFeedbackRef.current('Perfect', color);
      }
    },
    [spawnParticles, scoringHit],
  );

  const handleNoteOff = useCallback(
    (midi: number) => {
      if (!audioRef.current) return;
      audioRef.current.stopTone(midi);
      if (!gameState.current.isPlaying || gameState.current.isPaused) return;

      const noteIdx = notesRef.current.findIndex(
        (n) =>
          n.midi === midi && n.hit && n.isHolding && !n.completed && !n.lost,
      );

      if (noteIdx > -1) {
        const note = notesRef.current[noteIdx];
        note.isHolding = false;
        const currentBeatTime = 60 / gameState.current.bpm;
        const songTime =
          audioRef.current.ctx.currentTime - gameState.current.startTime;
        const noteEndTime = note.time + note.duration * currentBeatTime;
        const tolerance = 0.2;
        const st = gameState.current;

        if (note.duration < 0.3) {
          note.completed = true;
        } else if (songTime < noteEndTime - tolerance) {
          note.lost = true;
          failPhrase(note.phrase);
          const scoreState = scoringMiss();
          st.score = scoreState.score;
          st.streak = scoreState.streak;
          st.multiplier = scoreState.multiplier;
          st.uiDirty = true;
          showFeedbackRef.current('Early Release', '#ef4444');
        } else if (songTime > noteEndTime + tolerance) {
          note.lost = true;
          failPhrase(note.phrase);
          const scoreState = scoringMiss();
          st.score = scoreState.score;
          st.streak = scoreState.streak;
          st.multiplier = scoreState.multiplier;
          st.uiDirty = true;
          showFeedbackRef.current('Late Release', '#ef4444');
        } else {
          note.completed = true;
          st.holdCompletions += 1;
          const scoreState = scoringAddScore(40);
          st.score = scoreState.score;
          st.uiDirty = true;
          spawnParticles(note.midi);
          showFeedbackRef.current('Release!', '#34d399');
        }
      }
    },
    [spawnParticles, scoringMiss, scoringAddScore, failPhrase],
  );

  // Stable refs for callbacks used in game loop / event listeners.
  // These decouple the 60fps render loop from React's dependency system.
  const handleNoteOnRef = useRef(handleNoteOn);
  handleNoteOnRef.current = handleNoteOn;
  const handleNoteOffRef = useRef(handleNoteOff);
  handleNoteOffRef.current = handleNoteOff;

  const midi = useMidiKeyboard(
    (note) => {
      activeMidiNotes.current.add(note);
      handleNoteOnRef.current(note);
    },
    (note) => {
      activeMidiNotes.current.delete(note);
      handleNoteOffRef.current(note);
    },
  );

  const toggleMetronome = useCallback(() => {
    gameState.current.metronomeEnabled = !gameState.current.metronomeEnabled;
    setUiState((prev) => ({
      ...prev,
      metronomeEnabled: gameState.current.metronomeEnabled,
    }));
  }, []);

  const changeVolume = useCallback(
    (category: 'melody' | 'drums' | 'metronome' | 'backing', value: number) => {
      audioRef.current?.setVolume(category, value);
      const key = `${category}Volume` as
        | 'melodyVolume'
        | 'drumVolume'
        | 'metronomeVolume'
        | 'backingVolume';
      setUiState((prev) => ({
        ...prev,
        [category === 'drums' ? 'drumVolume' : key]: value,
      }));
      try {
        const stored = JSON.parse(localStorage.getItem('ma:volumes') ?? '{}');
        stored[category] = value;
        localStorage.setItem('ma:volumes', JSON.stringify(stored));
      } catch {
        /* ignore */
      }
    },
    [],
  );

  // ── Ending a run ─────────────────────────────────────────────────────────

  const stopRun = useCallback(() => {
    const st = gameState.current;
    st.isPlaying = false;
    st.isCountingIn = false;
    st.isPaused = false;
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    audioRef.current?.suspend();
    setUiState((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const finishRun = useCallback(
    (kind: 'won' | 'over') => {
      if (screenRef.current !== 'playing') return;
      stopRun();
      const st = gameState.current;
      const done = taskRef.current;
      const isFree = freeRef.current;
      onComplete?.({ score: st.score, maxStreak: st.maxStreak });
      if (kind === 'won') {
        const now = isFree ? progress : clear(done);
        const levelDone = !isFree && levelCleared(now, done.mode, done.level);
        setOutcome({
          kind: 'won',
          task: done,
          free: isFree,
          next: isFree ? null : nextTask(now, done.mode, done.level),
          levelDone,
          after: levelDone ? levelAfter(done.mode, done.level) : null,
          modeDone: !isFree && levelDone && modeCleared(now, done.mode),
        });
      } else {
        const attempted = st.hits + st.misses;
        setOutcome({
          kind: 'over',
          task: done,
          free: isFree,
          bestPhrases: trackRef.current.best,
          target: MODES[done.mode].streakPhrases[done.part],
          accuracy: attempted > 0 ? Math.round((st.hits / attempted) * 100) : 0,
        });
      }
      screenRef.current = 'result';
      setScreen('result');
    },
    [stopRun, onComplete, progress, clear],
  );
  const finishRunRef = useRef(finishRun);
  finishRunRef.current = finishRun;

  // A streak won during the run ends it: congratulations, and what's next.
  useEffect(() => {
    if (!reward.win || reward.win.id <= runWinFromRef.current) return;
    runWinFromRef.current = reward.win.id;
    finishRunRef.current('won');
  }, [reward.win]);

  // --- Render Loop ---
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !audioRef.current) return;

    const { width, height } = canvas;
    const st = gameState.current;

    if (st.isPaused) return;

    const currentTime = audioRef.current.ctx.currentTime;
    const currentBeatTime = 60 / st.bpm;

    ctx.clearRect(0, 0, width, height);

    // --- Count-in phase ---
    if (st.isCountingIn) {
      const timeUntilStart = st.startTime - currentTime;
      if (timeUntilStart <= 0) {
        st.isCountingIn = false;
        st.isPlaying = true;
        st.lastBeatScheduled = -1;
        st.countInNumber = 0;
        st.uiDirty = true;
      } else {
        const nextBeatIndex = Math.ceil(
          (currentTime - st.startTime) / currentBeatTime,
        );
        const nextBeatTime = st.startTime + nextBeatIndex * currentBeatTime;
        if (
          nextBeatTime < currentTime + 0.1 &&
          nextBeatIndex > st.lastBeatScheduled
        ) {
          audioRef.current.playClick(nextBeatTime, nextBeatIndex % 4 === 0);
          st.lastBeatScheduled = nextBeatIndex;
          const count = Math.abs(nextBeatIndex);
          if (count > 0 && count <= 4) {
            st.countInNumber = count;
            st.uiDirty = true;
          }
        }
        drawCountIn(ctx, width, height, st.countInNumber, st.currentKeyColor);
        requestRef.current = requestAnimationFrame(() =>
          renderFrameRef.current(),
        );
        return;
      }
    }

    // --- Playing phase ---
    if (st.isPlaying) {
      const songTime = currentTime - st.startTime;
      if (songTime > st.songDuration + 1) {
        finishRunRef.current('over');
        return;
      }

      // Schedule metronome + drums with pattern rotation
      const currentBeat = songTime / currentBeatTime;
      const currentBar = Math.floor(currentBeat / 4);

      const dp = drumPatternRef.current;
      if (
        currentBar > 0 &&
        currentBar % 8 === 0 &&
        currentBar !== dp.lastBarChanged
      ) {
        dp.patternIndex = (dp.patternIndex + 1) % DRUM_PATTERNS.length;
        dp.lastBarChanged = currentBar;
      }
      const drumPattern = DRUM_PATTERNS[dp.patternIndex];

      const nextBeatIndex = Math.ceil(currentBeat);
      const nextBeatTime = st.startTime + nextBeatIndex * currentBeatTime;

      if (
        nextBeatTime < currentTime + 0.1 &&
        nextBeatIndex > st.lastBeatScheduled
      ) {
        if (st.metronomeEnabled)
          audioRef.current.playClick(nextBeatTime, nextBeatIndex % 4 === 0);

        const beatInBar = nextBeatIndex % 4;
        drumPattern.forEach((hit) => {
          if (Math.abs(hit.beatOffset - beatInBar) < 0.01) {
            audioRef.current!.playDrum(hit.instrument, nextBeatTime);
          } else if (
            hit.beatOffset > beatInBar &&
            hit.beatOffset < beatInBar + 1
          ) {
            const subOffset = (hit.beatOffset - beatInBar) * currentBeatTime;
            audioRef.current!.playDrum(
              hit.instrument,
              nextBeatTime + subOffset,
            );
          }
        });

        st.lastBeatScheduled = nextBeatIndex;
      }

      // The band: every note whose time has come.
      const band = backingRef.current;
      while (
        band.next < band.notes.length &&
        band.notes[band.next].beat * currentBeatTime <= songTime + 0.02
      ) {
        const n = band.notes[band.next++];
        audioRef.current.playBacking(
          n.voice,
          n.midi,
          n.duration * currentBeatTime * 0.95,
        );
      }

      // Process note states
      notesRef.current.forEach((note) => {
        // Miss detection
        if (!note.hit && !note.missed && songTime > note.time + INPUT_WINDOW) {
          note.missed = true;
          st.misses += 1;
          failPhrase(note.phrase);
          if (st.streak > 0) {
            const scoreState = scoringMiss();
            st.score = scoreState.score;
            st.streak = scoreState.streak;
            st.multiplier = scoreState.multiplier;
            st.missFlashTime = songTime;
            showFeedbackRef.current('Miss', '#71717a');
          }
          st.uiDirty = true;
        }

        // Time-based hold scoring
        if (note.hit && note.isHolding && !note.completed && !note.lost) {
          const timeSinceLastScore = songTime - note.lastHoldScoreTime;
          if (
            note.duration > 0.5 &&
            timeSinceLastScore >= HOLD_SCORE_INTERVAL
          ) {
            const intervals = Math.floor(
              timeSinceLastScore / HOLD_SCORE_INTERVAL,
            );
            const scoreState = scoringAddScore(intervals);
            st.score = scoreState.score;
            note.lastHoldScoreTime = songTime;
            st.uiDirty = true;
          }
          if (songTime - note.lastParticleTime >= 0.15) {
            spawnParticles(note.midi);
            note.lastParticleTime = songTime;
          }
        }
      });

      // Judge each phrase once it's over: played clean, the streak grows.
      const track = trackRef.current;
      track.ends.forEach((end, phrase) => {
        if (track.judged.has(phrase) || songTime < end + PHRASE_SETTLE_S)
          return;
        track.judged.add(phrase);
        if (track.failed.has(phrase)) return;
        track.run += 1;
        track.best = Math.max(track.best, track.run);
        rewardRef.current.registerCorrect();
      });

      // Update particles
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.05;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // Draw
      drawGameFrame(
        ctx,
        width,
        height,
        st,
        songTime,
        notesRef.current,
        particlesRef.current,
        activeMidiNotes.current,
      );

      // Throttled UI update — single setUiState per frame
      if (st.uiDirty) {
        st.uiDirty = false;
        setUiState((prev) => ({
          ...prev,
          score: st.score,
          streak: st.streak,
          multiplier: st.multiplier,
          countInNumber: st.countInNumber,
        }));
      }
    }

    requestRef.current = requestAnimationFrame(() => renderFrameRef.current());
  }, [spawnParticles, scoringMiss, scoringAddScore, failPhrase]);

  const renderFrameRef = useRef(renderFrame);
  renderFrameRef.current = renderFrame;

  // --- Pause / Resume ---
  const togglePause = useCallback(() => {
    const st = gameState.current;
    if (!st.isPlaying && !st.isPaused) return;

    if (st.isPaused) {
      // Resume
      const pauseDuration =
        audioRef.current!.ctx.currentTime - st.pauseStartTime;
      st.totalPausedDuration += pauseDuration;
      st.startTime += pauseDuration;
      st.isPaused = false;
      audioRef.current?.resume();
      setUiState((prev) => ({ ...prev, isPaused: false }));
      requestRef.current = requestAnimationFrame(() =>
        renderFrameRef.current(),
      );
    } else {
      // Pause
      st.isPaused = true;
      st.pauseStartTime = audioRef.current!.ctx.currentTime;
      audioRef.current?.suspend();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setUiState((prev) => ({ ...prev, isPaused: true }));

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        drawPauseOverlay(ctx, canvas.width, canvas.height);
      }
    }
  }, []);

  const togglePauseRef = useRef(togglePause);
  togglePauseRef.current = togglePause;

  // ── Starting a run ───────────────────────────────────────────────────────

  const startRun = useCallback(
    (next: ArcanumTask, isFree = false) => {
      if (MODES[next.mode].midiRequired && !midi.connected) return;
      if (!audioRef.current) audioRef.current = new AudioEngine();
      const audio = audioRef.current;
      audio.resume();
      // Restore saved volume preferences
      try {
        const stored = JSON.parse(localStorage.getItem('ma:volumes') ?? '{}');
        for (const category of [
          'melody',
          'drums',
          'metronome',
          'backing',
        ] as const)
          if (stored[category] != null)
            audio.setVolume(category, stored[category]);
      } catch {
        /* ignore */
      }

      const run = buildRun({ ...next, rng: Math.random });
      const keyboard = runKeyboard(run);
      const beat = 60 / run.bpm;
      const st = gameState.current;
      st.bpm = run.bpm;
      st.gameMode = run.part;
      st.keyRootVal = run.keyPc;
      st.currentKeyColor = keyboard.keyColor;
      st.currentScaleNotes = keyboard.scaleNotes;
      st.keyboardMapping = keyboard.keyboardMapping;
      st.keyLabels = keyboard.keyLabels;
      st.display = keyboard.display;
      st.chordLabels = run.chords.map((c) => ({
        time: c.beat * beat,
        symbol: c.symbol,
      }));
      st.songDuration = run.totalBeats * beat;
      notesRef.current = run.notes.map((n) => ({
        time: n.beat * beat,
        midi: n.midi,
        phrase: n.phrase,
        duration: n.duration,
        isChord: n.isChord,
        hit: false,
        missed: false,
        lost: false,
        completed: false,
        isHolding: false,
        lastHoldScoreTime: 0,
        lastParticleTime: 0,
      }));
      st.totalNotes = notesRef.current.length;
      backingRef.current = {
        notes: [...run.backing].sort((a, b) => a.beat - b.beat),
        next: 0,
      };
      trackRef.current = {
        ...freshTrack(),
        ends: run.phrases.map((p) => {
          const last = run.notes
            .filter((n) => n.phrase === p.index)
            .reduce((end, n) => Math.max(end, n.beat), p.startBeat);
          return last * beat;
        }),
      };

      taskRef.current = next;
      freeRef.current = isFree;
      setTask(next);
      setFree(isFree);
      rewardRef.current.reset();
      runWinFromRef.current = rewardRef.current.win?.id ?? 0;

      scoringReset();
      st.score = 0;
      st.streak = 0;
      st.maxStreak = 0;
      st.multiplier = 1;
      st.hits = 0;
      st.misses = 0;
      st.holdCompletions = 0;
      st.holdAttempts = 0;
      st.missFlashTime = 0;
      st.isPaused = false;
      st.totalPausedDuration = 0;
      st.startTime = audio.ctx.currentTime + 4 * beat;
      st.isPlaying = false;
      st.isCountingIn = true;
      st.lastBeatScheduled = -5;
      st.countInNumber = 4;
      st.uiDirty = false;
      drumPatternRef.current = { patternIndex: 0, lastBarChanged: -1 };
      particlesRef.current = [];

      setUiState((prev) => ({
        ...prev,
        score: 0,
        streak: 0,
        multiplier: 1,
        countInNumber: 4,
        isPaused: false,
        bpm: run.bpm,
        keyColor: keyboard.keyColor,
      }));
      setOutcome(null);
      screenRef.current = 'playing';
      setScreen('playing');
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      requestRef.current = requestAnimationFrame(() =>
        renderFrameRef.current(),
      );
    },
    [midi.connected, scoringReset],
  );

  const openMap = useCallback(
    (focus?: { mode: ArcanumMode; level: ArcanumLevel }) => {
      stopRun();
      if (focus) setMapFocus(focus);
      screenRef.current = 'map';
      setScreen('map');
    },
    [stopRun],
  );

  // In development only: the run's notes and clock, for a test to play along.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as Record<string, unknown>;
    w.__arcanum = {
      notes: () => notesRef.current,
      songTime: () =>
        audioRef.current
          ? audioRef.current.ctx.currentTime - gameState.current.startTime
          : null,
      bpm: () => gameState.current.bpm,
    };
    return () => {
      delete w.__arcanum;
    };
  }, []);

  // --- Effects (mount-only — all callbacks accessed via stable refs) ---
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (
        e.code === 'Escape' &&
        (gameState.current.isPlaying || gameState.current.isPaused)
      ) {
        togglePauseRef.current();
        return;
      }

      if (gameState.current.isPaused) return;

      const mapping = gameState.current.keyboardMapping;
      if (mapping[e.code] && screenRef.current === 'playing') {
        const note = mapping[e.code];
        activeMidiNotes.current.add(note);
        handleNoteOnRef.current(note);
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      if (gameState.current.isPaused) return;
      const mapping = gameState.current.keyboardMapping;
      if (mapping[e.code]) {
        const note = mapping[e.code];
        activeMidiNotes.current.delete(note);
        handleNoteOffRef.current(note);
      }
    };

    const onResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const w = Math.round(width);
      const h = Math.round(height);
      if (w <= 0 || h <= 0) return;
      // Setting width/height clears the canvas, so avoid redundant resizes.
      if (canvasRef.current.width === w && canvasRef.current.height === h)
        return;
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      gameState.current.canvasWidth = w;
      gameState.current.canvasHeight = h;
      // The resize wiped the canvas; while paused nothing redraws it, so
      // repaint the pause overlay to keep it visible.
      if (gameState.current.isPaused) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) drawPauseOverlay(ctx, w, h);
      }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);

    // Track the container's actual rendered size so the canvas buffer always
    // matches its box exactly — a single mount-time measure can run before
    // layout settles, leaving the game mis-sized and shifted.
    const resizeObserver = new ResizeObserver(onResize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    onResize();

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      audioRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render ---
  const where = free
    ? 'The Circle'
    : `${MODES[task.mode].label} · Level ${task.level}`;

  return (
    <ArcadeStreakContext.Provider
      value={{
        count: reward.streak,
        target,
        win: reward.win,
        sessionXp: reward.sessionXp,
        unit: 'phrases',
      }}
    >
      <div className="flex w-full h-full bg-[#101012] text-zinc-100 overflow-hidden font-sans">
        {showCircle && (
          <CircleOfFifthsSelector
            onSelect={(keyPc) => {
              setShowCircle(false);
              const at = mapFocus ?? { mode: task.mode, level: task.level };
              startRun({ ...at, keyPc, part: 'melody' }, true);
            }}
            currentRoot={task.keyPc}
            onClose={() => setShowCircle(false)}
          />
        )}

        <div className="flex-1 min-h-0 min-w-0 flex flex-col relative bg-[#101012]">
          <GameHeader
            where={where}
            what={taskTitle(task)}
            keyColor={uiState.keyColor}
            score={uiState.score}
            streak={uiState.streak}
            multiplier={uiState.multiplier}
            onOpenMap={() => openMap({ mode: task.mode, level: task.level })}
          />

          <GameToolbar
            bpm={uiState.bpm}
            metronomeEnabled={uiState.metronomeEnabled}
            midiStatus={midi.status}
            showVolumePanel={uiState.showVolumePanel}
            melodyVolume={uiState.melodyVolume}
            drumVolume={uiState.drumVolume}
            metronomeVolume={uiState.metronomeVolume}
            backingVolume={uiState.backingVolume}
            onToggleMetronome={toggleMetronome}
            onToggleVolumePanel={() =>
              setUiState((s) => ({
                ...s,
                showVolumePanel: !s.showVolumePanel,
              }))
            }
            onChangeVolume={changeVolume}
          />

          {/* Canvas */}
          <div
            ref={containerRef}
            className="flex-1 min-h-0 relative bg-[#101012]"
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full"
            />

            {/* Feedback overlay */}
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-bold tracking-tight transition-opacity duration-200 pointer-events-none"
              style={{
                opacity: uiState.feedbackVisible ? 1 : 0,
                color: uiState.feedbackColor,
                textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                transform: uiState.feedbackVisible
                  ? 'translate(-50%, -50%) scale(1)'
                  : 'translate(-50%, -50%) scale(0.9)',
              }}
            >
              {uiState.feedbackText}
            </div>

            {screen === 'map' && (
              <LevelMap
                progress={progress}
                loading={loading}
                saveFailed={saveFailed}
                midiConnected={midi.connected}
                isPremium={isPremium}
                focus={mapFocus}
                onChoose={(mode, level) => setMapFocus({ mode, level })}
                onPlay={(next) => startRun(next)}
                onOpenCircle={() => setShowCircle(true)}
                onUpgrade={() => navigate(ProfileRoutes.plan.definition)}
              />
            )}

            {screen === 'result' && outcome && (
              <RunResult
                outcome={outcome}
                win={outcome.kind === 'won' ? reward.win : null}
                onPlay={(next) => startRun(next, outcome.free)}
                onLevel={(mode, level) => {
                  // The level's next part, or from the top to play it again;
                  // the map if it needs a MIDI keyboard and none is connected.
                  const first =
                    nextTask(progress, mode, level) ??
                    levelTasks(mode, level)[0];
                  if (MODES[mode].midiRequired && !midi.connected)
                    openMap({ mode, level });
                  else startRun(first);
                }}
                onMap={() => openMap({ mode: task.mode, level: task.level })}
              />
            )}
          </div>
        </div>
      </div>
    </ArcadeStreakContext.Provider>
  );
}
