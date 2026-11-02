import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import {
  LabDock,
  LabNext,
  LabPicker,
  LabReadout,
  LabSlider,
  LabText,
  PredictChoices,
  RevealVerdict,
  SoundPill,
  TapToHear,
  type LabChoice,
} from '../lab/LabControls';
import { LabDone, type LabFollowing } from '../lab/LabDone';
import type { LabTopicProps } from '../lab/LabLesson';
import { StandingStage } from '../lab/StandingStage';
import type { Tone } from '../lab/WaveStage';
import {
  fundamentalHz,
  modeHz,
  modesOf,
  nodesOf,
  OPEN_STRING_HZ,
  stringHz,
  type SoundSource,
} from '../lab/physics/standing';
import {
  formatHz,
  matchResult,
  nearestNote,
  type MatchResult,
} from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Sound Color → Strings & Pipes ──────────────────────────────────────────
// Why an instrument has notes at all: only the patterns that fit between its
// ends last. See them on a string and in two pipes; guess what half a string
// does; then find three notes by length alone, which is what a fret is.

const SOURCES: readonly { id: SoundSource; text: string }[] = [
  { id: 'string', text: 'String' },
  { id: 'flute', text: 'Flute' },
  { id: 'clarinet', text: 'Clarinet' },
];

const SLOWED =
  'Slowed right down: the real swing is far too fast to see. Drawn idealised, and far wider than a real one moves.';

const CHOICES: readonly LabChoice[] = [
  { id: 'up', text: 'The note goes up one octave' },
  { id: 'down', text: 'The note goes down one octave' },
  { id: 'same', text: 'It’s the same note, only quieter' },
];
const CORRECT = 'up';

/** The student's turn: three lengths to find, the first with its place marked. */
export const LENGTH_ROUNDS = [
  { length: 1 / 2, marked: true },
  { length: 2 / 3, marked: false },
  { length: 3 / 4, marked: false },
] as const;

const MIN_LENGTH = 0.25;

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [source, setSource] = useState<SoundSource>('string');
  const [mode, setMode] = useState(1);
  const on = tone.sounding.has('mine');
  const hz = modeHz(source, mode);
  return (
    <>
      <LabText>
        <p>
          Pluck a string and a wave runs along it, hits the end and comes back.
          Only the patterns that fit exactly between the two ends last. These
          are standing waves, and each one has its own pitch.
        </p>
        <p>Air in a pipe does the same thing. Try each one.</p>
      </LabText>
      <StandingStage
        source={source}
        mode={mode}
        accent={accent}
        tone={tone}
        caption={`The white dots never move. ${SLOWED}`}
      />
      <LabDock>
        <div className="flex flex-wrap items-center gap-2">
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : tone.set('mine', hz))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabPicker
            label="What’s ringing"
            options={SOURCES}
            value={source}
            onPick={(next) => {
              const nextMode = modesOf(next).includes(mode) ? mode : 1;
              setSource(next);
              setMode(nextMode);
              tone.glide('mine', modeHz(next, nextMode));
            }}
          />
        </div>
        <LabPicker
          label="Which pattern"
          options={modesOf(source).map((id) => ({
            id,
            text: `Harmonic ${id}`,
          }))}
          value={mode}
          onPick={(next) => {
            setMode(next);
            tone.glide('mine', modeHz(source, next));
          }}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout label="Frequency" value={formatHz(hz)} accent={accent} />
        <LabReadout label="Nearest note" value={nearestNote(hz).name} />
        <LabReadout
          label="Still points"
          value={String(nodesOf(source, mode).length)}
        />
      </div>
      <LabNext onClick={next}>Next: make a prediction</LabNext>
    </>
  );
}

