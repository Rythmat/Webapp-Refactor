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
import { RatioStage } from '../lab/RatioStage';
import type { Tone } from '../lab/WaveStage';
import { recipeNamed } from '../lab/physics/harmonics';
import {
  equalTemperedHz,
  intervalHz,
  intervalNamed,
  INTERVALS,
} from '../lab/physics/intervals';
import {
  formatHz,
  hzToPosition,
  matchResult,
  nearestNote,
  positionToHz,
  type MatchResult,
} from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Waves Together → Intervals & Ratios ────────────────────────────────────
// Why some notes blend. Hear intervals against one root and see their ratios;
// guess how often a fifth lines up; hear a pure third against a piano's, whose
// harmonics beat; then build three intervals by ear. Harmonics are on throughout,
// because they're what clash or agree.

const ROOT = 220;
const RICH = recipeNamed('bright').harmonics;
/** Two rich tones at once: each below full, to leave the limiter alone. */
const LEVEL = 0.6;
const ROOT_NOTE = 'A3';

/** How near counts when building an interval: a quarter of a semitone. */
export const BUILD_CENTS = 25;

const CHOICES: readonly LabChoice[] = [
  { id: '2', text: '2 cycles' },
  { id: '3', text: '3 cycles' },
  { id: '5', text: '5 cycles' },
];
const CORRECT = '3';

/** The student's turn: an interval to build above the root. */
export const BUILD_ROUNDS = ['fifth', 'fourth', 'third'] as const;

/** A major third as a pure ratio, and as a piano has it. */
export const PURE_THIRD = ROOT * (5 / 4);
export const PIANO_THIRD = equalTemperedHz(ROOT, 4);

/** How fast the two thirds' nearest harmonics beat: 5 of the root against 4. */
export const thirdBeats = (third: number) => Math.abs(ROOT * 5 - third * 4);

const intervalOptions = INTERVALS.map((interval) => ({
  id: interval.id,
  text: interval.name,
}));

function playBoth(tone: Tone, upper: number) {
  tone.set('root', ROOT, LEVEL, RICH);
  tone.set('upper', upper, LEVEL, RICH);
}

