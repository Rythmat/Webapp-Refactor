import { RotateCcw, Zap } from 'lucide-react';
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
  LabText,
  PredictChoices,
  RevealVerdict,
  TapToHear,
  type LabChoice,
} from '../lab/LabControls';
import { LabDone, type LabFollowing } from '../lab/LabDone';
import type { LabTopicProps } from '../lab/LabLesson';
import { PulseStage } from '../lab/PulseStage';
import type { Tone } from '../lab/WaveStage';
import { MEDIA, medium, type Medium } from '../lab/physics/particles';
import { useLabTone } from '../lab/useLabTone';

// ── Sound Basics → Waves & Mediums ─────────────────────────────────────────
// A wave moves energy, not matter. Send a pulse through air, water and steel;
// guess whether a particle travels with it; race the three, to scale; then tell
// a medium by how fast a pulse crosses it, with the names hidden.

const TAP_HZ = 660;
const ARRIVE_HZ = 990;

const CHOICES: readonly LabChoice[] = [
  { id: 'travels', text: 'It’s carried along to the far side' },
  { id: 'back', text: 'It moves a little, then goes back to where it started' },
  { id: 'still', text: 'It doesn’t move at all' },
];
const CORRECT = 'back';

/** The student's turn: tell these apart by speed alone. */
export const MYSTERY_ROUNDS: readonly Medium['id'][] = [
  'water',
  'air',
  'vacuum',
  'steel',
];

const speedText = (m: Medium) =>
  m.speed === 0
    ? 'No sound'
    : m.id === 'steel'
      ? 'About 5,000 m/s'
      : `${m.speed.toLocaleString('en-US')} m/s`;

/** One way to send a pulse, and the sound of it arriving. */
function usePulse(tone: Tone) {
  const [fire, setFire] = useState(0);
  const send = () => {
    tone.blip(TAP_HZ);
    setFire((n) => n + 1);
  };
  const arrive = () => tone.blip(ARRIVE_HZ);
  return { fire, send, arrive };
}

function SendButton({
  onClick,
  again,
}: {
  onClick: () => void;
  again: boolean;
}) {
  return (
    <button type="button" className={WHITE_PILL} onClick={onClick}>
      {again ? <RotateCcw aria-hidden /> : <Zap aria-hidden />}
      {again ? 'Send another' : 'Send a pulse'}
    </button>
  );
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
  const [id, setId] = useState<Medium['id']>('air');
  const { fire, send, arrive } = usePulse(tone);
  const chosen = medium(id);
  return (
    <>
      <LabText>
        <p>
          A wave is a disturbance that carries energy from one place to another.
          Sound is a wave that travels through a medium, like air, water or
          steel.
        </p>
        <p>Send a pulse through each one, and listen for it to arrive.</p>
      </LabText>
      <PulseStage
        key={id}
        lanes={[{ medium: chosen }]}
        fire={fire}
        accent={accent}
        onArrive={arrive}
      />
      <LabDock>
        <div className="flex flex-wrap items-center gap-2">
          <SendButton onClick={send} again={fire > 0} />
          {MEDIA.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={m.id === id}
              className={cn(
                PROMPT_PILL,
                m.id === id ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
              )}
              onClick={() => setId(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <p className="min-h-5 text-[0.8125rem] leading-5 text-white/55">
        {id === 'vacuum'
          ? 'A vacuum has no particles at all. Send a pulse and see what happens.'
          : 'Each dot stands for a particle of the medium. The closer together, the denser it is.'}
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
  return (
    <>
      <PulseStage
        lanes={[{ medium: medium('air') }]}
        fire={0}
        accent={accent}
      />
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="A pulse is about to cross this air. What happens to the coloured particle?"
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
  const { fire, send, arrive } = usePulse(tone);
  const lanes = useMemo(
    () =>
      MEDIA.filter((m) => m.speed > 0).map((m) => ({
        medium: m,
        label: m.name,
      })),
    [],
  );
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Each particle nudges the next and goes back to where it started. The energy crosses. The particles don’t."
      />
      <PulseStage lanes={lanes} fire={fire} accent={accent} onArrive={arrive} />
      <div>
        <SendButton onClick={send} again={fire > 0} />
      </div>
      <TapToHear show={tone.needsTap} />
      <p className="text-[0.8125rem] leading-5 text-white/55">
        Watch the coloured particle in each lane, against the tick where it
        rests. And the race is to scale: sound really does cross steel about 15
        times faster than air.
      </p>
      <div className="flex flex-wrap gap-3">
        {lanes.map(({ medium: m }) => (
          <LabReadout key={m.id} label={m.name} value={speedText(m)} />
        ))}
      </div>
      <LabText>
        <p>
          Stiffer materials pass the push along faster, which is why steel beats
          water and water beats air. With no particles at all, in a vacuum,
          there is nothing to pass it along. In space, nobody can hear you play.
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
  const [wrong, setWrong] = useState<Medium['id'] | null>(null);
  const { fire, send, arrive } = usePulse(tone);
  const finished = round >= MYSTERY_ROUNDS.length;
  const answer = MYSTERY_ROUNDS[Math.min(round, MYSTERY_ROUNDS.length - 1)];
  const lanes = useMemo(() => [{ medium: medium(answer) }], [answer]);

  if (finished) {
    return (
      <LabDone following={following} title="All four, from the speed alone.">
        <p>
          The same push crosses each medium at its own speed, and where there’s
          nothing to carry it, it doesn’t cross at all.
        </p>
      </LabDone>
    );
  }

  const pick = (id: Medium['id']) => {
    if (id !== answer) {
      setWrong(id);
      return;
    }
    setWrong(null);
    const following = round + 1;
    setRound(following);
    if (following >= MYSTERY_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Mystery {round + 1} of {MYSTERY_ROUNDS.length}.
          </span>{' '}
          The dots look the same on purpose. Send a pulse, time it by eye and
          ear, and say what it crossed.
        </p>
      </LabText>
      <PulseStage
        key={round}
        lanes={lanes}
        particles={36}
        fire={fire}
        accent={accent}
        onArrive={arrive}
      />
      <div>
        <SendButton onClick={send} again={fire > 0} />
      </div>
      <TapToHear show={tone.needsTap} />
      <div
        role="group"
        aria-label="What did it cross?"
        className="flex flex-wrap gap-2"
      >
        {MEDIA.map((m) => (
          <button
            key={m.id}
            type="button"
            className={cn(PROMPT_PILL, PROMPT_PILL_OFF, 'text-white/85')}
            onClick={() => pick(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong &&
          (answer === 'vacuum'
            ? 'Not that. Did anything arrive at all?'
            : `Not ${medium(wrong).name.toLowerCase()}: compare its speed in the race on the Reveal step, and send another.`)}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          A wave moves energy from one place to another without moving the
          material itself. Each particle pushes its neighbour, then returns.
        </p>
        <p className={INSIGHT_DIM}>
          Sound travels about 343 m/s in air, 1,480 m/s in water and about 5,000
          m/s in steel, and not at all in a vacuum.
        </p>
      </InsightCard>
      <InsightCard title="Reading the picture">
        <p className={INSIGHT_TEXT}>
          Every lane is slowed by the same amount, so the race is to scale. The
          particles are drawn huge, and move much further than real ones do.
        </p>
      </InsightCard>
    </>
  );
}

/** Going to another step stops whatever this one left sounding. */
function StopOnLeaving({ step, tone }: { step: string; tone: Tone }) {
  const { stopAll } = tone;
  useEffect(() => stopAll, [step, stopAll]);
  return null;
}

export default function WavesLab({
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
