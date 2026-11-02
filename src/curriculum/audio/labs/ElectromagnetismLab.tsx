import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { InductionStage } from '../lab/InductionStage';
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
import type { Tone } from '../lab/WaveStage';
import { peakMillivolts } from '../lab/physics/electric';
import { formatHz } from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Sound to Electricity → Electromagnetism ────────────────────────────────
// Move a magnet in a coil and it makes a voltage: the physics under microphones
// and pickups. Drag the magnet and see the needle answer; guess what holding it
// still does; see speed and turns double it; hear it at audio speed; then reach
// a voltage with what's given. (The deck's "disturbs the field" becomes what
// really happens: the field through the coil changes, which induces a voltage.)

const TURNS = [50, 100, 200, 400] as const;
type Turns = (typeof TURNS)[number];
const MAX_SWINGS = 4;

/** Same reach, wiggled faster: more voltage, heard as louder and higher. */
const AUDIO_SPEEDS = [55, 110, 220] as const;
const audioLevel = (hz: number) => hz / 220;

const CHOICES: readonly LabChoice[] = [
  { id: 'steady', text: 'A strong, steady voltage' },
  { id: 'zero', text: 'No voltage at all' },
  { id: 'grows', text: 'A voltage that slowly builds up' },
];
const CORRECT = 'zero';

/** The student's turn: a voltage to reach, some of it decided already. */
export const REACH_ROUNDS = [
  { millivolts: 40, turns: null, swings: null },
  { millivolts: 40, turns: null, swings: 1 },
  { millivolts: 10, turns: 50, swings: null },
] as const;
export const REACH_WITHIN = 0.1;

const SLOWED =
  'The meter reads the magnet’s real movement here, with no number on it, because the voltage is a model’s.';

