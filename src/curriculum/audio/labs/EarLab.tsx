import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
import { LessonInsightPanel } from '@/curriculum/guitar/layout/LessonInsightPanel';
import {
  INSIGHT_DIM,
  INSIGHT_TEXT,
  InsightCard,
} from '@/daw/components/Library/InsightCard';
import { CochleaStage, type EarPart } from '../lab/CochleaStage';
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
import { MAX_HZ } from '../lab/labAudio';
import { placeResult } from '../lab/physics/hearing';
import { formatHz, hzToPosition, positionToHz } from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Hearing → Ear Mechanics ────────────────────────────────────────────────
// Sound's route from air to nerve, and the cochlea sorting it by pitch along its
// length. Sweep a tone along it; guess where a high note lands; see a chord split
// into separate places; then place three tones by ear.

const LOW_HZ = 40;
const LOW_NOTE = 220;
const HIGH_NOTE = 3520;

const PARTS: readonly { id: EarPart; text: string; about: string }[] = [
  {
    id: 'outer',
    text: 'Outer ear',
    about:
      'The pinna and the ear canal gather sound and guide it in, to the eardrum.',
  },
  {
    id: 'middle',
    text: 'Middle ear',
    about:
      'The eardrum vibrates, and three tiny bones, the hammer, anvil and stirrup, carry that into the inner ear, concentrating its force.',
  },
  {
    id: 'inner',
    text: 'Inner ear',
    about:
      'The cochlea is coiled and full of fluid. Waves in the fluid move a membrane inside, which bends hair cells, and those send electrical signals to the brain.',
  },
];

const CHOICES: readonly LabChoice[] = [
  { id: 'entrance', text: 'Near the entrance' },
  { id: 'far', text: 'At the far end' },
  { id: 'everywhere', text: 'Equally along the whole length' },
];
const CORRECT = 'entrance';

/** The student's turn: a tone to place, the first with its landmarks showing. */
export const PLACE_ROUNDS = [
  { hz: 4000, ticks: true },
  { hz: 250, ticks: false },
  { hz: 1000, ticks: false },
] as const;

/** How near a mark counts, as a share of the cochlea's length. */
export const PLACE_WITHIN = 0.1;

const UNCOILED =
  'Drawn straight so you can see along it: a real cochlea is coiled, and about 35 mm long. The ripple is slowed right down, and its shape simplified.';

