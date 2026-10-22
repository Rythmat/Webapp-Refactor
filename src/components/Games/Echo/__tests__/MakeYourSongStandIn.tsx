import { useRef, useState } from 'react';
import type {
  EchoInputHandlers,
  MakeYourSongProps,
} from '../makeYourSong/types';

// ── Make Your Song's stand-in, for the game's tests ───────────────────────
// EchoGame.test.tsx plays a whole game through the gate; the song itself
// is Make Your Song's to test (makeYourSong/__tests__). This stand-in, the
// play screens' stub from before the real one landed, takes its place
// there: it shows the input the play screens hand over, and its buttons
// call back as the real one does (Finish once, then Play Again, Next
// Level! and Exit).

export function MakeYourSong({
  level,
  keyChoice,
  input,
  renderInput,
  onSongFinished,
  onPlayAgain,
  onNextLevel,
  onExit,
}: MakeYourSongProps) {
  const [finished, setFinished] = useState(false);
  const [notes, setNotes] = useState(0);
  const handlers = useRef<EchoInputHandlers>({
    kind: 'melody',
    noteOn: () => setNotes((n) => n + 1),
    noteOff: () => {},
  });

  const button =
    'h-11 rounded-full px-5 text-sm font-semibold transition-colors';
  return (
    <section
      aria-label="Make Your Song"
      data-make-your-song-stub
      className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-6 text-center"
    >
      <h2 className="text-3xl text-[#e8e8f0]">Make Your Song</h2>
      <p className="text-sm text-white/55">
        Level {level} · {keyChoice.tonic} {keyChoice.mode} · {input}. The
        mini-Studio is on its way. Try the input here: {notes} notes played.
      </p>
      <div className="flex h-40 w-full max-w-3xl">
        {renderInput(handlers.current)}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!finished ? (
          <button
            type="button"
            className={`${button} bg-white text-[#101012] hover:bg-white/90`}
            onClick={() => {
              setFinished(true);
              onSongFinished();
            }}
          >
            Finish My Song
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`${button} bg-white text-[#101012]`}
              onClick={onPlayAgain}
            >
              Play Again
            </button>
            {onNextLevel && (
              <button
                type="button"
                className={`${button} border border-white/20 text-[#e8e8f0]`}
                onClick={onNextLevel}
              >
                Next Level!
              </button>
            )}
          </>
        )}
        <button
          type="button"
          className={`${button} text-white/60 hover:text-white`}
          onClick={onExit}
        >
          Exit
        </button>
      </div>
    </section>
  );
}

export default MakeYourSong;
