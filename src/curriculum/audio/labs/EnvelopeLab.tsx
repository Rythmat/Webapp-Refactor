import { Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { OUTLINE_PILL, WHITE_PILL } from '@/components/kit/pills';
import { cn } from '@/components/utilities';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { EnvelopeStage, type PlayedNote } from '../lab/EnvelopeStage';
import {
  LabDock,
  LabNext,
  LabPicker,
  LabSlider,
  LabText,
  PredictChoices,
  RevealVerdict,
  TapToHear,
  type LabChoice,
} from '../lab/LabControls';
import { LabDone, type LabFollowing } from '../lab/LabDone';
import type { LabTopicProps } from '../lab/LabLesson';
import type { Tone } from '../lab/WaveStage';
import {
  envelopeLevel,
  MIN_ATTACK,
  MIN_RELEASE,
  shapeNamed,
  SHAPES,
  TAP_HOLD,
  type Envelope,
  type NamedEnvelope,
} from '../lab/physics/envelope';
import { recipeNamed } from '../lab/physics/harmonics';
import { useLabTone } from '../lab/useLabTone';

// ── Sound Color → Envelope & ADSR ──────────────────────────────────────────
// The same wave at the same pitch can pluck, swell or hold: a note's shape over
// time is part of what it sounds like. Hear four shapes; guess what a slow attack
// does; shape one by hand, holding the note; then read a shape by ear.

const HZ = 220;
const VOICE = recipeNamed('mellow').harmonics;
const MAX_SECONDS = 1.5;

const CHOICES: readonly LabChoice[] = [
  { id: 'swell', text: 'It swells up from silence, on the same note' },
  { id: 'slide', text: 'The pitch slides up into the note' },
  { id: 'click', text: 'It starts with a sharp click' },
];
const CORRECT = 'swell';

/** The student's turn: a shape to name by ear. */
export const MYSTERY_SHAPES: readonly NamedEnvelope['id'][] = [
  'swell',
  'pluck',
  'accent',
  'held',
];

const SHAPE_NOTE =
  'The same note and the same wave every time. Only its level over time changes.';

const shapeOptions = SHAPES.map((shape) => ({
  id: shape.id,
  text: shape.name,
}));

const seconds = (value: number) =>
  value < 1 ? `${Math.round(value * 1000)} ms` : `${value.toFixed(2)} s`;

/** Plays a whole note from a tap, and marks where it started for the picture. */
function useTappedNote(tone: Tone) {
  const played = useRef<PlayedNote | null>(null);
  const play = (envelope: Envelope) => {
    played.current = { startedAt: performance.now(), letGoAfter: TAP_HOLD };
    tone.playNote('note', HZ, envelope, TAP_HOLD, VOICE);
  };
  return { played, play };
}

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [id, setId] = useState<NamedEnvelope['id']>('pluck');
  const { played, play } = useTappedNote(tone);
  const shape = shapeNamed(id);
  return (
    <>
      <LabText>
        <p>
          A note also has a shape over time: how fast it starts, how it settles,
          how it ends. This is its envelope, and it’s a big part of how we
          recognise an instrument. A plucked string is loudest at the start. A
          bowed one can swell.
        </p>
        <p>Press each shape to hear it.</p>
      </LabText>
      <EnvelopeStage
        envelope={shape.envelope}
        played={played}
        accent={accent}
        tone={tone}
        caption={SHAPE_NOTE}
      />
      <LabDock>
        <LabPicker
          label="Shape"
          options={shapeOptions}
          value={id}
          onPick={(next) => {
            setId(next);
            play(shapeNamed(next).envelope);
          }}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <p className="text-[0.8125rem] leading-5 text-white/55">
        {shape.name} is a simplified version of {shape.like}.
      </p>
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
  const held = shapeNamed('held').envelope;
  const { played, play } = useTappedNote(tone);
  return (
    <>
      <EnvelopeStage
        envelope={held}
        played={played}
        accent={accent}
        tone={tone}
        caption="This note starts almost at once, holds its level, and stops."
      />
      <div>
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() => play(held)}
        >
          <Play aria-hidden />
          Hear it
        </button>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="Now make it take nearly a second to start. Nothing else changes. What do you hear?"
        choices={CHOICES}
        picked={picked}
        onPick={onPick}
      />
      {picked && <LabNext onClick={next}>Hear what really happens</LabNext>}
    </>
  );
}