function HearStep({
  tone,
  accent,
  next,
}: {
  tone: Tone;
  accent: string;
  next: () => void;
}) {
  const [hz, setHz] = useState(440);
  const [part, setPart] = useState<EarPart>('inner');
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          Your ear turns moving air into signals your brain can read, in three
          stages. Choose one to see where it is.
        </p>
      </LabText>
      <CochleaStage
        tones={on ? [hz] : []}
        part={part}
        accent={accent}
        tone={tone}
        caption={UNCOILED}
      />
      <LabDock>
        <LabPicker
          label="Part of the ear"
          options={PARTS}
          value={part}
          onPick={setPart}
        />
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
            value={hzToPosition(hz, LOW_HZ, MAX_HZ)}
            valueText={`${Math.round(hz)} hertz`}
            onChange={(position) => {
              const value = positionToHz(position, LOW_HZ, MAX_HZ);
              setHz(value);
              tone.glide('mine', value);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <p className="min-h-12 max-w-[44rem] text-[0.9375rem] leading-6 text-white/80">
        {PARTS.find((item) => item.id === part)?.about}
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
      <CochleaStage
        tones={[]}
        ticks={false}
        part="inner"
        accent={accent}
        tone={tone}
        caption="The hair cells run the whole length of the cochlea, and each is most sensitive to one frequency."
      />
      <PredictChoices
        question="A high note arrives, with a short wave and a quick cycle. Where along the cochlea does the membrane move most?"
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
  const lowOn = tone.sounding.has('low');
  const highOn = tone.sounding.has('high');
  const sounding = [
    ...(lowOn ? [LOW_NOTE] : []),
    ...(highOn ? [HIGH_NOTE] : []),
  ];
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Near the entrance. The membrane is stiff there and floppy at the far end, so high notes peak early and low notes travel further."
      />
      <CochleaStage
        tones={sounding}
        part="inner"
        accent={accent}
        tone={tone}
        caption="Turn on both: two notes at once, two separate places. The cochlea sorts sound by frequency before your brain ever gets it."
      />
      <div className="flex flex-wrap gap-2">
        <SoundPill
          on={lowOn}
          onClick={() =>
            lowOn ? tone.stop('low') : tone.set('low', LOW_NOTE, 0.7)
          }
        >
          {lowOn ? <Square aria-hidden /> : <Play aria-hidden />}
          Low · {formatHz(LOW_NOTE)}
        </SoundPill>
        <SoundPill
          on={highOn}
          onClick={() =>
            highOn ? tone.stop('high') : tone.set('high', HIGH_NOTE, 0.7)
          }
        >
          {highOn ? <Square aria-hidden /> : <Play aria-hidden />}
          High · {formatHz(HIGH_NOTE)}
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <div className="flex flex-wrap gap-3">
        <LabReadout
          label="Cochlea length"
          value="About 35 mm"
          accent={accent}
        />
        <LabReadout label="Hair cells" value="About 15,000" />
      </div>
      <LabText>
        <p>
          Those hair cells are delicate. Loud sound can damage them, and in
          people they don’t grow back, so hearing lost this way stays lost. It
          often shows first in the high notes.
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
  const [mark, setMark] = useState<number | null>(null);
  const [hint, setHint] = useState<'entrance' | 'far' | null>(null);
  const finished = round >= PLACE_ROUNDS.length;
  const current = PLACE_ROUNDS[Math.min(round, PLACE_ROUNDS.length - 1)];
  const on = tone.sounding.has('mine');

  if (finished) {
    return (
      <LabDone following={following} title="All three tones, in their places.">
        <p>
          High near the entrance, low at the far end. Your own cochlea did the
          same sorting for every tone as you heard it.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    if (mark == null) return;
    const result = placeResult(mark, current.hz, PLACE_WITHIN);
    if (result !== 'match') {
      setHint(result);
      return;
    }
    tone.stopAll();
    setHint(null);
    setMark(null);
    const following = round + 1;
    setRound(following);
    if (following >= PLACE_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Tone {round + 1} of {PLACE_ROUNDS.length}.
          </span>{' '}
          Play the tone, then press the cochlea where it would move most.
          {current.ticks
            ? ' The landmarks are there to help.'
            : ' No landmarks now: go by your ear.'}
        </p>
      </LabText>
      <CochleaStage
        tones={[]}
        ticks={current.ticks}
        part="inner"
        mark={mark}
        onMark={(along) => {
          setMark(along);
          setHint(null);
        }}
        accent={accent}
        tone={tone}
        caption="Your mark is the white line."
      />
      <LabDock>
        <div className="flex items-center gap-4">
          <SoundPill
            on={on}
            onClick={() =>
              on ? tone.stop('mine') : tone.set('mine', current.hz)
            }
          >
            {on ? <Square aria-hidden /> : <Play aria-hidden />}
            {on ? 'Stop' : 'Play'}
          </SoundPill>
          <LabSlider
            label="Your mark"
            low="Entrance"
            high="Far end"
            accent={accent}
            value={mark ?? 0.5}
            valueText={`${Math.round((mark ?? 0.5) * 100)} percent along`}
            onChange={(along) => {
              setMark(along);
              setHint(null);
            }}
          />
        </div>
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {hint === 'entrance' &&
            'Not yet: nearer the entrance. It’s higher than that.'}
          {hint === 'far' &&
            'Not yet: nearer the far end. It’s lower than that.'}
        </p>
        <button
          type="button"
          className={WHITE_PILL}
          disabled={mark == null}
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
          Sound travels from the outer ear through the middle ear’s eardrum and
          bones into the cochlea, where each place along a membrane answers most
          to its own frequency.
        </p>
        <p className={INSIGHT_DIM}>
          The map of frequency to place is a published fit to human hearing, the
          Greenwood function.
        </p>
      </InsightCard>
      <InsightCard title="Reading the picture">
        <p className={INSIGHT_TEXT}>
          The cochlea is uncoiled here, and the parts aren’t to scale. The
          outline of the wave is simplified, since how sharp its peak is depends
          on how loud the tone is and on the cochlea’s own active amplification.
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

export default function EarLab({
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
