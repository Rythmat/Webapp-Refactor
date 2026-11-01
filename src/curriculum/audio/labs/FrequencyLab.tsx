import { Play, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
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
import { WaveStage, type Tone } from '../lab/WaveStage';
import {
  formatHz,
  formatLength,
  hzToPosition,
  matchResult,
  nearestNote,
  positionToHz,
  wavelength,
  type MatchResult,
} from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Sound Basics → Frequency & Pitch ───────────────────────────────────────
// Hear a tone and see its wave; guess what an octave does to it; see and hear
// the answer; then find three tones by ear. The wave is to a true time scale,
// so the doubling is really there to count.

const LOW_HZ = 55;
const HIGH_HZ = 3520;
/** The As, each exactly double the one before. */
const OCTAVE_LADDER = [55, 110, 220, 440, 880, 1760, 3520];

const A3 = 220;
const A4 = 440;

const CHOICES: readonly LabChoice[] = [
  {
    id: 'same',
    text: 'The same number of cycles, but the wave gets taller',
  },
  {
    id: 'double',
    text: 'Twice as many cycles, each one half as long',
  },
  {
    id: 'half',
    text: 'Half as many cycles, each one twice as long',
  },
];
const CORRECT = 'double';

/** The student's turn: one tone with its wave shown, then two by ear alone. */
export const MATCH_ROUNDS = [
  { hz: 220, showTarget: true },
  { hz: 660, showTarget: false },
  { hz: 1320, showTarget: false },
] as const;

const describeHz = (hz: number) =>
  `${Math.round(hz)} hertz, ${nearestNote(hz).name}`;

/** Frequency's slider, equal travel per octave. */
function FrequencySlider({
  hz,
  accent,
  label,
  onChange,
}: {
  hz: number;
  accent: string;
  label: string;
  onChange: (hz: number) => void;
}) {
  return (
    <LabSlider
      label={label}
      low="Low"
      high="High"
      accent={accent}
      value={hzToPosition(hz, LOW_HZ, HIGH_HZ)}
      valueText={describeHz(hz)}
      onChange={(position) => onChange(positionToHz(position, LOW_HZ, HIGH_HZ))}
    />
  );
}

function HearStep({
  tone,
  hz,
  setHz,
  accent,
  next,
}: {
  tone: Tone;
  hz: number;
  setHz: (hz: number) => void;
  accent: string;
  next: () => void;
}) {
  const note = nearestNote(hz);
  const on = tone.sounding.has('mine');
  const change = (value: number) => {
    setHz(value);
    tone.glide('mine', value);
  };
  return (
    <>
      <LabText>
        <p>
          Music is made from the frequencies of waves: how many complete cycles
          pass by each second, counted in hertz (Hz).
        </p>
        <p>Press play and drag the slider. Watch the wave as you listen.</p>
      </LabText>
      <WaveStage tone={tone} accent={accent} lines={[{ hz, color: accent }]} />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : tone.set('mine', hz))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <FrequencySlider
            hz={hz}
            accent={accent}
            label="Frequency"
            onChange={change}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3" aria-live="off">
        <LabReadout label="Frequency" value={formatHz(hz)} accent={accent} />
        <LabReadout
          label="Nearest note"
          value={
            Math.abs(note.cents) < 5
              ? note.name
              : `${note.name} ${note.cents > 0 ? '+' : '−'}${Math.abs(note.cents)}¢`
          }
        />
        <LabReadout
          label="Wavelength in air"
          value={formatLength(wavelength(hz))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[0.8125rem] text-white/55">Jump to an A</span>
        <div className="flex flex-wrap gap-2">
          {OCTAVE_LADDER.map((value) => (
            <button
              key={value}
              type="button"
              className={cn(
                PROMPT_PILL,
                Math.abs(hz - value) < 0.5 ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
              )}
              onClick={() => change(value)}
            >
              {nearestNote(value).name} · {formatHz(value)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        Laptop and phone speakers can’t move enough air for very low tones. If
        A1 is faint or silent, that’s the speaker. Headphones will bring it
        back.
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
  const on = tone.sounding.has('a3');
  return (
    <>
      <WaveStage
        tone={tone}
        accent={accent}
        lines={[{ hz: A3, color: accent, label: 'A3 · 220 Hz' }]}
      />
      <div>
        <SoundPill
          on={on}
          onClick={() => (on ? tone.stop('a3') : tone.set('a3', A3))}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          Hear A3
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="This is A3. Go up one octave, to A4. What happens to the wave?"
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
  const lowOn = tone.sounding.has('a3');
  const highOn = tone.sounding.has('a4');
  const toggle = (id: 'a3' | 'a4', hz: number, on: boolean) =>
    on ? tone.stop(id) : tone.set(id, hz, 0.7);
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="An octave up is exactly twice the frequency: twice the cycles, each half as long."
      />
      <WaveStage
        compare
        tone={tone}
        accent={accent}
        lines={[
          { hz: A3, color: 'rgb(232 232 240 / 0.8)', label: 'A3 · 220 Hz' },
          { hz: A4, color: accent, label: 'A4 · 440 Hz' },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        <SoundPill on={lowOn} onClick={() => toggle('a3', A3, lowOn)}>
          {lowOn ? <Square aria-hidden /> : <Play aria-hidden />}
          A3
        </SoundPill>
        <SoundPill on={highOn} onClick={() => toggle('a4', A4, highOn)}>
          {highOn ? <Square aria-hidden /> : <Play aria-hidden />}
          A4
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <p className="text-[0.8125rem] leading-5 text-white/55">
        Turn both on. They blend so well they can sound like one note, because
        every cycle of A3 lines up with exactly two of A4.
      </p>
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="A3 wavelength"
          value={formatLength(wavelength(A3))}
        />
        <LabReadout
          label="A4 wavelength"
          value={formatLength(wavelength(A4))}
          accent={accent}
        />
      </div>
      <LabText>
        <p>
          When wavelength goes down, frequency goes up. Higher frequencies are
          what we hear as higher pitch, and every time the frequency doubles,
          the pitch goes up one octave.
        </p>
      </LabText>
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
  const [mine, setMine] = useState(110);
  const [result, setResult] = useState<MatchResult | null>(null);
  const finished = round >= MATCH_ROUNDS.length;
  const current = MATCH_ROUNDS[Math.min(round, MATCH_ROUNDS.length - 1)];
  const targetOn = tone.sounding.has('target');
  const mineOn = tone.sounding.has('mine');

  const lines = useMemo(
    () =>
      current.showTarget
        ? [
            { hz: current.hz, color: 'rgb(232 232 240 / 0.3)' },
            { hz: mine, color: accent },
          ]
        : [{ hz: mine, color: accent }],
    [current, mine, accent],
  );

  const check = () => {
    const outcome = matchResult(mine, current.hz);
    setResult(outcome);
    if (outcome !== 'match') return;
    tone.stopAll();
    const following = round + 1;
    setRound(following);
    if (following >= MATCH_ROUNDS.length) onDone();
    else setMine(110);
  };

  if (finished) {
    return (
      <LabDone
        following={following}
        title="That’s all three, the last two by ear alone."
      >
        <p>
          Every note you’ve ever heard has a frequency, and you just found them
          by listening. Your ear is a very precise instrument.
        </p>
      </LabDone>
    );
  }

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Tone {round + 1} of {MATCH_ROUNDS.length}.
          </span>{' '}
          {current.showTarget
            ? 'Play the target and drag your tone onto it. Its wave is the faint line.'
            : 'No wave to help this time: listen to the target, then match it by ear.'}
        </p>
      </LabText>
      <WaveStage tone={tone} accent={accent} lines={lines} />
      <LabDock>
        <div className="flex flex-wrap gap-2">
          <SoundPill
            on={targetOn}
            onClick={() => {
              tone.stop('mine');
              if (targetOn) tone.stop('target');
              else tone.set('target', current.hz);
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
              else tone.set('mine', mine);
            }}
          >
            {mineOn ? <Square aria-hidden /> : <Play aria-hidden />}
            Your tone
          </SoundPill>
        </div>
        <FrequencySlider
          hz={mine}
          accent={accent}
          label="Your tone"
          onChange={(value) => {
            setMine(value);
            setResult(null);
            tone.glide('mine', value);
          }}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {result === 'higher' && 'Not yet: the target is higher.'}
          {result === 'lower' && 'Not yet: the target is lower.'}
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
          Frequency is how many cycles of a wave pass each second. Wavelength is
          how far one cycle reaches. In air, one fixes the other: wavelength is
          343 metres per second divided by the frequency.
        </p>
        <p className={INSIGHT_DIM}>
          Pitch is what we hear. It follows frequency, and an octave is always a
          doubling.
        </p>
      </InsightCard>
      <InsightCard title="Reading the picture">
        <p className={INSIGHT_TEXT}>
          The width of the picture is a fixed slice of time, so twice the
          frequency really does draw twice the cycles. It only zooms in when the
          cycles get too fine to see, and the caption says when.
        </p>
      </InsightCard>
    </>
  );
}

export default function FrequencyLab({
  step,
  accent,
  next,
  complete,
  following,
  about,
}: LabTopicProps) {
  const tone = useLabTone();
  const [hz, setHz] = useState(A4);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <>
      <StopOnLeaving step={step} tone={tone} />
      {step === 'hear' && (
        <HearStep
          tone={tone}
          hz={hz}
          setHz={setHz}
          accent={accent}
          next={next}
        />
      )}
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

/** Going to another step stops whatever this one left sounding. */
function StopOnLeaving({ step, tone }: { step: string; tone: Tone }) {
  const { stopAll } = tone;
  useEffect(() => stopAll, [step, stopAll]);
  return null;
}
