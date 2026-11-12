import { cn } from '@/components/utilities';
import type { FeelingsLevel, StudentLanguage } from '../types';
import { EnergyRail } from './EnergyRail';
import { FeelingFace } from './FeelingFace';
import { FeelingsWheel } from './FeelingsWheel';
import {
  INTENSITIES,
  describeFeeling,
  faceValue,
  facesFor,
  energyValue,
  parseFeeling,
  primaryLabel,
  shadeOf,
  wheelValue,
  type FaceFeeling,
  type WheelPick,
} from './feelings';

// The student's half of the emotional check-in: the faces, or the wheel. A
// controlled input over the answer string (`feelings.ts`), so the live
// session and an assignment run submit it the same way.

const say = (
  text: { en: string; es?: string },
  lang: StudentLanguage,
): string => (lang === 'es' && text.es ? text.es : text.en);

const FaceButton = ({
  feeling,
  selected,
  dimmed,
  disabled,
  language,
  onSelect,
}: {
  feeling: FaceFeeling;
  selected: boolean;
  dimmed: boolean;
  disabled?: boolean;
  language: StudentLanguage;
  onSelect: () => void;
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    disabled={disabled}
    onClick={onSelect}
    className={cn(
      'group flex min-w-[4.5rem] flex-col items-center gap-2 rounded-[1.25rem] p-2 outline-none transition-[opacity,transform] focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed',
      dimmed && 'opacity-45 hover:opacity-80',
    )}
  >
    <span
      className={cn(
        'rounded-full p-1 transition-transform group-active:scale-95 motion-reduce:transition-none',
        selected ? 'ring-[3px] ring-white' : 'ring-[3px] ring-transparent',
      )}
    >
      <FeelingFace
        face={feeling.face}
        color={feeling.color}
        className="size-14 sm:size-16"
      />
    </span>
    <span
      className={cn(
        'text-[0.875rem]',
        selected ? 'font-bold text-daw-text' : 'text-daw-text-2',
      )}
    >
      {say(feeling.label, language)}
    </span>
  </button>
);

const FacesPicker = ({
  level,
  value,
  onChange,
  disabled,
  language,
}: {
  level: 'simple' | 'advanced';
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  language: StudentLanguage;
}) => {
  const faces = facesFor(level);
  const current = value ? parseFeeling(value) : null;
  const selectedId =
    current && current.level === level ? current.feeling.id : null;
  return (
    <div
      role="radiogroup"
      aria-label="How do you feel?"
      className={cn(
        level === 'simple'
          ? 'flex flex-wrap justify-center gap-1 sm:gap-3'
          : 'mx-auto grid w-fit grid-cols-3 gap-1 sm:gap-3',
      )}
    >
      {faces.map((feeling) => (
        <FaceButton
          key={feeling.id}
          feeling={feeling}
          language={language}
          selected={feeling.id === selectedId}
          dimmed={selectedId !== null && feeling.id !== selectedId}
          disabled={disabled}
          onSelect={() => onChange(faceValue(level, feeling))}
        />
      ))}
    </div>
  );
};

/**
 * Tap a ring to pick a feeling at that strength; tap a second petal to say
 * two at once (the wheel names the mix). Tapping a picked ring again takes it
 * back; with two picked, a third petal replaces the second.
 */
export const nextWheelPicks = (
  picks: readonly WheelPick[],
  tap: WheelPick,
): WheelPick[] => {
  const at = picks.findIndex((p) => p.primary === tap.primary);
  if (at >= 0) {
    if (picks[at].intensity === tap.intensity)
      return picks.filter((_, i) => i !== at);
    return picks.map((p, i) => (i === at ? tap : p));
  }
  if (picks.length < 2) return [...picks, tap];
  return [picks[0], tap];
};

const WheelPicker = ({
  value,
  onChange,
  onClear,
  disabled,
  language,
}: {
  value: string | null;
  onChange: (value: string) => void;
  onClear: () => void;
  disabled?: boolean;
  language: StudentLanguage;
}) => {
  const parsed = value ? parseFeeling(value) : null;
  const picks = parsed?.level === 'complex' ? parsed.picks : [];
  const described =
    value && picks.length ? describeFeeling(value, language) : null;

  const tap = (pick: WheelPick) => {
    const next = nextWheelPicks(picks, pick);
    if (next.length === 0) onClear();
    else onChange(wheelValue(next));
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <FeelingsWheel
        language={language}
        picks={picks}
        onPick={tap}
        disabled={disabled}
        className="w-full max-w-96"
      />
      <div
        aria-live="polite"
        className="flex min-h-14 flex-col items-center gap-1 text-center"
      >
        {described ? (
          <>
            <span className="flex items-center gap-2 text-[1.375rem] font-bold text-daw-text">
              {described.colors.map((c) => (
                <span
                  key={c}
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ background: c }}
                />
              ))}
              {described.label}
            </span>
            {described.detail && (
              <span className="text-[0.875rem] text-daw-text-2">
                {described.detail}
              </span>
            )}
          </>
        ) : (
          <span className="text-[0.875rem] text-daw-text-2">
            {language === 'es'
              ? 'Toca un color. Más cerca del centro es más fuerte.'
              : 'Tap a colour. Closer to the centre is stronger.'}
          </span>
        )}
      </div>
      {picks.map((p) => (
        <div
          key={p.primary}
          role="radiogroup"
          aria-label={`How strong is ${say(primaryLabel(p.primary), 'en').toLowerCase()}?`}
          className="flex flex-wrap justify-center gap-1.5"
        >
          {INTENSITIES.map((intensity) => {
            const shade = shadeOf(p.primary, intensity);
            const on = p.intensity === intensity;
            return (
              <button
                key={intensity}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => !on && tap({ primary: p.primary, intensity })}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  on
                    ? 'border-white bg-white/10 font-bold text-daw-text'
                    : 'border-daw-outline text-daw-text-2 hover:bg-daw-hover',
                )}
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-full"
                  style={{ background: shade.color }}
                />
                {say(shade.label, language)}
              </button>
            );
          })}
        </div>
      ))}
      {picks.length === 1 && (
        <p className="text-[0.8125rem] text-daw-text-3">
          {language === 'es'
            ? '¿Sientes algo más? Toca otro color.'
            : 'Feeling something else too? Tap another colour.'}
        </p>
      )}
    </div>
  );
};

