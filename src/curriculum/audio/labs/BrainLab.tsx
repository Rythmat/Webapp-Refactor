import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
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
import { SpectrumStage } from '../lab/SpectrumStage';
import type { Tone } from '../lab/WaveStage';
import { recipeNamed } from '../lab/physics/harmonics';
import { withoutFundamental } from '../lab/physics/hearing';
import {
  formatHz,
  hzToPosition,
  matchResult,
  positionToHz,
  type MatchResult,
} from '../lab/physics/wave';
import { useLabTone } from '../lab/useLabTone';

// ── Hearing → Brain & Psychoacoustics ──────────────────────────────────────
// What you hear isn't only what's in the air. Take a note's own frequency away
// and the brain supplies its pitch; hear a loud tone hide a quiet one; then match
// the pitch of a note whose frequency isn't there, which proves it to yourself.

const HZ = 165;
const FULL = recipeNamed('bright').harmonics;
const HOLLOWED = withoutFundamental(FULL);

const CHOICES: readonly LabChoice[] = [
  {
    id: 'octave',
    text: 'The note jumps up an octave, to the lowest thing left',
  },
  { id: 'same', text: 'It’s the same note, with a thinner tone' },
  { id: 'silent', text: 'It goes silent, or nearly' },
];
const CORRECT = 'same';

const MASKER_HZ = 1000;
const QUIET = 0.03;
/** A quiet tone beside the loud one, and one well away from it. */
const NEARBY_HZ = 1150;
const FAR_HZ = 4000;

/** The student's turn: a note with its own frequency removed, to match. */
export const PITCH_ROUNDS = [165, 220, 294] as const;

const MIN_HZ = 80;
const MAX_HZ = 500;

