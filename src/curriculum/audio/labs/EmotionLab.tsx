import { Play, Square } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WHITE_PILL } from '@/components/kit/pills';
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
import { AUTO_FADE_MS } from '../lab/labAudio';
import { recipeNamed } from '../lab/physics/harmonics';
import {
  COMMON_READING,
  phraseHz,
  PHRASE_LENGTH,
  phraseSemitones,
  stepMs,
  type Mood,
  type PhraseDials,
  type PhraseRegister,
  type PhraseScale,
} from '../lab/physics/phrase';
import { useLabTone } from '../lab/useLabTone';

// ── Hearing → Music, Emotion & Body ────────────────────────────────────────
// One short tune on three dials: speed, scale and how high it sits. Hear what
// they do; guess whether minor is always sad; hear why not. The student's turn
// has no wrong answers, since a feeling can't be marked: it sets a tune for a
// mood, then shows what many listeners report, and no more. The science is said
// as carefully as it's known.

const VOICE = recipeNamed('mellow').harmonics;
const MIN_BPM = 50;
const MAX_BPM = 170;
/** A voice for each of the last few notes, so that their tails can overlap. */
const VOICES = 4;

const SCALE_OPTIONS: readonly { id: PhraseScale; text: string }[] = [
  { id: 'major', text: 'Major' },
  { id: 'minor', text: 'Minor' },
];
const REGISTER_OPTIONS: readonly { id: PhraseRegister; text: string }[] = [
  { id: 'low', text: 'Low' },
  { id: 'middle', text: 'Middle' },
  { id: 'high', text: 'High' },
];

const CHOICES: readonly LabChoice[] = [
  {
    id: 'always',
    text: 'Yes: minor is sad for everyone, because of its physics',
  },
  {
    id: 'often',
    text: 'Often, for people raised on Western music, but speed and culture can change that',
  },
  { id: 'never', text: 'No: scale makes no difference to how music feels' },
];
const CORRECT = 'often';

/** Tunes to compare: minor needn't be sad, and major needn't be happy. */
const COMPARE: readonly { id: string; text: string; dials: PhraseDials }[] = [
  {
    id: 'slow-minor',
    text: 'Slow, minor',
    dials: { bpm: 60, scale: 'minor', register: 'middle' },
  },
  {
    id: 'fast-minor',
    text: 'Fast, minor',
    dials: { bpm: 160, scale: 'minor', register: 'middle' },
  },
  {
    id: 'slow-major',
    text: 'Slow, major',
    dials: { bpm: 60, scale: 'major', register: 'middle' },
  },
  {
    id: 'fast-major',
    text: 'Fast, major',
    dials: { bpm: 160, scale: 'major', register: 'middle' },
  },
];

/** The student's turn: a mood to set a tune for. */
export const MOODS: readonly Mood[] = ['calm', 'excited', 'sad'];
const MOOD_NAMES: Record<Mood, string> = {
  calm: 'calm',
  excited: 'exciting',
  sad: 'sad',
};

const TUNE_NOTE = 'A short tune, the same eight-note pattern every time.';

/**
 * Loops the tune on its dials, read fresh for each note so a change takes effect
 * at once. Stops itself after as long as a held tone would last, or in a hidden
 * tab, and with the step that started it.
 */
function usePhrase(tone: Tone, dials: PhraseDials) {
  const dialsRef = useRef(dials);
  dialsRef.current = dials;
  const [playing, setPlaying] = useState(false);
  const [noteIndex, setNoteIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playNote, stopAll } = tone;

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
    stopAll();
  }, [stopAll]);

  const start = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPlaying(true);
    const startedAt = performance.now();
    let index = 0;
    const tick = () => {
      if (document.hidden || performance.now() - startedAt > AUTO_FADE_MS) {
        stop();
        return;
      }
      const now = dialsRef.current;
      const length = stepMs(now.bpm);
      const at = index % PHRASE_LENGTH;
      setNoteIndex(at);
      playNote(
        `phrase-${index % VOICES}`,
        phraseHz(now)[at],
        { attack: 0.01, decay: 0.5, sustain: 0.15, release: 0.12 },
        (length * 0.9) / 1000,
        VOICE,
      );
      index += 1;
      timer.current = setTimeout(tick, length);
    };
    tick();
  }, [playNote, stop]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { playing, noteIndex, start, stop };
}

