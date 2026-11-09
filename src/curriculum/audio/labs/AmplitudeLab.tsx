import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { AirStage } from '../lab/AirStage';
import {
  LabDock,
  LabNext,
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
import type { Tone } from '../lab/WaveStage';
import { ampToDb, dbToAmp, formatDb } from '../lab/physics/decibels';
import { useLabTone } from '../lab/useLabTone';

// ── Sound Basics → Amplitude & Volume ──────────────────────────────────────
// How hard the air is pushed. Hear it and see the squeeze; guess what half the
// amplitude does; hear −6 dB for yourself; then match three levels by ear. All
// its decibels are relative to this lab's own maximum, and it says so: a page
// can't know how loud the student's speakers are.

const HZ = 440;

const CHOICES: readonly LabChoice[] = [
  { id: 'half', text: 'It sounds half as loud' },
  {
    id: 'more',
    text: 'It’s clearly quieter, but still sounds more than half as loud',
  },
  { id: 'same', text: 'It sounds about the same' },
];
const CORRECT = 'more';

/** Slider travel for matching by ear, in decibels: as the ear hears them. */
const MIN_DB = -36;

/** The student's turn: three levels to match, within what an ear can tell. */
export const LEVEL_ROUNDS = [-6, -20, -12] as const;
export const MATCH_DB = 3;

export type LevelResult = 'match' | 'louder' | 'quieter';

/** Which way the student's level has to go to reach the target. */
export function levelResult(mine: number, target: number): LevelResult {
  if (Math.abs(mine - target) <= MATCH_DB) return 'match';
  return mine < target ? 'louder' : 'quieter';
}

/** Rough sound levels in the real world, in dB SPL. */
const REAL_WORLD = [
  { db: 30, name: 'A whisper' },
  { db: 60, name: 'A conversation' },
  { db: 85, name: 'Heavy traffic. Hours of this can damage hearing' },
  { db: 110, name: 'A loud concert. Minutes of this can damage hearing' },
];

function HearStep({
  tone,
  amplitude,
  setAmplitude,
  accent,
  next,
}: {
  tone: Tone;
  amplitude: number;
  setAmplitude: (amplitude: number) => void;
  accent: string;
  next: () => void;
}) {
  const on = tone.sounding.has('mine');
  const db = ampToDb(amplitude);
  return (
    <>
      <LabText>
        <p>
          Amplitude is how hard the air is pushed: how much the particles bunch
          and spread. We hear it as volume. The volume on your phone sets how
          much air its speaker moves.
        </p>
      </LabText>
      <AirStage
        hz={HZ}
        squeeze={amplitude}
        accent={accent}
        pressure
        peak={tone.peak}
      />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() =>
              on ? tone.stop('mine') : tone.set('mine', HZ, amplitude)
            }
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabSlider
            label="Amplitude"
            low="Silent"
            high="Maximum"
            accent={accent}
            value={amplitude}
            valueText={`${Math.round(amplitude * 100)} percent, ${formatDb(db)}`}
            onChange={(value) => {
              setAmplitude(value);
              tone.glide('mine', HZ, value);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Amplitude"
          value={`${Math.round(amplitude * 100)}%`}
          accent={accent}
        />
        <LabReadout label="Level" value={formatDb(db)} />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        These decibels are relative to this lab’s maximum: 0 dB here isn’t
        silence, it’s the loudest this lab goes. How loud that really is depends
        on your device, so start low, especially in headphones.
      </p>
      <LabNext onClick={next}>Next: make a prediction</LabNext>
    </>
  );
}

function PredictStep({
  accent,
  picked,
  onPick,
  next,
}: {
  accent: string;
  picked: string | null;
  onPick: (id: string) => void;
  next: () => void;
}) {
  return (
    <>
      <AirStage hz={HZ} accent={accent} pressure />
      <PredictChoices
        question="Cut this wave’s amplitude exactly in half. How does it sound?"
        choices={CHOICES}
        picked={picked}
        onPick={onPick}
      />
      {picked && <LabNext onClick={next}>Hear what really happens</LabNext>}
    </>
  );
}

const COMPARE = [
  { label: 'Full', amplitude: 1 },
  { label: 'Half', amplitude: 0.5 },
  { label: 'Quarter', amplitude: 0.25 },
] as const;

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
  const [amplitude, setAmplitude] = useState(1);
  const on = tone.sounding.has('mine');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Half the amplitude is −6 dB. It’s clearly quieter, but the ear doesn’t hear it as half as loud: that takes about −10 dB."
      />
      <AirStage
        hz={HZ}
        squeeze={amplitude}
        accent={accent}
        pressure
        peak={tone.peak}
      />
      <div className="flex flex-wrap gap-2">
        {COMPARE.map((level) => {
          const active = on && amplitude === level.amplitude;
          return (
            <SoundPill
              key={level.label}
              on={active}
              onClick={() => {
                if (active) {
                  tone.stop('mine');
                  return;
                }
                setAmplitude(level.amplitude);
                tone.set('mine', HZ, level.amplitude);
              }}
            >
              {active ? <Square aria-hidden /> : <Play aria-hidden />}
              {level.label} · {formatDb(ampToDb(level.amplitude))}
            </SoundPill>
          );
        })}
      </div>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          Decibels count ratios, because that’s how we hear. Every halving of
          amplitude is the same 6 dB step, however loud you start.
        </p>
      </LabText>
      <div className="flex flex-col gap-2" data-lab-real-world>
        <span className="text-[0.8125rem] text-white/55">
          In the real world, decibels are measured against the quietest sound
          people can hear (dB SPL). Roughly:
        </span>
        <ul className="flex flex-col divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04]">
          {REAL_WORLD.map((level) => (
            <li
              key={level.db}
              className="flex items-baseline gap-4 px-4 py-2.5 text-[0.9375rem] text-white/80"
            >
              <span className="w-16 shrink-0 text-white">{level.db} dB</span>
              <span>{level.name}</span>
            </li>
          ))}
        </ul>
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
  const [db, setDb] = useState(MIN_DB + 6);
  const [result, setResult] = useState<LevelResult | null>(null);
  const finished = round >= LEVEL_ROUNDS.length;
  const target = LEVEL_ROUNDS[Math.min(round, LEVEL_ROUNDS.length - 1)];
  const targetOn = tone.sounding.has('target');
  const mineOn = tone.sounding.has('mine');

  if (finished) {
    return (
      <LabDone following={following} title="All three levels, by ear.">
        <p>
          You’ve just done what a sound engineer does all day. Look after those
          ears: they’re how you do it.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const outcome = levelResult(db, target);
    setResult(outcome);
    if (outcome !== 'match') return;
    tone.stopAll();
    setResult(null);
    setDb(MIN_DB + 6);
    const following = round + 1;
    setRound(following);
    if (following >= LEVEL_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Level {round + 1} of {LEVEL_ROUNDS.length}.
          </span>{' '}
          Play the target, then match it with your tone by ear. Switch between
          them as often as you like.
        </p>
      </LabText>
      <LabDock>
        <div className="flex flex-wrap gap-2">
          <SoundPill
            on={targetOn}
            onClick={() => {
              tone.stop('mine');
              if (targetOn) tone.stop('target');
              else tone.set('target', HZ, dbToAmp(target));
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
              else tone.set('mine', HZ, dbToAmp(db));
            }}
          >
            {mineOn ? <Square aria-hidden /> : <Play aria-hidden />}
            Your tone
          </SoundPill>
        </div>
        <LabSlider
          label="Your level"
          low="Quiet"
          high="Loud"
          accent={accent}
          min={MIN_DB}
          max={0}
          step={0.5}
          value={db}
          valueText="Match it by ear"
          onChange={(value) => {
            setDb(value);
            setResult(null);
            tone.glide('mine', HZ, dbToAmp(value));
          }}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {result === 'louder' && 'Not yet: the target is louder.'}
          {result === 'quieter' && 'Not yet: the target is quieter.'}
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
          Amplitude is how far pressure swings from rest. Volume, or loudness,
          is how we perceive it. They’re related, but not the same: halving
          amplitude takes off 6 dB, which sounds quieter but not half as loud.
        </p>
      </InsightCard>
      <InsightCard title="About these decibels">
        <p className={INSIGHT_TEXT}>
          A decibel is a ratio against a reference. Here that’s this lab’s own
          maximum. In the real world it’s the quietest sound people can hear.
        </p>
        <p className={INSIGHT_DIM}>
          This page caps what it sends out, but it can’t know how loud your
          device is. That part is up to you.
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

export default function AmplitudeLab({
  step,
  accent,
  next,
  complete,
  following,
  about,
}: LabTopicProps) {
  const tone = useLabTone();
  const [amplitude, setAmplitude] = useState(0.7);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <StopOnLeaving step={step} tone={tone} />
      {step === 'hear' && (
        <HearStep
          tone={tone}
          amplitude={amplitude}
          setAmplitude={setAmplitude}
          accent={accent}
          next={next}
        />
      )}
      {step === 'predict' && (
        <PredictStep
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