export interface FeelingsPickerProps {
  level: FeelingsLevel;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  language?: StudentLanguage;
}

export const FeelingsPicker = ({
  level,
  value,
  onChange,
  disabled,
  language = 'en',
}: FeelingsPickerProps) =>
  level === 'energy' ? (
    <EnergyPicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      language={language}
    />
  ) : level === 'complex' ? (
    <WheelPicker
      value={value}
      onChange={onChange}
      onClear={() => onChange(null)}
      disabled={disabled}
      language={language}
    />
  ) : (
    <FacesPicker
      level={level}
      value={value}
      onChange={onChange}
      disabled={disabled}
      language={language}
    />
  );

/** The energy slider, answering `energy:<0–100>`. */
const EnergyPicker = ({
  value,
  onChange,
  disabled,
  language,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean | undefined;
  language: StudentLanguage;
}) => {
  const parsed = value ? parseFeeling(value) : null;
  return (
    <div style={{ fontSize: 'var(--slide-body-fz, 1rem)' }}>
      <EnergyRail
        value={parsed?.level === 'energy' ? parsed.value : null}
        onChange={(v) => onChange(energyValue(v))}
        disabled={disabled ?? false}
        language={language}
      />
    </div>
  );
};

/** A level's tool as a picture: the editor canvas, the projector, previews. */
export const FeelingsPreview = ({
  level,
  language = 'en',
  row = false,
  className,
}: {
  level: FeelingsLevel;
  language?: StudentLanguage;
  /** The faces on one line (the advanced grid too), for a short band. */
  row?: boolean;
  className?: string;
}) =>
  level === 'energy' ? (
    <EnergyRail language={language} className={className} />
  ) : level === 'complex' ? (
    <FeelingsWheel
      language={language}
      className={cn('h-full max-h-full', className)}
    />
  ) : (
    <div
      className={cn(
        level === 'simple' || row
          ? 'flex flex-wrap items-start justify-center gap-[0.6em]'
          : 'grid w-fit grid-cols-3 gap-x-[1em] gap-y-[0.4em]',
        className,
      )}
    >
      {facesFor(level).map((f) => (
        <div key={f.id} className="flex flex-col items-center gap-[0.25em]">
          <FeelingFace face={f.face} color={f.color} className="size-[2.6em]" />
          <span className="whitespace-nowrap text-[0.7em] text-white/80">
            {say(f.label, language)}
          </span>
        </div>
      ))}
    </div>
  );
