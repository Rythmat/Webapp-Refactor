import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OUTLINE_PILL, WHITE_PILL } from '@/components/kit/pills';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { CircuitStage } from '../lab/CircuitStage';
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
import { SignalStage, type SignalShape } from '../lab/SignalStage';
import type { Tone } from '../lab/WaveStage';
import { currentAmps } from '../lab/physics/electric';
import { useLabTone } from '../lab/useLabTone';

// ── Sound to Electricity → Electricity & Voltage ───────────────────────────
// Voltage pushes, current flows, resistance holds it back. Then the idea sound
// needs: a steady voltage can't move air, so a sound signal is a voltage that
// keeps changing. Guess what a battery does to a speaker, hear it, then work out
// the voltage a lamp needs, the last two with no meter to read.

const RESISTORS = [50, 100, 200] as const;
const MAX_VOLTS = 12;
const SIGNAL_HZ = 220;

/** A battery's connection through a speaker: one short thump. Simulated. */
const CLICK = { attack: 0.005, decay: 0.05, sustain: 0, release: 0.02 };
const CLICK_RECIPE = [1, 0.6, 0.4, 0.2];

const CHOICES: readonly LabChoice[] = [
  { id: 'hum', text: 'A steady hum, for as long as it’s connected' },
  { id: 'click', text: 'One click as it connects, then silence' },
  { id: 'nothing', text: 'Nothing at all, not even a click' },
];
const CORRECT = 'click';

/** The student's turn: the voltage for a current, the first with a meter. */
export const VOLT_ROUNDS = [
  { ohms: 100, milliamps: 60, meter: true },
  { ohms: 50, milliamps: 180, meter: false },
  { ohms: 200, milliamps: 30, meter: false },
] as const;
/** Near enough, as a share of the current asked for. */
export const VOLT_WITHIN = 0.05;

const milliamps = (volts: number, ohms: number) =>
  Math.round(currentAmps(volts, ohms) * 1000);

const AS_DRAWN =
  'A safe model, slowed down. Real electrons drift very slowly, though the push travels along a wire nearly as fast as light.';

function HearStep({ accent, next }: { accent: string; next: () => void }) {
  const [volts, setVolts] = useState(6);
  const [ohms, setOhms] = useState<(typeof RESISTORS)[number]>(100);
  return (
    <>
      <LabText>
        <p>
          Before a sound can travel down a cable, it has to become electricity.
          Three words do most of the work. Voltage is the push. Current is how
          much charge flows. Resistance is what holds it back.
        </p>
        <p>Change the push and the resistance, and watch the lamp.</p>
      </LabText>
      <CircuitStage
        volts={volts}
        amps={currentAmps(volts, ohms)}
        accent={accent}
        caption={AS_DRAWN}
      />
      <LabDock>
        <LabSlider
          label={`Voltage: ${volts.toFixed(1)} V`}
          low="0 V"
          high={`${MAX_VOLTS} V`}
          accent={accent}
          max={MAX_VOLTS}
          step={0.1}
          value={volts}
          valueText={`${volts.toFixed(1)} volts`}
          onChange={setVolts}
        />
        <LabPicker
          label="Resistance"
          options={RESISTORS.map((id) => ({ id, text: `${id} Ω` }))}
          value={ohms}
          onPick={setOhms}
        />
      </LabDock>
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Current"
          value={`${milliamps(volts, ohms)} mA`}
          accent={accent}
        />
        <LabReadout label="Current = voltage ÷ resistance" value="I = V ÷ R" />
      </div>
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
      <SignalStage
        shape="off"
        accent={accent}
        caption="A speaker with nothing connected: no voltage, and the cone at rest."
      />
      <PredictChoices
        question="A speaker’s cone moves when voltage reaches it. Connect a battery, which gives one steady voltage. What do you hear?"
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
  const [shape, setShape] = useState<SignalShape>('off');
  const signalOn = tone.sounding.has('signal');
  const shown: SignalShape = signalOn ? 'changing' : shape;
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="One click, then silence. The cone jumps to a new place and stays there. Sound needs air moving back and forth, so it needs a voltage that keeps changing."
      />
      <SignalStage
        shape={shown}
        accent={accent}
        caption="Slowed right down. Don’t try the battery at home: a steady voltage heats a speaker’s coil, and can damage it."
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() => {
            tone.stop('signal');
            setShape('steady');
            tone.playNote('click', 70, CLICK, 0.08, CLICK_RECIPE);
          }}
        >
          Connect a battery
        </button>
        <SoundPill
          on={signalOn}
          onClick={() => {
            if (signalOn) {
              tone.stop('signal');
              setShape('off');
            } else {
              tone.set('signal', SIGNAL_HZ);
            }
          }}
        >
          {signalOn ? <Square aria-hidden /> : <Play aria-hidden />}
          {signalOn ? 'Stop' : 'A changing voltage'}
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          That changing voltage is an audio signal. Its shape copies the shape
          of the sound: how fast it swings is the pitch, and how far it swings
          is the volume. Everything from here to your speakers is about carrying
          that shape without spoiling it.
        </p>
      </LabText>
      <LabNext onClick={next}>Your turn</LabNext>
    </>
  );
}