function PredictStep({
  tone,
  accent,
  picked,
  onPick,
  next,
}: {
  tone: Tone;
  accent: string;
  picked: string | null;
  onPick: (id: string) => void;
  next: () => void;
}) {
  const on = tone.sounding.has('open');
  return (
    <>
      <StandingStage
        source="string"
        mode={1}
        accent={accent}
        tone={tone}
        caption={SLOWED}
      />
      <div>
        <SoundPill
          on={on}
          onClick={() =>
            on ? tone.stop('open') : tone.set('open', OPEN_STRING_HZ)
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          Hear the open string
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="Press this string down at exactly half its length. What happens to the note?"
        choices={CHOICES}
        picked={picked}
        onPick={onPick}
      />
      {picked && <LabNext onClick={next}>See what really happens</LabNext>}
    </>
  );
}

function RevealStep({
  tone,
  accent,
  picked,
  next,
}: {
  tone: Tone;
  accent: string;
  picked: string | null;
  next: () => void;
}) {
  const [length, setLength] = useState(1 / 2);
  const [pipe, setPipe] = useState<'flute' | 'clarinet'>('flute');
  const stringOn = tone.sounding.has('string');
  const pipeOn = tone.sounding.has('pipe');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Half the length, twice the frequency: one octave up. It’s the same wave with half as far to go."
      />
      <StandingStage
        source="string"
        mode={1}
        length={length}
        accent={accent}
        tone={tone}
        caption="The dot is your finger. Past it, the string doesn’t sound."
      />
      <div className="flex items-center gap-4">
        <SoundPill
          on={stringOn}
          onClick={() => {
            tone.stop('pipe');
            if (stringOn) tone.stop('string');
            else tone.set('string', stringHz(length));
          }}
        >
          {stringOn ? <Square aria-hidden /> : <Play aria-hidden />}
          {stringOn ? 'Stop' : 'Play'}
        </SoundPill>
        <LabSlider
          label={`String length: ${Math.round(length * 100)}%, ${formatHz(stringHz(length))}`}
          accent={accent}
          min={MIN_LENGTH}
          max={1}
          value={length}
          valueText={`${Math.round(length * 100)} percent, ${Math.round(stringHz(length))} hertz`}
          onChange={(value) => {
            setLength(value);
            tone.glide('string', stringHz(value));
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          A pipe works the same way, with one twist. These two are the same
          length, about 60 cm, but closing one end makes the wave twice as long,
          so the clarinet’s lowest note is an octave below the flute’s.
        </p>
      </LabText>
      <StandingStage
        source={pipe}
        mode={1}
        accent={accent}
        tone={tone}
        caption="The line shows how far the air moves at each place. In the clarinet, it can’t move at all against the closed mouthpiece."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={pipeOn}
          onClick={() => {
            tone.stop('string');
            if (pipeOn) tone.stop('pipe');
            else tone.set('pipe', fundamentalHz(pipe));
          }}
        >
          {pipeOn ? <Square aria-hidden /> : <Play aria-hidden />}
          {pipeOn ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="Which pipe"
          options={[
            {
              id: 'flute',
              text: `Flute · ${formatHz(fundamentalHz('flute'))}`,
            },
            {
              id: 'clarinet',
              text: `Clarinet · ${formatHz(fundamentalHz('clarinet'))}`,
            },
          ]}
          value={pipe}
          onPick={(next) => {
            setPipe(next);
            tone.glide('pipe', fundamentalHz(next));
          }}
        />
      </div>
      <LabNext onClick={next}>Your turn</LabNext>
    </>
  );
}

function TryStep({
  tone,
  accent,
  onDone,
  following,
}: {
  tone: Tone;
  accent: string;
  onDone: () => void;
  following: LabFollowing | null;
}) {
  const [round, setRound] = useState(0);
  const [length, setLength] = useState(1);
  const [result, setResult] = useState<MatchResult | null>(null);
  const finished = round >= LENGTH_ROUNDS.length;
  const current = LENGTH_ROUNDS[Math.min(round, LENGTH_ROUNDS.length - 1)];
  const target = stringHz(current.length);
  const targetOn = tone.sounding.has('target');
  const mineOn = tone.sounding.has('mine');

  if (finished) {
    return (
      <LabDone following={following} title="Three notes, from length alone.">
        <p>
          Half the string is an octave, two thirds a fifth, three quarters a
          fourth. Those frets are where they are for this reason.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const outcome = matchResult(stringHz(length), target);
    setResult(outcome);
    if (outcome !== 'match') return;
    tone.stopAll();
    setResult(null);
    setLength(1);
    const following = round + 1;
    setRound(following);
    if (following >= LENGTH_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Note {round + 1} of {LENGTH_ROUNDS.length}.
          </span>{' '}
          {current.marked
            ? 'Play the target and move your finger to the ring.'
            : 'No ring this time: listen to the target, then find it by ear.'}
        </p>
      </LabText>
      <StandingStage
        source="string"
        mode={1}
        length={length}
        ghostLength={current.marked ? current.length : undefined}
        accent={accent}
        tone={tone}
        caption="The dot is your finger, on one string."
      />
      <LabDock>
        <div className="flex flex-wrap gap-2">
          <SoundPill
            on={targetOn}
            onClick={() => {
              tone.stop('mine');
              if (targetOn) tone.stop('target');
              else tone.set('target', target);
            }}
          >
            {targetOn ? <Square aria-hidden /> : <Play aria-hidden />}
            Target
          </SoundPill>
          <SoundPill
            on={mineOn}
            onClick={() => {
              tone.stop('target');
              if (mineOn) tone.stop('mine');
              else tone.set('mine', stringHz(length));
            }}
          >
            {mineOn ? <Square aria-hidden /> : <Play aria-hidden />}
            Your note
          </SoundPill>
        </div>
        <LabSlider
          label="String length"
          accent={accent}
          min={MIN_LENGTH}
          max={1}
          value={length}
          valueText="Match it by ear"
          onChange={(value) => {
            setLength(value);
            setResult(null);
            tone.glide('mine', stringHz(value));
          }}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {result === 'higher' && 'Not yet: the target is higher. Go shorter.'}
          {result === 'lower' && 'Not yet: the target is lower. Go longer.'}
        </p>
        <button type="button" className={WHITE_PILL} onClick={check}>
          Check
        </button>
      </div>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          A standing wave is a wave reflecting back on itself, so that some
          places swing widely and others never move. Only patterns that fit the
          length last, which is why an instrument has notes rather than a blur.
        </p>
        <p className={INSIGHT_DIM}>
          A string or a pipe open at both ends rings at every whole-number
          multiple of its lowest note. A pipe closed at one end favours the odd
          ones.
        </p>
      </InsightCard>
      <InsightCard title="Reading the picture">
        <p className={INSIGHT_TEXT}>
          These are idealised, one pattern at a time. A real instrument rings in
          many at once, which is the next topic. Real pipes also behave as if
          slightly longer than they are, and a real clarinet’s even harmonics
          are weak, not missing.
        </p>
      </InsightCard>
    </>
  );
}

function StopOnLeaving({ step, tone }: { step: string; tone: Tone }) {
  const { stopAll } = tone;
  useEffect(() => stopAll, [step, stopAll]);
  return null;
}

export default function StringsAndPipesLab({
  step,
  accent,
  next,
  complete,
  following,
  about,
}: LabTopicProps) {
  const tone = useLabTone();
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <StopOnLeaving step={step} tone={tone} />
      {step === 'hear' && <HearStep tone={tone} accent={accent} next={next} />}
      {step === 'predict' && (
        <PredictStep
          tone={tone}
          accent={accent}
          picked={picked}
          onPick={setPicked}
          next={next}
        />
      )}
      {step === 'reveal' && (
        <RevealStep tone={tone} accent={accent} picked={picked} next={next} />
      )}
      {step === 'try' && (
        <TryStep
          tone={tone}
          accent={accent}
          onDone={complete}
          following={following}
        />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