/** The tune, one bar a note: how high each is, the sounding one in the accent. */
function PhraseBars({
  scale,
  active,
  accent,
}: {
  scale: PhraseScale;
  /** The note sounding; null when nothing is. */
  active: number | null;
  accent: string;
}) {
  const semitones = phraseSemitones(scale);
  return (
    <figure className="flex flex-col gap-2">
      <div
        aria-hidden
        className="flex h-[clamp(7rem,20vh,11rem)] items-end gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.02] p-4"
        data-lab-phrase
      >
        {semitones.map((value, i) => (
          <span
            key={i}
            className={cn(
              'min-w-0 flex-1 rounded-md',
              i !== active && 'bg-white/25',
            )}
            style={{
              height: `${20 + (value / 12) * 80}%`,
              backgroundColor: i === active ? accent : undefined,
            }}
          />
        ))}
      </div>
      <figcaption className="text-[0.8125rem] leading-5 text-white/55">
        {TUNE_NOTE}
      </figcaption>
    </figure>
  );
}

function Dials({
  dials,
  accent,
  onChange,
}: {
  dials: PhraseDials;
  accent: string;
  onChange: (dials: PhraseDials) => void;
}) {
  return (
    <>
      <LabSlider
        label={`Speed: ${Math.round(dials.bpm)} beats a minute`}
        low="Slow"
        high="Fast"
        accent={accent}
        min={MIN_BPM}
        max={MAX_BPM}
        step={1}
        value={dials.bpm}
        valueText={`${Math.round(dials.bpm)} beats a minute`}
        onChange={(bpm) => onChange({ ...dials, bpm })}
      />
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <LabPicker
          label="Scale"
          options={SCALE_OPTIONS}
          value={dials.scale}
          onPick={(scale) => onChange({ ...dials, scale })}
        />
        <LabPicker
          label="How high it sits"
          options={REGISTER_OPTIONS}
          value={dials.register}
          onPick={(register) => onChange({ ...dials, register })}
        />
      </div>
    </>
  );
}

