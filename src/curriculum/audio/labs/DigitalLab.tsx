import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  LabText,
  PredictChoices,
  RevealVerdict,
  SoundPill,
  TapToHear,
  type LabChoice,
} from '../lab/LabControls';
import { LabDone, type LabFollowing } from '../lab/LabDone';
import type { LabTopicProps } from '../lab/LabLesson';
import { SampleStage } from '../lab/SampleStage';
import type { Tone } from '../lab/WaveStage';
import { aliasOf, nyquist, quantize, renderTone } from '../lab/physics/signal';
import { formatHz } from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── The Signal Path → ADC, DAC & Sample Rate ───────────────────────────────
// A converter turns a signal into numbers in three separate steps: sampling,
// quantizing and encoding (the deck ran these together, and left out sample rate).
// See and hear samples and bits; guess what happens when a tone is too high for
// its sample rate; hear it fold back down; then show you can use the rule.

const HZ = 880;
const RATES = [4000, 8000, 16000, 44100] as const;
const BITS = [2, 3, 4, 8, 16] as const;
/** Bit-crushed tones are harsh: kept well under a clean tone's level. */
const LOOP_LEVEL = 0.5;

const TOO_HIGH_HZ = 5000;
const FOLD_RATES = [8000, 12000, 16000] as const;
const FOLD_LEVEL = 0.5;

const CHOICES: readonly LabChoice[] = [
  { id: 'same', text: 'The same 5 kHz tone, a little rougher' },
  { id: 'fold', text: 'A different, lower tone that was never played' },
  { id: 'silent', text: 'Nothing: the tone is lost completely' },
];
const CORRECT = 'fold';

type Round =
  | {
      kind: 'sum';
      question: string;
      choices: readonly string[];
      answer: string;
    }
  | {
      kind: 'ear';
      question: string;
      bits: number;
      choices: readonly string[];
      answer: string;
    };

/** The student's turn: the rule three ways, then by ear. */
export const DIGITAL_ROUNDS: readonly Round[] = [
  {
    kind: 'sum',
    question:
      'You want to record sounds up to 10 kHz. What’s the lowest sample rate that can hold them?',
    choices: ['10 kHz', '15 kHz', '20 kHz'],
    answer: '20 kHz',
  },
  {
    kind: 'sum',
    question:
      'A CD takes 44,100 samples a second. What’s the highest frequency it can hold?',
    choices: ['22.05 kHz', '44.1 kHz', '88.2 kHz'],
    answer: '22.05 kHz',
  },
  {
    kind: 'sum',
    question:
      'A 3 kHz tone is sampled at 5 kHz with no filter to protect it. What comes back out?',
    choices: ['1 kHz', '2 kHz', '3 kHz'],
    answer: '2 kHz',
  },
  {
    kind: 'ear',
    question: 'Play this tone. How many bits is it?',
    bits: 3,
    choices: ['3 bits', '16 bits'],
    answer: '3 bits',
  },
];

