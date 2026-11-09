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
import { squeezeAt, wavesAcross } from '../lab/physics/particles';
import {
  formatHz,
  hzToPosition,
  nearestNote,
  positionToHz,
} from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Sound Basics → Compression & Rarefaction ───────────────────────────────
// A speaker pushing on the air: particles bunch and spread, and that is what the
// wave on every diagram is drawing. See it, hear it, find a compression by eye
// in a frozen moment.

const LOW_HZ = 110;
const HIGH_HZ = 880;
const A4 = 440;

const CHOICES: readonly LabChoice[] = [
  { id: 'bunched', text: 'Where the particles bunch together' },
  { id: 'spread', text: 'Where the particles spread apart' },
  { id: 'even', text: 'It’s the same everywhere' },
];
const CORRECT = 'bunched';

/** The student's turn: a frozen moment each, a compression to find in it. */
export const FIND_ROUNDS = [
  { hz: 440, phase: 0.2 },
  { hz: 660, phase: 0.55 },
  { hz: 220, phase: 0.85 },
] as const;

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
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          When a speaker moves, it pushes on the air particles in front of it,
          and they push the ones in front of them. The air gets more dense in
          some places and less dense in others.
        </p>
      </LabText>
      <AirStage hz={hz} accent={accent} />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() => (on ? tone.stop('mine') : tone.set('mine', hz))}
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabSlider
            label={`Frequency: ${formatHz(hz)}`}
            low="Low"
            high="High"
            accent={accent}
            value={hzToPosition(hz, LOW_HZ, HIGH_HZ)}
            valueText={`${Math.round(hz)} hertz, ${nearestNote(hz).name}`}
            onChange={(position) => {
              const value = positionToHz(position, LOW_HZ, HIGH_HZ);
              setHz(value);
              tone.glide('mine', value);
            }}
          />
        </div>
      </LabDock>
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
      <AirStage hz={A4} accent={accent} />
      <PredictChoices
        question="Your eardrum feels air pressure. Where in this air is the pressure highest?"
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
  hz,
  accent,
  picked,
  next,
}: {
  tone: Tone;
  hz: number;
  accent: string;
  picked: string | null;
  next: () => void;
}) {
  const on = tone.sounding.has('mine');
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Pressure is highest where the particles bunch. That’s a compression. Where they spread apart, it’s a rarefaction."
      />
      <AirStage hz={hz} accent={accent} pressure labels />
      <div>
        <SoundPill
          on={on}
          onClick={() => (on ? tone.stop('mine') : tone.set('mine', hz))}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          The curve is the wave you see on every diagram of sound. It isn’t the
          shape of anything in the air: it’s a graph of the pressure at each
          place, peaking at each compression and dipping at each rarefaction.
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
  const [marker, setMarker] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const finished = round >= FIND_ROUNDS.length;
  const current = FIND_ROUNDS[Math.min(round, FIND_ROUNDS.length - 1)];

  if (finished) {
    return (
      <LabDone following={following} title="That’s all three compressions.">
        <p>
          You can read sound in the air now: bunched is high pressure, spread
          out is low. Next time you see a wave drawn on a page, that’s what it
          means.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    if (marker == null) return;
    const found = squeezeAt(marker, current.phase, wavesAcross(current.hz));
    if (found === 'rarefaction') {
      setFeedback('That’s a rarefaction: the particles are spread apart here.');
      return;
    }
    if (found === 'between') {
      setFeedback('Close. Move to where they’re bunched tightest.');
      return;
    }
    setFeedback(null);
    setMarker(null);
    const following = round + 1;
    setRound(following);
    if (following >= FIND_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Moment {round + 1} of {FIND_ROUNDS.length}.
          </span>{' '}
          The air is frozen. Press the picture on a compression, where the
          particles are bunched tightest.
        </p>
      </LabText>
      <AirStage
        hz={current.hz}
        accent={accent}
        frozenPhase={current.phase}
        marker={marker}
        onMark={(x) => {
          setMarker(x);
          setFeedback(null);
        }}
      />
      <LabDock>
        <LabSlider
          label="Your mark"
          accent={accent}
          value={marker ?? 0.5}
          valueText={`${Math.round((marker ?? 0.5) * 100)} percent across`}
          onChange={(x) => {
            setMarker(x);
            setFeedback(null);
          }}
        />
      </LabDock>
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {feedback}
        </p>
        <button
          type="button"
          className={WHITE_PILL}
          disabled={marker == null}
          onClick={check}
        >
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
          Sound is a pressure wave. A compression is where the medium is more
          dense, and a rarefaction is where it’s less dense. They travel away
          from the source; the particles only swing back and forth.
        </p>
        <p className={INSIGHT_DIM}>
          The pressure curve comes from the same equation that moves the dots,
          so its peaks line up with the bunches.
        </p>
      </InsightCard>
      <InsightCard title="Reading the picture">
        <p className={INSIGHT_TEXT}>
          This is about 2.3 metres of air, slowed hundreds of times. Real
          particles are far smaller and more numerous, and at ordinary volumes
          they move much less than a hair’s width.
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

export default function CompressionLab({
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
          accent={accent}
          picked={picked}
          onPick={setPicked}
          next={next}
        />
      )}
      {step === 'reveal' && (
        <RevealStep
          tone={tone}
          hz={hz}
          accent={accent}
          picked={picked}
          next={next}
        />
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