/** Sounds for as long as it's pressed, by pointer or by key. */
function HoldButton({
  held,
  onDown,
  onUp,
}: {
  held: boolean;
  onDown: () => void;
  onUp: () => void;
}) {
  const isKey = (key: string) => key === ' ' || key === 'Enter';
  return (
    <button
      type="button"
      aria-pressed={held}
      className={cn('touch-none select-none', held ? WHITE_PILL : OUTLINE_PILL)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        onDown();
      }}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={(event) => {
        if (!isKey(event.key)) return;
        event.preventDefault();
        if (!event.repeat) onDown();
      }}
      onKeyUp={(event) => {
        if (isKey(event.key)) onUp();
      }}
      onBlur={onUp}
    >
      <Play aria-hidden />
      Press and hold
    </button>
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
  const [envelope, setEnvelope] = useState<Envelope>({
    attack: 0.9,
    decay: 0.3,
    sustain: 0.7,
    release: 0.5,
  });
  const played = useRef<PlayedNote | null>(null);
  const held = tone.sounding.has('held');
  const change = (part: Partial<Envelope>) =>
    setEnvelope((prev) => ({ ...prev, ...part }));
  const down = () => {
    played.current = { startedAt: performance.now(), letGoAfter: null };
    tone.noteOn('held', HZ, envelope, VOICE);
  };
  const up = () => {
    // Already let go: a blur after a release, or a press that never started.
    if (!played.current || played.current.letGoAfter != null) return;
    played.current.letGoAfter =
      (performance.now() - played.current.startedAt) / 1000;
    tone.noteOff('held');
  };
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="It swells up from silence. The pitch doesn’t move at all, and neither does the wave. Only the level changes, but it sounds like a different kind of playing."
      />
      <EnvelopeStage
        envelope={envelope}
        played={played}
        named
        accent={accent}
        tone={tone}
        caption="Change the shape, then press and hold. The dot shows the level right now."
      />
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        <LabSlider
          label={`Attack: ${seconds(envelope.attack)}`}
          accent={accent}
          min={MIN_ATTACK}
          max={MAX_SECONDS}
          step={0.005}
          value={envelope.attack}
          valueText={seconds(envelope.attack)}
          onChange={(attack) => change({ attack })}
        />
        <LabSlider
          label={`Decay: ${seconds(envelope.decay)}`}
          accent={accent}
          min={0}
          max={MAX_SECONDS}
          step={0.005}
          value={envelope.decay}
          valueText={seconds(envelope.decay)}
          onChange={(decay) => change({ decay })}
        />
        <LabSlider
          label={`Sustain: ${Math.round(envelope.sustain * 100)}%`}
          accent={accent}
          step={0.01}
          value={envelope.sustain}
          valueText={`${Math.round(envelope.sustain * 100)} percent of the peak`}
          onChange={(sustain) => change({ sustain })}
        />
        <LabSlider
          label={`Release: ${seconds(envelope.release)}`}
          accent={accent}
          min={MIN_RELEASE}
          max={MAX_SECONDS}
          step={0.005}
          value={envelope.release}
          valueText={seconds(envelope.release)}
          onChange={(release) => change({ release })}
        />
      </div>
      <LabDock>
        <div>
          <HoldButton held={held} onDown={down} onUp={up} />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          <span className="text-white">Attack</span> is how long it takes to
          reach its peak. <span className="text-white">Decay</span> is how long
          it then takes to settle. <span className="text-white">Sustain</span>{' '}
          is the level it settles at while held: a level, not a time.{' '}
          <span className="text-white">Release</span> is how long it takes to
          fade once you let go.
        </p>
      </LabText>
      <LabNext onClick={next}>Your turn</LabNext>
    </>
  );
}

/** A shape drawn small, from the same numbers as the sound. */
function ShapeCurve({ envelope }: { envelope: Envelope }) {
  const total = TAP_HOLD + envelope.release;
  const points = [
    0,
    envelope.attack,
    envelope.attack + envelope.decay,
    TAP_HOLD,
    total,
  ]
    .map((t) => {
      const level = envelopeLevel(t, envelope, TAP_HOLD);
      return `${(t / total) * 100},${(1 - level) * 36 + 2}`;
    })
    .join(' ');
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="h-14 w-full"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
  const [wrong, setWrong] = useState(false);
  const finished = round >= MYSTERY_SHAPES.length;
  const answer = MYSTERY_SHAPES[Math.min(round, MYSTERY_SHAPES.length - 1)];

  if (finished) {
    return (
      <LabDone following={following} title="All four shapes, by ear.">
        <p>
          You now know what makes up a note’s sound: its pitch, its harmonics
          and its shape over time. Most synth controls you’ll ever touch change
          one of those three.
        </p>
      </LabDone>
    );
  }

  const pick = (id: NamedEnvelope['id']) => {
    if (id !== answer) {
      setWrong(true);
      return;
    }
    tone.stopAll();
    setWrong(false);
    const following = round + 1;
    setRound(following);
    if (following >= MYSTERY_SHAPES.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Mystery {round + 1} of {MYSTERY_SHAPES.length}.
          </span>{' '}
          Play the note, then choose the shape that matches what you heard. Is
          it sudden or slow to start? Does it hold, or die away?
        </p>
      </LabText>
      <div>
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() =>
            tone.playNote(
              'note',
              HZ,
              shapeNamed(answer).envelope,
              TAP_HOLD,
              VOICE,
            )
          }
        >
          <Play aria-hidden />
          Play the note
        </button>
      </div>
      <TapToHear show={tone.needsTap} />
      <div
        role="group"
        aria-label="Which shape was it?"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            type="button"
            aria-label={shape.name}
            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left text-[0.875rem] text-white/85 outline-none transition-colors duration-150 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-white/40"
            style={{ color: accent }}
            onClick={() => pick(shape.id)}
          >
            <ShapeCurve envelope={shape.envelope} />
            <span className="text-white/85">{shape.name}</span>
          </button>
        ))}
      </div>
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong && 'Not that shape. Play it again, and listen to how it ends.'}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          ADSR is a simple model of a note’s level over time, used by nearly
          every synth: attack, decay, sustain, release.
        </p>
        <p className={INSIGHT_DIM}>
          The Oracle synth in the Studio has these same four controls.
        </p>
      </InsightCard>
      <InsightCard title="Model and reality">
        <p className={INSIGHT_TEXT}>
          Real instruments are messier. A piano never truly sustains, since its
          sound starts dying the moment it’s struck, and an instrument’s
          harmonics each fade at their own rate. These shapes are simplified,
          and drawn as straight lines because that’s exactly how they play here.
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

export default function EnvelopeLab({
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
