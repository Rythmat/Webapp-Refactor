import { useEffect, useMemo } from 'react';
import { usePlayNote } from '@/contexts/PianoContext';
import { AnatomyStage } from '@/curriculum/anatomy/AnatomyStage';
import { describe } from '@/curriculum/anatomy/compileModel';
import type { StageProps } from '@/curriculum/audio/player/LessonPlayer';
import { midiToPitchName } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import { LessonKeyboard } from '@/learn/components/LessonKeyboard';
import { useLearnInputStable } from '@/learn/context/LearnInputContext';
import { pianoModel, type PianoModel, type PianoScene } from './script';

// ── Meet your instrument's stage ───────────────────────────────────────────
// The Anatomy pages' drawings for the parts, and the lesson keyboard (docked
// along the player's foot) for playing. A key clicked or played on a MIDI
// keyboard sounds and is kept, in order, for Check to read.

const DRAWINGS: Readonly<Record<string, PianoModel>> = {
  grand: 'grand',
  upright: 'upright',
  keyboard: 'keyboard',
};

const MIDDLE_C = 60;
const KEPT = 8;

const capitalise = (text: string) => text[0].toUpperCase() + text.slice(1);

export function PianoStage({
  scene,
  setScene,
  screen,
  accent,
  locked,
  onIdentify,
}: StageProps<PianoScene>) {
  const drawing = DRAWINGS[screen.view];
  const playing = screen.view === 'keys' || screen.view === 'sit';
  const playNote = usePlayNote();
  const { subscribeNoteOn, start, stop } = useLearnInputStable();

  // A MIDI keyboard, for as long as the lesson's open.
  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  // Notes played on the keys, while they're showing and the answer isn't.
  useEffect(() => {
    if (!playing) return undefined;
    return subscribeNoteOn((event) => {
      if (event.velocity === 0) return;
      if (event.source !== 'audio') playNote(event.number);
      if (!locked)
        setScene({ played: [...scene.played, event.number].slice(-KEPT) });
    });
  }, [locked, playNote, playing, scene.played, setScene, subscribeNoteOn]);

  const hints = useMemo(
    () =>
      screen.view === 'sit'
        ? new Map([[MIDDLE_C, accent]])
        : new Map<number, string>(),
    [accent, screen.view],
  );

  if (drawing) {
    const model = pianoModel(drawing);
    let term: string | null = null;
    if (screen.kind === 'anatomy') {
      term =
        screen.mode === 'show' ? screen.term : locked ? screen.target : null;
    }
    const finding = screen.kind === 'anatomy' && screen.mode === 'identify';
    return (
      <AnatomyStage
        model={model}
        term={term}
        apart={screen.kind === 'hook' ? 0 : 1}
        locked={locked}
        onPressTerm={finding ? onIdentify : undefined}
        listLabel={finding ? 'Choose from a list' : undefined}
        label={capitalise(describe(model))}
      />
    );
  }

  const [before, last] = scene.played.slice(-2);
  return (
    <div className="flex flex-col gap-3" data-stage="keys">
      <div className="flex items-center justify-between text-[0.875rem] font-bold uppercase tracking-[0.12em] text-white/55">
        <span aria-hidden>← Low</span>
        {screen.view === 'sit' ? (
          <span style={{ color: accent }}>Middle C, in front of you</span>
        ) : (
          <span className="normal-case tracking-normal text-white/75">
            {last == null
              ? 'Play a key'
              : before == null
                ? `You played ${midiToPitchName(last)}`
                : `You played ${midiToPitchName(before)}, then ${midiToPitchName(last)}`}
          </span>
        )}
        <span aria-hidden>High →</span>
      </div>
      <LessonKeyboard
        hintNotes={hints}
        enableClick={!locked}
        onKeyClick={(midi) => {
          if (screen.view !== 'keys' || locked) return;
          setScene({ played: [...scene.played, midi].slice(-KEPT) });
        }}
      />
    </div>
  );
}