function stopBoth(tone: Tone) {
  tone.stop('root');
  tone.stop('upper');
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
  const [id, setId] = useState('fifth');
  const interval = intervalNamed(id);
  const upper = intervalHz(ROOT, interval);
  const on = tone.sounding.has('root');
  return (
    <>
      <LabText>
        <p>
          An interval is the distance between two notes, and it’s really a ratio
          between their frequencies. Notes in a simple ratio line up again after
          only a few cycles. Many people hear those as blending smoothly.
        </p>
        <p>Press play and try each one against the same low note.</p>
      </LabText>
      <RatioStage
        interval={interval}
        accent={accent}
        tone={tone}
        caption="Left: one tone moves the dot sideways and the other moves it up, tracing a figure. Right: the two waves, with a tick each time they line up."
      />
      <LabDock>
        <div className="flex flex-wrap items-center gap-2">
          <SoundPill
            on={on}
            onClick={() => (on ? stopBoth(tone) : playBoth(tone, upper))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabPicker
            label="Interval"
            options={intervalOptions}
            value={id}
            onPick={(next) => {
              setId(next);
              tone.glide('upper', intervalHz(ROOT, intervalNamed(next)), LEVEL);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Ratio"
          value={`${interval.high} : ${interval.low}`}
          accent={accent}
        />
        <LabReadout label="Lower note" value={`${ROOT_NOTE} · ${ROOT} Hz`} />
        <LabReadout
          label="Upper note"
          value={`${nearestNote(upper).name} · ${formatHz(upper)}`}
        />
      </div>
      <LabNext onClick={next}>Next: make a prediction</LabNext>
    </>
  );
}

function PredictStep({
  tone,
  picked,
  onPick,
  next,
}: {
  tone: Tone;
  picked: string | null;
  onPick: (id: string) => void;
  next: () => void;
}) {
  const fifth = intervalNamed('fifth');
  const on = tone.sounding.has('root');
  return (
    <>
      <div>
        <SoundPill
          on={on}
          onClick={() =>
            on ? stopBoth(tone) : playBoth(tone, intervalHz(ROOT, fifth))
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          Hear a fifth
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="A fifth has a ratio of 3 to 2. The two notes start together. How many cycles of the higher note pass before they line up again?"
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
  const [third, setThird] = useState<'pure' | 'piano'>('pure');
  const fifth = intervalNamed('fifth');
  const upper = third === 'pure' ? PURE_THIRD : PIANO_THIRD;
  const on = tone.sounding.has('root');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="3 cycles of the higher note, while the lower one does 2. That’s what 3 : 2 means, and the ticks mark each time it comes round."
      />
      <RatioStage
        interval={fifth}
        accent={accent}
        tone={tone}
        caption="A fifth, top wave 3 cycles to each 2 of the lower one."
      />
      <LabText>
        <p>
          The harmonics agree too: the higher note’s second harmonic and the
          lower note’s third are the very same frequency. In a clashing
          interval, nearby harmonics beat against each other instead.
        </p>
        <p>
          Here’s a twist. A piano can’t keep every interval pure and still play
          in every key, so each is tuned a little away. Its major third is about
          14 cents wide. Listen for the fast shimmer it adds.
        </p>
      </LabText>
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={on}
          onClick={() => (on ? stopBoth(tone) : playBoth(tone, upper))}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="Which third"
          options={[
            { id: 'pure', text: `Pure · ${formatHz(PURE_THIRD)}` },
            { id: 'piano', text: `Piano · ${PIANO_THIRD.toFixed(1)} Hz` },
          ]}
          value={third}
          onPick={(next) => {
            setThird(next);
            tone.glide(
              'upper',
              next === 'pure' ? PURE_THIRD : PIANO_THIRD,
              LEVEL,
            );
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Beats a second"
          value={thirdBeats(upper).toFixed(0)}
          accent={accent}
        />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        Why some intervals sound smooth is only partly physics. What you grew up
        hearing matters too, and music around the world tunes and hears them
        differently.
      </p>
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
  const [upper, setUpper] = useState(ROOT);
  const [result, setResult] = useState<MatchResult | null>(null);
  const finished = round >= BUILD_ROUNDS.length;
  const interval = intervalNamed(
    BUILD_ROUNDS[Math.min(round, BUILD_ROUNDS.length - 1)],
  );
  const target = intervalHz(ROOT, interval);
  const on = tone.sounding.has('root');

  if (finished) {
    return (
      <LabDone following={following} title="Three intervals, tuned by ear.">
        <p>
          Those are the ratios under nearly all the chords you’ll play, and you
          found them by listening for them to settle.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const outcome = matchResult(upper, target, BUILD_CENTS);
    setResult(outcome);
    if (outcome !== 'match') return;
    tone.stopAll();
    setResult(null);
    setUpper(ROOT);
    const following = round + 1;
    setRound(following);
    if (following >= BUILD_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Interval {round + 1} of {BUILD_ROUNDS.length}: a{' '}
            {interval.name.toLowerCase()}, {interval.high} : {interval.low}.
          </span>{' '}
          Play both notes and move the upper one until they settle and the
          beating slows to nothing.
        </p>
      </LabText>
      <RatioStage
        interval={interval}
        accent={accent}
        tone={tone}
        caption="The picture shows the ratio you’re aiming for, not where you are now."
      />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() => (on ? stopBoth(tone) : playBoth(tone, upper))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabSlider
            label="The upper note"
            low="Same"
            high="Octave"
            accent={accent}
            step={0.0005}
            value={hzToPosition(upper, ROOT, ROOT * 2)}
            valueText="Match it by ear"
            onChange={(position) => {
              const value = positionToHz(position, ROOT, ROOT * 2);
              setUpper(value);
              setResult(null);
              tone.glide('upper', value, LEVEL);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {result === 'higher' && 'Not yet: it needs to go higher.'}
          {result === 'lower' && 'Not yet: it needs to go lower.'}
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
          Intervals are ratios of frequency. Simple ratios line up often and
          their harmonics coincide, while complex ones have nearby harmonics
          that beat.
        </p>
        <p className={INSIGHT_DIM}>
          Physics explains some of what we call consonance. Culture and
          experience explain the rest, and the balance is still debated.
        </p>
      </InsightCard>
      <InsightCard title="Pure and piano">
        <p className={INSIGHT_TEXT}>
          Equal temperament splits the octave into 12 identical steps, so a
          piano plays in every key at the cost of nearly every interval being
          slightly off pure. Its fifth is 2 cents narrow, and its major third 14
          cents wide.
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

export default function IntervalsLab({
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
