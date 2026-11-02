import { Play, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  LabText,
  PredictChoices,
  RevealVerdict,
  SoundPill,
  TapToHear,
  type LabChoice,
} from '../lab/LabControls';
import { LabDone, type LabFollowing } from '../lab/LabDone';
import type { LabTopicProps } from '../lab/LabLesson';
import { RecipeStage } from '../lab/RecipeStage';
import { TransducerStage, type TransducerKind } from '../lab/TransducerStage';
import type { Tone } from '../lab/WaveStage';
import {
  pickupNamed,
  pickupRecipe,
  PICKUPS,
  type PickupId,
} from '../lab/physics/electric';
import { useLabTone } from '../lab/useLabTone';

// ── Sound to Electricity → Transducers ─────────────────────────────────────
// A transducer changes one kind of energy into another. A dynamic mic, a guitar
// pickup and a speaker are the same magnet and coil, doing different jobs. Guess
// what headphones do plugged in as a mic; see a pickup's place change a string's
// tone, by real physics; then tell the three pickups apart by ear.

const HZ = 110;
const BARS = 12;

const KINDS: readonly {
  id: TransducerKind;
  text: string;
  about: string;
}[] = [
  {
    id: 'mic',
    text: 'Dynamic mic',
    about:
      'Sound moves a thin diaphragm. Fixed to it, a coil moves past a magnet, and that makes a tiny voltage in the shape of the sound.',
  },
  {
    id: 'pickup',
    text: 'Guitar pickup',
    about:
      'A magnet magnetizes the steel string above it. As the string moves, the field through the coil changes, which makes a voltage. No air is involved.',
  },
  {
    id: 'speaker',
    text: 'Speaker',
    about:
      'A mic in reverse. Voltage in the coil makes it push against the magnet, moving the cone fixed to it, and the cone moves the air.',
  },
];

const CHOICES: readonly LabChoice[] = [
  { id: 'nothing', text: 'Nothing: headphones only play sound' },
  { id: 'mic', text: 'They work as a microphone, if a faint one' },
  { id: 'damage', text: 'They break straight away' },
];
const CORRECT = 'mic';

/** The student's turn: a pickup to name by ear. */
export const MYSTERY_PICKUPS: readonly PickupId[] = [
  'bridge',
  'neck',
  'middle',
  'bridge',
];

const STRING_NOTE =
  'A simplified string, not a recording: each harmonic falls off evenly, then the pickup hears it only as far as it moves at that place. The bars count its harmonics, the first being the note.';

