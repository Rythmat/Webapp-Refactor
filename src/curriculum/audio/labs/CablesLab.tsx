import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OUTLINE_PILL } from '@/components/kit/pills';
import { GameRoutes } from '@/constants/routes';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { CableStage } from '../lab/CableStage';
import {
  LabDock,
  LabNext,
  LabPicker,
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
  CONNECTORS,
  renderCable,
  type CableKind,
  type ConnectorId,
} from '../lab/physics/signal';
import { useLabTone } from '../lab/useLabTone';

// ── The Signal Path → Connectors & Cables ──────────────────────────────────
// Getting the signal there clean. Long cables pick up hum; hear how much; guess
// how a balanced cable gets rid of it; see the flip and subtraction, from the same
// function the sound comes from; then match each connector to its job.

const HZ = 440;
const MAX_METRES = 80;

const KINDS: readonly { id: CableKind; text: string }[] = [
  { id: 'unbalanced', text: 'Unbalanced' },
  { id: 'balanced', text: 'Balanced' },
];

const CHOICES: readonly LabChoice[] = [
  { id: 'shield', text: 'A much thicker shield keeps the hum from getting in' },
  {
    id: 'subtract',
    text: 'It sends the signal twice, one copy flipped, and subtracts them at the far end',
  },
  { id: 'filter', text: 'A filter at the far end removes the hum’s frequency' },
];
const CORRECT = 'subtract';

/** The student's turn: a connector for each job. */
export const CONNECTOR_ROUNDS: readonly {
  job: string;
  answer: ConnectorId;
}[] = [
  { job: 'A microphone, 20 metres across a stage to a preamp', answer: 'xlr' },
  { job: 'An electric guitar to its amp', answer: 'ts' },
  { job: 'A power amp to a stage speaker', answer: 'speakon' },
  { job: 'A turntable to a home stereo', answer: 'rca' },
  { job: 'An interface’s balanced line output to a monitor', answer: 'trs' },
];

const connectorName = (id: ConnectorId) =>
  CONNECTORS.find((connector) => connector.id === id)?.name ?? '';

const connectorOptions = CONNECTORS.map(({ id, name }) => ({
  id,
  text: name,
}));

const playCable = (tone: Tone, metres: number, kind: CableKind) =>
  tone.setLoop('mine', (rate) => renderCable(HZ, rate, metres, kind), HZ, 0.7);

const MODEL =
  'A model of what a cable near mains power can pick up, slowed down. Real hum depends on what’s nearby, and on the cable.';