function TryStep({
  accent,
  onDone,
  following,
}: {
  accent: string;
  onDone: () => void;
  following: LabFollowing | null;
}) {
  const [round, setRound] = useState(0);
  const [volts, setVolts] = useState(0);
  const [hint, setHint] = useState<'more' | 'less' | null>(null);
  const finished = round >= VOLT_ROUNDS.length;
  const current = VOLT_ROUNDS[Math.min(round, VOLT_ROUNDS.length - 1)];

  if (finished) {
    return (
      <LabDone following={following} title="All three lamps, set right.">
        <p>
          Voltage equals current times resistance. It’s Ohm’s law, and you’ll
          meet it again whenever gear talks about levels and impedance.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const got = milliamps(volts, current.ohms);
    const off = (got - current.milliamps) / current.milliamps;
    if (Math.abs(off) > VOLT_WITHIN) {
      setHint(off < 0 ? 'more' : 'less');
      return;
    }
    setHint(null);
    setVolts(0);
    const following = round + 1;
    setRound(following);
    if (following >= VOLT_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Lamp {round + 1} of {VOLT_ROUNDS.length}.
          </span>{' '}
          This lamp has a resistance of {current.ohms} Ω and needs{' '}
          {current.milliamps} mA. Set the voltage.
          {current.meter
            ? ' Watch the meter.'
            : ' No meter this time: voltage is current times resistance, with current in amps.'}
        </p>
      </LabText>
      <CircuitStage
        volts={volts}
        amps={currentAmps(volts, current.ohms)}
        accent={accent}
        caption={AS_DRAWN}
      />
      <LabDock>
        <LabSlider
          label={`Voltage: ${volts.toFixed(1)} V`}
          low="0 V"
          high={`${MAX_VOLTS} V`}
          accent={accent}
          max={MAX_VOLTS}
          step={0.1}
          value={volts}
          valueText={`${volts.toFixed(1)} volts`}
          onChange={(value) => {
            setVolts(value);
            setHint(null);
          }}
        />
      </LabDock>
      {current.meter && (
        <div className="flex flex-wrap gap-3">
          <LabReadout
            label="Current"
            value={`${milliamps(volts, current.ohms)} mA`}
            accent={accent}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {hint === 'more' && 'Not enough current yet: more voltage.'}
          {hint === 'less' && 'Too much current: less voltage.'}
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
          Ohm’s law links voltage, current and resistance. An audio signal is a
          voltage changing over time, in the same shape as the sound it carries.
        </p>
      </InsightCard>
      <InsightCard title="Which way does it flow?">
        <p className={INSIGHT_TEXT}>
          Electrons really do drift from − to +. Circuits are drawn with
          conventional current going the other way, from + to −, a convention
          older than the discovery of the electron. You’ll see both, and the
          sums come out the same.
        </p>
      </InsightCard>
      <InsightCard title="About the sounds">
        <p className={INSIGHT_DIM}>
          The click is simulated, so nobody needs to try it on a real speaker.
          Household electricity is dangerous, and none of this is a reason to
          open gear up.
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

export default function ElectricityLab({
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
      {step === 'hear' && <HearStep accent={accent} next={next} />}
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
        <TryStep accent={accent} onDone={complete} following={following} />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