function HearStep({ accent, next }: { accent: string; next: () => void }) {
  const [place, setPlace] = useState(0.15);
  return (
    <>
      <LabText>
        <p>
          Here’s the discovery that makes microphones possible. Move a magnet
          near a coil of wire, and the changing magnetic field through the coil
          makes a voltage in it.
        </p>
        <p>
          Drag the slider to move the magnet through the coil. Try fast, slow
          and back again, and then try stopping.
        </p>
      </LabText>
      <InductionStage
        place={place}
        turns={400}
        accent={accent}
        caption={SLOWED}
      />
      <LabDock>
        <LabSlider
          label="Move the magnet"
          low="Left"
          high="Right"
          accent={accent}
          value={place}
          valueText={`${Math.round(place * 100)} percent along`}
          onChange={setPlace}
        />
      </LabDock>
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
      <InductionStage
        place={0.5}
        turns={200}
        accent={accent}
        caption="The magnet sits right in the middle of the coil, where its field through the coil is strongest."
      />
      <PredictChoices
        question="Hold the magnet perfectly still, right inside the coil. What does the meter read?"
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
  const [swings, setSwings] = useState(1);
  const [turns, setTurns] = useState<Turns>(100);
  const [hz, setHz] = useState<(typeof AUDIO_SPEEDS)[number]>(110);
  const on = tone.sounding.has('mine');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="No voltage. A strong field that isn’t changing does nothing. It’s the change that makes voltage, and more change makes more."
      />
      <InductionStage
        swings={swings}
        turns={turns}
        accent={accent}
        caption="Now it swings by itself. Faster or more turns, and the needle swings further."
      />
      <div className="grid gap-x-6 sm:grid-cols-2">
        <LabSlider
          label={`Speed: ${swings.toFixed(1)} swings a second`}
          low="Slow"
          high="Fast"
          accent={accent}
          min={0.2}
          max={MAX_SWINGS}
          step={0.1}
          value={swings}
          valueText={`${swings.toFixed(1)} swings a second`}
          onChange={setSwings}
        />
        <div className="flex flex-col gap-1.5 text-[0.8125rem] text-white/55">
          <span>Turns of wire</span>
          <LabPicker
            label="Turns of wire"
            options={TURNS.map((id) => ({ id, text: String(id) }))}
            value={turns}
            onPick={setTurns}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Peak voltage, in this model"
          value={`${peakMillivolts(turns, swings).toFixed(0)} mV`}
          accent={accent}
        />
      </div>
      <LabText>
        <p>
          Speed it up to the frequency of sound, and the voltage swings at the
          same rate as the air. Same reach, twice as fast, is twice the voltage.
          That’s a microphone’s tiny coil, moving with the sound that hits it.
        </p>
      </LabText>
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={on}
          onClick={() =>
            on ? tone.stop('mine') : tone.set('mine', hz, audioLevel(hz))
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="Swings a second"
          options={AUDIO_SPEEDS.map((id) => ({ id, text: formatHz(id) }))}
          value={hz}
          onPick={(next) => {
            setHz(next);
            tone.glide('mine', next, audioLevel(next));
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
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
  const [swings, setSwings] = useState<number>(2);
  const [turns, setTurns] = useState<Turns>(100);
  const [hint, setHint] = useState<'more' | 'less' | null>(null);
  const finished = round >= REACH_ROUNDS.length;
  const current = REACH_ROUNDS[Math.min(round, REACH_ROUNDS.length - 1)];
  const usedTurns = current.turns ?? turns;
  const usedSwings = current.swings ?? swings;
  const millivolts = peakMillivolts(usedTurns, usedSwings);

  if (finished) {
    return (
      <LabDone following={following} title="Every target, reached.">
        <p>
          Twice the turns or twice the speed gives twice the voltage. Real
          microphones make only a few thousandths of a volt, which is why the
          next stage of the journey has to be a preamp.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const off = (millivolts - current.millivolts) / current.millivolts;
    if (Math.abs(off) > REACH_WITHIN) {
      setHint(off < 0 ? 'more' : 'less');
      return;
    }
    setHint(null);
    const following = round + 1;
    setRound(following);
    if (following >= REACH_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Target {round + 1} of {REACH_ROUNDS.length}:
          </span>{' '}
          reach {current.millivolts} mV.
          {current.swings != null &&
            ` The speed is stuck at ${current.swings} swing a second, so the turns have to do it.`}
          {current.turns != null &&
            ` You only have ${current.turns} turns, so the speed has to do it.`}
        </p>
      </LabText>
      <InductionStage
        swings={usedSwings}
        turns={usedTurns}
        accent={accent}
        caption={SLOWED}
      />
      <LabDock>
        {current.swings == null && (
          <LabSlider
            label={`Speed: ${swings.toFixed(1)} swings a second`}
            low="Slow"
            high="Fast"
            accent={accent}
            min={0.2}
            max={MAX_SWINGS}
            step={0.1}
            value={swings}
            valueText={`${swings.toFixed(1)} swings a second`}
            onChange={(value) => {
              setSwings(value);
              setHint(null);
            }}
          />
        )}
        {current.turns == null && (
          <LabPicker
            label="Turns of wire"
            options={TURNS.map((id) => ({ id, text: `${id} turns` }))}
            value={turns}
            onPick={(next) => {
              setTurns(next);
              setHint(null);
            }}
          />
        )}
      </LabDock>
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Peak voltage"
          value={`${millivolts.toFixed(0)} mV`}
          accent={accent}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {hint === 'more' && 'Not enough yet.'}
          {hint === 'less' && 'That’s too much.'}
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
          This is Faraday’s law: the voltage in a coil depends on its number of
          turns and on how fast the magnetic field through it is changing. No
          change, no voltage.
        </p>
        <p className={INSIGHT_DIM}>
          It makes no difference whether the magnet or the coil does the moving,
          which is why a microphone can move its coil past a fixed magnet.
        </p>
      </InsightCard>
      <InsightCard title="Reading the picture">
        <p className={INSIGHT_TEXT}>
          The needle follows the magnet’s movement, from the same equation as
          the text. Its numbers come from a simple model, chosen to be easy to
          work with: they aren’t what a real coil of that size would make.
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

export default function ElectromagnetismLab({
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
