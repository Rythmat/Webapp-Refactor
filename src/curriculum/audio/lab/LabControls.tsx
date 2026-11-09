import { Check } from 'lucide-react';
import {
  useId,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { OUTLINE_PILL, WHITE_PILL } from '@/components/kit/pills';
import {
  PROMPT_PILL,
  PROMPT_PILL_OFF,
  PROMPT_PILL_ON,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import {
  SettingsRow,
  SettingsSlider,
} from '@/curriculum/guitar/layout/settingsControls';
import {
  getLessonVolume,
  setLessonVolume,
  subscribeLessonVolume,
} from '@/learn/audio/lessonVolumeValue';
import './lab.css';

// ── The parts every lab is made of ─────────────────────────────────────────

/** A lab's words: one idea at a time, in the deck's plain language. */
export function LabText({ children }: { children: ReactNode }) {
  return (
    <div className="flex max-w-[44rem] flex-col gap-2 text-[0.9375rem] leading-6 text-white/80">
      {children}
    </div>
  );
}

/** The dark stage a lab draws on, with its caption underneath. */
export function LabStage({
  caption,
  children,
  className,
}: {
  /** What the picture is showing, honestly: its scale, what's slowed. */
  caption?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className="flex flex-col gap-2">
      <div
        className={cn(
          'relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.02]',
          className,
        )}
      >
        {children}
      </div>
      {caption && (
        <figcaption className="text-[0.8125rem] leading-5 text-white/55">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/**
 * The controls a lab is driven by. On a phone they dock to the bottom of the
 * screen, because there the wave and the slider can't both fit otherwise, and
 * the point is to watch one while moving the other.
 */
export function LabDock({ children }: { children: ReactNode }) {
  return (
    <div className="z-10 flex flex-col gap-3 max-sm:sticky max-sm:bottom-0 max-sm:-mx-4 max-sm:border-t max-sm:border-white/10 max-sm:bg-[#101012] max-sm:px-4 max-sm:py-2">
      {children}
    </div>
  );
}

/** A labelled native slider: keyboard and touch come with it. */
export function LabSlider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.001,
  valueText,
  accent,
  onChange,
  low,
  high,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** What a screen reader says for the value ("440 hertz, A4"). */
  valueText: string;
  accent: string;
  onChange: (value: number) => void;
  /** The words at either end. */
  low?: string;
  high?: string;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="flex w-full min-w-0 flex-col gap-1.5 text-[0.8125rem] text-white/55">
      <span>{label}</span>
      <span className="flex items-center gap-3">
        {low && <span aria-hidden>{low}</span>}
        <input
          type="range"
          className="lab-slider min-w-0 flex-1"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={valueText}
          onChange={(event) => onChange(Number(event.target.value))}
          style={
            {
              '--slider-accent': accent,
              '--slider-fill': `${fill}%`,
            } as CSSProperties
          }
        />
        {high && <span aria-hidden>{high}</span>}
      </span>
    </label>
  );
}

/** One number the lab is showing, with what it is. */
export function LabReadout({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex min-w-[6.5rem] flex-1 flex-col gap-0.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <span className="text-xs text-white/55">{label}</span>
      <span className="text-lg leading-6 text-white" style={{ color: accent }}>
        {value}
      </span>
    </div>
  );
}

/** Next: the one primary action at a step's end. */
export function LabNext({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-end pt-1">
      <button type="button" className={WHITE_PILL} onClick={onClick}>
        {children}
      </button>
    </div>
  );
}

/** Says so when the browser is holding the sound back. */
export function TapToHear({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="status" className="text-[0.8125rem] text-white/70">
      No sound yet? Tap anywhere on this page, then press play again.
    </p>
  );
}

/** A toggle for a sound: outlined when off, filled when on. */
export function SoundPill({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn('shrink-0', on ? WHITE_PILL : OUTLINE_PILL)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** One of a few settings, chosen with a press: the picture and sound follow. */
export function LabPicker<Id extends string | number>({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: readonly { id: Id; text: string; disabled?: boolean }[];
  /** What's on: left out, these are answers, with nothing on yet. */
  value?: Id | ReadonlySet<Id>;
  onPick: (id: Id) => void;
}) {
  const isOn = (id: Id) =>
    value instanceof Set ? value.has(id) : value === id;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={isOn(option.id)}
          disabled={option.disabled}
          className={cn(
            PROMPT_PILL,
            isOn(option.id) ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
          )}
          onClick={() => onPick(option.id)}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}

export interface LabChoice {
  id: string;
  text: string;
}

/** The Predict step's choices: pick one, and it stays picked. */
export function PredictChoices({
  question,
  choices,
  picked,
  onPick,
}: {
  question: string;
  choices: readonly LabChoice[];
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-labelledby={id}
      className="flex flex-col gap-3"
      data-lab-predict
    >
      <p id={id} className="max-w-[44rem] text-lg leading-7 text-white">
        {question}
      </p>
      <div className="flex flex-col gap-2">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            role="radio"
            aria-checked={picked === choice.id}
            onClick={() => onPick(choice.id)}
            className={cn(
              PROMPT_PILL,
              'h-auto min-h-11 justify-start whitespace-normal rounded-2xl px-4 py-2.5 text-left',
              picked === choice.id
                ? PROMPT_PILL_ON
                : cn(PROMPT_PILL_OFF, 'text-white/85'),
            )}
          >
            {choice.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/** How the student's guess went, before the explanation. */
export function RevealVerdict({
  picked,
  correct,
  answer,
}: {
  picked: string | null;
  correct: string;
  /** The right answer, in words. */
  answer: string;
}) {
  if (picked === correct) {
    return (
      <p className="flex items-center gap-2 text-lg leading-7 text-white">
        <Check aria-hidden className="size-5 shrink-0" />
        You called it. {answer}
      </p>
    );
  }
  return (
    <p className="text-lg leading-7 text-white">
      {picked ? 'Not quite, and that’s what this step is for. ' : ''}
      {answer}
    </p>
  );
}

export function LabVolumeRow() {
  const volume = useSyncExternalStore(
    subscribeLessonVolume,
    getLessonVolume,
    getLessonVolume,
  );
  const percent = Math.round(volume * 100);
  return (
    <SettingsRow
      label="Volume"
      helper="Set your device low to start, especially in headphones."
      forControl={false}
    >
      {({ labelId, helperId }) => (
        <SettingsSlider
          value={percent}
          onValueChange={(next) => setLessonVolume(next / 100)}
          labelledBy={labelId}
          describedBy={helperId}
          valueText={percent === 0 ? 'Muted' : `${percent}%`}
        />
      )}
    </SettingsRow>
  );
}