function CableControls({
  tone,
  metres,
  kind,
  accent,
  onMetres,
  onKind,
}: {
  tone: Tone;
  metres: number;
  kind: CableKind;
  accent: string;
  onMetres: (metres: number) => void;
  /** Left out, the kind of cable isn't the student's to change yet. */
  onKind?: (kind: CableKind) => void;
}) {
  const on = tone.sounding.has('mine');
  return (
    <LabDock>
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={on}
          onClick={() =>
            on ? tone.stop('mine') : playCable(tone, metres, kind)
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
        {onKind && (
          <LabPicker
            label="Kind of cable"
            options={KINDS}
            value={kind}
            onPick={(next) => {
              onKind(next);
              if (on) playCable(tone, metres, next);
            }}
          />
        )}
      </div>
      <LabSlider
        label={`Cable length: ${Math.round(metres)} m`}
        low="1 m"
        high={`${MAX_METRES} m`}
        accent={accent}
        min={1}
        max={MAX_METRES}
        step={1}
        value={metres}
        valueText={`${Math.round(metres)} metres`}
        onChange={(value) => {
          onMetres(value);
          if (on) playCable(tone, value, kind);
        }}
      />
    </LabDock>
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
  const [metres, setMetres] = useState(3);
  return (
    <>
      <LabText>
        <p>
          A cable also works as an antenna. Nearby power wiring puts a hum on
          it, and the longer the cable, the more it picks up. Quiet signals like
          a mic’s can’t afford that.
        </p>
        <p>Press play, then make the cable longer.</p>
      </LabText>
      <CableStage
        kind="unbalanced"
        metres={metres}
        accent={accent}
        caption={MODEL}
      />
      <CableControls
        tone={tone}
        metres={metres}
        kind="unbalanced"
        accent={accent}
        onMetres={setMetres}
      />
      <TapToHear show={tone.needsTap} />
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
      <CableStage
        kind="unbalanced"
        metres={MAX_METRES}
        accent={accent}
        caption="A long unbalanced cable, with plenty of hum on it."
      />
      <PredictChoices
        question="Pro mics use balanced cables, and can run for 100 metres with almost no hum. How?"
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
  const [metres, setMetres] = useState(MAX_METRES);
  const [kind, setKind] = useState<CableKind>('balanced');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="It subtracts. One wire carries the signal, the other a flipped copy, and hum lands on both the same. Subtract one from the other at the far end: the signal adds up, and the hum cancels."
      />
      <CableStage
        kind={kind}
        metres={metres}
        accent={accent}
        caption="Switch between them. Both wires have the same hum on them, but the signal is flipped on the second."
      />
      <CableControls
        tone={tone}
        metres={metres}
        kind={kind}
        accent={accent}
        onMetres={setMetres}
        onKind={setKind}
      />
      <TapToHear show={tone.needsTap} />
      <div
        className="flex flex-col divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.04]"
        data-lab-connectors
      >
        {CONNECTORS.map((connector) => (
          <div
            key={connector.id}
            className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-2.5 text-[0.9375rem] text-white/80"
          >
            <span className="w-20 shrink-0 text-white">{connector.name}</span>
            <span className="w-24 shrink-0 text-[0.8125rem] text-white/55">
              {connector.balanced ? 'Balanced' : 'Unbalanced'}
            </span>
            <span className="min-w-0 flex-1 basis-56">{connector.carries}</span>
          </div>
        ))}
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        Never use an instrument cable from an amp to a speaker. It looks the
        same, but its thin wire isn’t made for speaker level, and it can
        overheat.
      </p>
      <div>
        <button
          type="button"
          className={OUTLINE_PILL}
          onClick={() => navigate(GameRoutes.signalFlow())}
        >
          Patch a rig in Signal Flow
        </button>
      </div>
      <LabNext onClick={next}>Your turn</LabNext>
    </>
  );
}

function TryStep({
  onDone,
  following,
}: {
  onDone: () => void;
  following: LabFollowing | null;
}) {
  const [round, setRound] = useState(0);
  const [wrong, setWrong] = useState<ConnectorId | null>(null);
  const finished = round >= CONNECTOR_ROUNDS.length;
  const current =
    CONNECTOR_ROUNDS[Math.min(round, CONNECTOR_ROUNDS.length - 1)];

  if (finished) {
    return (
      <LabDone following={following} title="From the mic to the speaker.">
        <p>
          You’ve followed it the whole way: air to voltage, up to line level,
          into numbers and back, up to speaker level, and out into the air
          again. What comes next is how to capture it well.
        </p>
      </LabDone>
    );
  }

  const pick = (id: ConnectorId) => {
    if (id !== current.answer) {
      setWrong(id);
      return;
    }
    setWrong(null);
    const following = round + 1;
    setRound(following);
    if (following >= CONNECTOR_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Job {round + 1} of {CONNECTOR_ROUNDS.length}:
          </span>{' '}
          {current.job}. Which connector would you normally use?
        </p>
      </LabText>
      <LabPicker
        label="Which connector"
        options={connectorOptions}
        onPick={pick}
      />
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {wrong &&
          `Not usually ${connectorName(wrong)}. ${
            CONNECTORS.find((connector) => connector.id === wrong)?.carries
          }.`}
      </p>
    </>
  );
}

function About() {
  return (
    <>
      <InsightCard title="What this shows">
        <p className={INSIGHT_TEXT}>
          A balanced connection sends a signal and its flipped copy on two
          wires. Interference lands on both alike, so subtracting them cancels
          it. This is called common-mode rejection.
        </p>
        <p className={INSIGHT_DIM}>
          A plug’s shape doesn’t make a connection balanced: both ends have to
          be built for it, and a TRS plug on stereo headphones isn’t balanced at
          all.
        </p>
      </InsightCard>
      <InsightCard title="About the sound">
        <p className={INSIGHT_TEXT}>
          The tone and the hum are added and subtracted just as the picture
          shows, with a small leak left in, since real receivers aren’t perfect.
          The amount of hum is a model’s, and isn’t what any given cable would
          pick up.
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

export default function CablesLab({
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
      {step === 'try' && <TryStep onDone={complete} following={following} />}
      <LessonInsightPanel {...about}>
        <About />
      </LessonInsightPanel>
    </>
  );
}