function HearStep({ accent, next }: { accent: string; next: () => void }) {
  const [kind, setKind] = useState<TransducerKind>('mic');
  return (
    <>
      <LabText>
        <p>
          A transducer changes one kind of energy into another. Three of the
          most important ones in music are built from the same two parts: a
          magnet and a coil.
        </p>
      </LabText>
      <TransducerStage
        kind={kind}
        accent={accent}
        caption="A schematic, not the parts’ real shapes. Slowed right down."
      />
      <LabDock>
        <LabPicker
          label="Which transducer"
          options={KINDS}
          value={kind}
          onPick={setKind}
        />
      </LabDock>
      <p className="min-h-12 max-w-[44rem] text-[0.9375rem] leading-6 text-white/80">
        {KINDS.find((item) => item.id === kind)?.about}
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
      <TransducerStage
        kind="speaker"
        accent={accent}
        caption="Headphones hold a tiny speaker like this one in each ear cup."
      />
      <PredictChoices
        question="Plug a pair of ordinary headphones into a microphone input, and talk into them. What happens?"
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
  const navigate = useNavigate();
  const [id, setId] = useState<PickupId>('neck');
  const harmonics = useMemo(
    () => pickupRecipe(pickupNamed(id).place, BARS),
    [id],
  );
  const on = tone.sounding.has('mine');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="They work as a microphone, if a faint one. A speaker and a dynamic mic share the same parts, so it runs both ways. Most headphones make a poor mic, but the physics holds."
      />
      <LabText>
        <p>
          A pickup does this with a string, and where it sits matters. Each
          harmonic’s pattern moves more in some places than others, and a pickup
          only hears what moves where it is. Near the bridge the note itself
          barely moves, so the higher harmonics stand out.
        </p>
      </LabText>
      <RecipeStage
        harmonics={harmonics}
        bars={BARS}
        accent={accent}
        tone={tone}
        caption={STRING_NOTE}
      />
      <LabDock>
        <div className="flex flex-wrap items-center gap-2">
          <SoundPill
            on={on}
            onClick={() =>
              on ? tone.stop('mine') : tone.set('mine', HZ, 1, harmonics)
            }
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabPicker
            label="Which pickup"
            options={PICKUPS.map((pickup) => ({
              id: pickup.id,
              text: pickup.name,
            }))}
            value={id}
            onPick={(next) => {
              setId(next);
              tone.glide(
                'mine',
                HZ,
                1,
                pickupRecipe(pickupNamed(next).place, BARS),
              );
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <p className="text-[0.8125rem] leading-5 text-white/55">
        A magnetic pickup only senses metal it can magnetize. That’s why nylon
        strings need a different kind of pickup.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() => navigate(LearnRoutes.microphoneAnatomy())}
        >
          Take a microphone apart
        </button>
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() => navigate(LearnRoutes.guitarAnatomy())}
        >
          See a guitar’s pickups
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
  const [playing, setPlaying] = useState<PickupId | 'mystery'>('mystery');
  const finished = round >= MYSTERY_PICKUPS.length;
  const answer = MYSTERY_PICKUPS[Math.min(round, MYSTERY_PICKUPS.length - 1)];
  const on = tone.sounding.has('sound');

  if (finished) {
    return (
      <LabDone following={following} title="You can hear where a pickup sits.">
        <p>
          Same string, same note. All that changed was where it was being heard
          from. That’s the end of the air’s part of the journey: from here on,
          the sound is a signal.
        </p>
      </LabDone>
    );
  }

  const play = (what: PickupId | 'mystery') => {
    if (on && playing === what) {
      tone.stop('sound');
      return;
    }
    setPlaying(what);
    tone.set(
      'sound',
      HZ,
      1,
      pickupRecipe(pickupNamed(what === 'mystery' ? answer : what).place, BARS),
    );
  };

  const pick = (id: PickupId) => {
    if (id !== answer) {
      setWrong(true);
      return;
    }
    tone.stopAll();
    setWrong(false);
    const following = round + 1;
    setRound(following);
    if (following >= MYSTERY_PICKUPS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Mystery {round + 1} of {MYSTERY_PICKUPS.length}.
          </span>{' '}
          Play the string, compare it with each pickup, then say which one you
          were hearing.
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
          {PICKUPS.map((pickup) => {
            const active = on && playing === pickup.id;
            return (
              <SoundPill
                key={pickup.id}
                on={active}
                onClick={() => play(pickup.id)}
              >
                {active ? <Square aria-hidden /> : <Play aria-hidden />}
                {pickup.name}
              </SoundPill>
            );
          })}
        </div>
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-col gap-2">
        <span className="text-[0.8125rem] text-white/55">It’s the…</span>
        <LabPicker
          label="It’s the…"
          options={PICKUPS.map((pickup) => ({
            id: pickup.id,
            text: pickup.name,
          }))}
          onPick={pick}
        />
      </div>
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong && 'Not that one. Is it warm and round, or thin and bright?'}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          Mics and pickups turn movement into voltage, and speakers turn voltage
          into movement. Each is a transducer, and the dynamic kinds rest on the
          magnet-and-coil physics of the last topic.
        </p>
        <p className={INSIGHT_DIM}>
          Condenser mics work differently, with a charged plate instead of a
          magnet and coil. That comes in the Microphones module.
        </p>
      </InsightCard>
      <InsightCard title="About the string">
        <p className={INSIGHT_TEXT}>
          The pickup’s effect is real physics, but this string is simplified. A
          real tone also depends on where you pluck, on the pickup’s size, and
          on its electronics.
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

export default function TransducersLab({
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
        <TryStep tone={tone} onDone={complete} following={following} />
      )}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