function PlayPill({
  playing,
  start,
  stop,
}: {
  playing: boolean;
  start: () => void;
  stop: () => void;
}) {
  return (
    <SoundPill on={playing} onClick={playing ? stop : start}>
      {playing ? <Square aria-hidden /> : <Play aria-hidden />}
      {playing ? 'Stop' : 'Play'}
    </SoundPill>
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
  const [dials, setDials] = useState<PhraseDials>({
    bpm: 100,
    scale: 'major',
    register: 'middle',
  });
  const phrase = usePhrase(tone, dials);
  return (
    <>
      <LabText>
        <p>
          Sound’s journey doesn’t end at the ear. It can change how you feel,
          and even how your body behaves.
        </p>
        <p>
          Press play and change the dials. Notice what each one does to you.
        </p>
      </LabText>
      <PhraseBars
        scale={dials.scale}
        active={phrase.playing ? phrase.noteIndex : null}
        accent={accent}
      />
      <LabDock>
        <div>
          <PlayPill {...phrase} />
        </div>
        <Dials dials={dials} accent={accent} onChange={setDials} />
      </LabDock>
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
  const dials: PhraseDials = { bpm: 60, scale: 'minor', register: 'middle' };
  const phrase = usePhrase(tone, dials);
  return (
    <>
      <PhraseBars
        scale={dials.scale}
        active={phrase.playing ? phrase.noteIndex : null}
        accent={accent}
      />
      <div>
        <PlayPill {...phrase} />
      </div>
      <TapToHear show={tone.needsTap} />
      <PredictChoices
        question="This tune is slow and in a minor scale. Does a minor scale always make music sad?"
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
  const [id, setId] = useState(COMPARE[0].id);
  const chosen = COMPARE.find((item) => item.id === id) ?? COMPARE[0];
  const phrase = usePhrase(tone, chosen.dials);
  return (
    <>
      <RevealVerdict
        picked={picked}
        correct={CORRECT}
        answer="Often, but not always. Listeners raised on Western music tend to hear minor as sadder, but speed counts for a lot, and much of it is learned. Plenty of fast minor music is thrilling."
      />
      <PhraseBars
        scale={chosen.dials.scale}
        active={phrase.playing ? phrase.noteIndex : null}
        accent={accent}
      />
      <div className="flex flex-wrap items-center gap-2">
        <PlayPill {...phrase} />
        <LabPicker
          label="Which tune"
          options={COMPARE}
          value={id}
          onPick={setId}
        />
      </div>
      <TapToHear show={tone.needsTap} />
      <LabText>
        <p>
          <span className="text-white">In the brain:</span> music people love
          activates the brain’s reward system. Studies have measured dopamine
          being released, in anticipation and at the peak of a favorite moment,
          much like other things we find rewarding.
        </p>
        <p>
          <span className="text-white">In the body:</span> people tend to move
          with a beat, and music can bring on chills. Heart rate and breathing
          can change with music too, often rising with fast, exciting pieces and
          falling with slow, calm ones, though this varies a lot between people
          and between studies.
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
  const [settled, setSettled] = useState(false);
  const [dials, setDials] = useState<PhraseDials>({
    bpm: 110,
    scale: 'major',
    register: 'middle',
  });
  const phrase = usePhrase(tone, dials);
  const finished = round >= MOODS.length;
  const mood = MOODS[Math.min(round, MOODS.length - 1)];

  if (finished) {
    return (
      <LabDone
        following={following}
        title="Three moods, and all of them yours."
      >
        <p>
          There were no wrong answers. Composers use exactly these dials, and
          what they do depends on the listener as much as the sound.
        </p>
      </LabDone>
    );
  }

  const nextMood = () => {
    phrase.stop();
    setSettled(false);
    const following = round + 1;
    setRound(following);
    if (following >= MOODS.length) onDone();
  };

  return (
    <>
      <LabText>
        <p>
          <span className="text-white">
            Mood {round + 1} of {MOODS.length}:
          </span>{' '}
          make this tune sound {MOOD_NAMES[mood]} to you. There’s no right
          answer here, only what you hear.
        </p>
      </LabText>
      <PhraseBars
        scale={dials.scale}
        active={phrase.playing ? phrase.noteIndex : null}
        accent={accent}
      />
      <LabDock>
        <div>
          <PlayPill {...phrase} />
        </div>
        <Dials dials={dials} accent={accent} onChange={setDials} />
      </LabDock>
      <TapToHear show={tone.needsTap} />
      <p role="status" className="min-h-6 text-[0.9375rem] text-white/80">
        {settled && `${COMMON_READING[mood]} Yours is yours.`}
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          className={WHITE_PILL}
          onClick={settled ? nextMood : () => setSettled(true)}
        >
          {settled ? 'Next' : 'That’s my tune'}
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
          Speed, scale and register are among the strongest cues for how music
          feels. How they’re read depends heavily on what you’ve grown up
          hearing: they aren’t a universal code.
        </p>
      </InsightCard>
      <InsightCard title="How sure is the science?">
        <p className={INSIGHT_TEXT}>
          Reward-system activity and dopamine release during loved music have
          been measured directly in brain imaging studies.
        </p>
        <p className={INSIGHT_DIM}>
          Effects on heart rate and breathing are real but less consistent.
          Claims that music treats a specific condition need their own evidence,
          so this lab makes none.
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

export default function EmotionLab({
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
