import { DIFFICULTY_PRESETS } from './constants';
import type { GameState } from './types';

interface StartScreenProps {
  difficulty: number;
  onChangeDifficulty: (diff: number) => void;
  onStart: () => void;
}

export function StartScreen({
  difficulty,
  onChangeDifficulty,
  onStart,
}: StartScreenProps) {
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
      <h2 className="text-4xl font-serif italic text-white mb-2">
        Ready to Play?
      </h2>
      <p className="text-zinc-400 mb-6 max-w-md text-center">
        Connect your MIDI keyboard or use keys A-L to begin the rhythm training
        session.
      </p>

      <div className="flex gap-2 mb-8">
        {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => {
          const diff = Number(key);
          return (
            <button
              key={diff}
              onClick={() => onChangeDifficulty(diff)}
              className={`px-4 py-2 rounded text-sm font-medium transition-all border ${
                difficulty === diff
                  ? 'bg-white text-black border-white'
                  : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
            >
              <div>{preset.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">
                {preset.bpm} BPM
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onStart}
        className="px-8 py-3 bg-[#d2404a] hover:bg-[#b9363f] text-white font-medium rounded shadow-lg shadow-red-900/20 transition-all"
      >
        Start Session
      </button>
    </div>
  );
}

interface GameOverScreenProps {
  score: number;
  gameState: GameState;
  onRestart: () => void;
}

export function GameOverScreen({
  score,
  gameState: st,
  onRestart,
}: GameOverScreenProps) {
  const totalAttempted = st.hits + st.misses;
  const accuracy =
    totalAttempted > 0 ? Math.round((st.hits / totalAttempted) * 100) : 0;
  const holdAccuracy =
    st.holdAttempts > 0
      ? Math.round((st.holdCompletions / st.holdAttempts) * 100)
      : 100;

  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
      <h2 className="text-5xl font-serif italic text-white mb-2">
        Session Complete
      </h2>

      <div className="grid grid-cols-3 gap-x-12 gap-y-6 mt-10 mb-10">
        <div className="text-center">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Final Score
          </div>
          <div className="text-4xl text-white font-light">
            {score.toLocaleString()}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Best Streak
          </div>
          <div className="text-4xl text-cyan-400 font-light">
            {st.maxStreak}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Accuracy
          </div>
          <div className="text-4xl text-white font-light">{accuracy}%</div>
        </div>

        <div className="text-center">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Notes Hit
          </div>
          <div className="text-2xl text-emerald-400 font-light">{st.hits}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Notes Missed
          </div>
          <div className="text-2xl text-zinc-400 font-light">{st.misses}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
            Hold Accuracy
          </div>
          <div className="text-2xl text-amber-400 font-light">
            {holdAccuracy}%
          </div>
        </div>
      </div>

      <div className="text-xs text-zinc-600 mb-6">
        {DIFFICULTY_PRESETS[st.difficulty].label} &middot; {st.bpm} BPM &middot;{' '}
        {st.totalNotes} notes
      </div>

      <button
        onClick={onRestart}
        className="px-8 py-3 border border-zinc-700 hover:bg-zinc-800 text-white font-medium rounded transition-all"
      >
        Restart
      </button>
    </div>
  );
}