const playBits = (tone: Tone, bits: number, id = 'mine') =>
  tone.setLoop(
    id,
    (rate) => renderTone(HZ, rate, (sine) => quantize(sine, bits)),
    HZ,
    LOOP_LEVEL,
  );

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [rate, setRate] = useState<(typeof RATES)[number]>(8000);
  const [bits, setBits] = useState<(typeof BITS)[number]>(4);
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          A computer can only store numbers, so a converter (an ADC) measures
          the voltage over and over. How often is its sample rate. How finely it
          can measure is its bit depth. A DAC does the reverse, on the way out.
        </p>
        <p>Change both, and play it. Fewer bits are easy to hear.</p>
      </LabText>
      <SampleStage
        hz={HZ}
        rate={rate}
        bits={bits}
        accent={accent}
        caption={`Four cycles of a ${formatHz(HZ)} tone. The faint line is the tone, and the dots are what’s kept of it.`}
      />
      <LabDock>
        <div className="flex flex-wrap items-center gap-2">
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : playBits(tone, bits))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabPicker
            label="Bit depth"
            options={BITS.map((id) => ({ id, text: `${id} bits` }))}
            value={bits}
            onPick={(next) => {
              setBits(next);
              if (on) playBits(tone, next);
            }}
          />
        </div>
        <LabPicker
          label="Sample rate"
          options={RATES.map((id) => ({ id, text: formatHz(id) }))}
          value={rate}
          onPick={setRate}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Levels it can measure"
          value={(2 ** bits).toLocaleString('en-US')}
          accent={accent}
        />
        <LabReadout label="Samples a cycle" value={(rate / HZ).toFixed(1)} />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        This tone sounds the same at all four sample rates, for a reason the
        next step gets to. Only the bits change what you hear here.
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
      <SampleStage
        hz={TOO_HIGH_HZ}
        rate={8000}
        accent={accent}
        caption="A 5 kHz tone, sampled 8,000 times a second: fewer than two samples for each cycle."
      />
      <PredictChoices
        question="There aren’t enough samples to follow this tone, and nothing has filtered it out first. What do you hear at the other end?"
        choices={CHOICES}
        picked={picked}
        onPick={onPick}
      />
      {picked && <LabNext onClick={next}>Hear what really happens</LabNext>}
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
  const [rate, setRate] = useState<(typeof FOLD_RATES)[number]>(8000);
  const out = aliasOf(TOO_HIGH_HZ, rate);
  const outOn = tone.sounding.has('out');
  const inOn = tone.sounding.has('in');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="A different, lower tone, at 3 kHz. Those samples fit a slower wave just as well, and the converter has no way to know which it was. That’s called aliasing."
      />
      <SampleStage
        hz={TOO_HIGH_HZ}
        rate={rate}
        alias
        accent={accent}
        caption="The white dots are the samples. Faint is the tone that went in, and bright is what fits the same dots."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={inOn}
          onClick={() => {
            tone.stop('out');
            if (inOn) tone.stop('in');
            else tone.set('in', TOO_HIGH_HZ, FOLD_LEVEL);
          }}
        >
          {inOn ? <Square aria-hidden /> : <Play aria-hidden />}
          What went in
        </SoundPill>
        <SoundPill
          on={outOn}
          onClick={() => {
            tone.stop('in');
            if (outOn) tone.stop('out');
            else tone.set('out', out, FOLD_LEVEL);
          }}
        >
          {outOn ? <Square aria-hidden /> : <Play aria-hidden />}
          What comes out
        </SoundPill>
        <LabPicker
          label="Sample rate"
          options={FOLD_RATES.map((id) => ({ id, text: formatHz(id) }))}
          value={rate}
          onPick={(next) => {
            setRate(next);
            tone.glide('out', aliasOf(TOO_HIGH_HZ, next), FOLD_LEVEL);
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Highest it can hold"
          value={formatHz(nyquist(rate))}
        />
        <LabReadout
          label="What comes out"
          value={formatHz(out)}
          accent={accent}
        />
      </div>
      <LabText>
        <p>
          The rule: a sample rate can hold frequencies up to half of itself, the
          Nyquist frequency. That’s why CDs use 44.1 kHz, just over twice the
          top of human hearing. Real converters also filter out anything too
          high before sampling, so this doesn’t happen in practice.
        </p>
        <p>
          Then comes encoding: each measurement is written down as a binary
          number. From there it’s only data, so a digital copy is exactly the
          same as the original, however many times it’s copied.
        </p>
      </LabText>
      <LabNext onClick={next}>Your turn</LabNext>
    </>
  );
}

function TryStep({
  tone,
  onDone,
  following,
}: {
  tone: Tone;
  onDone: () => void;
  following: LabFollowing | null;
}) {
  const [round, setRound] = useState(0);
  const [wrong, setWrong] = useState(false);
  const finished = round >= DIGITAL_ROUNDS.length;
  const current = DIGITAL_ROUNDS[Math.min(round, DIGITAL_ROUNDS.length - 1)];
  const on = tone.sounding.has('mine');

  if (finished) {
    return (
      <LabDone following={following} title="Sound, as numbers.">
        <p>
          Sampling, quantizing, encoding, and back again at the far end. From
          here the signal is exact, until a DAC turns it back into a voltage.
        </p>
      </LabDone>
    );
  }

  const pick = (choice: string) => {
    if (choice !== current.answer) {
      setWrong(true);
      return;
    }
    tone.stopAll();
    setWrong(false);
    const following = round + 1;
    setRound(following);
    if (following >= DIGITAL_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Question {round + 1} of {DIGITAL_ROUNDS.length}.
          </span>{' '}
          {current.question}
        </p>
      </LabText>
      {current.kind === 'ear' && (
        <div>
          <SoundPill
            on={on}
            onClick={() =>
              on ? tone.stop('mine') : playBits(tone, current.bits)
            }
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            Play it
          </SoundPill>
        </div>
      )}
      <TapToHear show={tone.needsTap} />
      <LabPicker
        label="Your answer"
        options={current.choices.map((id) => ({ id, text: id }))}
        onPick={pick}
      />
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong &&
          (current.kind === 'ear'
            ? 'Not that. Is it clean, or buzzy and rough?'
            : 'Not that. Remember, a sample rate holds up to half of itself.')}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          Three separate steps: sampling takes measurements, quantizing rounds
          each one to a level the bits can hold, and encoding writes it as
          binary.
        </p>
        <p className={INSIGHT_DIM}>
          Below half the sample rate, a tone comes back out exactly: extra
          samples don’t make it smoother. What extra bits buy is a lower noise
          floor.
        </p>
      </InsightCard>
      <InsightCard title="How the sound is made">
        <p className={INSIGHT_TEXT}>
          The bit depth is real: each sample of the tone is rounded to those
          bits. The folded tone plays what an ideal DAC would return, a clean
          sine at the folded frequency. Real converters have filters so you
          won’t meet this in normal use.
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

export default function DigitalLab({
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
        <TryStep tone={tone} onDone={complete} following={following} />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
