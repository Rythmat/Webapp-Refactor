import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameScore } from '../scoring/useGameScore';
import { AudioEngine } from './AudioEngine';
import { CircleOfFifthsSelector } from './CircleOfFifthsSelector';
import { GameHeader } from './GameHeader';
import { StartScreen, GameOverScreen } from './GameOverlay';
import { GameToolbar } from './GameToolbar';
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
  ROOTS,
  DIFFICULTY_PRESETS,
  DRUM_PATTERNS,
} from './constants';
import { getKeyGeometry, buildKeyMapping } from './keyMapping';
import { generateSong, getSongDuration } from './songGenerator';
import type { Note, Particle, GameState, NavigatorWithMIDI } from './types';

// --- Main Component ---

interface MajorArcanumProps {
  onComplete?: (result: { score: number; maxStreak: number }) => void;
}

export default function MajorArcanum({ onComplete }: MajorArcanumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioEngine | null>(null);
  const requestRef = useRef<number>();
  const activeMidiNotes = useRef<Set<number>>(new Set());
  const notesRef = useRef<Note[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const drumPatternRef = useRef({ patternIndex: 0, lastBarChanged: -1 });

  // Shared scoring integration — destructure to get individually stable refs
  const {
    hit: scoringHit,
    miss: scoringMiss,
    addScore: scoringAddScore,
    resetScore: scoringReset,
    completeRound: scoringComplete,
  } = useGameScore('majorArcanum');

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
    canvasWidth: 0,
    canvasHeight: 0,
    lastBeatScheduled: -1,
    metronomeEnabled: true,
    gameMode: 'Melody',
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
    difficulty: 3,
  });

  const [uiState, setUiState] = useState({
    score: 0,
    streak: 0,
    multiplier: 1,
    keyName: 'C Major',
    gameOver: false,
    gameStarted: false,
    countInNumber: 0,
    midiStatus: 'MIDI: Standby',
    feedbackText: '',
    feedbackColor: '#fff',
    feedbackVisible: false,
    metronomeEnabled: true,
    gameMode: 'Melody' as 'Melody' | 'Harmony',
    bpm: 80,
    showKeySelector: false,
    showVolumePanel: false,
    isPaused: false,
    difficulty: 3,
    melodyVolume: 1.0,
    drumVolume: 1.0,
    metronomeVolume: 1.0,
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
    const geom = getKeyGeometry(midi, gameState.current.canvasWidth);
    if (!geom) return;
    const x = geom.x + geom.width / 2;
    const y = gameState.current.canvasHeight - PIANO_HEIGHT;
    const st = gameState.current;
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
          const scoreState = scoringMiss();
          st.score = scoreState.score;
          st.streak = scoreState.streak;
          st.multiplier = scoreState.multiplier;
          st.uiDirty = true;
          showFeedbackRef.current('Early Release', '#ef4444');
        } else if (songTime > noteEndTime + tolerance) {
          note.lost = true;
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
    [spawnParticles, scoringMiss, scoringAddScore],
  );

  // Stable refs for callbacks used in game loop / event listeners.
  // These decouple the 60fps render loop from React's dependency system.
  const handleNoteOnRef = useRef(handleNoteOn);
  handleNoteOnRef.current = handleNoteOn;
  const handleNoteOffRef = useRef(handleNoteOff);
  handleNoteOffRef.current = handleNoteOff;

  const toggleMetronome = useCallback(() => {
    gameState.current.metronomeEnabled = !gameState.current.metronomeEnabled;
    setUiState((prev) => ({
      ...prev,
      metronomeEnabled: gameState.current.metronomeEnabled,
    }));
  }, []);

  const changeBPM = useCallback((delta: number) => {
    if (gameState.current.isPlaying) return;
    const newBPM = Math.max(40, Math.min(240, gameState.current.bpm + delta));
    gameState.current.bpm = newBPM;
    setUiState((prev) => ({ ...prev, bpm: newBPM }));
  }, []);

  const changeVolume = useCallback(
    (category: 'melody' | 'drums' | 'metronome', value: number) => {
      audioRef.current?.setVolume(category, value);
      const key = `${category}Volume` as
        | 'melodyVolume'
        | 'drumVolume'
        | 'metronomeVolume';
      setUiState((prev) => ({ ...prev, [key]: value }));
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

  const changeKey = useCallback((rootIndex: number) => {
    const { keyName, keyColor, scaleNotes, keyboardMapping } = buildKeyMapping(
      rootIndex,
      gameState.current.gameMode,
    );

    gameState.current.currentKeyColor = keyColor;
    gameState.current.currentScaleNotes = scaleNotes;
    gameState.current.keyboardMapping = keyboardMapping;
    gameState.current.keyRootVal = rootIndex;
    setUiState((prev) => ({ ...prev, keyName, showKeySelector: false }));

    const st = gameState.current;
    notesRef.current = generateSong(
      st.bpm,
      st.gameMode,
      keyboardMapping,
      scaleNotes,
      rootIndex,
      st.difficulty,
    );
    st.totalNotes = notesRef.current.length;
    st.songDuration = getSongDuration(st.bpm, st.difficulty);
  }, []);

  const toggleMode = useCallback(
    (mode: 'Melody' | 'Harmony') => {
      gameState.current.gameMode = mode;
      setUiState((prev) => ({ ...prev, gameMode: mode }));
      changeKey(gameState.current.keyRootVal);
    },
    [changeKey],
  );

  const changeDifficulty = useCallback(
    (diff: number) => {
      gameState.current.difficulty = diff;
      const preset = DIFFICULTY_PRESETS[diff];
      gameState.current.bpm = preset.bpm;
      setUiState((prev) => ({ ...prev, difficulty: diff, bpm: preset.bpm }));
      changeKey(gameState.current.keyRootVal);
    },
    [changeKey],
  );

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
      if (songTime > st.songDuration + 2) {
        st.isPlaying = false;
        scoringComplete(st.difficulty, ['majorArcanum']);
        setUiState((prev) => ({ ...prev, gameOver: true }));
        onComplete?.({ score: st.score, maxStreak: st.maxStreak });
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

      // Process note states
      notesRef.current.forEach((note) => {
        // Miss detection
        if (!note.hit && !note.missed && songTime > note.time + INPUT_WINDOW) {
          note.missed = true;
          st.misses += 1;
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
  }, [
    onComplete,
    spawnParticles,
    scoringMiss,
    scoringAddScore,
    scoringComplete,
  ]);

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

  const initGame = useCallback(() => {
    if (!audioRef.current) audioRef.current = new AudioEngine();
    audioRef.current.resume();

    // Restore saved volume preferences
    try {
      const stored = JSON.parse(localStorage.getItem('ma:volumes') ?? '{}');
      if (stored.melody != null)
        audioRef.current.setVolume('melody', stored.melody);
      if (stored.drums != null)
        audioRef.current.setVolume('drums', stored.drums);
      if (stored.metronome != null)
        audioRef.current.setVolume('metronome', stored.metronome);
    } catch {
      /* ignore */
    }

    changeKey(gameState.current.keyRootVal);
    scoringReset();

    const st = gameState.current;
    const currentBeatTime = 60 / st.bpm;
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
    st.startTime = audioRef.current.ctx.currentTime + 4 * currentBeatTime;
    st.isPlaying = false;
    st.isCountingIn = true;
    st.lastBeatScheduled = -5;
    st.countInNumber = 4;
    st.uiDirty = false;

    drumPatternRef.current = { patternIndex: 0, lastBarChanged: -1 };

    setUiState((prev) => ({
      ...prev,
      score: 0,
      streak: 0,
      multiplier: 1,
      gameStarted: true,
      gameOver: false,
      countInNumber: 4,
      isPaused: false,
    }));
    requestRef.current = requestAnimationFrame(() => renderFrameRef.current());
  }, [changeKey, scoringReset]);

  const handleStart = useCallback(async () => {
    setUiState((prev) => ({ ...prev, midiStatus: 'Requesting Access...' }));
    const nav = navigator as unknown as NavigatorWithMIDI;
    if (nav.requestMIDIAccess) {
      try {
        const access = await nav.requestMIDIAccess();
        let midiConnected = false;
        access.inputs.forEach((input) => {
          midiConnected = true;
          input.onmidimessage = (msg) => {
            const [cmd, note, vel] = msg.data;
            if (cmd >= 144 && cmd <= 159 && vel > 0) {
              activeMidiNotes.current.add(note);
              handleNoteOnRef.current(note);
            } else if (
              (cmd >= 128 && cmd <= 143) ||
              (cmd >= 144 && cmd <= 159 && vel === 0)
            ) {
              activeMidiNotes.current.delete(note);
              handleNoteOffRef.current(note);
            }
          };
        });
        if (midiConnected)
          setUiState((prev) => ({ ...prev, midiStatus: 'MIDI Active' }));
        else setUiState((prev) => ({ ...prev, midiStatus: 'MIDI Ready' }));
      } catch {
        setUiState((prev) => ({
          ...prev,
          midiStatus: 'Use Keyboard (A-L)',
        }));
      }
    } else {
      setUiState((prev) => ({
        ...prev,
        midiStatus: 'Use Keyboard (A-L)',
      }));
    }
    initGame();
  }, [initGame]);

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
      if (mapping[e.code]) {
        const midi = mapping[e.code];
        activeMidiNotes.current.add(midi);
        handleNoteOnRef.current(midi);
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      if (gameState.current.isPaused) return;
      const mapping = gameState.current.keyboardMapping;
      if (mapping[e.code]) {
        const midi = mapping[e.code];
        activeMidiNotes.current.delete(midi);
        handleNoteOffRef.current(midi);
      }
    };

    const onResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        gameState.current.canvasWidth = width;
        gameState.current.canvasHeight = height;
      }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('resize', onResize);
    onResize();

    // Initialize with random key
    const root = ROOTS[0]; // Default to C Major
    changeKey(root.val);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('resize', onResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      audioRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Render ---
  return (
    <div className="flex w-full h-full bg-[#09090b] text-zinc-100 overflow-hidden font-sans">
      {uiState.showKeySelector && (
        <CircleOfFifthsSelector
          onSelect={changeKey}
          currentRoot={gameState.current.keyRootVal}
          onClose={() => setUiState((s) => ({ ...s, showKeySelector: false }))}
        />
      )}

      <div className="flex-1 flex flex-col relative bg-[#09090b]">
        <GameHeader
          gameMode={uiState.gameMode}
          keyName={uiState.keyName}
          keyColor={gameState.current.currentKeyColor}
          score={uiState.score}
          streak={uiState.streak}
          multiplier={uiState.multiplier}
          onToggleMode={toggleMode}
          onOpenKeySelector={() =>
            setUiState((s) => ({ ...s, showKeySelector: true }))
          }
        />

        <GameToolbar
          bpm={uiState.bpm}
          metronomeEnabled={uiState.metronomeEnabled}
          midiStatus={uiState.midiStatus}
          showVolumePanel={uiState.showVolumePanel}
          melodyVolume={uiState.melodyVolume}
          drumVolume={uiState.drumVolume}
          metronomeVolume={uiState.metronomeVolume}
          onChangeBPM={changeBPM}
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
        <div ref={containerRef} className="flex-1 relative bg-[#09090b]">
          <canvas ref={canvasRef} className="block w-full h-full" />

          {/* Feedback overlay */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-bold tracking-tight transition-opacity duration-200 pointer-events-none"
            style={{
              opacity: uiState.feedbackVisible ? 1 : 0,
              color: uiState.feedbackColor,
              fontFamily: '"Playfair Display", serif',
              fontStyle: 'italic',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              transform: uiState.feedbackVisible
                ? 'translate(-50%, -50%) scale(1)'
                : 'translate(-50%, -50%) scale(0.9)',
            }}
          >
            {uiState.feedbackText}
          </div>

          {/* Overlays */}
          {!uiState.gameStarted && (
            <StartScreen
              difficulty={uiState.difficulty}
              onChangeDifficulty={changeDifficulty}
              onStart={handleStart}
            />
          )}

          {uiState.gameOver && (
            <GameOverScreen
              score={uiState.score}
              gameState={gameState.current}
              onRestart={initGame}
            />
          )}
        </div>
      </div>
    </div>
  );
}
