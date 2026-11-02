import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OUTLINE_PILL } from '@/components/kit/pills';
import { LearnRoutes } from '@/constants/routes';
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
import { SpeakerStage } from '../lab/SpeakerStage';
import { SpectrumStage } from '../lab/SpectrumStage';
import type { Tone } from '../lab/WaveStage';
import { recipePeak } from '../lab/physics/harmonics';
import {
  renderStack,
  throughDriver,
  type DriverId,
} from '../lab/physics/signal';
import { formatLength, wavelength } from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── The Signal Path → Loudspeakers ─────────────────────────────────────────
// Signal back into air, by two drivers and a crossover. See why one driver can't
// do it all, hear each driver's share of a rich note, then name it by ear.

const HZ = 220;
const CROSSOVER = 1500;
const HARMONICS = 30;
/** A rich note, with harmonics reaching well into the tweeter's range. */
const RICH = Array.from({ length: HARMONICS }, (_, i) => 1 / (i + 1));
const PEAK = recipePeak(RICH);

const DRIVERS: readonly { id: DriverId; text: string }[] = [
  { id: 'both', text: 'Both' },
  { id: 'woofer', text: 'Woofer only' },
  { id: 'tweeter', text: 'Tweeter only' },
];

const CHOICES: readonly LabChoice[] = [
  { id: 'stereo', text: 'So that it can play in stereo' },
  {
    id: 'split',
    text: 'Lows need a big cone to move lots of air, and highs need a small, light one to move fast',
  },
  { id: 'spare', text: 'So that one can take over if the other fails' },
];
const CORRECT = 'split';

/** The student's turn: a driver to name by ear. */
export const DRIVER_ROUNDS: readonly DriverId[] = [
  'tweeter',
  'woofer',
  'both',
  'tweeter',
];

const LOW_EXAMPLE = 100;
const HIGH_EXAMPLE = 5000;

const playDriver = (tone: Tone, driver: DriverId, id = 'mine') =>
  tone.setLoop(
    id,
    (rate) =>
      renderStack(HZ, rate, throughDriver(RICH, HZ, CROSSOVER, driver), PEAK),
    HZ,
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
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          A loudspeaker is where the signal becomes air again, through the same
          magnet-and-coil push you met in Transducers. Most have more than one
          driver in the box.
        </p>
      </LabText>
      <SpeakerStage
        driver="both"
        sounding={on}
        accent={accent}
        caption="A two-way speaker, from the front. Its movement is slowed, and far larger than real."
      />
      <LabDock>
        <div>
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : playDriver(tone, 'both'))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label={`Wavelength at ${LOW_EXAMPLE} Hz`}
          value={formatLength(wavelength(LOW_EXAMPLE))}
          accent={accent}
        />
        <LabReadout
          label={`Wavelength at ${HIGH_EXAMPLE / 1000} kHz`}
          value={formatLength(wavelength(HIGH_EXAMPLE))}
        />
      </div>
      <LabNext onClick={next}>Next: make a prediction</LabNext>
    </>
  );
}

