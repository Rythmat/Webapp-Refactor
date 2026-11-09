import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OUTLINE_PILL, WHITE_PILL } from '@/components/kit/pills';
import { LearnRoutes } from '@/constants/routes';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { ClipStage } from '../lab/ClipStage';
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
import {
  hardClip,
  powerDb,
  renderTone,
  softClip,
  speakerVolts,
} from '../lab/physics/signal';
import { hzToPosition, positionToHz } from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── The Signal Path → Amps & Speaker Level ─────────────────────────────────
// A power amp is the last big jump, up to tens of volts, and pushed hard it shapes
// the tone. Hear power as level, guess what twice the watts buys, hear tube and
// solid state clip differently, then work out the watts for a level.

const HZ = 110;
const MIN_WATTS = 1;
const MAX_WATTS = 200;

/** A tone's amplitude for this much power: its square root, on this page's scale. */
const levelFor = (watts: number) => Math.sqrt(watts / MAX_WATTS);

const CHOICES: readonly LabChoice[] = [
  { id: 'twice', text: 'Twice as loud' },
  { id: 'little', text: 'A little louder, but nowhere near twice' },
  { id: 'same', text: 'No louder at all' },
];
const CORRECT = 'little';

const COMPARE = [25, 50, 100, 200] as const;

/** The student's turn: how many watts for that many more decibels. */
export const WATT_ROUNDS = [
  { from: 25, db: 3 },
  { from: 10, db: 10 },
  { from: 5, db: 6 },
] as const;
/** Near enough, in decibels. */
export const WATTS_WITHIN = 0.5;

type AmpKind = 'tube' | 'solid';
const AMP_KINDS: readonly { id: AmpKind; text: string }[] = [
  { id: 'tube', text: 'Tube' },
  { id: 'solid', text: 'Solid state' },
];
const shapeOf = (kind: AmpKind) => (kind === 'tube' ? softClip : hardClip);
const PUSHES = [
  { id: 'clean', text: 'Clean', amount: 0.5 },
  { id: 'pushed', text: 'Pushed', amount: 1.6 },
  { id: 'hard', text: 'Pushed hard', amount: 4 },
] as const;
type PushId = (typeof PUSHES)[number]['id'];
const pushOf = (id: PushId) =>
  PUSHES.find((push) => push.id === id)?.amount ?? 0.5;

function playAmp(tone: Tone, kind: AmpKind, amount: number) {
  const shape = shapeOf(kind);
  tone.setLoop(
    'amp',
    (rate) => renderTone(HZ, rate, (sine) => shape(sine * amount)),
    HZ,
    0.7,
  );
}

const WattsSlider = ({
  watts,
  accent,
  label,
  onChange,
}: {
  watts: number;
  accent: string;
  label: string;
  onChange: (watts: number) => void;
}) => (
  <LabSlider
    label={label}
    low={`${MIN_WATTS} W`}
    high={`${MAX_WATTS} W`}
    accent={accent}
    value={hzToPosition(watts, MIN_WATTS, MAX_WATTS)}
    valueText={`${Math.round(watts)} watts`}
    onChange={(position) =>
      onChange(positionToHz(position, MIN_WATTS, MAX_WATTS))
    }
  />
);

