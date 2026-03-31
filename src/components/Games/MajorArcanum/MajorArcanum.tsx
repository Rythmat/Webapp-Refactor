import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioEngine } from './AudioEngine';
import { CircleOfFifthsSelector } from './CircleOfFifthsSelector';
import { getNoteColor, drawCountIn, drawGameFrame } from './canvasRenderer';
import {
  PIANO_HEIGHT,
  INPUT_WINDOW,
  HOLD_SCORE_INTERVAL,
  ROOTS,
} from './constants';
import { getKeyGeometry, buildKeyMapping } from './keyMapping';
import { generateSong, getSongDuration } from './songGenerator';
import type { Note, Particle, GameState, NavigatorWithMIDI } from './types';

// --- Sub-components ---

const HexagonPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full opacity-40"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <pattern
        id="hexagons"
        width="50"
        height="43.4"
        patternUnits="userSpaceOnUse"
        patternTransform="scale(2)"
      >
        <path
          d="M25 0L50 14.4V43.3L25 57.7L0 43.3V14.4L25 0Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-white/10"
        />
      </pattern>
    </defs>
    <path d="M0 0H400L300 200H0V0Z" fill="#28a69a" fillOpacity="0.2" />
    <path d="M300 0H600L500 200H200L300 0Z" fill="#d2404a" fillOpacity="0.3" />
    <path d="M550 0H900L800 200H450L550 0Z" fill="#9d7fce" fillOpacity="0.2" />
    <path
      d="M850 0H1200L1100 200H750L850 0Z"
      fill="#fea92a"
      fillOpacity="0.2"
    />
    <rect width="100%" height="100%" fill="url(#hexagons)" />
  </svg>
);

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
    bpm: 120,
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
    gameMode: 'Melody',
    bpm: 120,
    showKeySelector: false,
  });

  // Bug fix #3: ref-based showFeedback to avoid stale closure in renderFrame
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

  const handleResize = useCallback(() => {
    if (containerRef.current && canvasRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      gameState.current.canvasWidth = width;
      gameState.current.canvasHeight = height;
    }
  }, []);

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
      if (!gameState.current.isPlaying) return;

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
        st.streak += 1;
        st.maxStreak = Math.max(st.maxStreak, st.streak);
        st.multiplier = Math.floor(st.streak / 10) + 1;
        st.score += 10 * st.multiplier;

        setUiState((prev) => ({
          ...prev,
          streak: st.streak,
          multiplier: st.multiplier,
          score: st.score,
        }));

        spawnParticles(midi);
        const color = getNoteColor(
          midi,
          st.currentScaleNotes,
          st.currentKeyColor,
        );
        showFeedbackRef.current('Perfect', color);
      }
    },
    [spawnParticles],
  );

  const handleNoteOff = useCallback(
    (midi: number) => {
      if (!audioRef.current) return;
      audioRef.current.stopTone(midi);
      if (!gameState.current.isPlaying) return;

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
          st.streak = 0;
          st.multiplier = 1;
          setUiState((prev) => ({ ...prev, streak: 0, multiplier: 1 }));
          showFeedbackRef.current('Early Release', '#ef4444');
        } else if (songTime > noteEndTime + tolerance) {
          note.lost = true;
          st.streak = 0;
          st.multiplier = 1;
          setUiState((prev) => ({ ...prev, streak: 0, multiplier: 1 }));
          showFeedbackRef.current('Late Release', '#ef4444');
        } else {
          note.completed = true;
          st.score += 40 * st.multiplier;
          setUiState((prev) => ({ ...prev, score: st.score }));
          spawnParticles(note.midi);
          showFeedbackRef.current('Release!', '#34d399');
        }
      }
    },
    [spawnParticles],
  );

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
    );
    st.songDuration = getSongDuration(st.bpm);
  }, []);

  const toggleMode = useCallback(
    (mode: string) => {
      gameState.current.gameMode = mode;
      setUiState((prev) => ({ ...prev, gameMode: mode }));
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
        setUiState((prev) => ({ ...prev, countInNumber: 0 }));
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
            setUiState((prev) => ({ ...prev, countInNumber: count }));
          }
        }
        drawCountIn(ctx, width, height, st.countInNumber, st.currentKeyColor);
        requestRef.current = requestAnimationFrame(renderFrame);
        return;
      }
    }

    // --- Playing phase ---
    if (st.isPlaying) {
      const songTime = currentTime - st.startTime;
      if (songTime > st.songDuration + 2) {
        st.isPlaying = false;
        setUiState((prev) => ({ ...prev, gameOver: true }));
        onComplete?.({ score: st.score, maxStreak: st.maxStreak });
        return;
      }

      // Schedule metronome + drums
      const currentBeat = songTime / currentBeatTime;
      const nextBeatIndex = Math.ceil(currentBeat);
      const nextBeatTime = st.startTime + nextBeatIndex * currentBeatTime;

      if (
        nextBeatTime < currentTime + 0.1 &&
        nextBeatIndex > st.lastBeatScheduled
      ) {
        if (st.metronomeEnabled)
          audioRef.current.playClick(nextBeatTime, nextBeatIndex % 4 === 0);

        const beatInBar = nextBeatIndex % 4;
        if (beatInBar === 0 || beatInBar === 2)
          audioRef.current.playDrum('kick', nextBeatTime);
        if (beatInBar === 1 || beatInBar === 3)
          audioRef.current.playDrum('snare', nextBeatTime);
        audioRef.current.playDrum('hat', nextBeatTime);
        st.lastBeatScheduled = nextBeatIndex;
      }

      // Process note states
      notesRef.current.forEach((note) => {
        // Miss detection
        if (!note.hit && !note.missed && songTime > note.time + INPUT_WINDOW) {
          note.missed = true;
          if (st.streak > 0) {
            st.streak = 0;
            st.multiplier = 1;
            setUiState((prev) => ({ ...prev, streak: 0, multiplier: 1 }));
            showFeedbackRef.current('Miss', '#71717a');
          }
        }

        // Bug fix #6: time-based hold scoring instead of probabilistic
        if (note.hit && note.isHolding && !note.completed && !note.lost) {
          const timeSinceLastScore = songTime - note.lastHoldScoreTime;
          if (
            note.duration > 0.5 &&
            timeSinceLastScore >= HOLD_SCORE_INTERVAL
          ) {
            const intervals = Math.floor(
              timeSinceLastScore / HOLD_SCORE_INTERVAL,
            );
            st.score += intervals * st.multiplier;
            note.lastHoldScoreTime = songTime;
            setUiState((prev) => ({ ...prev, score: st.score }));
          }
          if (Math.random() > 0.8) spawnParticles(note.midi);
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
    }

    requestRef.current = requestAnimationFrame(renderFrame);
  }, [onComplete, spawnParticles]);

  const initGame = useCallback(() => {
    if (!audioRef.current) audioRef.current = new AudioEngine();
    audioRef.current.resume();
    changeKey(gameState.current.keyRootVal);

    const currentBeatTime = 60 / gameState.current.bpm;
    gameState.current.score = 0;
    gameState.current.streak = 0;
    gameState.current.maxStreak = 0;
    gameState.current.multiplier = 1;
    gameState.current.startTime =
      audioRef.current.ctx.currentTime + 4 * currentBeatTime;
    gameState.current.isPlaying = false;
    gameState.current.isCountingIn = true;
    gameState.current.lastBeatScheduled = -5;
    gameState.current.countInNumber = 4;

    setUiState((prev) => ({
      ...prev,
      score: 0,
      streak: 0,
      multiplier: 1,
      gameStarted: true,
      gameOver: false,
      countInNumber: 4,
    }));
    requestRef.current = requestAnimationFrame(renderFrame);
  }, [changeKey, renderFrame]);

  const handleStart = useCallback(async () => {
    setUiState((prev) => ({ ...prev, midiStatus: 'Requesting Access...' }));
    // Bug fix #2: removed sysex: true — not needed, triggers stricter prompt
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
              handleNoteOn(note);
            } else if (
              (cmd >= 128 && cmd <= 143) ||
              (cmd >= 144 && cmd <= 159 && vel === 0)
            ) {
              activeMidiNotes.current.delete(note);
              handleNoteOff(note);
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
  }, [handleNoteOn, handleNoteOff, initGame]);

  // --- Effects ---
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const mapping = gameState.current.keyboardMapping;
      if (mapping[e.code]) {
        const midi = mapping[e.code];
        activeMidiNotes.current.add(midi);
        handleNoteOn(midi);
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      const mapping = gameState.current.keyboardMapping;
      if (mapping[e.code]) {
        const midi = mapping[e.code];
        activeMidiNotes.current.delete(midi);
        handleNoteOff(midi);
      }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('resize', handleResize);
    handleResize();

    // Initialize with random key
    if (!audioRef.current) {
      const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
      changeKey(root.val);
    }

    // Bug fix #5: close AudioContext on unmount
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      audioRef.current?.close();
    };
  }, [handleResize, handleNoteOn, handleNoteOff, changeKey]);

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
        {/* Header */}
        <div className="h-28 relative w-full flex items-center px-8 justify-between shrink-0 overflow-hidden border-b border-zinc-800">
          <div className="absolute inset-0 bg-[#18181b]">
            <HexagonPattern />
          </div>
          <div className="relative z-10 flex flex-col">
            <h1
              className="text-5xl font-serif italic text-white tracking-wide"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Major Arcanum
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => toggleMode('Melody')}
                className={`px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all ${
                  uiState.gameMode === 'Melody'
                    ? 'bg-white text-black'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                Melody
              </button>
              <button
                onClick={() => toggleMode('Harmony')}
                className={`px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all ${
                  uiState.gameMode === 'Harmony'
                    ? 'bg-white text-black'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                Harmony
              </button>
              <div className="w-px h-3 bg-zinc-700 mx-1" />
              <button
                onClick={() =>
                  setUiState((s) => ({ ...s, showKeySelector: true }))
                }
                className="px-3 py-1 rounded text-xs font-medium uppercase tracking-wider transition-all text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-700 flex items-center gap-2"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: gameState.current.currentKeyColor,
                  }}
                />
                {uiState.keyName}
              </button>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-8 bg-black/20 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/5">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Session XP
              </span>
              <span className="text-xl font-medium text-white tabular-nums">
                {uiState.score.toLocaleString()}
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Streak
              </span>
              <span className="text-xl font-medium text-cyan-400 tabular-nums">
                {uiState.streak}
              </span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                Multiplier
              </span>
              <span className="text-xl font-bold text-yellow-400 tabular-nums">
                x{uiState.multiplier}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="h-12 bg-[#121214] border-b border-zinc-800 flex items-center px-6 gap-4 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800">
            <button
              onClick={() => changeBPM(-5)}
              className="text-zinc-400 hover:text-white px-2"
            >
              -
            </button>
            <span className="text-xs text-zinc-500 font-mono">BPM</span>
            <span className="text-sm text-zinc-200 font-mono w-8 text-center">
              {uiState.bpm}
            </span>
            <button
              onClick={() => changeBPM(5)}
              className="text-zinc-400 hover:text-white px-2"
            >
              +
            </button>
          </div>
          <button
            onClick={toggleMetronome}
            className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-colors border ${
              uiState.metronomeEnabled
                ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                uiState.metronomeEnabled ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
            />
            Metronome
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                uiState.midiStatus.includes('Active')
                  ? 'bg-green-500'
                  : 'bg-zinc-600'
              }`}
            />
            {uiState.midiStatus}
          </div>
        </div>

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

          {/* Start screen */}
          {!uiState.gameStarted && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-4xl font-serif italic text-white mb-2">
                Ready to Play?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-md text-center">
                Connect your MIDI keyboard or use keys A-L to begin the rhythm
                training session.
              </p>
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-[#d2404a] hover:bg-[#b9363f] text-white font-medium rounded shadow-lg shadow-red-900/20 transition-all"
              >
                Start Session
              </button>
            </div>
          )}

          {/* Game over screen */}
          {uiState.gameOver && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
              <h2 className="text-5xl font-serif italic text-white mb-2">
                Session Complete
              </h2>
              <div className="flex gap-12 mt-12 mb-12">
                <div className="text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Final Score
                  </div>
                  <div className="text-4xl text-white font-light">
                    {uiState.score.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                    Accuracy Streak
                  </div>
                  <div className="text-4xl text-cyan-400 font-light">
                    {gameState.current.maxStreak}
                  </div>
                </div>
              </div>
              <button
                onClick={initGame}
                className="px-8 py-3 border border-zinc-700 hover:bg-zinc-800 text-white font-medium rounded transition-all"
              >
                Restart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