function FullOrMissing({
  full,
  onPick,
}: {
  full: boolean;
  onPick: (full: boolean) => void;
}) {
  return (
    <LabPicker
      label="Which version"
      options={[
        { id: 'full', text: 'Whole note' },
        { id: 'missing', text: 'Its frequency removed' },
      ]}
      value={full ? 'full' : 'missing'}
      onPick={(id) => onPick(id === 'full')}
    />
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
  const on = tone.sounding.has('mine');
  return (
    <>
      <LabText>
        <p>
          Your ears only start the job. Your brain turns their signals into
          pitch, loudness, direction and meaning, and it does so much of the
          work that what you hear isn’t always what’s in the air.
        </p>
        <p>
          Here’s a note, with its harmonics as peaks on the spectrum. The line
          marks the note’s own frequency, the lowest peak.
        </p>
      </LabText>
      <SpectrumStage
        hz={HZ}
        accent={accent}
        tone={tone}
        caption="Measured live from this page’s real output."
      />
      <div>
        <SoundPill
          on={on}
          onClick={() =>
            on ? tone.stop('mine') : tone.set('mine', HZ, 1, FULL)
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
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
  const on = tone.sounding.has('mine');
  return (
    <>
      <SpectrumStage
        hz={HZ}
        accent={accent}
        tone={tone}
        caption="The line marks the note’s own frequency."
      />
      <div>
        <SoundPill
          on={on}
          onClick={() =>
            on ? tone.stop('mine') : tone.set('mine', HZ, 1, FULL)
          }
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          Hear it
        </SoundPill>
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="Remove that frequency completely, and leave all the harmonics above it. What do you hear?"
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
  const [full, setFull] = useState(false);
  const [quiet, setQuiet] = useState<'near' | 'far'>('near');
  const on = tone.sounding.has('mine');
  const loudOn = tone.sounding.has('loud');
  const quietOn = tone.sounding.has('quiet');
  const quietHz = quiet === 'near' ? NEARBY_HZ : FAR_HZ;
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="It’s the same note, thinner. The spectrum shows next to nothing at that frequency, yet the pitch stays, because your brain works it out from the spacing of the harmonics."
      />
      <SpectrumStage
        hz={HZ}
        accent={accent}
        tone={tone}
        caption="Switch between them while it plays, and look at the line. With it removed, only a faint trace is left, made by this page’s limiter."
      />
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={on}
          onClick={() => {
            tone.stop('loud');
            tone.stop('quiet');
            if (on) tone.stop('mine');
            else tone.set('mine', HZ, 1, full ? FULL : HOLLOWED);
          }}
        >
          {on ? <Square aria-hidden /> : <Play aria-hidden />}
          {on ? 'Stop' : 'Play'}
        </SoundPill>
        <FullOrMissing
          full={full}
          onPick={(next) => {
            setFull(next);
            tone.glide('mine', HZ, 1, next ? FULL : HOLLOWED);
          }}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          It’s also how you can follow a bass line on a phone that can’t play
          its lowest notes.
        </p>
        <p>
          Here’s another trick. A loud tone can hide a quiet one near it, called
          masking. Start the loud tone, then switch the quiet one on and off in
          each place. The quiet tone is just as quiet in both.
        </p>
      </LabText>
      <div className="flex flex-wrap items-center gap-2">
        <SoundPill
          on={loudOn}
          onClick={() => {
            tone.stop('mine');
            if (loudOn) {
              tone.stop('loud');
              tone.stop('quiet');
            } else {
              tone.set('loud', MASKER_HZ);
            }
          }}
        >
          {loudOn ? <Square aria-hidden /> : <Play aria-hidden />}
          Loud · {formatHz(MASKER_HZ)}
        </SoundPill>
        <SoundPill
          on={quietOn}
          onClick={() => {
            if (quietOn) tone.stop('quiet');
            else tone.set('quiet', quietHz, QUIET);
          }}
        >
          {quietOn ? <Square aria-hidden /> : <Play aria-hidden />}
          Quiet tone
        </SoundPill>
        <LabPicker
          label="Where the quiet tone is"
          options={[
            { id: 'near', text: `Near · ${formatHz(NEARBY_HZ)}` },
            { id: 'far', text: `Far · ${formatHz(FAR_HZ)}` },
          ]}
          value={quiet}
          onPick={(next) => {
            setQuiet(next);
            tone.glide('quiet', next === 'near' ? NEARBY_HZ : FAR_HZ, QUIET);
          }}
        />
      </div>
      <p className="text-[0.8125rem] leading-5 text-white/55">
        How much you notice depends on your ears, your speakers and your volume.
        Audio compression like MP3 relies on masking: it leaves out what you
        probably can’t hear anyway.
      </p>
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
  const [mine, setMine] = useState(MIN_HZ * 1.5);
  const [result, setResult] = useState<MatchResult | null>(null);
  const finished = round >= PITCH_ROUNDS.length;
  const target = PITCH_ROUNDS[Math.min(round, PITCH_ROUNDS.length - 1)];
  const targetOn = tone.sounding.has('target');
  const mineOn = tone.sounding.has('mine');

  if (finished) {
    return (
      <LabDone
        following={following}
        title="You matched three notes that weren’t there."
      >
        <p>
          Each of those frequencies was missing from what played, and you found
          it anyway. That pitch was made in your brain.
        </p>
      </LabDone>
    );
  }

  const check = () => {
    const outcome = matchResult(mine, target);
    setResult(outcome);
    if (outcome !== 'match') return;
    tone.stopAll();
    setResult(null);
    setMine(MIN_HZ * 1.5);
    const following = round + 1;
    setRound(following);
    if (following >= PITCH_ROUNDS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Note {round + 1} of {PITCH_ROUNDS.length}.
          </span>{' '}
          The target has its own frequency removed. Your tone is pure. Move it
          until the two sound like the same note.
        </p>
      </LabText>
      <LabDock>
        <div className="flex flex-wrap gap-2">
          <SoundPill
            on={targetOn}
            onClick={() => {
              tone.stop('mine');
              if (targetOn) tone.stop('target');
              else tone.set('target', target, 1, HOLLOWED);
            }}
          >
            {targetOn ? <Square aria-hidden /> : <Play aria-hidden />}
            Target
          </SoundPill>
          <SoundPill
            on={mineOn}
            onClick={() => {
              tone.stop('target');
              if (mineOn) tone.stop('mine');
              else tone.set('mine', mine);
            }}
          >
            {mineOn ? <Square aria-hidden /> : <Play aria-hidden />}
            Your tone
          </SoundPill>
        </div>
        <LabSlider
          label="Your tone"
          low="Low"
          high="High"
          accent={accent}
          value={hzToPosition(mine, MIN_HZ, MAX_HZ)}
          valueText="Match it by ear"
          onChange={(position) => {
            const value = positionToHz(position, MIN_HZ, MAX_HZ);
            setMine(value);
            setResult(null);
            tone.glide('mine', value);
          }}
        />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <div className="flex items-center justify-between gap-4">
        <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
          {result === 'higher' && 'Not yet: the target is higher.'}
          {result === 'lower' && 'Not yet: the target is lower.'}
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
          Psychoacoustics is the study of how sound in the air relates to what
          we perceive. The missing fundamental and masking are two of its
          classic effects.
        </p>
        <p className={INSIGHT_DIM}>
          Your brain has no single music center. Pitch, rhythm, memory, movement
          and emotion draw on networks spread across it, and scans of musicians
          show those networks overlap heavily.
        </p>
      </InsightCard>
      <InsightCard title="How the sound is made">
        <p className={INSIGHT_TEXT}>
          The note’s own frequency really is left out of what’s played, as the
          live spectrum shows. Faint traces can appear from this page’s limiter,
          and your speakers may add a little of their own.
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

export default function BrainLab({
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