const CAUTION =
  'A speaker’s level is high enough to hurt. Real amps can give a shock even when unplugged, so looking inside is for a qualified technician.';

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [watts, setWatts] = useState(20);
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          Line level is about a volt, with hardly any current behind it. A
          speaker needs far more, to push its cone against the air. A power amp
          makes that last jump, and it’s rated in watts.
        </p>
        <p>Press play and change the power.</p>
      </LabText>
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() =>
              on ? tone.stop('mine') : tone.set('mine', HZ, levelFor(watts))
            }
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <WattsSlider
            watts={watts}
            accent={accent}
            label={`Power: ${Math.round(watts)} W`}
            onChange={(value) => {
              setWatts(value);
              tone.glide('mine', HZ, levelFor(value));
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Voltage at an 8 Ω speaker"
          value={`${speakerVolts(watts).toFixed(1)} V`}
          accent={accent}
        />
        <LabReadout
          label="Level, against 100 W"
          value={`${powerDb(watts, 100).toFixed(1)} dB`}
        />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        This page plays each power at its true level against the others. How
        loud that is depends on your device, not on these watts. {CAUTION}
      </p>
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
  const on = tone.sounding.has('mine');
  return (
    <>
      <div>
        <SoundPill
          on={on}
          onClick={() =>
            on ? tone.stop('mine') : tone.set('mine', HZ, levelFor(50))
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          Hear 50 W
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="Swap this 50 W amp for a 100 W amp, on the same speaker. How much louder is it at full power?"
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
  const [watts, setWatts] = useState<(typeof COMPARE)[number]>(50);
  const [kind, setKind] = useState<AmpKind>('tube');
  const [push, setPush] = useState<PushId>('pushed');
  const on = tone.sounding.has('mine');
  const ampOn = tone.sounding.has('amp');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="A little: twice the power is 3 dB, which is clearly louder but nowhere near twice. Sounding about twice as loud takes around 10 dB, which is ten times the power."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={on}
          onClick={() => {
            tone.stop('amp');
            if (on) tone.stop('mine');
            else tone.set('mine', HZ, levelFor(watts));
          }}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="Power"
          options={COMPARE.map((id) => ({ id, text: `${id} W` }))}
          value={watts}
          onPick={(next) => {
            setWatts(next);
            tone.glide('mine', HZ, levelFor(next));
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="More than 25 W, by"
          value={`${powerDb(watts, 25).toFixed(0)} dB`}
          accent={accent}
        />
      </div>
      <LabText>
        <p>
          Amps also clip when pushed, and guitarists often do this on purpose.
          Tubes round off gradually, adding harmonics as they go. Transistors
          stay clean to a higher level, then flatten more abruptly. Neither is
          better.
        </p>
      </LabText>
      <ClipStage
        amount={pushOf(push)}
        shape={shapeOf(kind)}
        accent={accent}
        caption="Simplified: a real amp’s tone depends on far more than this one curve. The faint line is what it would be with nowhere to stop."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={ampOn}
          onClick={() => {
            tone.stop('mine');
            if (ampOn) tone.stop('amp');
            else playAmp(tone, kind, pushOf(push));
          }}
        >
          {ampOn ? <Square aria-hidden /> : <Play aria-hidden />}
          {ampOn ? 'Stop' : 'Play'}
        </SoundPill>
        <LabPicker
          label="Kind of amp"
          options={AMP_KINDS}
          value={kind}
          onPick={(next) => {
            setKind(next);
            if (ampOn) playAmp(tone, next, pushOf(push));
          }}
        />
        <LabPicker
          label="How hard"
          options={PUSHES}
          value={push}
          onPick={(next) => {
            setPush(next);
            if (ampOn) playAmp(tone, kind, pushOf(next));
          }}
        />
      </div>
      <div>
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() => navigate(LearnRoutes.comboAmpAnatomy())}
        >
          Take a combo amp apart
        </button>
      </div>
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
  const [watts, setWatts] = useState<number>(WATT_ROUNDS[0].from);
  const [hint, setHint] = useState<'more' | 'less' | null>(null);
  const finished = round >= WATT_ROUNDS.length;
  const current = WATT_ROUNDS[Math.min(round, WATT_ROUNDS.length - 1)];

  if (finished) {
    return (
      <LabDone following={following} title="You’ve got the power math.">
        <p>
          Every 3 dB takes double the power, and every 10 dB takes ten times.
          It’s why going loud gets expensive so quickly.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const off = powerDb(watts, current.from) - current.db;
    if (Math.abs(off) > WATTS_WITHIN) {
      setHint(off < 0 ? 'more' : 'less');
      return;
    }
    setHint(null);
    const following = round + 1;
    setRound(following);
    if (following < WATT_ROUNDS.length) setWatts(WATT_ROUNDS[following].from);
    else onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Amp {round + 1} of {WATT_ROUNDS.length}:
          </span>{' '}
          you have {current.from} W and want {current.db} dB more. Set the power
          you’d need. Double is 3 dB, and ten times is 10 dB.
        </p>
      </LabText>
      <LabDock>
        <WattsSlider
          watts={watts}
          accent={accent}
          label={`Power: ${Math.round(watts)} W`}
          onChange={(value) => {
            setWatts(value);
            setHint(null);
          }}
        />
      </LabDock>
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {hint === 'more' && 'Not enough power for that yet.'}
          {hint === 'less' && 'More power than that needs.'}
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
          Power follows 10 × log of a ratio: double is 3 dB, and ten times is 10
          dB. Loudness follows far more slowly than the watts do. Your speaker’s
          sensitivity often matters more than the amp’s rating.
        </p>
      </InsightCard>
      <InsightCard title="Stay safe">
        <p className={INSIGHT_TEXT}>
          Amps hold dangerous voltages, and some parts keep a charge after
          unplugging. Leave the inside to a qualified technician.
        </p>
        <p className={INSIGHT_DIM}>
          Tube and solid-state curves here are simple outlines, not models of
          real amps.
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

export default function AmpsLab({
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
        <TryStep accent={accent} onDone={complete} following={following} />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