function PredictStep({
  accent,
  tone,
  picked,
  onPick,
  next,
}: {
  accent: string;
  tone: Tone;
  picked: string | null;
  onPick: (id: string) => void;
  next: () => void;
}) {
  return (
    <>
      <SpeakerStage
        driver="both"
        sounding={tone.sounding.size > 0}
        accent={accent}
        caption="One big driver and one small one."
      />
      <PredictChoices
        question="Why do most speakers have a big driver and a small one, not just one?"
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
  const navigate = useNavigate();
  const [driver, setDriver] = useState<DriverId>('woofer');
  const on = tone.sounding.has('mine');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Each is built for its job. Low notes have long waves and need a lot of air moved, so a big cone. High notes need to change direction thousands of times a second, so a small, light dome."
      />
      <SpeakerStage
        driver={driver}
        sounding={on}
        accent={accent}
        caption="One rich note, split by a crossover at 1.5 kHz. Each driver gets only its share."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={on}
          onClick={() => (on ? tone.stop('mine') : playDriver(tone, driver))}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="Which driver"
          options={DRIVERS}
          value={driver}
          onPick={(next) => {
            setDriver(next);
            if (on) playDriver(tone, next);
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <SpectrumStage
        hz={1500}
        accent={accent}
        tone={tone}
        caption="Measured live. The line marks the crossover. Each driver’s peaks fall away on the other’s side of it."
      />
      <LabText>
        <p>
          A crossover divides the signal between them. Neither driver alone
          sounds like the note, and the tweeter carries far less of its energy,
          since most of a note’s energy sits low. The box matters too, because a
          cone’s back-wave would otherwise cancel its front-wave, and take the
          lows with it.
        </p>
      </LabText>
      <div>
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() => navigate(LearnRoutes.headphoneAnatomy())}
        >
          See the speaker in a pair of headphones
        </button>
      </div>
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
  const [playing, setPlaying] = useState<DriverId | 'mystery'>('mystery');
  const finished = round >= DRIVER_ROUNDS.length;
  const answer = DRIVER_ROUNDS[Math.min(round, DRIVER_ROUNDS.length - 1)];
  const on = tone.sounding.has('sound');

  if (finished) {
    return (
      <LabDone following={following} title="All four, by ear.">
        <p>
          Now you know what’s meant by thin, boomy or muddy speakers: too little
          or too much of one part of that split.
        </p>
      </LabDone>
    );
  }

  const play = (what: DriverId | 'mystery') => {
    if (on && playing === what) {
      tone.stop('sound');
      return;
    }
    setPlaying(what);
    playDriver(tone, what === 'mystery' ? answer : what, 'sound');
  };

  const pick = (id: DriverId) => {
    if (id !== answer) {
      setWrong(true);
      return;
    }
    tone.stopAll();
    setWrong(false);
    const following = round + 1;
    setRound(following);
    if (following >= DRIVER_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Mystery {round + 1} of {DRIVER_ROUNDS.length}.
          </span>{' '}
          Which driver is playing this note? Compare it with each one, then say.
        </p>
      </LabText>
      <div>
        <SoundPill
          on={on && playing === 'mystery'}
          onClick={() => play('mystery')}
        >
          {on && playing === 'mystery' ? (
            <Square aria-hidden />
          ) : (
            <Play aria-hidden />
          )}
          Mystery
        </SoundPill>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[0.8125rem] text-white/55">Compare with</span>
        <div className="flex flex-wrap gap-2">
          {DRIVERS.map((driver) => {
            const active = on && playing === driver.id;
            return (
              <SoundPill
                key={driver.id}
                on={active}
                onClick={() => play(driver.id)}
              >
                {active ? <Square aria-hidden /> : <Play aria-hidden />}
                {driver.text}
              </SoundPill>
            );
          })}
        </div>
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-col gap-2">
        <span className="text-[0.8125rem] text-white/55">It’s…</span>
        <LabPicker label="It’s…" options={DRIVERS} onPick={pick} />
      </div>
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong && 'Not that one. Is it round, thin, or the whole note?'}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          A speaker’s drivers each cover the range they’re built for, split by a
          crossover. Real speakers may have one, two, three or more.
        </p>
        <p className={INSIGHT_DIM}>
          Headphones usually manage with one driver, because a tiny one only has
          to move the air right next to your ear.
        </p>
      </InsightCard>
      <InsightCard title="How the sound is made">
        <p className={INSIGHT_TEXT}>
          One note’s harmonics are shared out between the drivers, by a real
          crossover’s curve. What you hear is still your own device’s speakers,
          so a laptop’s will color all of this.
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

export default function LoudspeakersLab({
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
        <TryStep tone={tone} onDone={complete} following={following} />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
